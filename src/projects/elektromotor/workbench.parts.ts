import {Assembly, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import KEYS from './workbench.parts.keys.json';

// Environment of scenes 1 and 7 of «Как работает электромотор»: the workbench the motor stands on (parts-plan.md §1.4,
// cut to the §22.2 share: ≤ 40 % of hero A's 112 parts). The SAME kit units as hero A (dcmotor.parts.ts, 10 kit units =
// 1 room unit): the motor's clamp plate (x 0…90, y 0…60) stands on the table top at z = 0, so the scene draws both
// assemblies in one projection without moving either. The viewer looks from +x +y (a larger x + y is nearer and lower
// on screen): the pegboard wall is at the back (small y), the front edge of the top is at y = TOP.y1.
// Nothing here is coral (coral = the conductor with current); the spool of wire on the mat carries no current.
export const BENCH_U = 10;
export const BENCH_P = anatomyProjection(BENCH_U);
const P = BENCH_P;

export const TOP = {x0: -130, x1: 190, y0: -40, y1: 110, z: 0, t: 6};
const WALL_Y = -50; // the pegboard's face toward the viewer
const out = (x: number, z: number) => G.frameAlong([x, WALL_Y, z], [0, 1, 0]); // from the wall toward the viewer
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const down = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, -1]);

export const BENCH = new Assembly('bench', P, {role: 'environment'});
const B = BENCH;

// ── table: five boards on four aprons and four legs, a front edge rail, a lower shelf
const boardD = (TOP.y1 - TOP.y0) / 5;
for (let k = 0; k < 5; k++)
  B.slab(`top.board${k}`, {x: TOP.x0, y: TOP.y0 + k * boardD + 0.3, w: TOP.x1 - TOP.x0, d: boardD - 0.6, r: 0.4}, TOP.z - TOP.t, TOP.t, {tone: 'lo', bevel: 0.6, meta: {touch: ['apron.front', 'apron.back', 'apron.left', 'apron.right']}});
// the edge rail is glued to the front board's face (boards are inset 0.3 on each side for the seams)
B.slab('top.edge', {x: TOP.x0, y: TOP.y1 - 0.3, w: TOP.x1 - TOP.x0, d: 3, r: 0.4}, TOP.z - TOP.t - 4, TOP.t + 4, {tone: 'mid', bevel: 0.6, meta: {touch: ['top.board4']}});
const LEG = 7;
const LEG_Z = -90;
for (const [n, x, y] of [
  ['legLB', TOP.x0 + 6, TOP.y0 + 6],
  ['legRB', TOP.x1 - 6 - LEG, TOP.y0 + 6],
  ['legLF', TOP.x0 + 6, TOP.y1 - 6 - LEG],
  ['legRF', TOP.x1 - 6 - LEG, TOP.y1 - 6 - LEG],
] as const)
  B.slab(n, {x, y, w: LEG, d: LEG, r: 0.6}, LEG_Z, TOP.z - TOP.t - LEG_Z, {tone: 'mid', bevel: 0.5, ground: true});
B.slab('apron.front', {x: TOP.x0 + 6 + LEG, y: TOP.y1 - 6 - LEG + 1.5, w: TOP.x1 - TOP.x0 - 12 - 2 * LEG, d: 4, r: 0.3}, TOP.z - TOP.t - 12, 12, {tone: 'mid', bevel: 0.4});
B.slab('apron.back', {x: TOP.x0 + 6 + LEG, y: TOP.y0 + 6 + 1.5, w: TOP.x1 - TOP.x0 - 12 - 2 * LEG, d: 4, r: 0.3}, TOP.z - TOP.t - 12, 12, {tone: 'mid', bevel: 0.4});
B.slab('apron.left', {x: TOP.x0 + 6 + 1.5, y: TOP.y0 + 6 + LEG, w: 4, d: TOP.y1 - TOP.y0 - 12 - 2 * LEG, r: 0.3}, TOP.z - TOP.t - 12, 12, {tone: 'mid', bevel: 0.4});
B.slab('apron.right', {x: TOP.x1 - 6 - 5.5, y: TOP.y0 + 6 + LEG, w: 4, d: TOP.y1 - TOP.y0 - 12 - 2 * LEG, r: 0.3}, TOP.z - TOP.t - 12, 12, {tone: 'mid', bevel: 0.4});
B.slab('shelf', {x: TOP.x0 + 6 + LEG, y: TOP.y0 + 6, w: TOP.x1 - TOP.x0 - 12 - 2 * LEG, d: TOP.y1 - TOP.y0 - 12, r: 0.6}, LEG_Z + 22, 4, {tone: 'lo', bevel: 0.5, meta: {touch: ['legLB', 'legRB', 'legLF', 'legRF']}});

// ── a rubber mat under the motor and the battery, with four marking lines (no numbers)
const MAT = {x: -105, y: -18, w: 215, d: 112};
B.slab('mat', {...MAT, r: 4}, TOP.z, 1, {tone: 'mid', bevel: 0.3});
for (let k = 0; k < 4; k++) B.slab(`mat.line${k}`, {x: MAT.x + 8, y: MAT.y + 12 + k * 28, w: MAT.w - 16, d: 0.8, r: 0}, TOP.z + 1, 0.2, {tone: 'lo', bevel: 0});

// ── the pegboard on the back wall: panel, frame of four rails, a 3 × 4 grid of holes
const PEG = {x0: -120, x1: 175, z0: 6, z1: 150};
B.slab('peg.panel', {x: PEG.x0, y: WALL_Y - 3, w: PEG.x1 - PEG.x0, d: 3, r: 0.3}, PEG.z0, PEG.z1 - PEG.z0, {tone: 'mid', bevel: 0.4, ground: true});
B.slab('peg.rail.bottom', {x: PEG.x0, y: WALL_Y, w: PEG.x1 - PEG.x0, d: 2, r: 0.3}, PEG.z0, 5, {tone: 'lo', bevel: 0.3});
B.slab('peg.rail.top', {x: PEG.x0, y: WALL_Y, w: PEG.x1 - PEG.x0, d: 2, r: 0.3}, PEG.z1 - 5, 5, {tone: 'lo', bevel: 0.3});
B.slab('peg.rail.left', {x: PEG.x0, y: WALL_Y, w: 5, d: 2, r: 0.3}, PEG.z0 + 5, PEG.z1 - PEG.z0 - 10, {tone: 'lo', bevel: 0.3});
B.slab('peg.rail.right', {x: PEG.x1 - 5, y: WALL_Y, w: 5, d: 2, r: 0.3}, PEG.z0 + 5, PEG.z1 - PEG.z0 - 10, {tone: 'lo', bevel: 0.3});
const HOLES_X = [-60, 0, 120, 160];
const HOLES_Z = [40, 80, 120];
for (const x of HOLES_X) for (const z of HOLES_Z) B.disc(`peg.hole${x}_${z}`, 0, 0.3, 1.6, out(x, z), {tone: 'lo', meta: {owner: 'peg.panel'}});

// ── a screwdriver hanging on a peg of the wall, a spool of wire standing on the mat (props: they say «workshop»)
const PEG_X = -95;
const PEG_Z = 118;
B.turned(
  'peg.hook',
  [
    [0, 0.9],
    [7, 0.9],
    [7.6, 0.4],
  ],
  out(PEG_X, PEG_Z),
  {tone: 'lo', meta: {owner: 'peg.panel'}},
);
const hang = down(PEG_X, WALL_Y + 4, PEG_Z - 0.9);
B.turned(
  'screwdriver.handle',
  [
    [0, 2.6],
    [12, 3.2, 1],
    [14, 2.2],
  ],
  hang,
  {tone: 'hi', meta: {touch: ['peg.hook']}},
);
B.turned(
  'screwdriver.shaft',
  [
    [14, 0.9],
    [36, 0.9],
    [38, 0.3],
  ],
  hang,
  {tone: 'mid', meta: {owner: 'screwdriver.handle'}},
);
const spoolAxis = up(150, 70, TOP.z);
B.disc('spool.base', 0, 1.6, 11, spoolAxis, {tone: 'mid', meta: {touch: ['top.board3', 'top.board4']}});
B.turned(
  'spool.wire',
  [
    [1.6, 7],
    [10.4, 7],
  ],
  spoolAxis,
  {tone: 'lo', meta: {owner: 'spool.base'}},
);
B.disc('spool.top', 10.4, 12, 11, spoolAxis, {tone: 'mid', meta: {owner: 'spool.wire'}});

BENCH.applyKeys((KEYS as Record<string, Record<string, number>>).BENCH);

/** Corners of the table top (for framing a wide shot). */
export const BENCH_CORNERS: Point3[] = [
  [TOP.x0, TOP.y0, TOP.z],
  [TOP.x1, TOP.y0, TOP.z],
  [TOP.x0, TOP.y1, TOP.z],
  [TOP.x1, TOP.y1, TOP.z],
  [PEG.x0, WALL_Y, PEG.z1],
  [PEG.x1, WALL_Y, PEG.z1],
];
