import * as K from '../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from './assembly';

// Money and flows (MASTER_PROMPT_FINAL §24.3): coins, banknotes and stacks as solids; a flow between two nodes as a
// pipe with dots moving along it (§22.3: flows are dots along routes). Counting objects follow §20.5: a stack either
// equals the number in the voice or never changes count; the value is read on a frontal plate.

const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

/** A coin lying flat at (x, y) on z: a turned body with a raised rim and a relief disc; milled edge lines. */
export const coin = (A: Assembly, name: string, [x, y, z]: Point3, o: {r?: number; t?: number; lit?: boolean; owner?: string; ground?: boolean} = {}) => {
  const r = o.r ?? 4;
  const t = o.t ?? 0.8;
  const knurl = K.lineSvg(K.knurl(x, y, r, z + 0.08, z + t - 0.08, 36, A.P), {tone: 'lo'});
  A.turned(name, [[0, r - 0.15], [0.1, r, 1], [t - 0.1, r, 1], [t, r - 0.4]], up(x, y, z), {tone: 'hi', lit: o.lit, over: knurl, ground: o.ground, meta: o.owner ? {owner: o.owner} : {}});
  A.turned(`${name}.face`, [[0, r * 0.62], [0.12, r * 0.58, 1], [0.18, 0.0001]], up(x, y, z + t), {tone: 'mid', meta: {owner: o.owner ?? name}});
};

/** A stack of `n` coins at (x, y) from z, each a hair off-centre (a real stack is never perfectly straight).
 *  `lit` makes the whole stack the coral part (a sum read on a phone); `litTop` only its top coin (a close shot). */
export const coinStack = (A: Assembly, name: string, [x, y, z]: Point3, n: number, o: {r?: number; t?: number; litTop?: boolean; lit?: boolean} = {}) => {
  const t = o.t ?? 0.8;
  for (let i = 0; i < n; i++) {
    const j = Math.sin(i * 2.7) * 0.25;
    coin(A, `${name}.${i}`, [x + j, y - j, z + i * t], {r: o.r, t, lit: o.lit || (o.litTop && i === n - 1), owner: `${name}.0`, ground: i === 0});
  }
  return z + n * t;
};

/** A banknote lying flat: paper plate, a printed band, a seal disc, a window strip and a number box (markup on its
 *  top). Long side along +x. */
export const note = (A: Assembly, name: string, [x, y, z]: Point3, o: {w?: number; d?: number; lit?: boolean; owner?: string; ground?: boolean} = {}) => {
  const w = o.w ?? 30;
  const d = o.d ?? 14;
  const top = z + 0.3;
  const print =
    K.lineSvg(K.planOutline({x: x + 1.2, y: y + 1.2, w: w - 2.4, d: d - 2.4, r: 0.8}, top, A.P), {tone: 'lo'}) +
    K.lineSvg(K.ring(x + w * 0.72, y + d / 2, d * 0.28, top, A.P), {tone: 'lo'}) +
    K.lineSvg(K.lineOnTop([x + w * 0.38, y + 1.2], [x + w * 0.38, y + d - 1.2], top, A.P), {tone: 'mid'}) +
    K.lineSvg(K.planOutline({x: x + 2.6, y: y + 2.4, w: w * 0.22, d: 2.2, r: 0.3}, top, A.P), {tone: 'lo'});
  A.slab(name, {x, y, w, d, r: 0.5}, z, 0.3, {tone: 'hi', bevel: 0.08, lit: o.lit, over: print, ground: o.ground, meta: o.owner ? {owner: o.owner} : {}});
};

/** A bundle of `n` notes with a paper band round the middle. */
export const noteStack = (A: Assembly, name: string, [x, y, z]: Point3, n: number, o: {w?: number; d?: number; lit?: boolean} = {}) => {
  const w = o.w ?? 30;
  const d = o.d ?? 14;
  for (let i = 0; i < n; i++) note(A, `${name}.${i}`, [x + Math.sin(i * 1.9) * 0.3, y + Math.cos(i * 2.3) * 0.3, z + i * 0.3], {w, d, owner: `${name}.0`, ground: i === 0});
  // the band sits on top of the stack (a band round it would encircle the notes: no paint order)
  A.slab(`${name}.band`, {x: x + w / 2 - 2.5, y: y - 0.2, w: 5, d: d + 0.4, r: 0.3}, z + n * 0.3, 0.25, {tone: 'mid', bevel: 0.05, lit: o.lit, meta: {owner: `${name}.0`}});
  return z + n * 0.3 + 0.25;
};

/** Dots moving along a route at `speed` kit units/s: the visible direction and rate of a flow (money, data, water,
 *  current). Draw them over the pipe they travel in. `spacing` is the gap between dots. */
export const flowDots = (P: K.Projection, route: Point3[], t: number, o: {speed?: number; spacing?: number; size?: number; tone?: K.Tone} = {}) => {
  const total = G.pathLength(route) as number;
  const gap = o.spacing ?? 6;
  const shift = (((o.speed ?? 12) * t) % gap + gap) % gap;
  const pts: [number, number][] = [];
  for (let s = shift; s <= total; s += gap) pts.push(K.iso(G.pointAlong(route, s), P));
  return K.dotsSvg(pts, {size: o.size ?? 0.8, tone: o.tone ?? 'mid'});
};
