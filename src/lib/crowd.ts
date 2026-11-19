import {Assembly, G, Point3} from './assembly';
import {capsule, loft} from './organic';

// Crowds in the house style (MASTER_PROMPT_FINAL §24.3): a queue, a stream, a market, a vote. 20–200 faceless
// figures share ONE motion field (a path and a speed), so the crowd reads as a group, not as noise. Near the camera
// use the full mannequin (character.ts, ~80 parts); a crowd figure is the distant level of detail of the same body:
// shoes, legs, hips, torso, arms, hands, neck, head and hair in the same proportions and tones (13 parts each).
// Positions are pure functions of time (frame-driven), deterministic by seed.

const rand = (seed: number) => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export type Figure = {at: Point3; yaw: number; scale?: number; step?: number; lit?: boolean; dark?: boolean};

/** One crowd figure standing at `at` facing `yaw` (radians, 0 = +x). `step` 0..1 is the walk phase (legs swing,
 *  body bobs); the figure is ~17 kit units tall at scale 1, the mannequin's proportions. */
export const figure = (A: Assembly, name: string, f: Figure) => {
  const k = f.scale ?? 1;
  const [x, y, z] = f.at;
  const fx = Math.cos(f.yaw);
  const fy = Math.sin(f.yaw);
  const side: Point3 = [-fy, fx, 0];
  const ph = (f.step ?? 0) * Math.PI * 2;
  const swing = f.step === undefined ? 0 : Math.sin(ph) * 1.6 * k;
  const bob = f.step === undefined ? 0 : Math.abs(Math.cos(ph)) * 0.3 * k;
  const P = (s: number, fwd: number, up: number): Point3 => [x + side[0] * s + fx * fwd, y + side[1] * s + fy * fwd, z + up + bob];
  const own = {meta: {owner: `${name}.hips`}};
  const cloth = f.dark ? {className: 'cl-dark'} : {className: 'cl-mid'};
  // the figure stands on its shoes: they are its ground
  ([-1, 1] as const).forEach((s, i) => {
    const fwd = s * swing;
    A.slab(`${name}.shoe${i}`, {x: P(s * 1.1 * k, fwd, 0)[0] - 0.9 * k, y: P(s * 1.1 * k, fwd, 0)[1] - 0.9 * k, w: 1.8 * k, d: 1.8 * k, r: 0.6 * k}, z, 0.8 * k, {tone: 'lo', ground: true, bevel: 0.2});
    capsule(A, `${name}.leg${i}`, P(s * 1.1 * k, fwd, 0.8 * k), P(s * 1.0 * k, fwd * 0.2, 7.6 * k), 0.85 * k, {tone: 'mid', ...cloth, ...own});
  });
  A.ball(`${name}.hips`, P(0, 0, 7.8 * k), 1.9 * k, {tone: 'mid', ...cloth});
  loft(A, `${name}.torso`, P(0, 0, 8.2 * k), [0, 0, 1], [[0, 1.9 * k], [2.4 * k, 2.2 * k], [4.6 * k, 2.3 * k], [5.6 * k, 1.6 * k]], {tone: 'hi', lit: f.lit, ...own});
  ([-1, 1] as const).forEach((s, i) => {
    const shoulder = P(s * 2.2 * k, 0, 13 * k);
    const hand = P(s * 2.6 * k, -s * swing * 0.8, 9 * k);
    capsule(A, `${name}.arm${i}`, shoulder, hand, 0.6 * k, {tone: 'hi', lit: f.lit, ...own});
    A.ball(`${name}.hand${i}`, [hand[0], hand[1], hand[2] - 0.5 * k], 0.65 * k, {tone: 'hi', ...own});
  });
  A.cyl(`${name}.neck`, ...(P(0, 0, 13.7 * k).slice(0, 2) as [number, number]), 0.6 * k, z + 13.7 * k + bob, 0.8 * k, {tone: 'hi', bevel: 0.1, ...own});
  A.ball(`${name}.head`, P(0, 0, 15.6 * k), 1.5 * k, {tone: 'hi', ...own});
  A.turned(`${name}.hair`, [[0, 1.55 * k], [0.6 * k, 1.45 * k, 1], [1.1 * k, 0.8 * k, 1], [1.3 * k, 0.0001]], G.frameAlong(P(0, 0, 15.9 * k), [0, 0, 1]), {tone: 'lo', className: 'cl-dark', ...own});
};

/** A queue along a polyline: `n` figures `gap` apart, each facing along the path to the next. The head of the queue
 *  is at the first point; `advance` (kit units, frame-driven) moves everyone forward by that much. */
export const queue = (path: Point3[], n: number, gap: number, advance = 0) => {
  const out: Figure[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.max(0, i * gap - advance);
    const p = G.pointAlong(path, s) as Point3;
    const q = G.pointAlong(path, Math.max(0, s - 0.5)) as Point3;
    out.push({at: p, yaw: Math.atan2(q[1] - p[1], q[0] - p[0]) || 0});
  }
  return out;
};

/** A stream along a path: `n` figures spread over its length, walking at `speed` (kit units/s) at time `t`; they
 *  wrap round to the start, side offsets keep them from walking in single file. */
export const stream = (path: Point3[], n: number, t: number, o: {speed?: number; width?: number; seed?: number} = {}) => {
  const total = G.pathLength(path) as number;
  const out: Figure[] = [];
  for (let i = 0; i < n; i++) {
    const s = (((i / n) * total + (o.speed ?? 6) * t) % total + total) % total;
    const p = G.pointAlong(path, s) as Point3;
    const tan = G.tangentAlong(path, s) as Point3;
    const off = ((rand(i + (o.seed ?? 3)) - 0.5) * (o.width ?? 8));
    out.push({at: [p[0] - tan[1] * off, p[1] + tan[0] * off, p[2]], yaw: Math.atan2(tan[1], tan[0]), step: (s / 4.5) % 1});
  }
  return out;
};

/** A loose group round a centre (a market, a meeting): `n` figures at least `gap` apart, facing the centre. */
export const cluster = (centre: Point3, n: number, radius: number, o: {gap?: number; seed?: number} = {}) => {
  const out: Figure[] = [];
  const gap = o.gap ?? 5;
  for (let i = 0, tries = 0; out.length < n && tries < n * 60; tries++, i++) {
    const a = rand(i * 2 + (o.seed ?? 5)) * Math.PI * 2;
    const r = Math.sqrt(rand(i * 5 + 1)) * radius;
    const p: Point3 = [centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r, centre[2]];
    if (out.some((f) => Math.hypot(f.at[0] - p[0], f.at[1] - p[1]) < gap)) continue;
    out.push({at: p, yaw: Math.atan2(centre[1] - p[1], centre[0] - p[0])});
  }
  return out;
};

/** Draws a crowd into one Assembly (figures named `<prefix><i>`). Pass `lit` to make ONE figure the coral one. */
export const crowd = (A: Assembly, figures: Figure[], o: {prefix?: string; lit?: number; dark?: (i: number) => boolean} = {}) =>
  figures.forEach((f, i) => figure(A, `${o.prefix ?? 'f'}${i}`, {...f, lit: o.lit === i, dark: o.dark ? o.dark(i) : i % 3 === 1}));
