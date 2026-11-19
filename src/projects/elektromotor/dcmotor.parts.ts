import {A, Assembly, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import KEYS from './dcmotor.parts.keys.json';

// Hero A of «Как работает электромотор»: a small brushed DC motor (class 130) standing shaft up in a clamp, closed or in
// cutaway (parts-plan.md §1.1). Kit units; 10 kit units = 1 room unit. The axis is vertical through (CX, CY).
// Pieces: `half` (the front half-shell, its magnet) slides aside, `cap` (the top shield) lifts, `rotor` rises.
// The real motor has three coils and three commutator segments (dossier: a source for the count is missing), so the
// picture shows three and the voice never gives a number. Coral = the conductor with current: ONE coil (lit).
export const DC_U = 10;
export const DC_P = anatomyProjection(DC_U);
const P = DC_P;
export const CX = 45;
export const CY = 30;
const R = 15; // housing outer radius
const RI = 13.6; // inner radius
const Z0 = 4; // plate top
const ZB = 8; // back shield top
const ZT = 58; // housing top
const POLE_ANGLES = [90, 210, 330].map((a) => (a * Math.PI) / 180);
const FRONT = Math.PI / 4; // toward the viewer: azimuth 45°

type Poly = [number, number][];
const polar = (r: number, a: number): [number, number] => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
/** a ring sector between radii r0 and r1 from angle a0 to a1 (a half-shell, a magnet, a commutator segment) */
const sector = (r0: number, r1: number, a0: number, a1: number, steps = 18): Poly => {
  const out: Poly = [];
  for (let i = 0; i <= steps; i++) out.push(polar(r1, a0 + ((a1 - a0) * i) / steps));
  for (let i = steps; i >= 0; i--) out.push(polar(r0, a0 + ((a1 - a0) * i) / steps));
  return out;
};
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const AXIS = up(CX, CY, 0);
/** the front half slides along (1, −1, 0): to the right on screen at the same depth, so it never covers the armature */
/** the housing splits along a plane through the axis at azimuth SPLIT: the back-left half stays, the front-right half
 *  slides out along its own centre line (azimuth SPLIT − 90°), so every point of it moves AWAY from the armature */
const SPLIT = FRONT + Math.PI / 3;
const HALF_DIR = SPLIT - Math.PI / 2;
export const HALF_MOVE: Point3 = [48 * Math.cos(HALF_DIR), 48 * Math.sin(HALF_DIR), 0];

export const DC = new Assembly('dc', P, {
  role: 'hero',
  order: ['half'],
  // wraps and rings that share an owner with their host cannot be ordered against it: excused by name
});
const S = DC;
const sh = {meta: {owner: 'shaft'}};

// ── base: plate, bolts, column, clamp
S.slab('plate', {x: 10, y: 0, w: 70, d: 60, r: 3}, 0, Z0, {tone: 'hi', halo: true, ground: true, bevel: 0.8, className: 'cl-mid'});
for (const [x, y] of [[16, 6], [74, 6], [16, 54], [74, 54], [45, 54], [16, 30], [74, 30]]) {
  S.disc(`bolt${x}${y}.washer`, 0, 0.5, 3.4, up(x, y, Z0), {tone: 'mid', meta: {owner: `bolt${x}${y}`}});
  S.turned(`bolt${x}${y}.head`, [[0.5, 2.6], [2.1, 2.6], [2.7, 1.8, 1], [3, 0]], up(x, y, Z0), {tone: 'hi', meta: {owner: `bolt${x}${y}`}});
}
S.slab('column', {x: CX - 3, y: CY - 22, w: 6, d: 5, r: 0.6}, Z0 + 2, 32, {tone: 'mid', bevel: 0.4});
S.slab('column.foot', {x: CX - 7, y: CY - 24, w: 14, d: 9, r: 0.8}, Z0, 2, {tone: 'mid', bevel: 0.4});
// the clamp: a back half fixed to the column and a front half (with the motor's front half) held by two screws
S.extruded('clamp.back', sector(R, R + 2.2, SPLIT + 0.2, SPLIT + Math.PI - 0.2), 24, 5, {tone: 'mid', meta: {owner: 'clamp'}});
S.extruded('clamp.front', sector(R, R + 2.2, SPLIT - Math.PI + 0.2, SPLIT - 0.2), 24, 5, {tone: 'mid', piece: 'half', move: HALF_MOVE, meta: {owner: 'clamp'}});
for (const k of [-1, 1]) {
  const a = SPLIT + (k === 1 ? 0 : Math.PI);
  S.turned(`clamp.screw${k}`, [[0, 1.2], [1.4, 1.2], [1.9, 0.8, 1], [2.2, 0]], G.frameAlong([...polar(R + 1.1, a), 24], [0, 0, 1]) as never, {tone: 'hi', meta: {owner: 'clamp'}});
}

// ── housing: back half-shell in three belts, front half-shell (piece `half`) in three belts
const belts: [number, number][] = [[ZB, 24], [24, 41], [41, ZT]];
belts.forEach(([a, b], i) => {
  S.extruded(`shell.back${i}`, sector(RI, R, SPLIT, SPLIT + Math.PI), a, b - a, {tone: 'hi', meta: {owner: 'shell'}});
  S.extruded(`shell.front${i}`, sector(RI, R, SPLIT - Math.PI, SPLIT), a, b - a, {tone: 'hi', piece: 'half', move: HALF_MOVE, meta: {owner: 'shell'}});
});
// back shield (a solid disc: the shaft is sliced at it) with a boss and four screws
S.disc('shield.back', Z0, ZB, R, AXIS, {tone: 'mid'});
S.disc('shield.back.boss', ZB, ZB + 2, 4.2, AXIS, {tone: 'hi'});
for (const a of [0.8, 2.4, 4.0, 5.5]) S.turned(`shield.back.screw${a}`, [[0, 0.9], [0.5, 0.9, 1], [0.7, 0]], up(...polar(R - 3.2, a), ZB), {tone: 'hi'});
// top shield: a solid disc with a boss, four screws, three vents (it stays on: the cutaway removes the front half only)
S.disc('shield.top', ZT, ZT + 3.6, R, AXIS, {tone: 'mid'});
S.disc('shield.top.boss', ZT + 3.6, ZT + 6.6, 4.4, AXIS, {tone: 'hi'});
for (const a of [0.8, 2.4, 4.0, 5.5]) S.turned(`shield.top.screw${a}`, [[0, 0.9], [0.5, 0.9, 1], [0.7, 0]], up(...polar(R - 3.2, a), ZT + 3.6), {tone: 'hi'});
for (const a of [1.2, 3.3, 5.4]) S.slab(`shield.top.vent${a}`, {x: polar(9, a)[0] - 1.8, y: polar(9, a)[1] - 0.5, w: 3.6, d: 1, r: 0.3}, ZT + 3.6, 0.3, {tone: 'mid', bevel: 0});

// ── magnets: two arcs (the back one fixed, the front one on the half), clips
S.extruded('magnet.N', sector(RI - 1.1, RI, SPLIT + 0.5, SPLIT + Math.PI - 0.5), 14, 34, {tone: 'mid', className: 'cl-mid'});
S.extruded('magnet.S', sector(RI - 1.1, RI, SPLIT - Math.PI + 0.5, SPLIT - 0.5), 14, 34, {tone: 'mid', className: 'cl-dark', piece: 'half', move: HALF_MOVE});

// ── rotor: a coaxial stack with no part inside another (the shaft is sliced at every collar), three T poles, three
// coils (coil 0 is the conductor with current: lit), three commutator segments with a lead from each coil
const RO = {};
export const STACK = {comm: [12, 19] as const, plateLow: [20.5, 22] as const, core: [22, 38] as const, plateTop: [38, 39.5] as const};
S.turned('shaft.a', [[ZB + 2, 1], [STACK.comm[0], 1]], AXIS, {tone: 'hi', ...sh, ...RO});
S.turned('commutator.hub', [[STACK.comm[0], 2.6], [STACK.comm[1], 2.6]], AXIS, {tone: 'mid', ...sh, ...RO});
S.turned('shaft.b', [[STACK.comm[1], 1], [STACK.plateLow[0], 1]], AXIS, {tone: 'hi', ...sh, ...RO});
S.disc('core.plate.low', STACK.plateLow[0], STACK.plateLow[1], 5.2, AXIS, {tone: 'mid', meta: {owner: 'core'}, ...RO});
S.turned('core.hub', [[STACK.core[0], 3.2], [STACK.core[1], 3.2]], AXIS, {tone: 'mid', meta: {owner: 'core'}, ...RO});
S.disc('core.plate.top', STACK.plateTop[0], STACK.plateTop[1], 5.2, AXIS, {tone: 'mid', meta: {owner: 'core'}, ...RO});
S.turned('shaft.c', [[STACK.plateTop[1], 1], [ZT, 1]], AXIS, {tone: 'hi', ...sh, ...RO});
S.turned('shaft.d', [[ZT + 6.6, 1], [ZT + 7, 1]], AXIS, {tone: 'hi', ...sh, ...RO});
/** coil block radii (kit units from the axis) and half width; the pole's neck is hidden inside the coil */
export const COIL = {r0: 3.2, r1: 7.6, half: 3.4};
POLE_ANGLES.forEach((a, i) => {
  const t = (r: number, lat: number) => [CX + r * Math.cos(a) - lat * Math.sin(a), CY + r * Math.sin(a) + lat * Math.cos(a)] as [number, number];
  const A0 = a - 0.62;
  const A1 = a + 0.62;
  // the shoe facing the magnet (its neck is inside the coil)
  S.extruded(`pole${i}.shoe`, [...sector(8.6, 12.2, A0, A1, 8)], 22, 16, {tone: 'hi', meta: {owner: 'core', touch: [`coil${i}`]}, ...RO});
  // the coil: one wound block round the neck; a short neck joins it to the shoe
  S.extruded(`coil${i}`, [t(COIL.r0, -COIL.half), t(COIL.r1, -COIL.half), t(COIL.r1, COIL.half), t(COIL.r0, COIL.half)], 23, 14, {tone: 'hi', lit: i === 0, meta: {touch: ['core.hub']}, ...RO});
  S.extruded(`pole${i}.neck`, [t(COIL.r1, -1.3), t(8.9, -1.3), t(8.9, 1.3), t(COIL.r1, 1.3)], 22, 16, {tone: 'mid', meta: {owner: 'core', touch: [`coil${i}`, `pole${i}.shoe`]}, ...RO});
  S.extruded(`commutator.seg${i}`, sector(2.6, 4.2, a - 0.95, a + 0.95, 8), STACK.comm[0], STACK.comm[1] - STACK.comm[0], {tone: 'hi', className: 'cl-mid', meta: {owner: 'commutator'}, ...RO});
});
// ── brushes (piece `brush`): two spring leaves pressing on the commutator, pads, bases, rivets, jumpers to the terminals
for (const [side, dx] of [['L', -1], ['R', 1]] as const) {
  const bx = CX + dx * 9;
  S.slab(`brush${side}.base`, {x: bx - 1.6, y: CY - 2.6, w: 3.2, d: 5.2, r: 0.4}, ZB, 3, {tone: 'mid', bevel: 0.3});
  S.ball(`brush${side}.rivet`, [bx, CY - 1, ZB + 3.3], 0.6, {tone: 'hi'});
  const lx = dx === 1 ? CX + 4.6 : bx - 1.6;
  S.slab(`brush${side}.leaf`, {x: lx, y: CY - 1.4, w: dx === 1 ? bx + 1.6 - (CX + 4.6) : CX - 4.6 - (bx - 1.6), d: 2.8, r: 0.2}, 14.5, 0.5, {tone: 'mid', bevel: 0.1, meta: {owner: `brush${side}`}});
  S.cyl(`brush${side}.pad`, CX + dx * 4.9, CY, 0.9, 12.4, 2.1, {tone: 'hi', meta: {owner: `brush${side}`}});
}
// terminals on the back shield: two pins with lugs and solder drops
for (const [side, dy] of [['L', -1], ['R', 1]] as const) {
  const tx = CX + dy * 11;
  S.slab(`terminal${side}.pin`, {x: tx - 0.9, y: CY + Math.sqrt(R * R - 121) - 0.6, w: 1.8, d: 4, r: 0.3}, Z0 + 1, 2, {tone: 'hi', meta: {owner: `terminal${side}`, touch: ['shield.back']}});
  S.slab(`terminal${side}.lug`, {x: tx - 1.4, y: CY + Math.sqrt(R * R - 121) + 3.4, w: 2.8, d: 3, r: 0.4}, Z0 + 1.6, 0.8, {tone: 'mid', meta: {owner: `terminal${side}`}});
  S.ball(`terminal${side}.solder`, [tx, CY + Math.sqrt(R * R - 121) + 4.9, Z0 + 3.2], 0.8, {tone: 'hi', meta: {owner: `terminal${side}`}});
}

// ── pulley on the shaft: hub, grooved wheel, set screw, a mark that shows the turn
S.turned('pulley.hub', [[ZT + 7, 3], [ZT + 10, 3]], AXIS, {tone: 'mid', ...sh, ...RO});
S.turned('pulley', [[ZT + 10, 5.5], [ZT + 10.8, 6], [ZT + 12.4, 4.2], [ZT + 14, 6], [ZT + 14.8, 5.5]], AXIS, {tone: 'hi', ...sh, ...RO});
S.cyl('pulley.screw', CX + 3.4, CY, 0.7, ZT + 7.6, 1.6, {tone: 'hi', ...sh, ...RO});

DC.applyKeys((KEYS as Record<string, Record<string, number>>).DC);

export const DC_CORNERS: Point3[] = [
  [10, 0, 0], [80, 0, 0], [10, 60, 0], [80, 60, 0], [CX, CY, ZT + 16], [CX + 20, CY + 20, ZT], [CX - 20, CY - 20, ZT],
];

/** Shapes of the turning armature (three pole shoes, three coils, three commutator segments) at angle theta, for the
 *  dynamic audit in scripts/object-audit.mjs: swept through a half turn they must not sink into the static motor
 *  (magnets, housing, shields). The brushes press on the commutator by design and are excused by the audit. */
export const dynamicShapes = (theta: number): {name: string; shape: unknown}[] => {
  const out: {name: string; shape: unknown}[] = [];
  POLE_ANGLES.forEach((a0, i) => {
    const a = a0 + theta;
    const ring = (r0: number, r1: number, w: number): Poly => sector(r0, r1, a - w, a + w, 8);
    out.push({name: `shoe${i}`, shape: A.extruded(ring(8.6, 12.2, 0.62), 22, 16, {name: `shoe${i}`})});
    out.push({name: `coil${i}`, shape: A.extruded(ring(COIL.r0 + 1, COIL.r1, 0.5), 23, 14, {name: `coil${i}`})});
    out.push({name: `seg${i}`, shape: A.extruded(ring(2.6, 4.2, 0.95), STACK.comm[0], STACK.comm[1] - STACK.comm[0], {name: `seg${i}`})});
  });
  return out;
};
