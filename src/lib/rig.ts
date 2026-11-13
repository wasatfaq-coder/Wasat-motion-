// Character rig (MASTER_PROMPT_FINAL §22): skeleton, two-bone IK, gait without foot sliding, sit, reach, finger poses.
// Pure math in kit units (z up, character ≈ 77 units tall); no kit and no React, so scripts/rig-check.mjs tests it
// without rendering. Every pose is a pure function of time (no state between frames, §12).

export type V3 = [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const Z: V3 = [0, 0, 1];

/** Bone lengths and body dimensions (kit units). Height: 4 ankle + 34 leg + 23 torso + 3 neck + 14 head ≈ 77. */
export const DIM = {
  thigh: 17,
  shin: 17,
  ankle: 4,
  hip: 4.2,
  torso: 23,
  shoulder: 7.5,
  neck: 3,
  head: 5.6,
  upper: 11.5,
  fore: 10.5,
  palm: 6.5,
  rootZ: 38,
} as const;
export const LEG = DIM.thigh + DIM.shin;
export const ARM = DIM.upper + DIM.fore;

export type Side = 'L' | 'R';
export type FingerPose = {
  curl: [number, number, number, number, number];
  spread: number;
}; // thumb, index, middle, ring, pinky; 0 open … 1 fist
export const HAND_POSES = {
  open: {curl: [0.05, 0.02, 0.02, 0.03, 0.05], spread: 0.35},
  relaxed: {curl: [0.15, 0.12, 0.16, 0.2, 0.24], spread: 0.08},
  fist: {curl: [0.8, 1, 1, 1, 1], spread: 0},
  point: {curl: [0.7, 0, 1, 1, 1], spread: 0.05},
  pinch: {curl: [0.55, 0.6, 0.15, 0.2, 0.25], spread: 0.1},
  press: {curl: [0.6, 0.05, 0.95, 1, 1], spread: 0},
  hold: {curl: [0.55, 0.72, 0.74, 0.76, 0.78], spread: 0}, // fingers wrapped round a handle across the palm
} satisfies Record<string, FingerPose>;
export const lerpFingers = (a: FingerPose, b: FingerPose, k: number): FingerPose => ({
  curl: a.curl.map((c, i) => lerp(c, b.curl[i], k)) as FingerPose['curl'],
  spread: lerp(a.spread, b.spread, k),
});

/** Hand aim: direction and weight (0 = follow the forearm, 1 = point along dir). */
export type Aim = {dir: V3; k: number};

export type Pose = {
  root: V3; // pelvis centre
  yaw: number; // heading, rad (0 = +x)
  lean: number; // torso pitch forward, rad
  twist: number; // shoulders turn about z, rad
  footL: V3; // ankle joint, world
  footR: V3;
  pitchL: number; // foot pitch, rad (+ toe up)
  pitchR: number;
  handL: V3; // wrist, world
  handR: V3;
  fingersL: FingerPose;
  fingersR: FingerPose;
  headYaw: number; // relative to the body, rad
  headPitch: number;
  squash: number; // 1 = none; < 1 squashes the torso a little on impact
  aimL?: Aim; // optional: point the hand along a direction (pressing, pointing)
  aimR?: Aim;
};

export type Skel = {
  pose: Pose;
  f: V3; // forward
  l: V3; // left
  axis: V3; // torso axis
  pelvis: V3;
  hip: Record<Side, V3>;
  knee: Record<Side, V3>;
  ankle: Record<Side, V3>;
  shoulder: Record<Side, V3>;
  elbow: Record<Side, V3>;
  wrist: Record<Side, V3>;
  chest: V3; // shoulder centre
  neck: V3;
  head: V3; // head centre
  headUp: V3;
  headFwd: V3;
  reached: Record<'legL' | 'legR' | 'armL' | 'armR', boolean>;
  hand: Record<Side, HandSkel>;
};

export type HandSkel = {
  wrist: V3;
  fwd: V3; // wrist → knuckles
  n: V3; // palm normal (the side the palm faces)
  side: V3; // across the palm (towards the thumb side is -side for L, +side for R, see thumbDir)
  knuckle: V3[]; // thumb base, index … pinky bases
  chain: V3[][]; // per finger: base, joint1, joint2, tip
  radii: number[]; // per finger: base radius
};

export const bodyFrame = (yaw: number) => {
  const f: V3 = [Math.cos(yaw), Math.sin(yaw), 0];
  return {f, l: [-f[1], f[0], 0] as V3};
};

/** Two-bone IK: the middle joint for a limb from `a` to `target` with bone lengths l1, l2 and a bend direction hint. */
export const ik = (a: V3, target: V3, l1: number, l2: number, pole: V3) => {
  let d = sub(target, a);
  let D = len(d);
  const max = l1 + l2 - 1e-4;
  const min = Math.abs(l1 - l2) + 1e-4;
  let reached = true;
  if (D > max || D < min) {
    reached = false;
    D = Math.min(max, Math.max(min, D));
  }
  const dir = unit(d);
  d = mul(dir, D);
  let p = sub(pole, mul(dir, dot(pole, dir)));
  if (len(p) < 1e-6) p = sub([1, 0, 0], mul(dir, dir[0]));
  p = unit(p);
  const x = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return {mid: add(add(a, mul(dir, x)), mul(p, h)), end: add(a, d), reached};
};

const fingerGeometry = (side: Side, w: V3, fwd: V3, n: V3, lat: V3, fp: FingerPose) => {
  // lat = cross(fwd, n): towards the left with the palm down. The thumb is on the inner side: -lat for the left hand.
  const s = side === 'L' ? 1 : -1;
  const sc = DIM.palm / 6.5;
  const at = (along: number, across: number) => add(add(w, mul(fwd, along * sc)), mul(lat, across * sc * s));
  const base: V3[] = [at(1.8, -3.1), at(6.5, -2.4), at(6.7, -0.8), at(6.5, 0.8), at(6.1, 2.4)];
  const lens = [
    [3, 2.4, 2],
    [3.2, 2.2, 1.8],
    [3.5, 2.5, 1.9],
    [3.2, 2.3, 1.8],
    [2.6, 1.8, 1.6],
  ].map((l) => l.map((x) => x * sc));
  const flex = [
    [0.7, 1.0, 0.9],
    [1.55, 1.75, 1.1],
    [1.55, 1.75, 1.1],
    [1.55, 1.75, 1.1],
    [1.55, 1.75, 1.1],
  ];
  const chain: V3[][] = base.map((b0, i) => {
    // thumb leaves outwards and slightly towards the palm; the others fan by `spread`
    const out: V3 = i === 0 ? unit(add(add(mul(fwd, 0.7), mul(lat, -0.75 * s)), mul(n, 0.15))) : fwd;
    const fan = i === 0 ? 0 : (i - 2.5) * 0.35 * fp.spread;
    const d0 = unit(add(mul(out, Math.cos(fan)), mul(lat, Math.sin(fan) * s)));
    const n0 = unit(sub(n, mul(d0, dot(n, d0)))); // bend plane: the finger's direction and the palm normal
    let p = b0;
    let theta = 0; // joint angles accumulate, so a fist folds the tips back under the palm
    const pts: V3[] = [p];
    for (let j = 0; j < 3; j++) {
      theta += fp.curl[i] * flex[i][j];
      const dir = add(mul(d0, Math.cos(theta)), mul(n0, Math.sin(theta)));
      p = add(p, mul(dir, lens[i][j]));
      pts.push(p);
    }
    return pts;
  });
  return {
    base,
    chain,
    radii: [1.05, 0.95, 0.98, 0.95, 0.85].map((r) => r * sc),
  };
};

/** Hand frame from the forearm direction: the palm faces down (or inwards when the arm points down). */
const handOf = (side: Side, wrist: V3, elbow: V3, fp: FingerPose, f: V3, aim?: Aim): HandSkel => {
  const arm = unit(sub(wrist, elbow));
  const fwd = aim ? unit(lerp3(arm, unit(aim.dir), aim.k)) : arm; // the wrist bends to point the hand at a target
  // palm normal: down when the hand is level, towards the body's side (the thigh) when the arm hangs; blended
  // smoothly between the two so the palm never flips to face forward
  const down = sub([0, 0, -1], mul(fwd, dot([0, 0, -1], fwd)));
  const inward = side === 'L' ? mul(cross(Z, f), -1) : cross(Z, f);
  const level = Math.min(1, Math.max(0, (len(down) - 0.55) / 0.35));
  let n = add(mul(unit(down), level), mul(inward, 1 - level));
  n = unit(sub(n, mul(fwd, dot(n, fwd))));
  const lat = unit(cross(fwd, n));
  const g = fingerGeometry(side, wrist, fwd, n, lat, fp);
  return {
    wrist,
    fwd,
    n,
    side: lat,
    knuckle: g.base,
    chain: g.chain,
    radii: g.radii,
  };
};

/** Resolve a pose into joint positions (legs and arms by IK). */
export const solve = (pose: Pose): Skel => {
  const {f, l} = bodyFrame(pose.yaw);
  const axis = unit(add(mul(f, Math.sin(pose.lean)), mul(Z, Math.cos(pose.lean))));
  const pelvis = pose.root;
  const hip = {
    L: add(pelvis, mul(l, DIM.hip)),
    R: add(pelvis, mul(l, -DIM.hip)),
  };
  const knee = {} as Record<Side, V3>;
  const ankle = {} as Record<Side, V3>;
  const reached = {} as Skel['reached'];
  for (const s of ['L', 'R'] as Side[]) {
    const r = ik(hip[s], s === 'L' ? pose.footL : pose.footR, DIM.thigh, DIM.shin, add(f, mul(Z, 0.2)));
    knee[s] = r.mid;
    ankle[s] = r.end;
    reached[s === 'L' ? 'legL' : 'legR'] = r.reached;
  }
  const chest = add(pelvis, mul(axis, DIM.torso * pose.squash));
  const sl = unit(add(mul(l, Math.cos(pose.twist)), mul(f, Math.sin(pose.twist))));
  const shoulder = {
    L: add(chest, mul(sl, DIM.shoulder)),
    R: add(chest, mul(sl, -DIM.shoulder)),
  };
  const elbow = {} as Record<Side, V3>;
  const wrist = {} as Record<Side, V3>;
  const hand = {} as Record<Side, HandSkel>;
  for (const s of ['L', 'R'] as Side[]) {
    const out = mul(sl, s === 'L' ? 1 : -1);
    const r = ik(shoulder[s], s === 'L' ? pose.handL : pose.handR, DIM.upper, DIM.fore, add(add(mul(Z, -1), mul(f, -0.5)), mul(out, 0.5)));
    elbow[s] = r.mid;
    wrist[s] = r.end;
    reached[s === 'L' ? 'armL' : 'armR'] = r.reached;
    hand[s] = handOf(s, r.end, r.mid, s === 'L' ? pose.fingersL : pose.fingersR, f, s === 'L' ? pose.aimL : pose.aimR);
  }
  const neck = add(chest, mul(axis, DIM.neck));
  const hy = pose.yaw + pose.headYaw;
  const headFwd = unit([Math.cos(hy) * Math.cos(pose.headPitch), Math.sin(hy) * Math.cos(pose.headPitch), -Math.sin(pose.headPitch)]);
  const headUp = unit(add(mul(Z, Math.cos(pose.headPitch)), mul([Math.cos(hy), Math.sin(hy), 0], Math.sin(pose.headPitch))));
  const head = add(neck, mul(headUp, DIM.head + 1.4));
  return {
    pose,
    f,
    l,
    axis,
    pelvis,
    hip,
    knee,
    ankle,
    shoulder,
    elbow,
    wrist,
    chest,
    neck,
    head,
    headUp,
    headFwd,
    reached,
    hand,
  };
};

// ───────────────────────────── poses ─────────────────────────────

const smooth = (w: number) => w * w * (3 - 2 * w);

export type WalkOpts = {
  start?: V3;
  yaw?: number;
  speed?: number;
  stride?: number;
  lift?: number;
  swing?: number;
};

/** Where the root is and the gait phase at time t (the distance walked is speed·t). */
export const walkDistance = (t: number, speed = 40) => Math.max(0, t) * speed;

/** Walking: the stance foot is fixed in the world (no sliding), the swing foot arcs; arms swing against the legs.
 *  Foot x(D) repeats every 2·stride of root distance; stance = 60 % of the cycle. */
export const walk = (t: number, o: WalkOpts = {}): Pose => {
  const speed = o.speed ?? 40; // units/s
  const S = o.stride ?? 9;
  const lift = o.lift ?? 3.4;
  const yaw = o.yaw ?? 0;
  const start = o.start ?? [0, 0, 0];
  const {f, l} = bodyFrame(yaw);
  const D = walkDistance(t, speed);
  const foot = (side: Side) => {
    const off = side === 'L' ? 0 : 1;
    const q = (D / S - off) / 2;
    const n = Math.floor(q);
    const u = q - n;
    const plant = (m: number) => (2 * m + off) * S + 0.6 * S; // distance along the path where the foot stands
    let dist = plant(n);
    let h = 0;
    let pitch = lerp(0.3, -0.45, Math.min(1, u / 0.6));
    if (u >= 0.6) {
      const w = (u - 0.6) / 0.4;
      dist = plant(n) + 2 * S * smooth(w);
      h = lift * Math.sin(Math.PI * w);
      pitch = lerp(-0.45, 0.3, smooth(w)) + 0.25 * Math.sin(Math.PI * w);
    }
    const lat = (side === 'L' ? 1 : -1) * DIM.hip;
    const p = add(add(add(start, mul(f, dist)), mul(l, lat)), [0, 0, DIM.ankle + h]);
    return {p, pitch, rel: (dist - D) / (0.6 * S)};
  };
  const fl = foot('L');
  const fr = foot('R');
  const bob = 0.7 * Math.cos((2 * Math.PI * D) / S);
  const root = add(add(start, mul(f, D)), [0, 0, DIM.rootZ - 0.9 - bob * 0.5]);
  const lean = 0.07;
  const sh = (side: Side) => add(add(root, mul(unit(add(mul(f, Math.sin(lean)), mul(Z, Math.cos(lean)))), DIM.torso)), mul(l, DIM.shoulder * (side === 'L' ? 1 : -1)));
  const hand = (side: Side, opp: number) => add(add(sh(side), [0, 0, -ARM * 0.9]), mul(f, -opp * 6.5 + 0.8));
  return {
    root,
    yaw,
    lean,
    twist: 0.12 * -fl.rel,
    footL: fl.p,
    footR: fr.p,
    pitchL: fl.pitch,
    pitchR: fr.pitch,
    handL: hand('L', fl.rel),
    handR: hand('R', fr.rel),
    fingersL: HAND_POSES.relaxed,
    fingersR: HAND_POSES.relaxed,
    headYaw: 0,
    headPitch: 0.04,
    squash: 1,
  };
};

/** Standing at a point (feet planted at the given gait end). */
export const stand = (at: V3, yaw = 0): Pose => {
  const {l} = bodyFrame(yaw);
  const root = add(at, [0, 0, DIM.rootZ - 0.9]);
  const sh = (side: Side) => add(add(root, mul(Z, DIM.torso)), mul(l, DIM.shoulder * (side === 'L' ? 1 : -1)));
  return {
    root,
    yaw,
    lean: 0.03,
    twist: 0,
    footL: add(add(at, mul(l, DIM.hip)), [0, 0, DIM.ankle]),
    footR: add(add(at, mul(l, -DIM.hip)), [0, 0, DIM.ankle]),
    pitchL: 0,
    pitchR: 0,
    // hands hang beside the thighs (outside the trouser line), not in front of the crotch
    handL: add(add(sh('L'), [0, 0, -ARM * 0.96]), mul(l, 3)),
    handR: add(add(sh('R'), [0, 0, -ARM * 0.96]), mul(l, -3)),
    fingersL: HAND_POSES.relaxed,
    fingersR: HAND_POSES.relaxed,
    headYaw: 0,
    headPitch: 0.02,
    squash: 1,
  };
};

/** Sitting on a seat whose top is at `seat` (the point under the pelvis): feet planted ahead, hands on the thighs. */
export const sit = (seat: V3, yaw = 0, floorZ = 0): Pose => {
  const {f, l} = bodyFrame(yaw);
  const root = add(seat, [0, 0, 2.4]);
  const foot = (s: number): V3 => {
    const p = add(add(seat, mul(f, 19)), mul(l, s * DIM.hip * 1.1));
    return [p[0], p[1], floorZ + DIM.ankle];
  };
  const thigh = (s: number) => add(add(add(root, mul(f, 9)), mul(l, s * (DIM.hip + 1))), [0, 0, 3.2]); // on the thigh, within arm's reach
  return {
    root,
    yaw,
    lean: 0.1,
    twist: 0,
    footL: foot(1),
    footR: foot(-1),
    pitchL: 0,
    pitchR: 0,
    handL: thigh(1),
    handR: thigh(-1),
    fingersL: HAND_POSES.relaxed,
    fingersR: HAND_POSES.relaxed,
    headYaw: 0,
    headPitch: 0.05,
    squash: 1,
  };
};

/** Reach / press: the chosen hand goes to `target` (wrist) with share k; the body leans and turns toward it. */
export const reach = (base: Pose, side: Side, target: V3, k = 1, fingers: FingerPose = HAND_POSES.press, aim?: V3): Pose => {
  const f = bodyFrame(base.yaw).f;
  const toward = unit(sub(target, base.root));
  const lean = lerp(base.lean, Math.min(0.5, Math.max(0, dot([toward[0], toward[1], 0], f) * 0.55)), k);
  const hand =
    side === 'L'
      ? {
          handL: lerp3(base.handL, target, k),
          fingersL: lerpFingers(base.fingersL, fingers, k),
          aimL: aim ? {dir: aim, k} : base.aimL,
        }
      : {
          handR: lerp3(base.handR, target, k),
          fingersR: lerpFingers(base.fingersR, fingers, k),
          aimR: aim ? {dir: aim, k} : base.aimR,
        };
  return {
    ...base,
    ...hand,
    lean,
    twist: lerp(base.twist, (side === 'L' ? 1 : -1) * 0.25, k),
    headPitch: lerp(base.headPitch, 0.18, k),
  };
};

/** Holding a tool in front: the elbow at the side, the forearm forward at waist height, the fist closed round the
 *  tool's handle (which then runs across the screen and reads as the role's prop). */
export const holdInFront = (base: Pose, side: Side = 'R', k = 1): Pose => {
  const {f, l} = bodyFrame(base.yaw);
  const sh = solve(base).shoulder[side];
  const target = add(add(add(sh, [0, 0, -DIM.upper + 0.5]), mul(f, DIM.fore - 0.5)), mul(l, (side === 'L' ? -1 : 1) * 1.5));
  // holding is not reaching: the body stays upright and the head level
  return {...reach(base, side, target, k, HAND_POSES.hold, f), lean: base.lean, twist: base.twist, headPitch: base.headPitch};
};

/** Blend two poses (joint targets are lerped; IK keeps the bones rigid). */
export const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  root: lerp3(a.root, b.root, k),
  yaw: lerp(a.yaw, b.yaw, k),
  lean: lerp(a.lean, b.lean, k),
  twist: lerp(a.twist, b.twist, k),
  footL: lerp3(a.footL, b.footL, k),
  footR: lerp3(a.footR, b.footR, k),
  pitchL: lerp(a.pitchL, b.pitchL, k),
  pitchR: lerp(a.pitchR, b.pitchR, k),
  handL: lerp3(a.handL, b.handL, k),
  handR: lerp3(a.handR, b.handR, k),
  fingersL: lerpFingers(a.fingersL, b.fingersL, k),
  fingersR: lerpFingers(a.fingersR, b.fingersR, k),
  headYaw: lerp(a.headYaw, b.headYaw, k),
  headPitch: lerp(a.headPitch, b.headPitch, k),
  squash: lerp(a.squash, b.squash, k),
});
