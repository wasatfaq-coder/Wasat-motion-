import {Assembly, G, Point3} from '../../lib/assembly';
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

export const DC = new Assembly('dc', P, {
  role: 'hero',
  order: ['half', 'cap', 'rotor'],
  // wraps and rings that share an owner with their host cannot be ordered against it: excused by name
});
const S = DC;
const sh = {meta: {owner: 'shaft'}};

// ── base: plate, bolts, column, clamp
S.slab('plate', {x: 10, y: 0, w: 70, d: 60, r: 3}, 0, Z0, {tone: 'hi', halo: true, ground: true, bevel: 0.8, className: 'cl-mid'});
for (const [x, y] of [[16, 6], [74, 6], [16, 54], [74, 54], [45, 6], [45, 54], [16, 30], [74, 30]]) {
  S.disc(`bolt${x}${y}.washer`, 0, 0.5, 3.4, up(x, y, Z0), {tone: 'mid', meta: {owner: `bolt${x}${y}`}});
  S.turned(`bolt${x}${y}.head`, [[0.5, 2.6], [2.1, 2.6], [2.7, 1.8, 1], [3, 0]], up(x, y, Z0), {tone: 'hi', meta: {owner: `bolt${x}${y}`}});
}
S.slab('column', {x: CX - 3, y: CY - 22, w: 6, d: 5, r: 0.6}, Z0, 34, {tone: 'mid', bevel: 0.4});
S.slab('column.foot', {x: CX - 7, y: CY - 24, w: 14, d: 9, r: 0.8}, Z0, 2, {tone: 'mid', bevel: 0.4});
// the clamp: a back half fixed to the column and a front half (with the motor's front half) held by two screws
S.extruded('clamp.back', sector(R, R + 2.2, FRONT + Math.PI / 2 + 0.2, FRONT + (3 * Math.PI) / 2 - 0.2), 24, 5, {tone: 'mid', meta: {owner: 'clamp'}});
S.extruded('clamp.front', sector(R, R + 2.2, FRONT - Math.PI / 2 + 0.2, FRONT + Math.PI / 2 - 0.2), 24, 5, {tone: 'mid', piece: 'half', move: [26, 4, 0], meta: {owner: 'clamp'}});
for (const k of [-1, 1]) {
  const a = FRONT + (k * Math.PI) / 2;
  S.turned(`clamp.screw${k}`, [[0, 1.2], [1.4, 1.2], [1.9, 0.8, 1], [2.2, 0]], G.frameAlong([...polar(R + 1.1, a), 24], [0, 0, 1]) as never, {tone: 'hi', meta: {owner: 'clamp'}});
}

// ── housing: back half-shell in three belts, front half-shell (piece `half`) in three belts, seams, teeth
const belts: [number, number][] = [[ZB, 24], [24, 41], [41, ZT]];
belts.forEach(([a, b], i) => {
  S.extruded(`shell.back${i}`, sector(RI, R, FRONT + Math.PI / 2, FRONT + (3 * Math.PI) / 2), a, b - a, {tone: 'hi', meta: {owner: 'shell'}});
  S.extruded(`shell.front${i}`, sector(RI, R, FRONT - Math.PI / 2, FRONT + Math.PI / 2), a, b - a, {tone: 'hi', piece: 'half', move: [26, 4, 0], meta: {owner: 'shell'}});
});
// back shield (a ring: the shaft's bearing hole is real) with a boss, a bushing and four screws
S.ring('shield.back', Z0 - Z0, ZB - Z0, 1.3, R, G.frameAlong([CX, CY, Z0], [0, 0, 1]), {tone: 'mid'});
S.ring('shield.back.boss', 0, 2.2, 1.3, 4.2, G.frameAlong([CX, CY, ZB], [0, 0, 1]), {tone: 'hi'});
for (const a of [0.8, 2.4, 4.0, 5.5]) S.turned(`shield.back.screw${a}`, [[0, 0.9], [0.5, 0.9, 1], [0.7, 0]], up(...polar(R - 2, a), ZB), {tone: 'hi'});
// top shield (piece `cap`): a ring with a boss, a bushing, four screws, three vents
const CAP: {piece: string; move: Point3} = {piece: 'cap', move: [0, 0, 26]};
S.ring('shield.top', 0, 3.6, 1.3, R, G.frameAlong([CX, CY, ZT], [0, 0, 1]), {tone: 'mid', ...CAP});
S.ring('shield.top.boss', 0, 3, 1.3, 4.4, G.frameAlong([CX, CY, ZT + 3.6], [0, 0, 1]), {tone: 'hi', ...CAP});
S.ring('shield.top.bushing', 0, 1, 1.3, 2, G.frameAlong([CX, CY, ZT + 6.6], [0, 0, 1]), {tone: 'mid', ...CAP});
for (const a of [0.8, 2.4, 4.0, 5.5]) S.turned(`shield.top.screw${a}`, [[0, 0.9], [0.5, 0.9, 1], [0.7, 0]], up(...polar(R - 2, a), ZT + 3.6), {tone: 'hi', ...CAP});
for (const a of [1.2, 3.3, 5.4]) S.slab(`shield.top.vent${a}`, {x: polar(9, a)[0] - 1.8, y: polar(9, a)[1] - 0.5, w: 3.6, d: 1, r: 0.3}, ZT + 3.6, 0.3, {tone: 'mid', bevel: 0, ...CAP});
// crimp teeth where the housing is rolled over the shield, a label with two rivets
for (const a of [0.4, 2.0, 3.6, 5.2]) S.slab(`teeth${a}`, {x: polar(R - 0.7, a)[0] - 0.9, y: polar(R - 0.7, a)[1] - 0.9, w: 1.8, d: 1.8, r: 0.2}, ZB, 1.2, {tone: 'mid', bevel: 0});

// ── magnets: two arcs (the back one fixed, the front one on the half), clips
S.extruded('magnet.N', sector(RI - 1.1, RI, FRONT + Math.PI / 2 + 0.5, FRONT + (3 * Math.PI) / 2 - 0.5), 14, 34, {tone: 'mid', className: 'cl-mid'});
S.extruded('magnet.S', sector(RI - 1.1, RI, FRONT - Math.PI / 2 + 0.5, FRONT + Math.PI / 2 - 0.5), 14, 34, {tone: 'mid', className: 'cl-dark', piece: 'half', move: [26, 4, 0]});

// ── rotor (piece `rotor`): shaft, hub, three T poles, three coils, end plates, commutator with three segments
const RO: {piece: string; move: Point3} = {piece: 'rotor', move: [0, 0, 0]};
S.turned('shaft.low', [[6, 1], [14, 1]], AXIS, {tone: 'hi', ...sh, ...RO});
S.turned('shaft.mid', [[14, 1], [40, 1]], AXIS, {tone: 'hi', ...sh, ...RO});
S.turned('shaft.top', [[40, 1], [ZT + 13, 1]], AXIS, {tone: 'hi', ...sh, ...RO});
S.turned('core.hub', [[21, 3.2], [40, 3.2]], AXIS, {tone: 'mid', ...sh, ...RO});
for (const a of POLE_ANGLES) {
  // a T-shaped pole: a neck and a curved shoe
  const neck = 1.3;
  const t = (r: number, lat: number) => [CX + r * Math.cos(a) - lat * Math.sin(a), CY + r * Math.sin(a) + lat * Math.cos(a)] as [number, number];
  const A0 = a - 0.62;
  const A1 = a + 0.62;
  // the neck from the hub outward, then the shoe: its inner arc is the shoulder, its outer arc faces the magnet
  const pole: Poly = [t(3, -neck), t(8.6, -neck), polar(8.6, A0), ...sector(8.6, 12.2, A0, A1, 8).slice(0, 9), polar(8.6, A1), t(8.6, neck), t(3, neck)];
  S.extruded(`pole${Math.round((a * 180) / Math.PI)}`, pole, 22, 16, {tone: 'hi', meta: {owner: 'core'}, ...RO});
}
S.disc('core.plate.low', 20, 22, 5.2, AXIS, {tone: 'mid', meta: {owner: 'core'}, ...RO});
S.disc('core.plate.top', 38, 40, 5.2, AXIS, {tone: 'mid', meta: {owner: 'core'}, ...RO});
POLE_ANGLES.forEach((a, i) => {
  // a coil round the pole's neck: three winding layers (the first lit: the conductor with current), tape bands
  const t = (r: number, lat: number) => [CX + r * Math.cos(a) - lat * Math.sin(a), CY + r * Math.sin(a) + lat * Math.cos(a)] as [number, number];
  for (let k = 0; k < 3; k++) {
    const r0 = 4.3 + k * 1.3;
    // the winding passes either side of the neck (a hollow wrap cannot be one solid): two flanks per layer
    for (const [side, l0, l1] of [['a', -3.6, -1.3], ['b', 1.3, 3.6]] as const) {
      S.extruded(`coil${i}.layer${k}${side}`, [t(r0, l0), t(r0 + 1.3, l0), t(r0 + 1.3, l1), t(r0, l1)], 23, 14, {tone: 'hi', lit: i === 0, meta: {owner: `coil${i}`}, ...RO});
    }
  }
});
// commutator: an insulating hub and three segments with gaps, under the core
S.turned('commutator.hub', [[10, 2.6], [20, 2.6]], AXIS, {tone: 'mid', ...sh, ...RO});
POLE_ANGLES.forEach((a, i) => S.extruded(`commutator.seg${i}`, sector(2.6, 4.2, a - 0.95, a + 0.95, 8), 12, 7, {tone: 'hi', className: 'cl-mid', meta: {owner: 'commutator'}, ...RO}));
for (const [i, z] of [[0, 9], [1, 21], [2, 40.2], [3, 56]] as const) S.disc(`washer${i}`, z, z + 0.8, 2.2, AXIS, {tone: 'mid', ...sh, ...RO});

// ── brushes (piece `brush`): two spring leaves pressing on the commutator, pads, bases, rivets, jumpers to the terminals
for (const [side, dx] of [['L', -1], ['R', 1]] as const) {
  const bx = CX + dx * 9;
  S.slab(`brush${side}.base`, {x: bx - 1.6, y: CY - 2.6, w: 3.2, d: 5.2, r: 0.4}, ZB, 3, {tone: 'mid', bevel: 0.3});
  S.ball(`brush${side}.rivet`, [bx, CY - 1, ZB + 3.3], 0.6, {tone: 'hi'});
  const lx = dx === 1 ? CX + 4.6 : bx - 1.6;
  S.slab(`brush${side}.leaf`, {x: lx, y: CY - 1.4, w: dx === 1 ? bx + 1.6 - (CX + 4.6) : CX - 4.6 - (bx - 1.6), d: 2.8, r: 0.2}, 14.5, 0.5, {tone: 'mid', bevel: 0.1, meta: {owner: `brush${side}`}, piece: 'brush', move: [0, 0, 0]});
  S.cyl(`brush${side}.pad`, CX + dx * 4.9, CY, 0.9, 12.4, 2.1, {tone: 'hi', meta: {owner: `brush${side}`}, piece: 'brush', move: [0, 0, 0]});
}
// terminals on the back shield: two pins with lugs and solder drops
for (const [side, dy] of [['L', -1], ['R', 1]] as const) {
  const tx = CX + dy * 11;
  S.slab(`terminal${side}.pin`, {x: tx - 0.9, y: CY + 13.6, w: 1.8, d: 3.4, r: 0.3}, Z0 + 1, 2, {tone: 'hi', meta: {owner: `terminal${side}`}});
  S.slab(`terminal${side}.lug`, {x: tx - 1.4, y: CY + 16.6, w: 2.8, d: 3, r: 0.4}, Z0 + 0.8, 0.8, {tone: 'mid', meta: {owner: `terminal${side}`}});
  S.ball(`terminal${side}.solder`, [tx, CY + 18, Z0 + 2], 0.8, {tone: 'hi', meta: {owner: `terminal${side}`}});
}

// ── pulley on the shaft: hub, grooved wheel, set screw, a mark that shows the turn
S.turned('pulley.hub', [[ZT + 7, 3], [ZT + 10, 3]], AXIS, {tone: 'mid', ...sh, ...RO});
S.turned('pulley', [[ZT + 10, 5.5], [ZT + 10.8, 6], [ZT + 12.4, 4.2], [ZT + 14, 6], [ZT + 14.8, 5.5]], AXIS, {tone: 'hi', ...sh, ...RO});
S.cyl('pulley.screw', CX + 3.4, CY, 0.7, ZT + 7.6, 1.6, {tone: 'hi', ...sh, ...RO});

DC.applyKeys((KEYS as Record<string, Record<string, number>>).DC);

export const DC_CORNERS: Point3[] = [
  [10, 0, 0], [80, 0, 0], [10, 60, 0], [80, 60, 0], [CX, CY, ZT + 16], [CX + 20, CY + 20, ZT], [CX - 20, CY - 20, ZT],
];
