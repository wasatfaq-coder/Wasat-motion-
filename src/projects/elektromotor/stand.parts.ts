import * as K from '../../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import KEYS from './stand.parts.keys.json';

// Hero B of «Как работает электромотор»: the field stand (scenes 2–5), a classroom model of the SIMPLEST motor
// (parts-plan.md §1.2): a plate on four feet, two magnets with pole pieces, a wire or a one-turn loop on a vertical
// axis, a two-half-ring commutator and two brushes. Kit units; 8 kit units = 1 room unit. The field runs along +x
// (N on the left, S on the right), the loop turns about the vertical axis through (AX, AY).
// Coral = the conductor with current, everywhere in the film: the wire / the loop (lit); nothing else is coral.
// The static part is an audited Assembly; the loop and the commutator are rebuilt every frame (they turn).
export const STAND_U = 8;
export const STAND_P = anatomyProjection(STAND_U);
const P = STAND_P;

export const AX = 45; // loop axis
export const AY = 30;
export const PLATE_TOP = 10;
export const LOOP_R = 12; // half width of the loop
export const LOOP_Z0 = 21; // bottom bar (above the commutator)
export const LOOP_Z1 = 37; // top bar
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

export const STAND = new Assembly('stand', P, {
  role: 'hero',
});
const S = STAND;

// ── base: plate on four feet with levelling pads, rails, bolts, a ruler along the front
S.slab('plate', {x: 0, y: 0, w: 90, d: 60, r: 3}, 6, 4, {tone: 'hi', halo: true, ground: false, bevel: 0.8, className: 'cl-mid'});
for (const [x, y] of [
  [8, 8],
  [82, 8],
  [8, 52],
  [82, 52],
]) {
  S.cyl(`pad${x}${y}`, x, y, 4.4, 0, 1.2, {tone: 'mid', ground: true, bevel: 0.3});
  S.cyl(`leg${x}${y}`, x, y, 3, 1.2, 4.8, {tone: 'mid', bevel: 0.3});
}
for (const [x, y] of [[5, 6], [85, 6], [5, 54], [85, 54], [30, 6], [60, 6], [30, 54], [60, 54]
]) {
  S.disc(`bolt${x}${y}.washer`, 0, 0.5, 3.4, up(x, y, PLATE_TOP), {tone: 'mid', meta: {owner: `bolt${x}${y}`}});
  S.turned(
    `bolt${x}${y}.head`,
    [
      [0.5, 2.6],
      [2.1, 2.6],
      [2.7, 1.8, 1],
      [3, 0],
    ],
    up(x, y, PLATE_TOP),
    {tone: 'hi', meta: {owner: `bolt${x}${y}`}},
  );
}
S.slab('rail.front', {x: 12, y: 0, w: 66, d: 1.6, r: 0.3}, PLATE_TOP, 1.6, {tone: 'mid', bevel: 0.3});
S.slab('rail.back', {x: 12, y: 58.4, w: 66, d: 1.6, r: 0.3}, PLATE_TOP, 1.6, {tone: 'mid', bevel: 0.3});
for (const x of [14, 76])
  for (const y of [0.8, 59.2])
    S.turned(
      `rail.screw${x}${y}`,
      [
        [0, 0.8],
        [0.4, 0.8, 1],
        [0.6, 0],
      ],
      up(x, y, PLATE_TOP + 1.6),
      {tone: 'hi'},
    );
for (let k = 0; k < 10; k++) if (k !== 4) S.slab(`ruler${k}`, {x: 10 + 8 * k, y: 9.5, w: 0.6, d: k % 5 === 0 ? 2.6 : 1.6, r: 0}, PLATE_TOP, 0.25, {tone: 'mid', bevel: 0});

// ── magnets: N on the left, S on the right (pedestal, body, pole piece, yoke plate, two screws, a letter plate)
for (const [side, sx] of [
  ['N', 1],
  ['S', -1],
] as const) {
  const m = (x: number, w: number) => (sx === 1 ? x : 90 - x - w); // mirror about x = 45
  S.slab(`${side}.pedestal`, {x: m(5, 16), y: 17, w: 16, d: 26, r: 1}, PLATE_TOP, 3, {tone: 'mid', bevel: 0.4});
  S.slab(`${side}.body`, {x: m(7, 10), y: 21, w: 10, d: 18, r: 0.6}, PLATE_TOP + 3, 16, {tone: 'hi', bevel: 0.5});
  S.slab(`${side}.pole`, {x: m(17, 3.5), y: 20, w: 3.5, d: 20, r: 0.4}, PLATE_TOP + 3, 18, {tone: 'hi', bevel: 0.4});
  S.slab(`${side}.yoke`, {x: m(5.2, 1.8), y: 20, w: 1.8, d: 20, r: 0.3}, PLATE_TOP + 3, 18, {tone: 'mid', bevel: 0.2});
  for (const y of [18.6, 41.4]) S.turned(`${side}.screw${y}`, [[0, 1.2], [0.8, 1.2], [1.2, 0.8, 1], [1.4, 0]], up(m(12, 0), y, PLATE_TOP + 3), {tone: 'hi'});
  S.slab(`${side}.letter`, {x: m(10, 2.4), y: 28.6, w: 2.4, d: 2.8, r: 0.3}, PLATE_TOP + 19, 0.2, {tone: 'mid', bevel: 0});
}

// ── axis, bearings and the arch over the loop
S.cyl('bearing.low.base', AX, AY, 4.2, PLATE_TOP, 2, {tone: 'mid', bevel: 0.3});
S.cyl('bearing.low', AX, AY, 2.6, PLATE_TOP + 2, 2, {tone: 'hi', bevel: 0.2, meta: {owner: 'axis'}});
S.slab('arch.column', {x: AX - 2, y: 8, w: 4, d: 4, r: 0.5}, PLATE_TOP, 31, {tone: 'mid', bevel: 0.4});
S.slab('arch.arm', {x: AX - 2, y: 8, w: 4, d: AY + 2 - 8, r: 0.5}, PLATE_TOP + 31, 2.4, {tone: 'hi', bevel: 0.4});
S.cyl('bearing.top', AX, AY, 2.4, PLATE_TOP + 29.4, 1.6, {tone: 'hi', bevel: 0.2, meta: {owner: 'axis'}});
S.cyl('axis', AX, AY, 0.7, PLATE_TOP + 7.4, 21.8, {tone: 'hi', meta: {owner: 'axis'}});

// ── brushes: holder on the plate, a spring leaf to the commutator, a tip, two screws, a supply wire to a terminal
for (const [side, dx] of [
  ['L', -1],
  ['R', 1],
] as const) {
  const hx = AX + dx * 14;
  S.slab(`brush${side}.holder`, {x: hx - 2, y: AY - 3, w: 4, d: 6, r: 0.4}, PLATE_TOP, 4, {tone: 'mid', bevel: 0.3});
  for (const y of [AY - 1.6, AY + 1.6])
    S.turned(
      `brush${side}.screw${y}`,
      [
        [0, 0.7],
        [0.4, 0.7, 1],
        [0.6, 0],
      ],
      up(hx, y, PLATE_TOP + 4),
      {tone: 'hi'},
    );
  const lx = dx === 1 ? AX + 5.4 : hx - 2;
  const lw = dx === 1 ? hx + 2 - (AX + 5.4) : AX - 5.4 - (hx - 2);
  S.slab(`brush${side}.leaf`, {x: lx, y: AY - 1.4, w: lw, d: 2.8, r: 0.2}, PLATE_TOP + 4.5, 0.5, {tone: 'mid', bevel: 0.1, meta: {owner: `brush${side}`}});
  S.cyl(`brush${side}.tip`, AX + dx * 5.9, AY, 0.9, PLATE_TOP + 2.4, 2.1, {tone: 'hi', meta: {owner: `brush${side}`}});
}
for (const [side, y] of [
  ['L', 5],
  ['R', 55],
] as const) {
  const tx = AX + (side === 'L' ? -20 : 20);
  S.turned(`terminal${side}.stud`, [[0, 1.8], [1.2, 1.8]], up(tx, y, PLATE_TOP), {tone: 'hi', meta: {owner: `terminal${side}`}});
  S.turned(`terminal${side}.nut`, [[1.2, 2.3], [2.2, 2.3]], up(tx, y, PLATE_TOP), {tone: 'mid', meta: {owner: `terminal${side}`}});
  S.turned(`terminal${side}.tip`, [[2.2, 1.8], [3.2, 1.8, 1], [3.8, 1.2, 1], [4.4, 0]], up(tx, y, PLATE_TOP), {tone: 'hi', meta: {owner: `terminal${side}`}});
}

// cable clips along the back rail
for (const x of [18, 36, 52, 72]) S.slab(`clip${x}`, {x, y: 55.6, w: 3, d: 1.6, r: 0.3}, PLATE_TOP + 1.6, 1.2, {tone: 'mid', bevel: 0.2});
// the straight wire of scene 2 stands on two clamps in front of the loop's axis (x = AX − 18 … the loop is hidden then)
for (const x of [AX - 18, AX + 18]) {
  S.slab(`wire.post${x}`, {x: x - 1.5, y: AY - 1.5, w: 3, d: 3, r: 0.4}, PLATE_TOP, 28, {tone: 'mid', bevel: 0.3});
  S.slab(`wire.clamp${x}`, {x: x - 2.2, y: AY - 2.2, w: 4.4, d: 4.4, r: 0.4}, PLATE_TOP + 28, 1.6, {tone: 'hi', bevel: 0.3});
}

// paint order solved by `node scripts/object-audit.mjs --settle` (re-run after any change of the static parts)
STAND.applyKeys((KEYS as Record<string, Record<string, number>>).STAND);

// ── dynamic parts, rebuilt every frame: they return {at, svg} items for Assembly.svg({}, {extra})
type Item = {at: Point3; svg: string; bias?: number};
const dirOf = (theta: number): Point3 => [Math.cos(theta), Math.sin(theta), 0];
const mid = (a: Point3, b: Point3): Point3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const bar = (a: Point3, b: Point3, r: number, lit: boolean): Item => {
  const F = G.frameAlong(a, G.sub3(b, a));
  const L = G.len3(G.sub3(b, a));
  return {
    at: mid(a, b),
    svg: K.solidSvg(
      G.solidOf(
        [
          [0, r],
          [L, r],
        ],
        F,
        P,
      ),
      {tone: 'hi', lit},
    ),
  };
};
/** The one-turn loop at angle theta (the loop's plane contains the vertical axis and the direction theta): coral. */
export const loopItems = (theta: number): Item[] => {
  const d = dirOf(theta);
  const at = (s: number, z: number): Point3 => [AX + d[0] * s, AY + d[1] * s, z];
  const out: Item[] = [
    bar(at(-LOOP_R, LOOP_Z0), at(LOOP_R, LOOP_Z0), 1.4, true),
    bar(at(-LOOP_R, LOOP_Z1), at(LOOP_R, LOOP_Z1), 1.4, true),
    bar(at(-LOOP_R, LOOP_Z0), at(-LOOP_R, LOOP_Z1), 1.4, true),
    bar(at(LOOP_R, LOOP_Z0), at(LOOP_R, LOOP_Z1), 1.4, true),
  ];
  for (const s of [-LOOP_R, LOOP_R]) for (const z of [LOOP_Z0, LOOP_Z1]) out.push({at: at(s, z), svg: K.solidSvg(G.sphereOf(at(s, z), 1.7, P), {tone: 'hi', lit: true})});
  // leads: from the bottom bar down to the two half-rings of the commutator (current paths: coral)
  for (const k of [-1, 1]) {
    const top = at(k * 3.2, LOOP_Z0);
    const low = at(k * 4.4, PLATE_TOP + 7.4);
    out.push(bar(top, low, 0.9, true));
  }
  return out;
};
/** A wire for scene 2: vertical, between the two posts' height, coral; `bow` bends it sideways (+y) for the push. */
export const wireItems = (bow = 0): Item[] => {
  const z0 = PLATE_TOP + 8;
  const z1 = PLATE_TOP + 28;
  const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => [AX, AY + bow * Math.sin(Math.PI * t), z0 + (z1 - z0) * t] as Point3);
  return pts.slice(0, -1).map((a, i) => bar(a, pts[i + 1], 1.9, true));
};
/** Commutator: a hub and two half-rings (and the gaps between them) at angle theta, below the loop. */
export const commutatorItems = (theta: number): Item[] => {
  const z = PLATE_TOP + 4;
  const h = 3.4; // z 14 … 17.4: below the loop's bottom bar
  const r0 = 3.2;
  const r1 = 5.2;
  const half = (a0: number) => {
    const ring: [number, number][] = [];
    for (let i = 0; i <= 16; i++) ring.push([AX + r1 * Math.cos(a0 + (i / 16) * (Math.PI - 0.16)), AY + r1 * Math.sin(a0 + (i / 16) * (Math.PI - 0.16))]);
    for (let i = 16; i >= 0; i--) ring.push([AX + r0 * Math.cos(a0 + (i / 16) * (Math.PI - 0.16)), AY + r0 * Math.sin(a0 + (i / 16) * (Math.PI - 0.16))]);
    return ring;
  };
  const out: Item[] = [];
  for (const k of [0, 1]) {
    const a0 = theta + 0.08 + k * Math.PI;
    out.push({at: [AX + 4.2 * Math.cos(a0 + 1.5), AY + 4.2 * Math.sin(a0 + 1.5), z + h / 2], svg: K.solidSvg(K.extrude(half(a0), z, h, P), k === 0 ? {tone: 'hi'} : {tone: 'hi', className: 'cl-mid'}), bias: 7}); // two halves, two tones: the gaps and the swap read
  }
  out.push({
    at: [AX, AY, z + h / 2],
    svg: K.solidSvg(
      G.solidOf(
        [
          [0, 3.4],
          [h, 3.4],
        ],
        G.frameAlong([AX, AY, z], [0, 0, 1]),
        P,
      ),
      {tone: 'hi', className: 'cl-dark'},
    ),
    bias: 5,
  });
  return out;
};

export const STAND_CORNERS: Point3[] = [
  [0, 0, 0],
  [90, 0, 0],
  [0, 60, 0],
  [90, 60, 0],
  [AX, AY, PLATE_TOP + 36],
];
