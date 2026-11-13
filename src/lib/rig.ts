// Character rig v2 (MASTER_PROMPT_FINAL §22): skeleton with a two-link spine and clavicles, two-bone IK with joint
// limits, gait on any path and ground (heel–flat–toe roll, no foot sliding at any speed), start/stop with follow-
// through, sit, reach with anticipation and counterbalance, hold, finger poses; arms kept out of the body.
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
  waist: 2.9, // pelvis → top of the belt, where the spine bends
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
  rest: {curl: [0.12, 0.06, 0.07, 0.08, 0.1], spread: 0.1}, // lying on a surface (a thigh, a table): fingers along it
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
  lean: number; // spine pitch forward, rad (the chest takes all of it, the pelvis a third)
  twist: number; // shoulders turn about z, rad
  pelvisYaw?: number; // hips turn about z, rad (against the shoulders when walking)
  footL: V3; // ankle joint, world
  footR: V3;
  pitchL: number; // foot pitch, rad (+ toe up: rolls on the heel; − toe down: rolls on the ball)
  pitchR: number;
  footYawL?: number; // foot heading (defaults to yaw)
  footYawR?: number;
  toeL?: number; // toe bend at the ball, rad (keeps the toe flat while the heel lifts)
  toeR?: number;
  handL: V3; // wrist, world
  handR: V3;
  fingersL: FingerPose;
  fingersR: FingerPose;
  headYaw: number; // relative to the body, rad
  headPitch: number;
  squash: number; // 1 = none; < 1 squashes the spine a little on impact
  aimL?: Aim; // optional: point the hand along a direction (pressing, pointing)
  aimR?: Aim;
};

export type Skel = {
  pose: Pose;
  f: V3; // forward
  l: V3; // left
  axis: V3; // chest axis (= axisUp)
  axisLow: V3; // pelvis axis
  waist: V3; // top of the belt: where the spine bends
  pelvis: V3;
  hip: Record<Side, V3>;
  knee: Record<Side, V3>;
  ankle: Record<Side, V3>;
  foot: Record<Side, {yaw: number; pitch: number; toe: number}>;
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
  side: V3; // across the palm
  knuckle: V3[]; // thumb base, index … pinky bases
  chain: V3[][]; // per finger: base, joint1, joint2, tip
  radii: number[]; // per finger: base radius
};

// ───────────────────────────── limits ─────────────────────────────

/** Joint limits (rad). solve() clamps to them; scripts/rig-check.mjs verifies them on every sampled frame. */
export const LIMITS = {
  lean: [-0.35, 0.75],
  twist: [-0.6, 0.6],
  pelvisYaw: [-0.35, 0.35],
  headYaw: [-1.2, 1.2],
  headPitch: [-0.6, 0.7],
  footPitch: [-0.75, 0.55],
  toe: [0, 0.8],
  wrist: 1.1, // max angle between the forearm and the hand
  kneeMin: (30 * Math.PI) / 180, // smallest interior knee angle (deepest bend)
  elbowMin: (25 * Math.PI) / 180,
} as const;
const clamp = (x: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const bodyFrame = (yaw: number) => {
  const f: V3 = [Math.cos(yaw), Math.sin(yaw), 0];
  return {f, l: [-f[1], f[0], 0] as V3};
};

/** Two-bone IK: the middle joint for a limb from `a` to `target` with bone lengths l1, l2 and a bend direction hint.
 *  `minAngle` is the smallest interior angle at the middle joint (the deepest bend the joint allows). */
export const ik = (a: V3, target: V3, l1: number, l2: number, pole: V3, minAngle = 0) => {
  let d = sub(target, a);
  let D = len(d);
  const max = l1 + l2 - 1e-4;
  const min = Math.max(Math.abs(l1 - l2) + 1e-4, Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(minAngle)));
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

/** Interior angle at b of the chain a–b–c. */
export const jointAngle = (a: V3, b: V3, c: V3) => Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(a, b)), unit(sub(c, b))))));

// ───────────────────────────── feet ─────────────────────────────

/** Sole points relative to the ankle along the foot: heel 3 behind, ball 6 ahead, toe tip 9.2 ahead, sole 4 below. */
export const FOOT = {heel: 3, ball: 6, tip: 9.2} as const;
const horiz = (yaw: number): V3 => [Math.cos(yaw), Math.sin(yaw), 0];
const rotUp = (h: V3, a: number, b: number, p: number): V3 => add(mul(h, a * Math.cos(p) - b * Math.sin(p)), mul(Z, a * Math.sin(p) + b * Math.cos(p)));

/** Ankle position for a foot whose flat sole would stand on ground point `g` (under the ankle), rolled by `pitch`:
 *  toe up rolls on the heel, toe down rolls on the ball, so the point touching the ground never moves. */
export const ankleFor = (g: V3, yaw: number, pitch: number): V3 => {
  const h = horiz(yaw);
  const pivot = pitch >= 0 ? add(g, mul(h, -FOOT.heel)) : add(g, mul(h, FOOT.ball));
  const r = sub(add(g, [0, 0, DIM.ankle]), pivot);
  return add(pivot, rotUp(h, dot(r, h), r[2], pitch));
};

/** World points of the sole: heel, ball, toe tip (the toe segment bends at the ball by `toe`). */
export const solePoints = (ankle: V3, yaw: number, pitch: number, toe = 0) => {
  const h = horiz(yaw);
  const heel = add(ankle, rotUp(h, -FOOT.heel, -DIM.ankle, pitch));
  const ball = add(ankle, rotUp(h, FOOT.ball, -DIM.ankle, pitch));
  const tip = add(ball, rotUp(h, FOOT.tip - FOOT.ball, 0, pitch + toe));
  return {heel, ball, tip};
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

// ───────────────────────────── hands ─────────────────────────────

/** Hand frame from the forearm direction: the palm faces down (or inwards when the arm points down). */
const handOf = (side: Side, wrist: V3, elbow: V3, fp: FingerPose, f: V3, aim?: Aim): HandSkel => {
  const arm = unit(sub(wrist, elbow));
  let fwd = arm;
  if (aim && aim.k > 0) {
    // the wrist bends to point the hand at a target, within the wrist limit
    const want = unit(lerp3(arm, unit(aim.dir), clamp01(aim.k)));
    const ang = Math.acos(Math.max(-1, Math.min(1, dot(arm, want))));
    fwd = ang <= LIMITS.wrist ? want : unit(lerp3(arm, want, LIMITS.wrist / ang));
  }
  const down = sub([0, 0, -1], mul(fwd, dot([0, 0, -1], fwd)));
  const inward = side === 'L' ? mul(cross(Z, f), -1) : cross(Z, f);
  const level = clamp01((len(down) - 0.55) / 0.35);
  let n = add(mul(unit(down), level), mul(inward, 1 - level));
  n = unit(sub(n, mul(fwd, dot(n, fwd))));
  const lat = unit(cross(fwd, n));
  const fpc: FingerPose = {curl: fp.curl.map((c) => clamp01(c)) as FingerPose['curl'], spread: clamp01(fp.spread)};
  const g = fingerGeometry(side, wrist, fwd, n, lat, fpc);
  return {wrist, fwd, n, side: lat, knuckle: g.base, chain: g.chain, radii: g.radii};
};

// ───────────────────────────── body volumes (collisions) ─────────────────────────────

/** Capsules of the body the arms must stay out of (radius = the drawn surface). */
export const BODY_R = {torso: 7.0, thigh: 3.7, head: DIM.head, hand: 1.4, fore: 2.2, upper: 2.6} as const; // hand: half its thickness

/** Distance from p to the segment a–b, and the nearest point on it. */
export const segDist = (p: V3, a: V3, b: V3) => {
  const ab = sub(b, a);
  const t = clamp01(dot(sub(p, a), ab) / (dot(ab, ab) || 1));
  const q = add(a, mul(ab, t));
  return {d: len(sub(p, q)), q, t};
};
/** Distance between two segments (sampled; enough for checks and pushes). */
export const segSegDist = (a: V3, b: V3, c: V3, d: V3) => {
  let best = Infinity;
  for (let i = 0; i <= 12; i++) best = Math.min(best, segDist(lerp3(a, b, i / 12), c, d).d);
  return best;
};

const pushOut = (p: V3, caps: {a: V3; b: V3; r: number}[]) => {
  let q = p;
  for (let k = 0; k < 3; k++)
    for (const c of caps) {
      const {d, q: near} = segDist(q, c.a, c.b);
      if (d < c.r) q = add(near, mul(d > 1e-6 ? unit(sub(q, near)) : [0, 0, 1], c.r));
    }
  return q;
};

// ───────────────────────────── solve ─────────────────────────────

const rotZ = (v: V3, a: number): V3 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];

/** Resolve a pose into joint positions: limits, spine, clavicles, legs and arms by IK, arms kept out of the body. */
export const solve = (pose: Pose): Skel => {
  const {f, l} = bodyFrame(pose.yaw);
  const lean = clamp(pose.lean, LIMITS.lean);
  const twist = clamp(pose.twist, LIMITS.twist);
  const pelvisYaw = clamp(pose.pelvisYaw ?? 0, LIMITS.pelvisYaw);
  const axisLow = unit(add(mul(f, Math.sin(lean * 0.35)), mul(Z, Math.cos(lean * 0.35))));
  const axis = unit(add(mul(f, Math.sin(lean)), mul(Z, Math.cos(lean))));
  const pelvis = pose.root;
  const lp = rotZ(l, pelvisYaw);
  const hip = {L: add(pelvis, mul(lp, DIM.hip)), R: add(pelvis, mul(lp, -DIM.hip))};
  const knee = {} as Record<Side, V3>;
  const ankle = {} as Record<Side, V3>;
  const foot = {} as Skel['foot'];
  const reached = {} as Skel['reached'];
  for (const s of ['L', 'R'] as Side[]) {
    const fy = (s === 'L' ? pose.footYawL : pose.footYawR) ?? pose.yaw;
    const pole = add(horiz((fy + pose.yaw) / 2), mul(Z, 0.2)); // the knee points where the foot and the body point
    const r = ik(hip[s], s === 'L' ? pose.footL : pose.footR, DIM.thigh, DIM.shin, pole, LIMITS.kneeMin);
    knee[s] = r.mid;
    ankle[s] = r.end;
    reached[s === 'L' ? 'legL' : 'legR'] = r.reached;
    foot[s] = {yaw: fy, pitch: clamp(s === 'L' ? pose.pitchL : pose.pitchR, LIMITS.footPitch), toe: clamp((s === 'L' ? pose.toeL : pose.toeR) ?? 0, LIMITS.toe)};
  }
  const waist = add(pelvis, mul(axisLow, DIM.waist));
  const chest = add(waist, mul(axis, (DIM.torso - DIM.waist) * pose.squash));
  const sl = unit(add(mul(l, Math.cos(twist)), mul(f, Math.sin(twist))));
  const caps = [
    {a: pelvis, b: chest, r: BODY_R.torso + BODY_R.hand + 0.2},
    {a: hip.L, b: knee.L, r: BODY_R.thigh + BODY_R.hand + 0.2},
    {a: hip.R, b: knee.R, r: BODY_R.thigh + BODY_R.hand + 0.2},
  ];
  const shoulder = {} as Record<Side, V3>;
  const elbow = {} as Record<Side, V3>;
  const wrist = {} as Record<Side, V3>;
  const hand = {} as Record<Side, HandSkel>;
  for (const s of ['L', 'R'] as Side[]) {
    const out = mul(sl, s === 'L' ? 1 : -1);
    const base = add(chest, mul(out, DIM.shoulder));
    // the hand never goes inside the torso or a thigh: its target is pushed to the surface (a hand on the knee rests on it)
    const target = pushOut(s === 'L' ? pose.handL : pose.handR, caps);
    // clavicle: the shoulder rises for a hand above it and comes forward for a long reach
    const v = sub(target, base);
    const raise = clamp01((target[2] - base[2]) / ARM) * 1.6;
    const reachOver = clamp01((len(v) - ARM * 0.85) / (ARM * 0.3)) * 2;
    const flat = unit([v[0], v[1], 0]);
    shoulder[s] = add(add(base, [0, 0, raise]), mul(flat, reachOver));
    const arm = (goal: V3) => {
      let pole = add(add(mul(Z, -1), mul(f, -0.5)), mul(out, 0.5));
      let r = ik(shoulder[s], goal, DIM.upper, DIM.fore, pole, LIMITS.elbowMin);
      // keep the elbow out of the torso: swing it outwards until it clears
      for (let k = 0; k < 4 && segDist(r.mid, pelvis, chest).d < BODY_R.torso + BODY_R.upper; k++) {
        pole = add(pole, mul(out, 1.2));
        r = ik(shoulder[s], goal, DIM.upper, DIM.fore, pole, LIMITS.elbowMin);
      }
      return r;
    };
    let r = arm(target);
    // the hand itself (not only the wrist) stays out of the body: move the goal by what the hand centre needs
    const aimS = s === 'L' ? pose.aimL : pose.aimR;
    for (let k = 0; k < 4; k++) {
      const h0 = handOf(s, r.end, r.mid, s === 'L' ? pose.fingersL : pose.fingersR, f, aimS);
      const centre = add(r.end, mul(h0.fwd, 3.5));
      let delta = sub(pushOut(centre, caps), centre);
      // fingers resting on a surface lie on it, not in it: lift the hand by what the deepest finger joint needs
      // (only against the part the hand rests on: the nearest one to the hand's centre)
      const near = caps.reduce((a, c) => (segDist(centre, c.a, c.b).d - c.r < segDist(centre, a.a, a.b).d - a.r ? c : a));
      const fingerCaps = [{...near, r: near.r - BODY_R.hand + 1}];
      for (const chain of h0.chain)
        for (const p of chain.slice(1)) {
          const d = sub(pushOut(p, fingerCaps), p);
          if (len(d) > len(delta)) delta = d;
        }
      // the forearm too: push the hand out by what the forearm's nearest point to the torso needs
      let best = {d: Infinity, p: r.mid as V3, q: r.mid as V3};
      for (let i = 0; i <= 8; i++) {
        const p = lerp3(r.mid, r.end, i / 8);
        const n = segDist(p, pelvis, chest);
        if (n.d < best.d) best = {d: n.d, p, q: n.q};
      }
      const need = BODY_R.torso + BODY_R.fore + 0.2 - best.d;
      if (need > 0) delta = add(delta, mul(unit(sub(best.p, best.q)), need));
      if (len(delta) < 1e-6) break;
      // a push never stretches the arm: past its length the hand swings out on the arm's sphere instead
      let goal = add(r.end, delta);
      const v = sub(goal, shoulder[s]);
      if (len(v) > ARM * 0.995) goal = add(shoulder[s], mul(unit(v), ARM * 0.995));
      r = arm(goal);
    }
    elbow[s] = r.mid;
    wrist[s] = r.end;
    reached[s === 'L' ? 'armL' : 'armR'] = r.reached;
    hand[s] = handOf(s, r.end, r.mid, s === 'L' ? pose.fingersL : pose.fingersR, f, s === 'L' ? pose.aimL : pose.aimR);
  }
  const neck = add(chest, mul(axis, DIM.neck));
  const hy = pose.yaw + clamp(pose.headYaw, LIMITS.headYaw);
  const hp = clamp(pose.headPitch, LIMITS.headPitch);
  const headFwd = unit([Math.cos(hy) * Math.cos(hp), Math.sin(hy) * Math.cos(hp), -Math.sin(hp)]);
  const headUp = unit(add(mul(Z, Math.cos(hp)), mul([Math.cos(hy), Math.sin(hy), 0], Math.sin(hp))));
  const head = add(neck, mul(headUp, DIM.head + 1.4));
  return {pose, f, l, axis, axisLow, waist, pelvis, hip, knee, ankle, foot, shoulder, elbow, wrist, chest, neck, head, headUp, headFwd, reached, hand};
};

// ───────────────────────────── paths and gait ─────────────────────────────

const smooth = (w: number) => w * w * (3 - 2 * w);
const lerpAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

/** A walking path: ground point and heading at arc length d. */
export type Path = (d: number) => {p: V3; yaw: number};
export const linePath =
  (start: V3 = [0, 0, 0], yaw = 0): Path =>
  (d) => ({p: add(start, mul(horiz(yaw), d)), yaw});
/** A circular arc: `dir` +1 turns left (counter-clockwise), −1 right. */
export const arcPath =
  (center: V3, radius: number, a0: number, dir: 1 | -1 = 1): Path =>
  (d) => {
    const a = a0 + (dir * d) / radius;
    return {p: add(center, [radius * Math.cos(a), radius * Math.sin(a), 0]), yaw: a + (dir * Math.PI) / 2};
  };
/** Straight, then an arc: for a walk that turns a corner. */
export const cornerPath =
  (start: V3, yaw: number, straight: number, radius: number, dir: 1 | -1 = 1): Path =>
  (d) => {
    if (d <= straight) return linePath(start, yaw)(d);
    const end = add(start, mul(horiz(yaw), straight));
    const center = add(end, mul(horiz(yaw + (dir * Math.PI) / 2), radius));
    return arcPath(center, radius, yaw - (dir * Math.PI) / 2, dir)(d - straight);
  };

export type Ground = (x: number, y: number) => number;
export const flatGround: Ground = () => 0;
/** Stairs along a direction: `rise` per step every `run` units, starting at `from` (distance along dir from origin). */
export const stairs =
  (origin: V3, yaw: number, from: number, run: number, rise: number, steps: number): Ground =>
  (x, y) => {
    const d = (x - origin[0]) * Math.cos(yaw) + (y - origin[1]) * Math.sin(yaw) - from;
    return d < 0 ? 0 : Math.min(steps, Math.floor(d / run) + 1) * rise;
  };

export type GaitOpts = {path?: Path; stride?: number; lift?: number; ground?: Ground};

/** The body at walked distance D along the path, at speed share v (0..1) and acceleration share a (−1..1).
 *  Feet are functions of D alone: the stance foot's ground contact (heel, flat sole, then ball) never moves,
 *  whatever the speed profile. Stance is 60 % of a cycle of 2·stride. */
export const gaitAt = (D: number, v = 1, a = 0, o: GaitOpts = {}): Pose => {
  const S = o.stride ?? 9;
  const path = o.path ?? linePath();
  const ground = o.ground ?? flatGround;
  const k = 0.4 + 0.6 * clamp01(v); // heel strike and toe-off get softer when slow
  const gp = (d: number, lat: number) => {
    const {p, yaw} = path(d);
    const q = add(p, mul(horiz(yaw + Math.PI / 2), lat));
    // the sole stands on the highest ground under it (on stairs the heel may overhang a lower tread)
    const h = horiz(yaw);
    const z = Math.max(...[-FOOT.heel, 0, FOOT.ball, FOOT.tip].map((x) => ground(q[0] + h[0] * x, q[1] + h[1] * x)));
    return {g: [q[0], q[1], z] as V3, yaw};
  };
  const foot = (side: Side) => {
    const off = side === 'L' ? 0 : 1;
    const lat = (side === 'L' ? 1 : -1) * DIM.hip;
    const q = (D / S - off) / 2;
    const n = Math.floor(q);
    const u = q - n;
    const plant = (m: number) => (2 * m + off) * S + 0.6 * S;
    const now = gp(plant(n), lat);
    if (u < 0.6) {
      const pitch = u < 0.12 ? 0.3 * k * (1 - smooth(u / 0.12)) : u < 0.45 ? 0 : -0.45 * k * smooth((u - 0.45) / 0.15);
      return {ankle: ankleFor(now.g, now.yaw, pitch), pitch, toe: pitch < 0 ? -pitch : 0, yaw: now.yaw, gz: now.g[2], d: plant(n), swing: 0};
    }
    const w = (u - 0.6) / 0.4;
    const next = gp(plant(n + 1), lat);
    const e = smooth(w);
    const from = ankleFor(now.g, now.yaw, -0.45 * k);
    const to = ankleFor(next.g, next.yaw, 0.3 * k);
    // the foot first rises above both treads, travels, then comes down: it clears a step up or down
    const top = Math.max(now.g[2], next.g[2]) + DIM.ankle + (o.lift ?? 3.4) * (0.5 + 0.5 * clamp01(v));
    const eh = smooth(clamp01((w - 0.08) / 0.8));
    const z = w < 0.5 ? lerp(from[2], top, smooth(w / 0.5)) : lerp(top, to[2], smooth((w - 0.5) / 0.5));
    const xy = lerp3(from, to, eh);
    const ankle: V3 = [xy[0], xy[1], z];
    const pitch = lerp(-0.45 * k, 0.3 * k, e) + 0.15 * Math.sin(Math.PI * w);
    return {ankle, pitch, toe: 0.45 * k * (1 - smooth(Math.min(1, w / 0.3))), yaw: lerpAngle(now.yaw, next.yaw, e), gz: lerp(now.g[2], next.g[2], e), d: lerp(plant(n), plant(n + 1), e), swing: w};
  };
  const fl = foot('L');
  const fr = foot('R');
  const here = path(D);
  const {f, l} = bodyFrame(here.yaw);
  const vv = clamp01(v);
  const relL = (fl.d - D) / (0.6 * S);
  const relR = (fr.d - D) / (0.6 * S);
  const bob = 0.6 * vv * Math.cos(2 * Math.PI * (D / S - 0.6)); // high at mid-stance, low at double support
  const sway = 0.9 * Math.min(1, vv * 3) * Math.cos(Math.PI * (D / S - 0.6)); // over the stance foot
  const gz = Math.min(fl.gz, fr.gz); // on stairs the pelvis follows the lower foot, so both legs reach
  const root = add(add(here.p, mul(l, sway)), [0, 0, gz + DIM.rootZ - 0.9 - 0.6 * vv + bob]);
  const lean = 0.04 + 0.05 * vv + 0.12 * a;
  const axisUp = unit(add(mul(f, Math.sin(lean)), mul(Z, Math.cos(lean))));
  const sh = (side: Side) => add(add(root, mul(axisUp, DIM.torso)), mul(l, DIM.shoulder * (side === 'L' ? 1 : -1)));
  const hand = (side: Side, rel: number) => add(add(add(sh(side), [0, 0, -ARM * 0.9]), mul(f, -rel * 6.5 * vv + 0.8)), mul(l, (side === 'L' ? 1 : -1) * 2.6));
  return {
    root,
    yaw: here.yaw,
    lean,
    twist: -0.12 * vv * relL,
    pelvisYaw: 0.1 * vv * relL,
    footL: fl.ankle,
    footR: fr.ankle,
    pitchL: fl.pitch,
    pitchR: fr.pitch,
    footYawL: fl.yaw,
    footYawR: fr.yaw,
    toeL: fl.toe,
    toeR: fr.toe,
    handL: hand('L', relL),
    handR: hand('R', relR),
    fingersL: HAND_POSES.relaxed,
    fingersR: HAND_POSES.relaxed,
    headYaw: 0,
    headPitch: 0.04 - 0.4 * (lean - 0.04), // the head stays nearly level when the chest leans
    squash: 1 - 0.012 * vv * (1 - bob / (0.6 * vv || 1)) * 0.5,
  };
};

export type WalkOpts = {start?: V3; yaw?: number; speed?: number; stride?: number; lift?: number; path?: Path; ground?: Ground};

/** Steady walking at `speed` (units/s) from t = 0. */
export const walk = (t: number, o: WalkOpts = {}): Pose =>
  gaitAt(Math.max(0, t) * (o.speed ?? 40), 1, 0, {path: o.path ?? linePath(o.start ?? [0, 0, 0], o.yaw ?? 0), stride: o.stride, lift: o.lift, ground: o.ground});

/** Damped oscillation starting at 0 (follow-through after a stop): exp(−decay·t)·sin(2π·freq·t). */
export const wobble = (t: number, freq = 1.6, decay = 4) => (t <= 0 ? 0 : Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t));

export type WalkToOpts = GaitOpts & {distance: number; speed?: number; accel?: number; t0?: number; settle?: number};

/** Plan of a walk that starts from rest, cruises and stops with both feet down (the stop distance is snapped to
 *  the nearest double support). */
export const walkPlan = (o: WalkToOpts) => {
  const S = o.stride ?? 9;
  const V = o.speed ?? 36;
  const n = Math.max(0, Math.round((o.distance / S - 1.1) / 2));
  const end = S * (2 * n + 1.1);
  const ta = Math.min(o.accel ?? 0.5, end / V);
  const T = end / V + ta; // smoothstep ramps: each covers V·ta/2
  return {end, ta, T, V, arrive: (o.t0 ?? 0) + T, settle: o.settle ?? 0.45};
};

/** Distance, speed share and acceleration share at time t of a planned walk. */
export const walkProfile = (t: number, o: WalkToOpts) => {
  const {end, ta, T, V} = walkPlan(o);
  const tau = t - (o.t0 ?? 0);
  if (tau <= 0) return {D: 0, v: 0, a: 0};
  if (tau >= T) return {D: end, v: 0, a: 0};
  if (tau < ta) {
    const u = tau / ta;
    return {D: V * ta * (u ** 3 - u ** 4 / 2), v: smooth(u), a: (6 * u * (1 - u)) / 1.5};
  }
  if (tau > T - ta) {
    const w = (T - tau) / ta;
    return {D: end - V * ta * (w ** 3 - w ** 4 / 2), v: smooth(w), a: -(6 * w * (1 - w)) / 1.5};
  }
  return {D: V * ta * 0.5 + V * (tau - ta), v: 1, a: 0};
};

/** A whole walk: start from rest, walk the path, stop in double support, settle (feet roll flat on their contact
 *  points, the pelvis comes over the feet, the head nods once: follow-through). */
export const walkTo = (t: number, o: WalkToOpts): Pose => {
  const {end, arrive, settle} = walkPlan(o);
  const {D, v, a} = walkProfile(t, o);
  const g = gaitAt(D, v, a, o);
  if (t <= arrive) return g;
  const e = smooth(clamp01((t - arrive) / settle));
  const last = gaitAt(end, 0, 0, o);
  const S = o.stride ?? 9;
  const path = o.path ?? linePath();
  const ground = o.ground ?? flatGround;
  // flat feet on the same ground points (each foot rolls back about its own contact point)
  const flat = (side: Side) => {
    const off = side === 'L' ? 0 : 1;
    const n = Math.floor((end / S - off) / 2);
    const d = (2 * n + off) * S + 0.6 * S;
    const {p, yaw} = path(d);
    const q = add(p, mul(horiz(yaw + Math.PI / 2), (side === 'L' ? 1 : -1) * DIM.hip));
    return {g: [q[0], q[1], ground(q[0], q[1])] as V3, yaw};
  };
  const L = flat('L');
  const R = flat('R');
  const pitchL = lerp(last.pitchL, 0, e);
  const pitchR = lerp(last.pitchR, 0, e);
  const mid = mul(add(L.g, R.g), 0.5);
  const yaw = path(end).yaw;
  const {f, l} = bodyFrame(yaw);
  const standRoot = add(mid, [0, 0, DIM.rootZ - 0.9]);
  const root = lerp3(last.root, standRoot, e);
  const nod = wobble(t - arrive, 1.4, 4.5);
  const sh = (side: Side) => add(add(root, mul(Z, DIM.torso)), mul(l, DIM.shoulder * (side === 'L' ? 1 : -1)));
  const hang = (side: Side) => add(add(add(sh(side), [0, 0, -ARM * 0.96]), mul(l, (side === 'L' ? 1 : -1) * 3)), mul(f, 2.2 * nod));
  return {
    ...last,
    root,
    lean: lerp(last.lean, 0.03, e) + 0.05 * nod,
    twist: lerp(last.twist, 0, e),
    pelvisYaw: lerp(last.pelvisYaw ?? 0, 0, e),
    footL: ankleFor(L.g, L.yaw, pitchL),
    footR: ankleFor(R.g, R.yaw, pitchR),
    pitchL,
    pitchR,
    toeL: pitchL < 0 ? -pitchL : 0,
    toeR: pitchR < 0 ? -pitchR : 0,
    footYawL: L.yaw,
    footYawR: R.yaw,
    handL: lerp3(last.handL, hang('L'), e),
    handR: lerp3(last.handR, hang('R'), e),
    headPitch: lerp(last.headPitch, 0.02, e) + 0.08 * nod,
  };
};

// ───────────────────────────── poses ─────────────────────────────

/** Standing at a point. */
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

/** Seat contact: the pelvis centre sits this far above the seat top. */
export const SEAT_CLEAR = 2.4;

/** Sitting on a seat whose top is at `seat` (the point under the pelvis): feet planted ahead, hands on the thighs. */
export const sit = (seat: V3, yaw = 0, floorZ = 0): Pose => {
  const {f, l} = bodyFrame(yaw);
  const root = add(seat, [0, 0, SEAT_CLEAR]);
  const foot = (s: number): V3 => {
    const p = add(add(seat, mul(f, 19)), mul(l, s * DIM.hip * 1.1));
    return [p[0], p[1], floorZ + DIM.ankle];
  };
  const thigh = (s: number) => add(add(add(root, mul(f, 9)), mul(l, s * (DIM.hip + 1))), [0, 0, 3.2]);
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
    fingersL: HAND_POSES.rest,
    fingersR: HAND_POSES.rest,
    headYaw: 0,
    headPitch: 0.05,
    squash: 1,
  };
};

/** Share of a reach at time t: a small pull back first (anticipation), then a critically damped approach
 *  (no overshoot into the target). */
export const reachShare = (t: number, t0: number, duration: number) => {
  const tau = t - t0;
  if (tau <= 0) return 0;
  const w = 4.5 / duration;
  const pull = tau < duration * 0.2 ? -0.06 * Math.sin((Math.PI * tau) / (duration * 0.2)) : 0;
  return Math.min(1, 1 - Math.exp(-w * tau) * (1 + w * tau)) + pull;
};

/** Reach / press: the chosen hand goes to `target` (wrist) with share k; the chest leans and turns toward it and
 *  the hips go back to keep the weight over the feet. */
export const reach = (base: Pose, side: Side, target: V3, k = 1, fingers: FingerPose = HAND_POSES.press, aim?: V3): Pose => {
  const f = bodyFrame(base.yaw).f;
  const kk = Math.max(-0.2, Math.min(1, k));
  const toward = unit(sub(target, base.root));
  const want = Math.min(0.5, Math.max(0, dot([toward[0], toward[1], 0], f) * 0.55));
  const lean = lerp(base.lean, want, clamp01(kk));
  const hips = -Math.sin(lean - base.lean) * 7; // counterbalance: the pelvis moves back as the chest leans
  const pick = (cur: V3) => lerp3(cur, target, kk);
  const hand =
    side === 'L'
      ? {handL: pick(base.handL), fingersL: lerpFingers(base.fingersL, fingers, clamp01(kk)), aimL: aim ? {dir: aim, k: clamp01(kk)} : base.aimL}
      : {handR: pick(base.handR), fingersR: lerpFingers(base.fingersR, fingers, clamp01(kk)), aimR: aim ? {dir: aim, k: clamp01(kk)} : base.aimR};
  return {
    ...base,
    ...hand,
    root: add(base.root, mul(f, hips)),
    lean,
    twist: lerp(base.twist, (side === 'L' ? 1 : -1) * 0.25, clamp01(kk)),
    headPitch: lerp(base.headPitch, 0.18, clamp01(kk)),
  };
};

/** Holding a tool in front: the elbow at the side, the forearm forward at waist height, the fist closed round the
 *  tool's handle (which then runs across the screen and reads as the role's prop). */
export const holdInFront = (base: Pose, side: Side = 'R', k = 1): Pose => {
  const {f, l} = bodyFrame(base.yaw);
  const sh = solve(base).shoulder[side];
  const target = add(add(add(sh, [0, 0, -DIM.upper + 0.5]), mul(f, DIM.fore - 0.5)), mul(l, (side === 'L' ? -1 : 1) * 1.5));
  // holding is not reaching: the body stays upright and the head level
  return {...reach(base, side, target, k, HAND_POSES.hold, f), root: base.root, lean: base.lean, twist: base.twist, headPitch: base.headPitch};
};

/** Blend two poses (joint targets are lerped; IK keeps the bones rigid). Feet: blend only poses whose feet stand
 *  on the same points (or use walkTo, which settles the feet on their contact points). */
export const lerpPose = (a: Pose, b: Pose, k: number): Pose => ({
  root: lerp3(a.root, b.root, k),
  yaw: lerpAngle(a.yaw, b.yaw, k),
  lean: lerp(a.lean, b.lean, k),
  twist: lerp(a.twist, b.twist, k),
  pelvisYaw: lerp(a.pelvisYaw ?? 0, b.pelvisYaw ?? 0, k),
  footL: lerp3(a.footL, b.footL, k),
  footR: lerp3(a.footR, b.footR, k),
  pitchL: lerp(a.pitchL, b.pitchL, k),
  pitchR: lerp(a.pitchR, b.pitchR, k),
  footYawL: lerpAngle(a.footYawL ?? a.yaw, b.footYawL ?? b.yaw, k),
  footYawR: lerpAngle(a.footYawR ?? a.yaw, b.footYawR ?? b.yaw, k),
  toeL: lerp(a.toeL ?? 0, b.toeL ?? 0, k),
  toeR: lerp(a.toeR ?? 0, b.toeR ?? 0, k),
  handL: lerp3(a.handL, b.handL, k),
  handR: lerp3(a.handR, b.handR, k),
  fingersL: lerpFingers(a.fingersL, b.fingersL, k),
  fingersR: lerpFingers(a.fingersR, b.fingersR, k),
  headYaw: lerp(a.headYaw, b.headYaw, k),
  headPitch: lerp(a.headPitch, b.headPitch, k),
  squash: lerp(a.squash, b.squash, k),
  aimL: b.aimL ?? a.aimL,
  aimR: b.aimR ?? a.aimR,
});
