import * as K from '../../vendor/anatomy/iso-kit';
import {A, Assembly, Dyn, dynBall, dynSolid, dynTube, G, Point3} from '../../lib/assembly';
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
/** radius of the loop's bar: thick enough to read as the one coral conductor on a phone (§19.2) */
export const LOOP_T = 1.8;
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

export const STAND = new Assembly('stand', P, {
  role: 'hero',
});
const S = STAND;

// ── base: plate on four feet with levelling pads, rails, bolts, a ruler along the front
S.slab('plate', {x: 0, y: 0, w: 90, d: 60, r: 3}, 6, 4, {tone: 'lo', halo: true, ground: false, bevel: 0.8, shadow: 'hero'});
for (const [x, y] of [
  [8, 8],
  [82, 8],
  [8, 52],
  [82, 52],
]) {
  S.cyl(`pad${x}${y}`, x, y, 4.4, 0, 1.2, {tone: 'lo', ground: true, bevel: 0.4});
  S.cyl(`leg${x}${y}`, x, y, 3, 1.2, 4.8, {tone: 'lo', bevel: 0.4});
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
    {tone: 'mid', meta: {owner: `bolt${x}${y}`}},
  );
}
S.slab('rail.front', {x: 12, y: 0, w: 66, d: 1.6, r: 0.3}, PLATE_TOP, 1.6, {tone: 'mid', bevel: 0.4});
S.slab('rail.back', {x: 12, y: 58.4, w: 66, d: 1.6, r: 0.3}, PLATE_TOP, 1.6, {tone: 'mid', bevel: 0.4});
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
      {tone: 'mid'},
    );
for (let k = 0; k < 10; k++) if (k !== 4) S.slab(`ruler${k}`, {x: 10 + 8 * k, y: 9.5, w: 0.6, d: k % 5 === 0 ? 2.6 : 1.6, r: 0}, PLATE_TOP, 0.25, {tone: k % 5 === 0 ? 'mid' : 'lo', bevel: 0});

// ── magnets: N on the left, S on the right (pedestal, body, pole piece, yoke plate, two screws, a letter plate)
for (const [side, sx] of [
  ['N', 1],
  ['S', -1],
] as const) {
  const m = (x: number, w: number) => (sx === 1 ? x : 90 - x - w); // mirror about x = 45
  S.slab(`${side}.pedestal`, {x: m(5, 16), y: 17, w: 16, d: 26, r: 1}, PLATE_TOP, 3, {tone: 'mid', bevel: 0.4});
  S.slab(`${side}.body`, {x: m(7, 10), y: 21, w: 10, d: 18, r: 0.6}, PLATE_TOP + 3, 16, {tone: 'hi', bevel: 0.5});
  S.slab(`${side}.pole`, {x: m(17, 3.5), y: 20, w: 3.5, d: 20, r: 0.4}, PLATE_TOP + 3, 18, {tone: 'hi', bevel: 0.4});
  S.slab(`${side}.yoke`, {x: m(5.2, 1.8), y: 20, w: 1.8, d: 20, r: 0.3}, PLATE_TOP + 3, 18, {tone: 'mid', bevel: 0.4});
  for (const y of [18.6, 41.4]) S.turned(`${side}.screw${y}`, [[0, 1.2], [0.8, 1.2], [1.2, 0.8, 1], [1.4, 0]], up(m(12, 0), y, PLATE_TOP + 3), {tone: 'mid'});
  S.slab(`${side}.letter`, {x: m(10, 2.4), y: 28.6, w: 2.4, d: 2.8, r: 0.3}, PLATE_TOP + 19, 0.2, {tone: 'mid', bevel: 0});
}

// ── axis, bearings and the arch over the loop
S.cyl('bearing.low.base', AX, AY, 4.2, PLATE_TOP, 2, {tone: 'mid', bevel: 0.4});
S.cyl('bearing.low', AX, AY, 2.6, PLATE_TOP + 2, 2, {tone: 'mid', bevel: 0.4, meta: {owner: 'axis'}});
S.slab('arch.column', {x: AX - 2, y: 8, w: 4, d: 4, r: 0.5}, PLATE_TOP, 31, {tone: 'mid', bevel: 0.4});
S.slab('arch.arm', {x: AX - 2, y: 8, w: 4, d: AY + 2 - 8, r: 0.5}, PLATE_TOP + 31, 2.4, {tone: 'mid', bevel: 0.4});
S.cyl('bearing.top', AX, AY, 2.4, PLATE_TOP + 29.4, 1.6, {tone: 'mid', bevel: 0.4, meta: {owner: 'axis'}});
S.cyl('axis', AX, AY, 0.7, PLATE_TOP + 7.4, 21.8, {tone: 'hi', meta: {owner: 'axis'}});

// ── brushes: holder on the plate, a spring leaf to the commutator, a tip, two screws, a supply wire to a terminal
for (const [side, dx] of [
  ['L', -1],
  ['R', 1],
] as const) {
  const hx = AX + dx * 14;
  S.slab(`brush${side}.holder`, {x: hx - 2, y: AY - 3, w: 4, d: 6, r: 0.4}, PLATE_TOP, 4, {tone: 'mid', bevel: 0.4});
  for (const y of [AY - 1.6, AY + 1.6])
    S.turned(
      `brush${side}.screw${y}`,
      [
        [0, 0.7],
        [0.4, 0.7, 1],
        [0.6, 0],
      ],
      up(hx, y, PLATE_TOP + 4),
      {tone: 'mid'},
    );
  const lx = dx === 1 ? AX + 5.4 : hx - 2;
  const lw = dx === 1 ? hx + 2 - (AX + 5.4) : AX - 5.4 - (hx - 2);
  S.slab(`brush${side}.leaf`, {x: lx, y: AY - 1.4, w: lw, d: 2.8, r: 0.2}, PLATE_TOP + 4.5, 0.5, {tone: 'mid', bevel: 0.4, meta: {owner: `brush${side}`}});
  S.cyl(`brush${side}.tip`, AX + dx * 5.55, AY, 0.9, PLATE_TOP + 2.4, 2.1, {tone: 'hi', meta: {owner: `brush${side}`}});
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
for (const x of [18, 36, 52, 72]) S.slab(`clip${x}`, {x, y: 55.6, w: 3, d: 1.6, r: 0.3}, PLATE_TOP + 1.6, 1.2, {tone: 'mid', bevel: 0.4});
// scene 2: two posts whose clamps grip the supply cable (the cable itself is drawn by wireItems, only on that beat)
export const WIRE_POST_X = [AX - 18, AX + 18] as const;
export const WIRE_Z = PLATE_TOP + 28.8; // centre of the clamp, where the cable runs
/** the scene-2 wire runs 4 units in front of the loop's axle (on the axis it would pass through the axle) */
export const WIRE_Y = AY + 4;
for (const x of WIRE_POST_X) {
  S.slab(`wire.post${x}`, {x: x - 1.5, y: WIRE_Y - 1.5, w: 3, d: 3, r: 0.4}, PLATE_TOP, 28, {tone: 'mid', bevel: 0.4});
  S.slab(`wire.clamp${x}`, {x: x - 2.2, y: WIRE_Y - 2.2, w: 4.4, d: 4.4, r: 0.4}, PLATE_TOP + 28, 1.6, {tone: 'mid', bevel: 0.4});
}

// paint order solved by `node scripts/object-audit.mjs --settle` (re-run after any change of the static parts)
STAND.applyKeys((KEYS as Record<string, Record<string, number>>).STAND);

// ── dynamic parts, rebuilt every frame: moving parts (Dyn) with their 3D shapes, for Assembly.svg({}, {extra}).
// Each carries its shape, so the paint order against the stand is solved from the geometry every frame (src/lib/depth.ts)
// and the long bars are split into short pieces (dynTube): a bar can pass behind the arch and in front of a brush.
const dirOf = (theta: number): Point3 => [Math.cos(theta), Math.sin(theta), 0];
/** The one-turn loop at angle theta (the loop's plane contains the vertical axis and the direction theta): coral.
 *  Names: loop.top / loop.bottom / loop.plus (the side at +direction) / loop.minus / loop.corner* / loop.lead*. */
export const loopItems = (theta: number, opacity?: number): Dyn[] => {
  const d = dirOf(theta);
  const at = (s: number, z: number): Point3 => [AX + d[0] * s, AY + d[1] * s, z];
  const bar = (name: string, a: Point3, b: Point3, r: number) => dynTube(name, [a, b], r, P, {lit: true, caps: false, opacity});
  const out: Dyn[] = [
    ...bar('loop.bottom', at(-LOOP_R, LOOP_Z0), at(LOOP_R, LOOP_Z0), LOOP_T),
    ...bar('loop.top', at(-LOOP_R, LOOP_Z1), at(LOOP_R, LOOP_Z1), LOOP_T),
    ...bar('loop.minus', at(-LOOP_R, LOOP_Z0), at(-LOOP_R, LOOP_Z1), LOOP_T),
    ...bar('loop.plus', at(LOOP_R, LOOP_Z0), at(LOOP_R, LOOP_Z1), LOOP_T),
  ];
  for (const s of [-LOOP_R, LOOP_R]) for (const z of [LOOP_Z0, LOOP_Z1]) out.push(dynBall(`loop.corner${s > 0 ? 'P' : 'M'}${z}`, at(s, z), LOOP_T + 0.3, P, {tone: 'hi', lit: true}, opacity));
  // leads: from the bottom bar down to the two half-rings of the commutator (current paths: coral)
  for (const k of [-1, 1]) out.push(...bar(`loop.lead${k > 0 ? 'P' : 'M'}`, at(k * 3.2, LOOP_Z0), at(k * 4.4, PLATE_TOP + 7.4), 0.9));
  return out;
};
const span = (pts: Point3[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) : 0), 0);

/** Scene 2 conductor, coral. A bus runs through both clamps (the gaps hide it inside the clamp blocks)
 *  and a straight drop hangs from the middle — that drop is the wire the force acts on. `bow` bends the
 *  middle in +y; the ends stay in the clamps. Built with Assembly.pipe (tube.mjs), not a chain of cylinders.
 *  It is not part of STAND: on the other beats the loop occupies this volume. Names: sceneWire.bus:*, sceneWire.drop:*. */
export const wireItems = (bow = 0, opacity?: number): Dyn[] => {
  const zBot = PLATE_TOP + 8;
  const yMid = WIRE_Y + bow;
  const bus: Point3[] = [
    [WIRE_POST_X[0], WIRE_Y, WIRE_Z],
    [WIRE_POST_X[0] + 4.2, WIRE_Y, WIRE_Z],
    [AX, yMid, WIRE_Z],
    [WIRE_POST_X[1] - 4.2, WIRE_Y, WIRE_Z],
    [WIRE_POST_X[1], WIRE_Y, WIRE_Z],
  ];
  const drop: Point3[] = [
    [AX, WIRE_Y, WIRE_Z],
    [AX, yMid, (WIRE_Z + zBot) / 2],
    [AX, WIRE_Y, zBot],
  ];
  const busLen = span(bus);
  const wire = new Assembly('sceneWire', P, {role: 'secondary'});
  wire.pipe('bus', bus, 1.7, {bend: 3.4, limp: true, lit: true, maxLength: 4, gaps: [[0, 2.6], [Math.max(2.6, busLen - 2.6), busLen]]});
  wire.pipe('drop', drop, 1.7, {bend: 3.6, limp: true, lit: true, maxLength: 4, gaps: [[0, 1.4]]});
  return wire.dyn(opacity);
};
/** Commutator: a hub and two half-rings (and the gaps between them) at angle theta, below the loop. */
export const commutatorItems = (theta: number, opacity?: number): Dyn[] => {
  const z = PLATE_TOP + 4;
  const h = 3.4; // z 14 … 17.4: below the loop's bottom bar
  const r0 = 3.2;
  const r1 = 5.2;
  const half = (a0: number) => {
    const ring: [number, number][] = [];
    for (let i = 0; i <= 16; i++) ring.push([AX + r1 * Math.cos(a0 + (i / 16) * (Math.PI - 0.5)), AY + r1 * Math.sin(a0 + (i / 16) * (Math.PI - 0.5))]);
    for (let i = 16; i >= 0; i--) ring.push([AX + r0 * Math.cos(a0 + (i / 16) * (Math.PI - 0.5)), AY + r0 * Math.sin(a0 + (i / 16) * (Math.PI - 0.5))]);
    return ring;
  };
  const out: Dyn[] = [];
  for (const k of [0, 1]) {
    const a0 = theta + 0.25 + k * Math.PI;
    const ring = half(a0);
    // both halves are the subject (hi); the gap between them is the split, not a clothing tone
    out.push(dynSolid(`commutator.${k}`, [AX + 4.2 * Math.cos(a0 + 1.5), AY + 4.2 * Math.sin(a0 + 1.5), z + h / 2], K.solidSvg(K.extrude(ring, z, h, P), {tone: 'hi'}), A.extruded(ring, z, h, {name: `commutator.${k}`}), opacity));
  }
  const hubF = G.frameAlong([AX, AY, z], [0, 0, 1]);
  const hubProfile = [
    [0, 3.4],
    [h, 3.4],
  ];
  out.push(dynSolid('commutator.hub', [AX, AY, z + h / 2], K.solidSvg(G.solidOf(hubProfile, hubF, P), {tone: 'mid'}), A.solid(hubF, hubProfile, {name: 'commutator.hub'}), opacity));
  return out;
};

/** Shapes of the parts that turn (loop, leads, commutator) at angle theta, for the dynamic audit in scripts/object-audit.mjs:
 *  swept through a half turn they must not sink into the static stand (magnets, poles, arch, brushes, bearings).
 *  Built from the same items the scene draws, so the audit and the picture cannot drift apart. */
export const dynamicShapes = (theta: number): {name: string; shape: unknown}[] =>
  [...loopItems(theta), ...commutatorItems(theta)].filter((d) => d.name !== 'commutator.hub').flatMap((d) => d.shapes.map((shape) => ({name: d.name, shape})));

export const STAND_CORNERS: Point3[] = [
  [0, 0, 0],
  [90, 0, 0],
  [0, 60, 0],
  [90, 60, 0],
  [AX, AY, PLATE_TOP + 36],
];
