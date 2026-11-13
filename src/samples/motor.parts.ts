import {Assembly, G, Point3} from '../lib/assembly';
import {anatomyProjection} from '../lib/anatomy';
import KEYS from './motor.parts.keys.json';

// Kit sample (§22): a small electric motor on a base plate, built with Assembly so every part is drawn AND recorded
// for scripts/object-audit.mjs. Exercises turned parts on two axes (can, caps, shaft, pulley along x; bolts along z),
// fins, a cable with a gland, and parts sharing an owner. Illustrative geometry, not a real motor (no dossier).
export const MOTOR_U = 10; // kit units per room unit
export const MOTOR_P = anatomyProjection(MOTOR_U);

const Z = 25; // motor axis height
const R = 15; // can radius
const top = Z + R; // 40: top of the can
export const MOTOR_AXIS = G.frameAlong([12, 25, Z], [1, 0, 0]) as {o: Point3; a: Point3; u: Point3; v: Point3};
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

/** The motor in two builds: `lit` picks its one coral part (the pulley, or the terminals inside the box); the box
 *  lid and its screws are a piece that can lift off (svg({lid: 1})). */
const build = (name: string, lit: 'pulley' | 'terminals' | 'stator', withLid = true) => {
  const M = new Assembly(name, MOTOR_P, {
    role: 'hero',
    order: ['lid'],
    // the box base is seated 1.6 into the can's curve: the sliver where the can is "in front" is the buried base
    allow: [[`${name}.box`, `${name}.can*`]],
  });

  // base plate (stands on the floor) and its four corner bolts with washers
  M.slab('base', {x: 0, y: 0, w: 82, d: 50, r: 3}, 0, 4, {tone: 'hi', halo: true, ground: true, bevel: 0.8});
  const bolt = (name: string, x: number, y: number, z: number) => {
    M.disc(`${name}.washer`, 0, 0.6, 3.4, up(x, y, z), {tone: 'mid', meta: {owner: name}});
    M.turned(
      `${name}.head`,
      [
        [0.6, 2.6],
        [2.2, 2.6],
        [2.8, 1.8, 1],
        [3.1, 0],
      ],
      up(x, y, z),
      {tone: 'hi', meta: {owner: name}},
    );
  };
  for (const [x, y] of [
    [5, 5],
    [77, 5],
    [5, 45],
    [77, 45],
  ])
    bolt(`bolt${x}${y}`, x, y, 4);

  // two saddle brackets: a flange plate and a block; the can rests on the blocks
  for (const x0 of [18, 48]) {
    M.slab(`bracket${x0}.flange`, {x: x0, y: 7, w: 8, d: 36, r: 1}, 4, 2, {tone: 'mid', bevel: 0.3});
    M.slab(`bracket${x0}.block`, {x: x0 + 1, y: 15, w: 6, d: 20, r: 1}, 6, Z - R - 6, {tone: 'mid', bevel: 0.3});
    for (const y of [10, 40]) bolt(`bracket${x0}.bolt${y}`, x0 + 4, y, 6);
  }

  // the can is cut into slices between the fins, so every slice and fin paints in order along the axis (a ring
  // round a body can't be ordered against it); one owner joins the can, its caps, fins and terminal box
  const can = {meta: {owner: 'can'}};
  const FINS = [2, 4.5, 14.5, 16.5, 33, 35, 44.5, 47]; // free of the brackets (s 7–13, 37–43) and the box (s 18–32)
  let s0 = 0;
  for (const f of [...FINS, 50]) {
    if (f > s0)
      M.turned(
        `can.${s0}`,
        [
          [s0, R],
          [f, R],
        ],
        MOTOR_AXIS,
        {tone: 'hi', lathe: {rims: 'none'}, lit: lit === 'stator', ...can},
      );
    if (f < 50) M.disc(`fin${f}`, f, f + 1, R + 1.8, MOTOR_AXIS, {tone: 'mid', ...can});
    s0 = f + 1;
  }
  M.turned(
    'cap.rear',
    [
      [-4, 9],
      [-2.6, 12.6, 1],
      [-1, 14.6, 1],
      [0, R],
    ],
    MOTOR_AXIS,
    {tone: 'hi', ...can},
  );
  M.turned(
    'cap.front',
    [
      [50, R],
      [51, 14.6, 1],
      [52.6, 12.6, 1],
      [54, 9],
    ],
    MOTOR_AXIS,
    {tone: 'hi', ...can},
  );
  // shaft, hub and pulley in axial order (the hub and the pulley are solid round the shaft)
  const shaft = {meta: {owner: 'shaft'}};
  M.turned(
    'shaft',
    [
      [54, 2.2],
      [60, 2.2],
    ],
    MOTOR_AXIS,
    {tone: 'hi', ...shaft},
  );
  M.turned(
    'pulley.hub',
    [
      [60, 3.6],
      [62, 3.6],
    ],
    MOTOR_AXIS,
    {tone: 'mid', ...shaft},
  );
  M.turned(
    'pulley',
    [
      [62, 7],
      [63, 7.6],
      [66, 7.6],
      [67, 7],
    ],
    MOTOR_AXIS,
    {tone: 'hi', lit: lit === 'pulley', ...shaft},
  );
  M.turned(
    'shaft.tip',
    [
      [67, 2.2],
      [69.4, 2.2],
      [70, 1.6],
    ],
    MOTOR_AXIS,
    {tone: 'hi', ...shaft},
  );

  // terminal box on top of the can (sunk into its curve, same owner), lid and four lid screws; nameplate on the base
  // the box bottom sits just above the can surface at its edges (y 18/32: z 38.27) and sinks 1.6 at the centre
  M.slab('box', {x: 30, y: 18, w: 14, d: 14, r: 1.2}, top - 1.6, 7.4, {tone: 'hi', bevel: 0.4, ...can});
  // terminal block and three terminals on the box top, hidden under the lid until it lifts
  M.slab('box.block', {x: 32, y: 21, w: 10, d: 8, r: 0.6}, top + 5.8, 0.6, {tone: 'mid', bevel: 0.2, ...can});
  for (const x of [34, 37, 40]) M.cyl(`box.terminal${x}`, x, 25, 1.4, top + 6.4, 0.6, {tone: 'hi', lit: lit === 'terminals', ...can});
  // the box walls rise round the terminals (the lid rests on them); two screws hold the terminal block
  for (const [nm, plan] of [
    ['wall.n', {x: 30, y: 18, w: 14, d: 0.9, r: 0.2}],
    ['wall.s', {x: 30, y: 31.1, w: 14, d: 0.9, r: 0.2}],
    ['wall.w', {x: 30, y: 18.9, w: 0.9, d: 12.2, r: 0.2}],
    ['wall.e', {x: 43.1, y: 18.9, w: 0.9, d: 12.2, r: 0.2}],
  ] as const)
    M.slab(`box.${nm}`, plan, top + 5.8, 2, {tone: 'hi', bevel: 0.1, ...can});
  for (const x of [33, 41]) M.turned(`box.block.screw${x}`, [[0, 0.6], [0.3, 0.6], [0.45, 0]], up(x, 22.2, top + 6.4), {tone: 'mid', ...can});
  const lid = {piece: 'lid', move: [0, 0, 22] as Point3};
  if (withLid) M.slab('box.lid', {x: 29.5, y: 17.5, w: 15, d: 15, r: 1.4}, top + 7.8, 1.4, {tone: 'hi', bevel: 0.4, ...can, ...lid});
  if (withLid) for (const [x, y] of [
    [31.6, 19.6],
    [42.4, 19.6],
    [31.6, 30.4],
    [42.4, 30.4],
  ])
    M.turned(
      `box.screw${x}${y}`,
      [
        [0, 0.9],
        [0.5, 0.9, 1],
        [0.8, 0],
      ],
      up(x, y, top + 9.2),
      {tone: 'hi', ...can, ...lid},
    );
  M.slab('nameplate', {x: 58, y: 39, w: 12, d: 8, r: 0.6}, 4, 0.4, {tone: 'mid', bevel: 0});

  // cable gland on the box side (along +y) and the cable: out of the gland, over the base edge, down to the floor
  const gland = G.frameAlong([37, 32, top + 2], [0, 1, 0]);
  M.turned(
    'gland',
    [
      [0, 3.2],
      [2.6, 3.2],
      [3.2, 2.4, 1],
      [4, 2.2],
    ],
    gland,
    {tone: 'mid', ...can},
  );
  M.pipe(
    'cable',
    [
      [37, 36, top + 2],
      [37, 50, top + 2],
      [37, 62, 18],
      [37, 64, 1.6],
      [37, 140, 1.6], // runs off the cover's frame instead of ending in the air
    ],
    1.6,
    {bend: 6, limp: true, ends: [true, false], tone: 'hi'},
  );

  // detail (hero norm, §22.2): end-shield bolt circles, grease nipples, a lifting eye, nameplate rivets, terminal nuts
  const onCap = (st: number, dir: 1 | -1, k: number) => {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    const o = MOTOR_AXIS;
    const p = [0, 1, 2].map((i) => o.o[i] + o.a[i] * st + (o.u[i] * Math.cos(a) + o.v[i] * Math.sin(a)) * 6.6) as Point3;
    return G.frameAlong(p, dir === 1 ? o.a : G.mul3(o.a, -1));
  };
  for (let k = 0; k < 6; k++) {
    M.turned(`cap.front.bolt${k}`, [[0, 1.1], [0.8, 1.1], [1.2, 0.8, 1], [1.4, 0]], onCap(54, 1, k), {tone: 'hi', ...can});
    M.turned(`cap.rear.bolt${k}`, [[0, 1.1], [0.8, 1.1], [1.2, 0.8, 1], [1.4, 0]], onCap(-4, -1, k), {tone: 'hi', ...can});
  }
  for (const x of [19, 58.5]) M.turned(`nipple${x}`, [[0, 0.9], [1.4, 0.9], [1.8, 0.6, 1], [2.4, 0]], up(x, 25, top), {tone: 'mid', ...can});
  M.cyl('eye.stem', 24, 25, 1.1, top, 3, {tone: 'mid', ...can});
  M.ring('eye', -0.8, 0.8, 1.6, 3.4, G.frameAlong([24, 25, top + 6.2], [0, 1, 0]), {tone: 'hi', ...can});
  for (const [x, y] of [[59, 40], [69, 40], [59, 46], [69, 46]]) M.ball(`nameplate.rivet${x}${y}`, [x, y, 4.6], 0.4, {tone: 'hi'});
  for (const x of [34, 37, 40]) M.turned(`box.terminal${x}.nut`, [[0, 0.9], [0.5, 0.9], [0.7, 0]], up(x, 25, top + 7), {tone: 'mid', ...can});

  return M;
};

export const MOTOR = build('motor', 'pulley');
export const MOTOR_OPEN = build('motorOpen', 'terminals', false);
export const MOTOR_HUM = build('motorHum', 'stator');
// paint order solved by `node scripts/object-audit.mjs --settle`
MOTOR.applyKeys((KEYS as Record<string, Record<string, number>>).MOTOR);
MOTOR_OPEN.applyKeys((KEYS as Record<string, Record<string, number>>).MOTOR_OPEN);
MOTOR_HUM.applyKeys((KEYS as Record<string, Record<string, number>>).MOTOR_HUM);

export const MOTOR_CORNERS: Point3[] = [
  [0, 0, 0],
  [82, 0, 0],
  [0, 50, 0],
  [82, 50, 0],
  [40, 25, top + 8],
  [29.5, 17.5, top + 9.5], // terminal box lid corners and the gland
  [44.5, 32.5, top + 9.5],
  [37, 36, top + 5],
];
