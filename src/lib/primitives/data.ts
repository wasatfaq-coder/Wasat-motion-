import * as K from '../../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from '../assembly';

// Data as objects (MASTER_PROMPT_FINAL §24.3, §20.4): bars, a pie of wedges, a ruler and a balance, built as
// audited solids. The objects carry QUANTITY (more, less, half, equal); exact values and the unit are read on a
// frontal plate pinned to them (Frontal.tsx, §20.4). Each builder returns the kit points to pin those plates to.
// Heights are proportional to the values from a common floor (an axis from zero, §5), never rescaled per bar.

const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

export type BarsOpts = {
  /** values in one unit; bar height = value · `perUnit` kit units */
  values: number[];
  perUnit: number;
  /** index of the one coral bar (the bar the voice is about), or none */
  lit?: number;
  bar?: number; // bar footprint (kit units), default 10
  gap?: number; // between bars, default 6
  /** 0..1 per bar: grows each bar from the floor (frame-driven by the scene, physics.ts) */
  grow?: number[];
  /** grid lines on the back wall every `grid` units of value (parallel to the row: a level value is level) */
  grid?: number;
};

/** A row of bars along +x on a plinth, with a back wall carrying grid lines parallel to the row, so the top of a
 *  bar is compared against a line in its own plane (a level value never reads as a slope, §20.4). */
export const bars = (A: Assembly, [x0, y0, z0]: Point3, o: BarsOpts) => {
  const w = o.bar ?? 10;
  const gap = o.gap ?? 6;
  const n = o.values.length;
  const L = n * w + (n + 1) * gap;
  const D = w + 2 * gap + 2;
  const top = Math.max(...o.values) * o.perUnit;
  // plinth: base slab, a lip, four feet
  A.slab('plinth', {x: x0, y: y0, w: L, d: D, r: 1.5}, z0 + 1.2, 3, {tone: 'mid', bevel: 0.6, shadow: 'hero'});
  A.slab('plinth.lip', {x: x0 + 1, y: y0 + 1, w: L - 2, d: D - 2, r: 1}, z0 + 4.2, 0.8, {tone: 'hi', bevel: 0.3});
  for (const [fx, fy] of [
    [x0 + 3, y0 + 3],
    [x0 + L - 3, y0 + 3],
    [x0 + 3, y0 + D - 3],
    [x0 + L - 3, y0 + D - 3],
  ])
    A.cyl(`plinth.foot${Math.round(fx)}_${Math.round(fy)}`, fx, fy, 2, z0, 1.2, {tone: 'lo', ground: true, bevel: 0.3});
  const floor = z0 + 5;
  // back wall with grid ribs (thin slabs on its face) and a top rail
  const wallH = top + 6;
  A.slab('wall', {x: x0 + 1, y: y0 + 1, w: L - 2, d: 2, r: 0.3}, floor, wallH, {tone: 'lo', bevel: 0.3});
  A.slab('wall.rail', {x: x0 + 0.5, y: y0 + 0.5, w: L - 1, d: 3, r: 0.4}, floor + wallH, 1, {tone: 'mid', bevel: 0.3});
  const step = o.grid ?? 0;
  if (step > 0)
    for (let v = step; v * o.perUnit <= top + 1e-6; v += step)
      A.slab(`wall.grid${v}`, {x: x0 + 2, y: y0 + 3, w: L - 4, d: 0.6, r: 0.1}, floor + v * o.perUnit - 0.3, 0.6, {tone: 'mid', bevel: 0.05});
  const pins: Point3[] = [];
  o.values.forEach((value, i) => {
    const bx = x0 + gap + i * (w + gap);
    const by = y0 + gap + 1;
    const h = Math.max(0.6, value * o.perUnit * (o.grow?.[i] ?? 1));
    const lit = o.lit === i;
    // socket in the lip, the bar with a cap plate
    A.slab(`bar${i}.socket`, {x: bx - 1, y: by - 1, w: w + 2, d: w + 2, r: 0.8}, floor, 0.8, {tone: 'lo', bevel: 0.2});
    // a seam ring every 10 kit units of height, drawn on the bar's own faces
    let seams = '';
    for (let s = 10; s < h - 2; s += 10) seams += K.lineSvg(K.sideSeam({x: bx, y: by, w, d: w, r: 0.8}, floor + 0.8 + s, A.P), {tone: 'lo'});
    A.slab(`bar${i}`, {x: bx, y: by, w, d: w, r: 0.8}, floor + 0.8, h, {tone: 'hi', bevel: 0.5, lit, over: seams, meta: {owner: `${A.name}.bar${i}`}});
    A.slab(`bar${i}.cap`, {x: bx - 0.4, y: by - 0.4, w: w + 0.8, d: w + 0.8, r: 0.9}, floor + 0.8 + h, 0.8, {tone: 'hi', bevel: 0.3, lit, meta: {owner: `${A.name}.bar${i}`}});
    pins.push([bx + w / 2, by + w / 2, floor + 1.6 + h]);
  });
  return {pins, floor, size: [L, D, wallH + 6] as Point3};
};

/** A pie of wedge solids round an upright axis. `shares` sum to 1; the `lit` wedge slides out along its middle
 *  (piece `pie.lit`, move set from the share), so the part the voice names leaves the whole without changing size. */
export const pie = (A: Assembly, [cx, cy, z0]: Point3, o: {shares: number[]; r: number; h: number; lit?: number; out?: number}) => {
  const total = o.shares.reduce((s, v) => s + v, 0);
  let a0 = -Math.PI / 2;
  // a base disc and a hub pin
  A.cyl('pie.base', cx, cy, o.r + 1.5, z0, 1.2, {tone: 'lo', ground: true, bevel: 0.4, shadow: 'hero'});
  const pins: Point3[] = [];
  o.shares.forEach((share, i) => {
    const span = (share / total) * Math.PI * 2;
    const mid = a0 + span / 2;
    const lit = o.lit === i;
    // a wedge wider than 180° is split, every piece stays convex for the prism
    const parts = Math.max(1, Math.ceil(span / (Math.PI * 0.95)));
    for (let k = 0; k < parts; k++) {
      const s0 = a0 + (span * k) / parts;
      const s1 = a0 + (span * (k + 1)) / parts;
      const steps = Math.max(2, Math.ceil((s1 - s0) / 0.12));
      const ring: K.Plane[] = [[cx, cy]];
      for (let j = 0; j <= steps; j++) {
        const a = s0 + ((s1 - s0) * j) / steps;
        ring.push([cx + o.r * Math.cos(a), cy + o.r * Math.sin(a)]);
      }
      const move: Point3 = lit ? [Math.cos(mid) * (o.out ?? o.r * 0.3), Math.sin(mid) * (o.out ?? o.r * 0.3), 0] : [0, 0, 0];
      A.extruded(`pie.w${i}${parts > 1 ? `.${k}` : ''}`, ring, z0 + 1.2, o.h, {tone: 'hi', lit, ...(lit ? {piece: 'pie.lit', move} : {}), meta: {owner: `${A.name}.pie.w${i}`}});
    }
    pins.push([cx + Math.cos(mid) * o.r * 0.6, cy + Math.sin(mid) * o.r * 0.6, z0 + 1.2 + o.h]);
    a0 += span;
  });
  return {pins};
};

/** A ruler bar along +x with a tick every `step` units of length and a longer one every `every` ticks. */
export const ruler = (A: Assembly, [x, y, z]: Point3, o: {length: number; step: number; every?: number; width?: number}) => {
  const w = o.width ?? 6;
  A.slab('ruler', {x, y, w: o.length, d: w, r: 0.6}, z, 1.6, {tone: 'hi', bevel: 0.4, ground: true});
  A.slab('ruler.edge', {x, y: y + w - 1, w: o.length, d: 1, r: 0.2}, z + 1.6, 0.4, {tone: 'mid', bevel: 0.1});
  const ticks = K.topTicks(x + 1, x + o.length - 1, o.step, o.every ?? 5, y + 0.4, z + 1.6, [1.6, 3.2], A.P);
  A.markup('ruler.ticks', [x + o.length / 2, y + w / 2, z + 1.6], K.lineSvg(ticks.minor, {tone: 'lo'}) + K.lineSvg(ticks.major, {tone: 'lo'}), []);
};

/** A beam balance tilted by `tilt` radians (positive: the +x pan goes down). Rebuilt when the tilt changes; build it
 *  at rest for the audit. The pans hang plumb whatever the tilt (they swing on their hangers). */
export const balance = (A: Assembly, [cx, cy, z0]: Point3, o: {arm: number; tilt?: number; litPan?: 0 | 1; weights?: [number, number]}) => {
  const t = o.tilt ?? 0;
  const H = o.arm * 0.9;
  const own = (n: string) => ({meta: {owner: `${A.name}.${n}`}});
  // base on four levelling feet, four screws in its top
  for (const [dx, dy] of [
    [-8, -5],
    [8, -5],
    [-8, 5],
    [8, 5],
  ]) {
    A.cyl(`balance.foot${dx}_${dy}`, cx + dx, cy + dy, 1.4, z0, 1, {tone: 'lo', ground: true, bevel: 0.2});
    A.turned(`balance.screw${dx}_${dy}`, [[0, 0.8], [0.3, 0.8], [0.6, 0.0001]], up(cx + dx * 0.75, cy + dy * 0.6, z0 + 3.4), {tone: 'mid', ...own('balance.base')});
  }
  A.slab('balance.base', {x: cx - 10, y: cy - 7, w: 20, d: 14, r: 2}, z0 + 1, 2.4, {tone: 'mid', bevel: 0.6, shadow: 'hero'});
  const postTop = z0 + 3.4 + H;
  // the column in three drums with collar discs between them
  const drums = [z0 + 3.4, z0 + 3.4 + H * 0.35, z0 + 3.4 + H * 0.7, postTop];
  for (let k = 0; k < 3; k++) {
    A.cyl(`balance.post${k}`, cx, cy, 1.6, drums[k] + (k ? 0.8 : 0), drums[k + 1] - drums[k] - (k ? 0.8 : 0), {tone: 'hi', bevel: 0.3});
    if (k) A.cyl(`balance.collar${k}`, cx, cy, 2.2, drums[k], 0.8, {tone: 'mid', bevel: 0.2});
  }
  // bearing block and the knife edge the beam rocks on
  A.slab('balance.block', {x: cx - 2.4, y: cy - 2, w: 4.8, d: 4, r: 0.6}, postTop, 1.6, {tone: 'mid', bevel: 0.3});
  const kz = postTop + 1.6 + 0.6;
  A.turned('balance.knife', [[-2, 0.6], [2, 0.6]], G.frameAlong([cx, cy, kz], [0, 1, 0]), {tone: 'lo', ...own('balance.block')});
  // the beam: a bar resting on the knife, tilted about it
  const dir: Point3 = [Math.cos(t), 0, -Math.sin(t)];
  const beamF = {o: [cx, cy, kz + 0.6] as Point3, a: dir, u: [0, 1, 0] as Point3, v: [Math.sin(t), 0, Math.cos(t)] as Point3};
  A.prism('balance.beam', beamF, [[-0.9, 0], [0.9, 0], [0.9, 1.8], [-0.9, 1.8]], -o.arm, o.arm, {tone: 'hi', ...own('balance.knife')});
  const along = (s: number, up2 = 0): Point3 => [cx + dir[0] * s + beamF.v[0] * up2, cy, kz + 0.6 + dir[2] * s + beamF.v[2] * up2];
  // pointer: a boss on the beam front and a needle hanging in front of the scale plate
  A.turned('balance.boss', [[0, 0.6], [1.6, 0.6]], G.frameAlong([cx, cy + 0.9, kz + 1.5], [0, 1, 0]), {tone: 'mid', ...own('balance.beam')});
  A.prism('balance.needle', {o: [cx, cy + 2.5, kz + 1.5], a: [0, 1, 0], u: [Math.cos(t), 0, -Math.sin(t)], v: [-Math.sin(t), 0, -Math.cos(t)]}, [[-0.5, -0.4], [0.5, -0.4], [0.15, H * 0.3], [-0.15, H * 0.3]], 0, 0.4, {tone: 'lo', ...own('balance.boss')});
  A.slab('balance.scale', {x: cx - 4, y: cy + 1.6, w: 8, d: 0.6, r: 0.3}, postTop - H * 0.32, 3.2, {
    tone: 'hi',
    bevel: 0.1,
    over: K.lineSvg(K.sideTicks(cx - 3.4, cx + 3.4, 0.85, 4, cy + 2.2, postTop - H * 0.32 + 3.2, [0.8, 1.6], A.P).minor, {tone: 'lo'}),
    ...own('balance.post2'),
  });
  ([-1, 1] as const).forEach((s, i) => {
    // an end cap, a hook under it and a hanger ball; three chains from the hanger to the pan rim
    const e = along(s * (o.arm - 0.9));
    A.ball(`balance.cap${i}`, along(s * o.arm, 0.9), 1.3, {tone: 'mid', ...own('balance.beam')});
    const hanger: Point3 = [e[0], e[1], e[2] - 3.6];
    A.pipe(`balance.hook${i}`, [e, [hanger[0], hanger[1], hanger[2] + 0.9]], 0.4, {meta: {touch: [`${A.name}.balance.*`]}});
    A.ball(`balance.hanger${i}`, hanger, 0.9, {tone: 'lo', ...own(`balance.hook${i}`)});
    const panZ = hanger[2] - o.arm * 0.9;
    for (let c = 0; c < 3; c++) {
      const a = (c / 3) * Math.PI * 2 + 0.5;
      const rim: Point3 = [hanger[0] + Math.cos(a) * 6.2, hanger[1] + Math.sin(a) * 6.2, panZ + 2.2];
      const d = G.unit3(G.sub3(rim, hanger)) as Point3;
      A.pipe(`balance.chain${i}.${c}`, [G.add3(hanger, G.mul3(d, 0.9)) as Point3, rim], 0.25, {meta: {touch: [`${A.name}.balance.*`]}});
    }
    A.turned(`balance.pan${i}`, [[0, 0.0001], [0.5, 4.8, 1], [1.4, 6.2, 1], [1.6, 6.4]], up(hanger[0], hanger[1], panZ), {tone: 'hi', lit: o.litPan === i});
    A.ring(`balance.rim${i}`, 1.6, 2.2, 5.8, 6.6, up(hanger[0], hanger[1], panZ), {tone: 'mid', ...own(`balance.pan${i}`)});
    // weights stacked in the pan: cylinders of falling size
    const n = (o.weights ?? [3, 2])[i];
    let wz = panZ + 0.6;
    for (let k = 0; k < n; k++) {
      const r = 3 - k * 0.6;
      A.turned(`balance.weight${i}.${k}`, [[0, r], [1.6, r], [1.9, r * 0.6], [2.4, r * 0.5]], up(hanger[0], hanger[1], wz), {tone: 'lo', ...own(`balance.pan${i}`)});
      wz += 2.4;
    }
  });
};
