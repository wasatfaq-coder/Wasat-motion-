import {Assembly, Point3} from './assembly';

// A grid of units (MASTER_PROMPT_FINAL v3.0, section 5 «Приёмы объяснения», 5): N identical bodies where N IS the number
// the voice says («одна ракета покупает сорок таких»); `marked` of them are the coral part of the meaning. Counting by
// objects is clearer than a word. Bodies of the kit (slabs on a tray), role `prop`: no part count, loupe check only.

export type UnitGridOpts = {cols?: number; cell?: number; gap?: number; marked?: number; height?: number};

/** `count` unit blocks in rows of `cols` on a thin tray at `at` (kit units); the first `marked` are lit (coral). */
export const unitGrid = (A: Assembly, name: string, [x, y, z]: Point3, count: number, o: UnitGridOpts = {}) => {
  const cols = o.cols ?? Math.ceil(Math.sqrt(count));
  const cell = o.cell ?? 4;
  const gap = o.gap ?? 1.2;
  const h = o.height ?? 3;
  const rows = Math.ceil(count / cols);
  const w = cols * (cell + gap) + gap;
  const d = rows * (cell + gap) + gap;
  A.slab(`${name}.tray`, {x: x - gap, y: y - gap, w, d, r: 1}, z, 0.8, {tone: 'lo', ground: true, bevel: 0.25, shadow: 'part', bias: -1000});
  for (let i = 0; i < count; i++) {
    const cx = x + (i % cols) * (cell + gap);
    const cy = y + Math.floor(i / cols) * (cell + gap);
    A.slab(`${name}.u${i}`, {x: cx, y: cy, w: cell, d: cell, r: 0.7}, z + 0.8, h, {tone: 'hi', lit: i < (o.marked ?? 0), bevel: 0.4});
  }
  return {w, d, count};
};
