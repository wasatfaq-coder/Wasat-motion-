import {Assembly, Dyn, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import KEYS from './dcmotor.parts.keys.json';

// Hero A of «Как работает электромотор»: a small brushed DC motor (class 130) standing shaft up in a clamp, closed or in
// cutaway (parts-plan.md §1.1). Kit units; 10 kit units = 1 room unit. The axis is vertical through (CX, CY).
// The STATIC object (DC) is the base, the clamp, the housing in two halves, the shields, the magnets, the brushes and
// the terminals. The ARMATURE turns, so it is rebuilt at its angle every frame (rotorItems) and is never part of DC
// (object-audit `double`). The housing splits along a plane through the axis at azimuth SPLIT: the back-left half stays,
// the front-right half (piece `half`) slides out along its own centre line, so no point of it crosses the armature.
// Every ring sector (half-shells, magnets, clamp bands, shoes, segments) is built with Assembly.arc, which splits it
// at the silhouette azimuths (lint `arc`). The real motor has three coils and three commutator segments; the voice never
// gives a number. Coral = the conductor with current: coil 0 (lit), nothing else.
export const DC_U = 10;
export const DC_P = anatomyProjection(DC_U);
const P = DC_P;
export const CX = 45;
export const CY = 30;
const R = 15; // housing outer radius
const RI = 13.6; // inner radius
const Z0 = 4; // plate top
const ZB = 8; // back shield top
export const ZT = 58; // housing top
const POLE_ANGLES = [90, 210, 330].map((a) => (a * Math.PI) / 180);
const FRONT = Math.PI / 4; // toward the viewer: azimuth 45°
const SPLIT = FRONT + Math.PI / 3;
const HALF_DIR = SPLIT - Math.PI / 2;
/** the front half slides out along its own centre line: every point of it moves away from the armature */
export const HALF_MOVE: Point3 = [48 * Math.cos(HALF_DIR), 48 * Math.sin(HALF_DIR), 0];

const C: [number, number] = [CX, CY];
const polar = (r: number, a: number): [number, number] => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const down = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, -1]);
const AXIS = up(CX, CY, 0);
const HALF = {piece: 'half', move: HALF_MOVE};

export const DC = new Assembly('dc', P, {role: 'hero', order: ['half']});
const S = DC;

// ── base: plate, seven bolts, a column on a foot with two screws, a clamp in two halves with two screws and nuts
S.slab('plate', {x: 10, y: 0, w: 70, d: 60, r: 3}, 0, Z0, {tone: 'hi', halo: true, ground: true, bevel: 0.8, className: 'cl-mid', shadow: 'hero'});
for (const [x, y] of [
  [16, 6],
  [74, 6],
  [16, 54],
  [74, 54],
  [45, 54],
  [16, 30],
  [74, 30],
]) {
  S.disc(`bolt${x}_${y}.washer`, 0, 0.5, 3.4, up(x, y, Z0), {tone: 'mid', meta: {owner: `bolt${x}_${y}`}});
  S.turned(
    `bolt${x}_${y}.head`,
    [
      [0.5, 2.6],
      [2.1, 2.6],
      [2.7, 1.8, 1],
      [3, 0],
    ],
    up(x, y, Z0),
    {tone: 'hi', meta: {owner: `bolt${x}_${y}`}},
  );
}
const COL_Y1 = CY - (R + 2.2); // the column's front face touches the clamp band
S.slab('column.foot', {x: CX - 7, y: CY - 26, w: 14, d: 9, r: 0.8}, Z0, 2, {tone: 'mid', bevel: 0.4});
S.slab('column', {x: CX - 3, y: CY - 22, w: 6, d: COL_Y1 - (CY - 22), r: 0.6}, Z0 + 2, 32, {tone: 'mid', bevel: 0.4, meta: {touch: ['clamp.back']}});
for (const x of [CX - 5, CX + 5])
  S.turned(
    `column.screw${x}`,
    [
      [0, 1],
      [0.6, 1, 1],
      [0.8, 0],
    ],
    up(x, CY - 24, Z0 + 2),
    {tone: 'hi', meta: {owner: 'column.foot'}},
  );
S.arc('clamp.back', C, R, R + 2.2, SPLIT + 0.2, SPLIT + Math.PI - 0.2, 24, 5, {tone: 'mid', meta: {touch: ['shell.back1', 'column']}});
S.arc('clamp.front', C, R, R + 2.2, SPLIT - Math.PI + 0.2, SPLIT - 0.2, 24, 5, {tone: 'mid', ...HALF, meta: {touch: ['shell.front1']}});
for (const a of [SPLIT + 0.35, SPLIT + Math.PI - 0.35]) {
  const [x, y] = polar(R + 1.1, a);
  S.turned(
    `clamp.screw${a.toFixed(2)}`,
    [
      [0, 0.9],
      [1.2, 0.9],
      [1.6, 0.6, 1],
      [1.8, 0],
    ],
    up(x, y, 29),
    {tone: 'hi', meta: {owner: 'clamp.back'}},
  );
  S.turned(
    `clamp.nut${a.toFixed(2)}`,
    [
      [0, 0.9],
      [1.2, 0.9],
    ],
    down(x, y, 24),
    {tone: 'mid', meta: {owner: 'clamp.back'}},
  );
}

// ── housing: back half in three belts, front half (piece `half`) in three belts, a label with two rivets on the front
const belts: [number, number][] = [
  [ZB, 24],
  [24, 41],
  [41, ZT],
];
belts.forEach(([a, b], i) => {
  S.arc(`shell.back${i}`, C, RI, R, SPLIT, SPLIT + Math.PI, a, b - a, {tone: 'hi', meta: {owner: 'shell'}});
  S.arc(`shell.front${i}`, C, RI, R, SPLIT - Math.PI, SPLIT, a, b - a, {tone: 'hi', ...HALF, meta: {owner: 'shell'}});
});
S.arc('label', C, R, R + 0.25, FRONT - 0.55, FRONT + 0.25, 30, 9, {tone: 'mid', ...HALF, meta: {owner: 'shell.front1'}});
for (const a of [FRONT - 0.45, FRONT + 0.15]) S.ball(`label.rivet${a.toFixed(2)}`, [...polar(R + 0.55, a), 34.5], 0.45, {tone: 'hi', ...HALF, meta: {owner: 'label'}});

// ── shields: solid discs (the armature's shaft stops at them), bosses, a bushing, screws, three vents on the top one
S.disc('shield.back', Z0, ZB, R, AXIS, {tone: 'mid'});
S.disc('shield.back.boss', ZB, ZB + 2, 4.2, AXIS, {tone: 'hi'});
S.disc('shield.top', ZT, ZT + 3.6, R, AXIS, {tone: 'mid'});
S.disc('shield.top.boss', ZT + 3.6, ZT + 6.6, 4.4, AXIS, {tone: 'hi'});
S.disc('shield.top.bushing', ZT + 6.6, ZT + 7.2, 2, AXIS, {tone: 'mid'});
for (const a of [0.8, 2.4, 4.0, 5.5]) {
  const screw = [
    [0, 0.9],
    [0.5, 0.9, 1],
    [0.7, 0],
  ];
  S.turned(`shield.back.screw${a}`, screw, up(...polar(R - 3.2, a), ZB), {tone: 'hi', meta: {owner: 'shield.back'}});
  S.turned(`shield.top.screw${a}`, screw, up(...polar(R - 3.2, a), ZT + 3.6), {tone: 'hi', meta: {owner: 'shield.top'}});
}
for (const a of [1.2, 3.3, 5.4]) S.slab(`shield.top.vent${a}`, {x: polar(9, a)[0] - 1.8, y: polar(9, a)[1] - 0.5, w: 3.6, d: 1, r: 0.3}, ZT + 3.6, 0.3, {tone: 'mid', bevel: 0, meta: {owner: 'shield.top'}});

// ── magnets: two arcs (the back one fixed, the front one on the half), each held by two clips at its ends
S.arc('magnet.N', C, RI - 1.1, RI, SPLIT + 0.5, SPLIT + Math.PI - 0.5, 14, 34, {tone: 'mid', className: 'cl-mid'});
S.arc('magnet.S', C, RI - 1.1, RI, SPLIT - Math.PI + 0.5, SPLIT - 0.5, 14, 34, {tone: 'mid', className: 'cl-dark', ...HALF});
for (const [n, a0, half] of [
  ['clip.N0', SPLIT + 0.3, false],
  ['clip.N1', SPLIT + Math.PI - 0.5, false],
  ['clip.S0', SPLIT - Math.PI + 0.3, true],
  ['clip.S1', SPLIT - 0.5, true],
] as const)
  S.arc(n, C, RI - 0.6, RI, a0, a0 + 0.2, 20, 22, {tone: 'hi', ...(half ? HALF : {}), meta: {touch: [n.startsWith('clip.N') ? 'magnet.N' : 'magnet.S']}});

// ── brushes: a base on the back shield, a rivet, a stem, a spring leaf and a pad pressing on the commutator
export const BRUSH_Z = 14.5;
for (const [side, dx] of [
  ['L', -1],
  ['R', 1],
] as const) {
  const bx = CX + dx * 9;
  S.slab(`brush${side}.base`, {x: bx - 1.6, y: CY - 2.6, w: 3.2, d: 5.2, r: 0.4}, ZB, 3, {tone: 'mid', bevel: 0.3, meta: {owner: `brush${side}`}});
  S.ball(`brush${side}.rivet`, [bx, CY - 1.2, ZB + 3.3], 0.6, {tone: 'hi', meta: {owner: `brush${side}`}});
  S.slab(`brush${side}.stem`, {x: bx - 1.6, y: CY - 1.4 + 1.8, w: 3.2, d: 1, r: 0.2}, ZB + 3, BRUSH_Z - ZB - 3, {tone: 'mid', bevel: 0.1, meta: {owner: `brush${side}`}});
  const x0 = dx === 1 ? CX + 5.6 : bx - 1.6;
  const x1 = dx === 1 ? bx + 1.6 : CX - 5.6;
  S.slab(`brush${side}.leaf`, {x: x0, y: CY - 1.4, w: x1 - x0, d: 2.8, r: 0.2}, BRUSH_Z, 0.5, {tone: 'mid', bevel: 0.1, meta: {owner: `brush${side}`}});
  S.cyl(`brush${side}.pad`, CX + dx * 4.9, CY, 0.9, 12.4, BRUSH_Z - 12.4, {tone: 'hi', meta: {owner: `brush${side}`}});
}
// terminals on the side of the back shield: pins, lugs, solder drops
for (const [side, dx] of [
  ['L', -1],
  ['R', 1],
] as const) {
  const tx = CX + dx * 9;
  const y0 = CY + Math.sqrt(R * R - (Math.abs(tx - CX) + 0.9) ** 2) - 0.15; // the pin's inner corners on the shield's rim
  S.slab(`terminal${side}.pin`, {x: tx - 0.9, y: y0, w: 1.8, d: 4, r: 0.3}, Z0 + 1, 2, {tone: 'hi', meta: {owner: `terminal${side}`, touch: ['shield.back']}});
  S.slab(`terminal${side}.lug`, {x: tx - 1.4, y: y0 + 4, w: 2.8, d: 3, r: 0.4}, Z0 + 1.6, 0.8, {tone: 'mid', meta: {owner: `terminal${side}`}});
  S.ball(`terminal${side}.solder`, [tx, y0 + 5.5, Z0 + 2.9], 0.5, {tone: 'hi', meta: {owner: `terminal${side}`}});
}

DC.applyKeys((KEYS as Record<string, Record<string, number>>).DC);

// ── the armature (rebuilt at angle theta every frame): shaft in slices, commutator (hub, three segments, three leads),
// core (end plates, hub, three poles = neck + shoe), three coils (coil 0 lit), the pulley with its screw and a mark
export const STACK = {comm: [12, 19] as const, plateLow: [20.5, 22] as const, core: [22, 38] as const, plateTop: [38, 39.5] as const};
/** coil block: radii from the axis and half width (its corners stay inside the shoe's arc) */
export const COIL = {r0: 3.2, r1: 7.6, half: 3.4};
export const rotorItems = (theta: number, opacity?: number, litCoil: number | null = 0): Dyn[] => {
  const Rt = new Assembly('rotor', P, {role: 'secondary'});
  const sh = {meta: {owner: 'shaft'}};
  Rt.turned('shaft.a', [[ZB + 2, 1], [STACK.comm[0], 1]], AXIS, {tone: 'hi', ...sh});
  Rt.turned('commutator.hub', [[STACK.comm[0], 2.6], [STACK.comm[1], 2.6]], AXIS, {tone: 'mid', ...sh});
  Rt.turned('shaft.b', [[STACK.comm[1], 1], [STACK.plateLow[0], 1]], AXIS, {tone: 'hi', ...sh});
  Rt.disc('core.plate.low', STACK.plateLow[0], STACK.plateLow[1], 5.2, AXIS, {tone: 'mid', meta: {owner: 'core'}});
  Rt.turned('core.hub', [[STACK.core[0], 3.2], [STACK.core[1], 3.2]], AXIS, {tone: 'mid', meta: {owner: 'core'}});
  Rt.disc('core.plate.top', STACK.plateTop[0], STACK.plateTop[1], 5.2, AXIS, {tone: 'mid', meta: {owner: 'core'}});
  Rt.turned('shaft.c', [[STACK.plateTop[1], 1], [ZT, 1]], AXIS, {tone: 'hi', ...sh});
  POLE_ANGLES.forEach((a0, i) => {
    const a = a0 + theta;
    const t = (r: number, lat: number) => [CX + r * Math.cos(a) - lat * Math.sin(a), CY + r * Math.sin(a) + lat * Math.cos(a)] as [number, number];
    Rt.extruded(`pole${i}.neck`, [t(COIL.r1, -1.3), t(8.9, -1.3), t(8.9, 1.3), t(COIL.r1, 1.3)], STACK.core[0], 16, {tone: 'mid', meta: {owner: 'core'}});
    Rt.arc(`pole${i}.shoe`, C, 8.6, 12.2, a - 0.62, a + 0.62, STACK.core[0], 16, {tone: 'hi', meta: {owner: 'core'}});
    Rt.extruded(`coil${i}`, [t(COIL.r0, -COIL.half), t(COIL.r1, -COIL.half), t(COIL.r1, COIL.half), t(COIL.r0, COIL.half)], STACK.core[0] + 1, 14, {tone: 'hi', lit: i === litCoil, meta: {owner: `coil${i}`}});
    Rt.arc(`commutator.seg${i}`, C, 2.6, 4.2, a - 0.95, a + 0.95, STACK.comm[0], STACK.comm[1] - STACK.comm[0], {tone: 'hi', className: 'cl-mid', meta: {owner: 'commutator'}});
  });
  // the pulley above the top shield
  Rt.turned('shaft.d', [[ZT + 7.2, 1], [ZT + 8, 1]], AXIS, {tone: 'hi', ...sh});
  Rt.turned('pulley.hub', [[ZT + 8, 3], [ZT + 10, 3]], AXIS, {tone: 'mid', ...sh});
  Rt.turned(
    'pulley',
    [
      [ZT + 10, 5.5],
      [ZT + 10.8, 6],
      [ZT + 12.4, 4.2],
      [ZT + 14, 6],
      [ZT + 14.8, 5.5],
    ],
    AXIS,
    {tone: 'hi', ...sh},
  );
  Rt.turned('shaft.tip', [[ZT + 14.8, 1], [ZT + 16.4, 0.8, 1], [ZT + 16.8, 0]], AXIS, {tone: 'hi', ...sh});
  // the turn mark on the pulley's top and the set screw in the hub (they show the rotation)
  const [mx, my] = polar(4.2, theta + 0.3);
  Rt.slab('pulley.mark', {x: mx - 0.9, y: my - 0.9, w: 1.8, d: 1.8, r: 0.6}, ZT + 14.8, 0.2, {tone: 'lo', bevel: 0, meta: {owner: 'pulley'}});
  const sa = theta + Math.PI;
  Rt.turned(
    'pulley.screw',
    [
      [0, 0.6],
      [0.5, 0.6],
    ],
    G.frameAlong([...polar(2.9, sa), ZT + 9], [Math.cos(sa), Math.sin(sa), 0]),
    {tone: 'lo', meta: {owner: 'pulley.hub'}},
  );
  return Rt.dyn(opacity);
};

/** Shapes of the turning armature at angle theta, for the dynamic audit in scripts/object-audit.mjs: swept through a
 *  half turn they must not sink into the static motor (magnets, housing, shields). Built from the same items the scene
 *  draws, so the audit and the picture cannot drift apart. The brush pads press on the segments by design. */
export const dynamicShapes = (theta: number): {name: string; shape: unknown}[] => rotorItems(theta).flatMap((d) => d.shapes.map((shape) => ({name: d.name, shape})));
