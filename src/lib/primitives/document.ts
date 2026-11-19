import {Assembly, G, Point3} from '../assembly';

// Documents as objects (MASTER_PROMPT_FINAL §24.3): a sheet is a plate with thickness, text lines are grey strips
// on it, the line the voice names slides forward as the one coral part, a stamp comes down on a handle, folders
// are drawers of an archive cabinet. Real readable text stays on a frontal plate (§19.1, §20.4); the strips only
// show where it is and how much of it there is.

const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

export type SheetOpts = {
  w?: number; // sheet size (kit units), default A-format 42 × 30 lying along x
  d?: number;
  lines?: number; // number of text strips, default 9
  /** index of the coral line: it rises and slides forward (piece `sheet.line`, share 0..1 from the scene) */
  lit?: number;
  /** stamped mark on the sheet (shown after the stamp lands: piece `sheet.mark` is drawn only when share > 0) */
  mark?: boolean;
  prefix?: string;
};

/** A sheet of paper lying on a surface at z: plate, header block, text strips, signature line, page number. */
export const sheet = (A: Assembly, [x, y, z]: Point3, o: SheetOpts = {}) => {
  const p = o.prefix ?? 'sheet';
  const w = o.w ?? 42;
  const d = o.d ?? 30;
  const n = o.lines ?? 9;
  A.slab(p, {x, y, w, d, r: 0.4}, z, 0.6, {tone: 'hi', bevel: 0.15, ground: true, shadow: 'hero'});
  const top = z + 0.6;
  // header block (a title strip and a logo square)
  A.slab(`${p}.title`, {x: x + 3, y: y + 3, w: w * 0.5, d: 2.4, r: 0.3}, top, 0.25, {tone: 'mid', bevel: 0.05, meta: {owner: `${A.name}.${p}`}});
  A.slab(`${p}.logo`, {x: x + w - 8, y: y + 2.5, w: 5, d: 3.4, r: 0.4}, top, 0.25, {tone: 'mid', bevel: 0.05, meta: {owner: `${A.name}.${p}`}});
  const lineY = (i: number) => y + 8 + i * ((d - 14) / Math.max(1, n - 1));
  for (let i = 0; i < n; i++) {
    const len = (w - 6) * (i === n - 1 ? 0.55 : 0.82 + 0.15 * Math.abs(Math.sin(i * 2.3)));
    const lit = o.lit === i;
    A.slab(`${p}.line${i}`, {x: x + 3, y: lineY(i), w: len, d: 1.1, r: 0.2}, top + (lit ? 0.02 : 0), lit ? 0.6 : 0.2, {
      tone: lit ? 'hi' : 'mid',
      bevel: 0.05,
      lit,
      ...(lit ? {piece: `${p}.line`, move: [0, 6, 4] as Point3} : {}),
      meta: {owner: `${A.name}.${p}`},
    });
  }
  // signature line and page number
  A.slab(`${p}.sign`, {x: x + w - 16, y: y + d - 4, w: 12, d: 0.5, r: 0.1}, top, 0.2, {tone: 'lo', bevel: 0.03, meta: {owner: `${A.name}.${p}`}});
  A.slab(`${p}.page`, {x: x + w / 2 - 1, y: y + d - 2.2, w: 2, d: 0.9, r: 0.2}, top, 0.2, {tone: 'mid', bevel: 0.03, meta: {owner: `${A.name}.${p}`}});
  if (o.mark) A.cyl(`${p}.mark`, x + w - 12, y + d - 9, 3.6, top, 0.15, {tone: 'mid', bevel: 0, meta: {owner: `${A.name}.${p}`}});
  return {line: (i: number): Point3 => [x + 3 + (w - 6) * 0.4, lineY(i) + 0.5, top + 0.6], top, size: [w, d, 0.6] as Point3};
};

/** A hand stamp standing on the sheet at (x, y): pad, block, neck, knob. `press` 0..1 lowers it (piece `stamp`,
 *  rest height `lift` above the sheet). Build it at rest for the audit; the scene moves the piece. */
export const stamp = (A: Assembly, [x, y, z]: Point3, o: {lift?: number} = {}) => {
  const lift = o.lift ?? 14;
  const c = {piece: 'stamp', move: [0, 0, -lift] as Point3, meta: {owner: `${A.name}.stamp`}};
  const base = z + lift;
  A.cyl('stamp.pad', x, y, 3.8, base, 0.8, {tone: 'lo', bevel: 0.2, ground: true, ...c});
  A.slab('stamp.block', {x: x - 4.4, y: y - 4.4, w: 8.8, d: 8.8, r: 1.2}, base + 0.8, 3, {tone: 'mid', bevel: 0.5, ...c});
  A.turned('stamp.neck', [[0, 1.6], [3, 1.2], [4, 1.6, 1]], up(x, y, base + 3.8), {tone: 'hi', ...c});
  A.turned('stamp.knob', [[0, 2], [1.5, 3.4, 1], [3.6, 3.2, 1], [5, 0.0001]], up(x, y, base + 7.8), {tone: 'hi', ...c});
  return {pressedZ: z};
};

/** An archive cabinet of `rows` × `cols` drawers along +x, each with a handle and a label slot; drawer `open`
 *  (index) slides out along +y as piece `drawer` (share from the scene). The open drawer shows its folders. */
export const archive = (A: Assembly, [x, y, z]: Point3, o: {rows?: number; cols?: number; open?: number; litFolder?: number}) => {
  const rows = o.rows ?? 3;
  const cols = o.cols ?? 2;
  const dw = 22;
  const dh = 12;
  const D = 30;
  const W = cols * dw + 3;
  const H = rows * dh + 3;
  const t = 1.5; // board thickness
  const z0 = z + 2;
  // a carcass of boards (not a solid block), so a drawer really sits in its cavity and slides out of it
  A.slab('cabinet.plinth', {x: x + 1, y: y + 1, w: W - 2, d: D - 2, r: 0.6}, z, 2, {tone: 'lo', ground: true, bevel: 0.3, shadow: 'hero'});
  A.slab('cabinet.bottom', {x, y, w: W, d: D, r: 0.3}, z0, t, {tone: 'mid', bevel: 0.3});
  A.slab('cabinet.back', {x, y, w: W, d: t, r: 0.2}, z0 + t, H - t, {tone: 'lo', bevel: 0.2});
  A.slab('cabinet.left', {x, y: y + t, w: t, d: D - t, r: 0.2}, z0 + t, H - t, {tone: 'mid', bevel: 0.2});
  A.slab('cabinet.right', {x: x + W - t, y: y + t, w: t, d: D - t, r: 0.2}, z0 + t, H - t, {tone: 'mid', bevel: 0.2});
  A.slab('cabinet.top', {x: x - 0.6, y: y - 0.6, w: W + 1.2, d: D + 1.2, r: 1}, z0 + H, 1.2, {tone: 'hi', bevel: 0.4});
  const cw = (W - 2 * t - (cols - 1) * t) / cols; // cavity width
  const ch = (H - t - (rows - 1) * t) / rows; // cavity height
  // shelves and dividers stop behind the drawer fronts; a divider is cut per row so no board runs through another
  const inner = D - t - 1.4;
  for (let r = 1; r < rows; r++) A.slab(`cabinet.shelf${r}`, {x: x + t, y: y + t, w: W - 2 * t, d: inner, r: 0.1}, z0 + t + r * ch + (r - 1) * t, t, {tone: 'mid', bevel: 0.15});
  for (let r = 0; r < rows; r++)
    for (let c = 1; c < cols; c++) A.slab(`cabinet.divider${r}.${c}`, {x: x + t + c * cw + (c - 1) * t, y: y + t, w: t, d: inner, r: 0.1}, z0 + t + r * (ch + t), ch, {tone: 'mid', bevel: 0.15});
  let k = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++, k++) {
      const dx = x + t + c * (cw + t);
      const dz = z0 + t + r * (ch + t);
      const open = o.open === k;
      const pc = open ? {piece: 'drawer', move: [0, 20, 0] as Point3} : {};
      const id = `drawer${k}`;
      const own = {meta: {owner: `${A.name}.${id}`}};
      // the front stands on the shelf below it; the label slot and the handle are fixed to the front
      A.slab(`${id}`, {x: dx + 0.3, y: y + D - 1.4, w: cw - 0.6, d: 1.4, r: 0.4}, dz, ch, {tone: 'hi', bevel: 0.3, ...pc});
      A.slab(`${id}.slot`, {x: dx + cw / 2 - 4, y: y + D, w: 8, d: 0.4, r: 0.2}, dz + ch - 4.5, 2.4, {tone: 'mid', bevel: 0.05, ...pc, ...own});
      const hz = dz + 3;
      A.pipe(`${id}.handle`, [[dx + cw / 2 - 4, y + D, hz], [dx + cw / 2 - 4, y + D + 1.8, hz], [dx + cw / 2 + 4, y + D + 1.8, hz], [dx + cw / 2 + 4, y + D, hz]], 0.5, {bend: 1.3, ...pc});
      if (open) {
        // the drawer box (floor and two sides) and the folders standing in it
        A.slab(`${id}.floor`, {x: dx + 0.6, y: y + t + 1, w: cw - 1.2, d: inner - 1, r: 0.2}, dz, 0.6, {tone: 'lo', bevel: 0.1, ...pc, ...own});
        for (const sx of [dx + 0.6, dx + cw - 1.2]) A.slab(`${id}.side${Math.round(sx)}`, {x: sx, y: y + t + 1, w: 0.6, d: inner - 1, r: 0.1}, dz + 0.6, 4, {tone: 'mid', bevel: 0.05, ...pc, ...own});
        for (let f = 0; f < 6; f++)
          A.slab(`${id}.folder${f}`, {x: dx + 1.6, y: y + t + 3 + f * 3.4, w: cw - 3.2, d: 1.2, r: 0.2}, dz + 0.6, ch - 3.5 + (f === o.litFolder ? 2.4 : 0), {tone: 'hi', bevel: 0.1, lit: f === o.litFolder, ...pc, ...own});
      }
    }
  return {size: [W, D, H + 3.2] as Point3};
};
