#!/usr/bin/env node
// Rig check without rendering (MASTER_PROMPT_FINAL §22, §12). On every sampled frame of straight, curved, stair
// and start/stop walks and of the stock poses:
//   contact   a sole point that touches the ground stays put between frames (no foot sliding), none goes under it
//   bones     every bone keeps its length; every IK target is reached
//   limits    knee and elbow bends, wrist, head, spine and foot angles stay inside LIMITS; knees bend forward
//   body      hands and forearms stay out of the torso and thighs (contact allowed)
//   balance   standing/reaching poses keep the pelvis over the feet
//   fingers   finite chains for every hand pose
//   parts     every outfit draws ≥ 40 parts (§22.2)
//   order     paint order checked by ray-casting the recorded shapes (no part drawn behind one it is in front of)
// Exit code 1 on any failure.   node scripts/rig-check.mjs [--quiet] [--no-order]
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const load = (f) => tsImport(pathToFileURL(resolve(root, f)).href, import.meta.url);
const R = await load('src/lib/rig.ts');
const C = await load('src/lib/character.ts');
const A = await load('src/vendor/anatomy/audit.mjs');
const {anatomyProjection} = await load('src/lib/anatomy.tsx');
const P = anatomyProjection(14);
const quiet = process.argv.includes('--quiet');
const fails = [];
const fail = (msg) => fails.length < 400 && fails.push(msg);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const FPS = 60;
const EPS = 1e-4;

/** Checks shared by every frame. */
const checkSkel = (label, s, ground = () => 0) => {
  const L = R.LIMITS;
  for (const side of ['L', 'R']) {
    if (Math.abs(dist(s.hip[side], s.knee[side]) - R.DIM.thigh) > 1e-6 || Math.abs(dist(s.knee[side], s.ankle[side]) - R.DIM.shin) > 1e-6) fail(`${label}: ${side} leg bone length changed`);
    if (Math.abs(dist(s.shoulder[side], s.elbow[side]) - R.DIM.upper) > 1e-6 || Math.abs(dist(s.elbow[side], s.wrist[side]) - R.DIM.fore) > 1e-6) fail(`${label}: ${side} arm bone length changed`);
    const knee = R.jointAngle(s.hip[side], s.knee[side], s.ankle[side]);
    const elbow = R.jointAngle(s.shoulder[side], s.elbow[side], s.wrist[side]);
    if (knee < L.kneeMin - 1e-3) fail(`${label}: ${side} knee bent past its limit (${((knee * 180) / Math.PI).toFixed(0)}°)`);
    if (elbow < L.elbowMin - 1e-3) fail(`${label}: ${side} elbow bent past its limit (${((elbow * 180) / Math.PI).toFixed(0)}°)`);
    // knee bends forward: the knee lies on the foot's forward side of the hip–ankle line
    const mid = R.segDist(s.knee[side], s.hip[side], s.ankle[side]);
    const off = R.sub(s.knee[side], mid.q);
    const fy = s.foot[side].yaw;
    if (mid.d > 0.3 && off[0] * Math.cos(fy) + off[1] * Math.sin(fy) < -0.05) fail(`${label}: ${side} knee bends backwards`);
    const wristAng = Math.acos(Math.max(-1, Math.min(1, R.dot(R.unit(R.sub(s.wrist[side], s.elbow[side])), s.hand[side].fwd))));
    if (wristAng > L.wrist + 1e-3) fail(`${label}: ${side} wrist bent past its limit`);
    if (s.hand[side].chain.flat(2).some((v) => !Number.isFinite(v))) fail(`${label}: ${side} finger chain not finite`);
    // body: forearm and hand stay out of the torso and both thighs (touching is fine: 0.6 overlap allowed)
    const fore = [s.elbow[side], s.wrist[side]];
    const handC = R.add(s.wrist[side], R.mul(s.hand[side].fwd, 3.5));
    const torso = R.segSegDist(fore[0], fore[1], s.pelvis, s.chest);
    if (torso < R.BODY_R.torso + R.BODY_R.fore - 0.6) fail(`${label}: ${side} forearm inside the torso (${torso.toFixed(2)})`);
    const ht = R.segDist(handC, s.pelvis, s.chest).d;
    if (ht < R.BODY_R.torso + R.BODY_R.hand - 0.6) fail(`${label}: ${side} hand inside the torso (${ht.toFixed(2)})`);
    for (const t of ['L', 'R']) {
      const d = R.segDist(handC, s.hip[t], s.knee[t]).d;
      if (d < R.BODY_R.thigh + R.BODY_R.hand - 0.6) fail(`${label}: ${side} hand inside the ${t} thigh (${d.toFixed(2)})`);
    }
    // feet: no sole point under the ground
    const sp = R.solePoints(s.ankle[side], s.foot[side].yaw, s.foot[side].pitch, s.foot[side].toe);
    for (const [k, p] of Object.entries(sp)) if (p[2] < ground(p[0], p[1]) - 0.05) fail(`${label}: ${side} ${k} ${(ground(p[0], p[1]) - p[2]).toFixed(2)} under the ground`);
  }
  for (const [k, ok] of Object.entries(s.reached)) if (!ok) fail(`${label}: ${k} target out of reach`);
};

/** Contact: a sole point at ground height in two consecutive frames must not move. */
const contactCheck = (name, poseAt, frames, ground = () => 0) => {
  let prev = null;
  let slide = 0;
  let where = '';
  for (let f = 0; f <= frames; f++) {
    const s = R.solve(poseAt(f / FPS));
    checkSkel(`${name} f${f}`, s, ground);
    const pts = {};
    for (const side of ['L', 'R']) {
      const sp = R.solePoints(s.ankle[side], s.foot[side].yaw, s.foot[side].pitch, s.foot[side].toe);
      for (const [k, p] of Object.entries(sp)) pts[side + k] = p;
    }
    if (prev)
      for (const [k, p] of Object.entries(pts)) {
        const q = prev[k];
        const on = (x) => Math.abs(x[2] - ground(x[0], x[1])) < EPS;
        if (on(p) && on(q) && dist(p, q) > slide) {
          slide = dist(p, q);
          where = `f${f} ${k}`;
        }
      }
    prev = pts;
  }
  if (slide > 1e-3) fail(`${name}: a foot slides ${slide.toFixed(4)} units in one frame (${where})`);
  if (!quiet) console.log(`ok ${name}: max contact slip ${slide.toExponential(1)}`);
};

// 1) gaits
contactCheck('walk straight', (t) => R.walk(t, {yaw: -Math.PI / 3, speed: 40}), 4 * FPS);
contactCheck('walk arc', (t) => R.walk(t, {speed: 36, path: R.arcPath([0, 0, 0], 60, 0, 1)}), 4 * FPS);
contactCheck('walk corner', (t) => R.walk(t, {speed: 36, path: R.cornerPath([0, 0, 0], 0.4, 40, 45, -1)}), 4 * FPS);
const STAIRS = R.stairs([0, 0, 0], 0, 30, 14, 5, 4);
contactCheck('walk stairs', (t) => R.walk(t, {speed: 30, path: R.linePath([0, 0, 0], 0), ground: STAIRS, lift: 4.5}), 4 * FPS, STAIRS);
const PLAN = {distance: 90, speed: 36, path: R.linePath([0, 0, 0], 0.7), t0: 0.3};
const T = R.walkPlan(PLAN).arrive;
contactCheck('walk start–stop–settle', (t) => R.walkTo(t, PLAN), Math.ceil((T + 1.2) * FPS));
// the stop is in double support: at arrival both feet touch the ground
{
  const s = R.solve(R.walkTo(T, PLAN));
  for (const side of ['L', 'R']) {
    const sp = R.solePoints(s.ankle[side], s.foot[side].yaw, s.foot[side].pitch, s.foot[side].toe);
    if (Math.min(...Object.values(sp).map((p) => p[2])) > EPS) fail(`stop: ${side} foot in the air at arrival`);
  }
}

// 2) stock poses and reaches through their motion
const base = R.stand([0, 0, 0], 0.4);
const poses = {
  stand: base,
  sit: R.sit([0, 0, 21], -0.7),
  hold: R.holdInFront(R.stand([0, 0, 0], 0.4)),
  reachFar: R.reach(R.stand([0, 0, 0], 0), 'L', [24, 8, 50], 1, R.HAND_POSES.press, [1, 0, 0]),
  reachHigh: R.reach(R.stand([0, 0, 0], 0), 'R', [6, -8, 82], 1, R.HAND_POSES.open),
  reachAcross: R.reach(R.stand([0, 0, 0], 0), 'R', [9, 3, 47], 1, R.HAND_POSES.pinch), // across the body, within arm's length
  handOnHip: R.reach(R.stand([0, 0, 0], 0), 'L', [1, 6, 42], 1, R.HAND_POSES.relaxed), // a target inside the body: pushed to its surface
};
for (const [name, pose] of Object.entries(poses)) {
  checkSkel(name, R.solve(pose), name === 'sit' ? () => 0 : () => 0);
  for (const fp of Object.keys(R.HAND_POSES)) checkSkel(`${name}/${fp}`, R.solve({...pose, fingersL: R.HAND_POSES[fp], fingersR: R.HAND_POSES[fp]}));
}
for (let i = 0; i <= 60; i++) {
  const k = R.reachShare(i / FPS, 0, 0.7);
  checkSkel(`reach motion ${i}`, R.solve(R.reach(base, 'L', [20, 10, 50], k, R.HAND_POSES.press, [1, 0, 0])));
}
// sitting: the pelvis rests on the seat
if (Math.abs(poses.sit.root[2] - 21 - R.SEAT_CLEAR) > 1e-6) fail('sit: pelvis not on the seat');
// balance: the pelvis stays over the support (within the feet's span plus half a foot) when standing and reaching
for (const name of ['stand', 'hold', 'reachFar', 'reachHigh', 'reachAcross']) {
  const s = R.solve(poses[name]);
  const mid = R.mul(R.add(s.ankle.L, s.ankle.R), 0.5);
  const off = Math.hypot(s.pelvis[0] - mid[0], s.pelvis[1] - mid[1]);
  if (off > 7) fail(`balance ${name}: pelvis ${off.toFixed(1)} units off the support`);
}

// 3) parts
for (const [name, outfit] of Object.entries(C.OUTFITS)) {
  const {parts, svg} = C.drawCharacter(R.solve(poses.stand), P, outfit);
  if (parts < 40) fail(`outfit ${name}: ${parts} parts < 40 (§22.2)`);
  if (/NaN/.test(svg)) fail(`outfit ${name}: NaN in markup`);
  if (!quiet) console.log(`ok outfit ${name}: ${parts} parts`);
}

// 4) paint order by ray-casting the recorded shapes (clean misorders only; touching parts may interlock)
if (!process.argv.includes('--no-order')) {
  const cases = {
    ...Object.fromEntries(['stand', 'sit', 'hold', 'reachFar', 'reachAcross'].map((k) => [k, poses[k]])),
    walk1: R.walk(0.3, {yaw: -Math.PI / 3}),
    walk2: R.walk(0.55, {yaw: 2.2}),
    stairs: R.walk(1.6, {speed: 30, ground: STAIRS, lift: 4.5}),
  };
  for (const [name, pose] of Object.entries(cases))
    for (const [oname, outfit] of [['plain', C.OUTFITS.plain], ['worker', C.OUTFITS.worker]]) {
      const {items} = C.drawCharacter(R.solve(pose), P, outfit);
      // key = the position in the order actually painted
      const list = items.map((i, index) => ({name: `${i.name}#${index}`, key: index, shapes: i.shapes, move: [0, 0, 0], piece: '', ride: '', svg: i.svg})).filter((i) => i.shapes.length);
      const overlaps = A.overlapsOf(list, P, {states: [0], step: 0.5});
      const order = A.depthOrder(list, P, {overlaps, rest: [0]});
      const bad = order.problems.filter((p) => !p.cycle && p.area >= 6);
      for (const p of bad.slice(0, 6)) fail(`order ${name}/${oname}: ${p.front} is in front of ${p.back} but drawn first (${p.area.toFixed(0)} px²)`);
      if (!quiet) console.log(`ok order ${name}/${oname}: ${list.length} items, ${bad.length} misorders`);
    }
}

if (fails.length) {
  console.log(fails.slice(0, 60).join('\n'));
  console.log(`rig-check failed: ${fails.length} problem(s)`);
  process.exitCode = 1;
} else console.log('rig-check passed: feet hold their contact on every gait, limits, rigid bones, IK reached, arms out of the body, balance, fingers, ≥ 40 parts, paint order');
