import {Assembly, G, Point3} from '../../lib/assembly';
import {DC_P} from './dcmotor.parts';
import KEYS from './battery.parts.keys.json';

// The circuit of scenes 1 and 7 of «Как работает электромотор»: two cells in a holder on the mat and two wires to the
// motor's terminals (parts-plan.md §1.3). The SAME kit units and projection as hero A (dcmotor.parts.ts) and the
// workbench (mat top z = 1), so the scene draws them together without moving any. The holder lies left of the motor
// (cells along x); its output lugs face the motor. Coral = the conductor with current: both wires (lit), nothing in the
// holder. The wires end at the motor's terminal lugs (dcmotor.parts.ts: radial pins at azimuths FRONT ± 0.55 out of the
// back shield's rim, z 6): wire L comes in front of the plate, wire R round its back, so the two never cross.
export const CELL = new Assembly('circuit', DC_P, {role: 'secondary'});
const B = CELL;

const MAT_Z = 1; // the workbench mat's top
const Z0 = MAT_Z + 2; // the tray's floor
const X0 = -70; // the spring end wall's outer face
const X1 = -34; // the output end wall's outer face
const Y0 = 25;
const Y1 = 55;
const CELL_R = 6;
const CELL_Z = Z0 + CELL_R; // the cells lie on the tray floor
const CELL_Y = [33, 47];
const POST = 3.2;
const W = 1.9; // thick leads of a teaching set: they must read in the wide shot of scene 1 (still-check coral share)
const along = (x: number, y: number, z: number, dir: 1 | -1) => G.frameAlong([x, y, z], [dir, 0, 0]);

// ── tray: floor, two side walls, two end walls, a rib between the cells, four screws, two latch tabs
B.slab('tray', {x: X0, y: Y0, w: X1 - X0, d: Y1 - Y0, r: 1.2}, MAT_Z, 2, {tone: 'mid', bevel: 0.4, ground: true});
B.slab('wall.back', {x: X0 + 2, y: Y0, w: X1 - X0 - 4, d: 1.5, r: 0.3}, Z0, 7, {tone: 'mid', bevel: 0.3, meta: {touch: ['tray']}});
B.slab('wall.front', {x: X0 + 2, y: Y1 - 1.5, w: X1 - X0 - 4, d: 1.5, r: 0.3}, Z0, 7, {tone: 'mid', bevel: 0.3, meta: {touch: ['tray']}});
B.slab('end.spring', {x: X0, y: Y0, w: 2, d: Y1 - Y0, r: 0.4}, Z0, 12, {tone: 'mid', bevel: 0.3, meta: {touch: ['tray']}});
B.slab('end.out', {x: X1 - 2.4, y: Y0, w: 2.4, d: Y1 - Y0, r: 0.4}, Z0, 12, {tone: 'mid', bevel: 0.3, meta: {touch: ['tray']}});
B.slab('rib', {x: X0 + 6, y: 39.5, w: X1 - X0 - 12, d: 1, r: 0.2}, Z0, 2, {tone: 'mid', bevel: 0.1, meta: {owner: 'tray'}});
for (const [x, y] of [
  [X0 + 3.5, Y0 + 3.5],
  [X1 - 4.5, Y0 + 3.5],
  [X0 + 3.5, Y1 - 3.5],
  [X1 - 4.5, Y1 - 3.5],
])
  B.turned(
    `screw${x}_${y}`,
    [
      [0, 0.9],
      [0.4, 0.9, 1],
      [0.6, 0],
    ],
    G.frameAlong([x, y, Z0], [0, 0, 1]),
    {tone: 'hi', meta: {owner: 'tray'}},
  );
for (const y of [Y0, Y1 - 0.6]) B.slab(`latch${y}`, {x: (X0 + X1) / 2 - 2.5, y, w: 5, d: 0.6, r: 0.2}, Z0 + 7, 1.2, {tone: 'mid', bevel: 0.1, meta: {owner: y === Y0 ? 'wall.back' : 'wall.front'}});

// ── two cells in series: cell 0 has its + end at the output wall, cell 1 its − end there; body, label band, + nub, − cap
const BODY = 26;
CELL_Y.forEach((y, i) => {
  const plus = i === 0 ? 1 : -1; // direction from − to +
  const s0 = plus === 1 ? X0 + 4.4 : X1 - 3.6; // the − end
  const F = along(s0, y, CELL_Z, plus);
  // the body in three belts (two bare ends and the label between them): a ring over a rod has no paint order
  const belt = (n: string, a: number, b: number, tone: 'hi' | 'mid', ra: number, rb: number) =>
    B.turned(
      `cell${i}.${n}`,
      [
        [a, ra],
        [a + 0.5, CELL_R, 1],
        [b - 0.5, CELL_R, 1],
        [b, rb],
      ],
      F,
      {tone, meta: {owner: `cell${i}`}},
    );
  belt('end0', 0, 4, 'hi', CELL_R - 0.5, CELL_R);
  belt('label', 4, BODY - 4, 'mid', CELL_R, CELL_R);
  belt('end1', BODY - 4, BODY, 'hi', CELL_R, CELL_R - 0.5);
  B.turned(
    `cell${i}.nub`,
    [
      [BODY, 2],
      [BODY + 0.8, 2, 1],
      [BODY + 1, 0],
    ],
    F,
    {tone: 'hi', meta: {owner: `cell${i}`}},
  );
  B.disc(`cell${i}.cap`, -0.2, 0, CELL_R - 1, F, {tone: 'mid', meta: {owner: `cell${i}`}});
  // polarity marks moulded in the tray floor beside the cell: a plus (two bars) at the + end, a minus at the − end
  const xp = plus === 1 ? X1 - 9 : X0 + 7;
  const xm = plus === 1 ? X0 + 7 : X1 - 9;
  const ym = y + (i === 0 ? -CELL_R + 0.6 : CELL_R - 2.6);
  B.slab(`mark${i}.plus.h`, {x: xp - 1, y: ym + 0.75, w: 2, d: 0.5, r: 0}, Z0, 0.2, {tone: 'lo', bevel: 0, meta: {owner: 'tray'}});
  B.slab(`mark${i}.plus.v`, {x: xp - 0.25, y: ym, w: 0.5, d: 2, r: 0}, Z0, 0.2, {tone: 'lo', bevel: 0, meta: {owner: 'tray'}});
  B.slab(`mark${i}.minus`, {x: xm - 1, y: ym + 0.75, w: 2, d: 0.5, r: 0}, Z0, 0.2, {tone: 'lo', bevel: 0, meta: {owner: 'tray'}});
});

// ── contacts: a coil spring (a plate and four turns) for each cell at the spring wall, a flat plate at the output wall,
// a bridge strip joining the two springs (series), and an output lug with a solder drop through the output wall
CELL_Y.forEach((y, i) => {
  const F = along(X0 + 2, y, CELL_Z, 1);
  B.disc(`spring${i}.plate`, 0, 0.3, 4, F, {tone: 'hi', meta: {owner: `spring${i}`, touch: ['end.spring']}});
  for (let k = 0; k < 4; k++) B.ring(`spring${i}.turn${k}`, 0.3 + k * 0.5, 0.8 + k * 0.5, 2.4 - k * 0.15, 3 - k * 0.15, F, {tone: 'hi', meta: {owner: `spring${i}`}});
  B.slab(`plate${i}`, {x: X1 - 2.9, y: y - 3, w: 0.5, d: 6, r: 0.2}, CELL_Z - 3, 6, {tone: 'hi', bevel: 0.05, meta: {touch: ['end.out']}});
  // the output post: a round pin out of the wall (the wire's end seats on its flat end)
  B.disc(`post${i}`, 0, POST, W + 0.4, along(X1, y, CELL_Z, 1), {tone: 'hi', meta: {owner: `plate${i}`, touch: ['end.out']}});
});
B.slab('bridge', {x: X0 + 2, y: CELL_Y[0] - 1, w: 0.4, d: CELL_Y[1] - CELL_Y[0] + 2, r: 0.2}, CELL_Z - 4.5, 1.6, {tone: 'hi', bevel: 0.05, meta: {owner: 'spring0', touch: ['end.spring']}});

// ── the wires (coral: the conductor with current) from the lugs to the motor's terminals, with a sleeve at each end
// motor terminals (dcmotor.parts.ts): centre (45, 30), lug at radius ≈ 19.3, azimuths 45° ± 0.55 rad, z 6
const TERM = (a: number, r: number): Point3 => [45 + r * Math.cos(a), 30 + r * Math.sin(a), 6];
const AL = Math.PI / 4 + 0.55;
const AR = Math.PI / 4 - 0.55;
const GROUND = MAT_Z + W;
/** wire L (to the left terminal) runs in front of the motor's plate; wire R round the plate's back */
const TL = TERM(AL, 25);
// a corner on the mat between +x and +y needs a wide bend: tight, it folds on screen (the view is along x + y);
// both wires leave the posts level, ramp down to the mat, and climb back to the terminal by a ramp (no vertical step:
// the audit's `fold`), clearing the motor's plate edge (z 4) by more than their radius
export const WIRE_L: Point3[] = [[X1 + POST, CELL_Y[1], CELL_Z], [X1 + 5, CELL_Y[1], CELL_Z], [X1 + 11, CELL_Y[1], GROUND], [X1 + 11, 70, GROUND], [TL[0], 70, GROUND], [TL[0], 57, 6], TERM(AL, 20.4)];
export const WIRE_R: Point3[] = [[X1 + POST, CELL_Y[0], CELL_Z], [X1 + 5, CELL_Y[0], CELL_Z], [X1 + 11, CELL_Y[0], GROUND], [X1 + 11, -8, GROUND], [88, -8, GROUND], [88, 35.6, GROUND], [78, 35.6, 6], TERM(AR, 20.4)];
// the far end presses on the motor's terminal lug, a part of another assembly (dcmotor.parts.ts): not seated here
const WIRE = {bend: 9, limp: true, lit: true, maxLength: 4, ends: [true, false] as [boolean, boolean]};
B.pipe('wireL', WIRE_L, W, {...WIRE, meta: {touch: ['post1', 'tray']}});
B.pipe('wireR', WIRE_R, W, {...WIRE, meta: {touch: ['post0', 'tray']}});

CELL.applyKeys((KEYS as Record<string, Record<string, number>>).CELL);
