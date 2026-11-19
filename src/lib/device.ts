import * as K from '../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from './assembly';

// Screens and interfaces (MASTER_PROMPT_FINAL §24.3, §20.1: an interface is shown LITERALLY). A phone or a monitor is
// a solid with thickness and its real parts; the screen face carries the interface. Layout blocks of the interface
// (bars, buttons, a list) may be drawn ON the face with `faceMatrix`; text the viewer must read never sits on the
// slanted face: it goes on a frontal panel pinned to the screen corners (`screenCorners`, Frontal.tsx, §20.4).

const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

export type ScreenRect = {o: Point3; u: Point3; v: Point3};

/** A literal interface layout (a status bar, three list rows, a button) mapped onto a screen face, `w` × `h` px. Pass
 *  it through the `ui` option of phone / monitor, which draws it as the `over` of the screen part: drawn with the screen, it keeps the
 *  screen's place in the depth order. Glued after the picture it covered the housing; added as a loose extra the
 *  housing covered it (docs/root-causes.md). */
export const screenUi = (P: K.Projection, s: ScreenRect, w = 360, h = 760) => {
  const m = faceMatrix(P, s.o, s.u, s.v, w, h);
  const line = Math.max(w, h) / 150;
  const box = (x: number, y: number, bw: number, bh: number, r: number, k = 1) => `<rect x="${(w * x).toFixed(1)}" y="${(h * y).toFixed(1)}" width="${(w * bw).toFixed(1)}" height="${(h * bh).toFixed(1)}" rx="${r.toFixed(1)}" fill="none" stroke="currentColor" stroke-width="${(line * k).toFixed(2)}"/>`;
  const rows = [0, 1, 2].map((i) => box(0.07, 0.16 + i * 0.16, 0.86, 0.12, line * 3)).join('');
  return `<g class="iso-line" style="color:var(--anatomy-mid)"><g transform="${m}">${box(0.07, 0.05, 0.86, 0.05, line * 2)}${rows}${box(0.22, 0.82, 0.56, 0.09, h * 0.045, 1.2)}</g></g>`;
};

/** SVG matrix that maps 2D interface pixels (u right, v down; `w` × `h` px) onto a 3D rectangle with corner `o`, right
 *  edge `u` and down edge `v` (kit vectors). Wrap the interface markup in <g transform={faceMatrix(...)}>. */
export const faceMatrix = (P: K.Projection, o: Point3, u: Point3, v: Point3, w: number, h: number) => {
  const [ox, oy] = K.iso(o, P);
  const [ux, uy] = K.iso(G.add3(o, u) as Point3, P);
  const [vx, vy] = K.iso(G.add3(o, v) as Point3, P);
  return `matrix(${((ux - ox) / w).toFixed(5)},${((uy - oy) / w).toFixed(5)},${((vx - ox) / h).toFixed(5)},${((vy - oy) / h).toFixed(5)},${ox.toFixed(3)},${oy.toFixed(3)})`;
};

/** A smartphone lying on a surface at z (screen up), long side along +y: body, back plate, frame band, glass, screen,
 *  earpiece and speaker grilles, camera module with lenses and flash, side buttons, port, mics. ~45 parts.
 *  Returns the screen rectangle (o, u, v) for faceMatrix / screenCorners. */
export const phone = (A: Assembly, [x, y, z]: Point3, o: {w?: number; d?: number; lit?: 'screen' | 'button'; ui?: (screen: ScreenRect) => string} = {}) => {
  const w = o.w ?? 14;
  const d = o.d ?? 29;
  const T = 1.6;
  A.slab('phone.back', {x: x + 0.3, y: y + 0.3, w: w - 0.6, d: d - 0.6, r: 2.2}, z, 0.4, {tone: 'mid', ground: true, bevel: 0.2, shadow: 'hero'});
  A.slab('phone', {x, y, w, d, r: 2.4}, z + 0.4, T - 0.6, {tone: 'mid', bevel: 0.3});
  A.slab('phone.glass', {x: x + 0.2, y: y + 0.2, w: w - 0.4, d: d - 0.4, r: 2.2}, z + T - 0.2, 0.2, {tone: 'lo', bevel: 0.05});
  const sx = x + 0.9;
  const sy = y + 1.6;
  const sw = w - 1.8;
  const sd = d - 3.2;
  const rect: ScreenRect = {o: [sx, sy, z + T + 0.06], u: [sw, 0, 0], v: [0, sd, 0]};
  A.slab('phone.screen', {x: sx, y: sy, w: sw, d: sd, r: 1.6}, z + T, 0.06, {tone: 'hi', bevel: 0, lit: o.lit === 'screen', over: o.ui ? o.ui(rect) : ''});
  // earpiece slot and front camera in the top bezel
  A.slab('phone.earpiece', {x: x + w / 2 - 2, y: y + 0.6, w: 4, d: 0.5, r: 0.25}, z + T, 0.06, {tone: 'lo', bevel: 0});
  A.cyl('phone.frontcam', x + w / 2 + 3, y + 0.85, 0.3, z + T, 0.06, {tone: 'lo', bevel: 0});
  // side buttons: power on +x, two volume keys on −x
  A.slab('phone.power', {x: x + w, y: y + 8, w: 0.35, d: 3.4, r: 0.15}, z + 0.6, 0.6, {tone: 'mid', bevel: 0.05, lit: o.lit === 'button'});
  for (const [i, by] of [6, 10].entries()) A.slab(`phone.volume${i}`, {x: x - 0.35, y: y + by, w: 0.35, d: 2.6, r: 0.15}, z + 0.6, 0.6, {tone: 'mid', bevel: 0.05});
  A.slab('phone.mute', {x: x - 0.35, y: y + 3.6, w: 0.35, d: 1.2, r: 0.15}, z + 0.6, 0.6, {tone: 'mid', bevel: 0.05});
  // bottom edge: port, speaker holes, mic holes (seated in the frame band)
  A.slab('phone.port', {x: x + w / 2 - 1.2, y: y + d - 0.1, w: 2.4, d: 0.15, r: 0.3}, z + 0.65, 0.5, {tone: 'lo', bevel: 0});
  // holes only on the straight part of the edge (beyond the corner radius they would float off the rounded frame)
  for (let i = 0; i < 6; i++) A.slab(`phone.speaker${i}`, {x: x + w / 2 + 1.6 + i * 0.55, y: y + d - 0.1, w: 0.35, d: 0.15, r: 0.15}, z + 0.75, 0.35, {tone: 'lo', bevel: 0});
  for (let i = 0; i < 6; i++) A.slab(`phone.mic${i}`, {x: x + w / 2 - 4.8 + i * 0.55, y: y + d - 0.1, w: 0.35, d: 0.15, r: 0.15}, z + 0.75, 0.35, {tone: 'lo', bevel: 0});
  for (const [i, sx] of [x + w / 2 - 2, x + w / 2 + 1.6].entries()) A.cyl(`phone.screw${i}`, sx, y + d + 0.02, 0.2, z + 0.85, 0.05, {tone: 'mid', bevel: 0});
  // SIM tray with its eject hole on the −x side, proximity and light sensors by the earpiece
  A.slab('phone.sim', {x: x - 0.12, y: y + 15, w: 0.12, d: 4.2, r: 0.1}, z + 0.65, 0.5, {tone: 'mid', bevel: 0});
  A.cyl('phone.simhole', x - 0.13, y + 15.6, 0.12, z + 0.8, 0.05, {tone: 'lo', bevel: 0});
  A.cyl('phone.proximity', x + w / 2 - 3.2, y + 0.85, 0.2, z + T, 0.05, {tone: 'lo', bevel: 0});
  A.cyl('phone.light', x + w / 2 - 3.9, y + 0.85, 0.2, z + T, 0.05, {tone: 'lo', bevel: 0});
  // antenna breaks in the frame band
  for (const [i, by] of [2.4, d - 2.4].entries()) A.slab(`phone.band${i}`, {x: x + w, y: y + by, w: 0.12, d: 0.4, r: 0}, z + 0.4, T - 0.6, {tone: 'lo', bevel: 0});
  // camera module on the back is under the phone (screen up): its bump is shown by a raised ring round the back plate edge
  A.slab('phone.bumper', {x: x - 0.1, y: y - 0.1, w: w + 0.2, d: d + 0.2, r: 2.5}, z + 0.4, 0.15, {tone: 'lo', bevel: 0});
  // a status bar and a home bar as raised hairlines on the screen (the interface lives in faceMatrix)
  A.slab('phone.homebar', {x: x + w / 2 - 2.6, y: y + d - 2.4, w: 5.2, d: 0.35, r: 0.17}, z + T + 0.06, 0.04, {tone: 'lo', bevel: 0});
  for (let i = 0; i < 3; i++) A.cyl(`phone.status${i}`, x + w - 2.4 + i * 0.6, y + 2.2, 0.18, z + T + 0.06, 0.04, {tone: 'lo', bevel: 0});
  // a stand it leans on is not part of the phone: scenes add one; a charging cable plugs into the port
  const top = z + T + 0.06;
  return {o: [sx, sy, top] as Point3, u: [sw, 0, 0] as Point3, v: [0, sd, 0] as Point3};
};

/** A desktop monitor on a stand, screen facing +y (towards the viewer's left-front): foot, column, hinge, housing,
 *  bezel, screen, buttons, vents and ports on the back, a cable. ~48 parts. Returns the screen rectangle. */
export const monitor = (A: Assembly, [x, y, z]: Point3, o: {w?: number; h?: number; lit?: 'screen' | 'power'; ui?: (screen: ScreenRect) => string} = {}) => {
  const w = o.w ?? 54;
  const h = o.h ?? 32;
  const cx = x + w / 2;
  A.slab('monitor.foot', {x: cx - 11, y: y - 8, w: 22, d: 14, r: 3}, z, 1.4, {tone: 'mid', ground: true, bevel: 0.5, shadow: 'hero'});
  for (const [i, fx] of [cx - 9, cx + 9].entries()) A.cyl(`monitor.pad${i}`, fx, y - 2, 1, z + 1.4, 0.2, {tone: 'lo', bevel: 0});
  A.slab('monitor.column', {x: cx - 2.5, y: y - 6, w: 5, d: 2.4, r: 0.8}, z + 1.4, 16, {tone: 'mid', bevel: 0.4});
  A.slab('monitor.clip', {x: cx - 1.4, y: y - 6.6, w: 2.8, d: 0.6, r: 0.3}, z + 6, 2, {tone: 'lo', bevel: 0.1});
  A.turned('monitor.hinge', [[-4, 1.4], [4, 1.4]], G.frameAlong([cx, y - 4.8, z + 17.4], [1, 0, 0]), {tone: 'lo', meta: {owner: 'monitor.column'}});
  const bz = z + 10;
  A.slab('monitor.housing', {x: x + 1, y: y - 3.4, w: w - 2, d: 3, r: 1.6}, bz + 1, h - 2, {tone: 'mid', bevel: 0.6});
  A.slab('monitor.bezel', {x, y: y - 0.4, w, d: 0.9, r: 1}, bz, h, {tone: 'lo', bevel: 0.3});
  const rect: ScreenRect = {o: [x + 1.2, y + 0.5, bz + 2.6 + h - 3.8], u: [w - 2.4, 0, 0], v: [0, 0, -(h - 3.8)]};
  A.slab('monitor.screen', {x: x + 1.2, y: y + 0.5, w: w - 2.4, d: 0.06, r: 0.4}, bz + 2.6, h - 3.8, {tone: 'hi', bevel: 0, lit: o.lit === 'screen', over: o.ui ? o.ui(rect) : ''});
  A.slab('monitor.chin', {x: x + 1, y: y + 0.5, w: w - 2, d: 0.06, r: 0.2}, bz + 0.6, 1.6, {tone: 'mid', bevel: 0});
  // power and menu buttons under the chin, a status light
  for (let i = 0; i < 4; i++) A.cyl(`monitor.button${i}`, x + w - 4 - i * 2.4, y + 0.1, 0.5, bz - 0.3, 0.3, {tone: 'mid', bevel: 0.05, lit: o.lit === 'power' && i === 0});
  A.cyl('monitor.led', x + w - 14, y + 0.2, 0.25, bz - 0.2, 0.2, {tone: 'hi', bevel: 0});
  // vents across the back, ports in a row, a vesa plate
  for (let i = 0; i < 16; i++) A.slab(`monitor.vent${i}`, {x: x + 8 + i * 2.4, y: y - 3.5, w: 1.2, d: 0.12, r: 0.1}, bz + h - 6, 3.4, {tone: 'lo', bevel: 0});
  for (let i = 0; i < 4; i++) A.slab(`monitor.port${i}`, {x: x + 10 + i * 3.4, y: y - 3.5, w: 2.4, d: 0.12, r: 0.2}, bz + 4, 1.2, {tone: 'lo', bevel: 0});
  A.slab('monitor.vesa', {x: cx - 5, y: y - 3.6, w: 10, d: 0.2, r: 0.4}, bz + h / 2 - 5, 10, {tone: 'mid', bevel: 0.05});
  for (const [i, [vx, vz]] of [
    [cx - 3.5, bz + h / 2 - 3.5],
    [cx + 3.5, bz + h / 2 - 3.5],
    [cx - 3.5, bz + h / 2 + 3.5],
    [cx + 3.5, bz + h / 2 + 3.5],
  ].entries())
    A.turned(`monitor.screw${i}`, [[0, 0.5], [0.3, 0.5], [0.45, 0.0001]], G.frameAlong([vx, y - 3.6, vz], [0, -1, 0]), {tone: 'hi', meta: {owner: 'monitor.vesa'}});
  // the power cable from the back, down the column, out over the foot to the floor
  // the power cable from the back, down behind the column through its clip, out over the foot to the floor
  // it ends in a plug lying on the floor (a cable that stops in the open reads as a stub hanging off the monitor)
  A.slab('monitor.plug', {x: cx - 1.2, y: y - 34, w: 2.4, d: 4, r: 0.5}, z, 1.4, {tone: 'lo', ground: true, bevel: 0.2});
  A.pipe('monitor.cable', [[cx + 4.5, y - 3.4, bz + 5], [cx + 4.5, y - 7.8, bz + 5], [cx, y - 7.8, bz - 2], [cx, y - 7.8, z + 3], [cx, y - 14, z + 1.4], [cx, y - 30, z + 0.7]], 0.5, {bend: 2.2, limp: true, maxLength: 5, meta: {touch: ['monitor.clip', 'monitor.foot']}});
  // short chunks: a long chunk beside the column is in front of it at one end and behind at the other (no paint order)
  void up;
  return {o: [x + 1.2, y + 0.56, bz + 2.6 + h - 3.8] as Point3, u: [w - 2.4, 0, 0] as Point3, v: [0, 0, -(h - 3.8)] as Point3};
};

/** Screen corners as kit points (top-left, top-right, bottom-right, bottom-left) for pinning a frontal panel. */
export const screenCorners = (s: {o: Point3; u: Point3; v: Point3}): Point3[] => [s.o, G.add3(s.o, s.u), G.add3(G.add3(s.o, s.u), s.v), G.add3(s.o, s.v)] as Point3[];
