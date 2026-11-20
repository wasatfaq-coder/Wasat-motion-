import * as K from '../vendor/anatomy/iso-kit';
import {A as AK, asTopFace, Assembly, Dyn, dynSolid, Frame, G, Point3} from './assembly';

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
  // it ends in a socket on the back of the foot: a cable led off to an undrawn floor ended in the air beside the
  // monitor (gate rounds 1–2 of the showcase)
  A.slab('monitor.socket', {x: cx - 1.4, y: y - 7.9, w: 2.8, d: 1.6, r: 0.4}, z + 1.4, 1, {tone: 'lo', bevel: 0.15, meta: {owner: 'monitor.foot'}});
  A.pipe('monitor.cable', [[cx + 4.5, y - 3.4, bz + 5], [cx + 4.5, y - 7.1, bz + 5], [cx, y - 7.1, bz - 2], [cx, y - 7.1, z + 2.4]], 0.5, {bend: 2.2, limp: true, maxLength: 5, meta: {touch: ['monitor.clip', 'monitor.foot']}});
  // short chunks: a long chunk beside the column is in front of it at one end and behind at the other (no paint order)
  void up;
  return {o: [x + 1.2, y + 0.56, bz + 2.6 + h - 3.8] as Point3, u: [w - 2.4, 0, 0] as Point3, v: [0, 0, -(h - 3.8)] as Point3};
};

/** Screen corners as kit points (top-left, top-right, bottom-right, bottom-left) for pinning a frontal panel. */
export const screenCorners = (s: {o: Point3; u: Point3; v: Point3}): Point3[] => [s.o, G.add3(s.o, s.u), G.add3(G.add3(s.o, s.u), s.v), G.add3(s.o, s.v)] as Point3[];

// ── a phone standing on a desk stand (leaning back, its screen turned to the viewer) ──────────────────────────────────
// Every tilted body is a prism with a bevel (§22.1; Assembly.prism `bevel`, lint «bevel»). No logos, no brand UI.

const unit3 = (v: Point3): Point3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const ptOf = (F: Frame, x: number, y: number, s = 0): Point3 => G.add3(G.add3(G.add3(F.o, G.mul3(F.u, x)), G.mul3(F.v, y)), G.mul3(F.a, s)) as Point3;
/** A convex rounded rectangle x0…x1 × y0…y1 with corner radius r (a prism outline). */
export const roundRect = (x0: number, y0: number, x1: number, y1: number, r: number, steps = 5): number[][] => {
  const rr = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  if (rr < 1e-6) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const out: number[][] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (k / steps) * (Math.PI / 2);
      out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  arc(x1 - rr, y0 + rr, -Math.PI / 2);
  arc(x1 - rr, y1 - rr, 0);
  arc(x0 + rr, y1 - rr, Math.PI / 2);
  arc(x0 + rr, y0 + rr, Math.PI);
  return out;
};

/** The frame of a body leaning back on a desk: o = its foot (the bottom centre of its back face), a = out of the front
 *  face, u = across it (to the right on screen when `facing` is near the view azimuth 45°), v = up the lean.
 *  `facing`: plan azimuth (degrees) the front face turns to; `tilt`: angle of the face from the table (54.74° puts the
 *  face square to the line of sight, so frontal text pinned to it reads without skew, §20.4). */
export const leanFrame = (foot: Point3, facing = 55, tilt = 54.74): Frame => {
  const f = (facing * Math.PI) / 180;
  const t = (tilt * Math.PI) / 180;
  const h: Point3 = [Math.cos(f), Math.sin(f), 0];
  return {o: foot, a: unit3([Math.sin(t) * h[0], Math.sin(t) * h[1], Math.cos(t)]), u: [Math.sin(f), -Math.cos(f), 0], v: unit3([-Math.cos(t) * h[0], -Math.cos(t) * h[1], Math.sin(t)])};
};

/** The frame of a screen rectangle: o = its top-left corner, u = right, v = down, a = INTO the screen. A body on the
 *  face spans s ∈ [−h, 0] (it stands out of the glass toward the viewer). Every ScreenRect of this module has u × v
 *  pointing OUT of the screen (phone: x × y = up; monitor: x × −z = +y; standingPhone: across × down = out), so the
 *  inward normal is v × u. Root cause: taken as u × v, the blocks sat 0.04 inside the glass and the screen painted
 *  over them (a sink that shallow is below the audit's 0.5 limit); faceInward() guards it. */
const faceFrame = (s: ScreenRect): Frame => {
  const u = unit3(s.u);
  const v = unit3(s.v);
  return {o: s.o, u, v, a: unit3(G.cross3(v, u) as Point3)};
};

type FaceOpts = Parameters<Assembly['prism']>[5];

/** Paint-order lift of a block on a face. A block thinner than the audit's depth tolerance (0.3 units) gets no order
 *  rule against the face it sits on, so it kept its centre's depth key and, on a face turned off the line of sight,
 *  the blocks on its far half were painted UNDER the screen (scene 1 of «Как работает Claude», 20.11.2026). The bias
 *  puts the block in front of every point of the face, and a block lifted onto another block in front of that one.
 *  Assembly.lint «face-order» guards it. */
const faceBias = (A: Assembly, s: ScreenRect, lift: number) => {
  const spread = (Math.abs(G.dot3(s.u, A.V)) + Math.abs(G.dot3(s.v, A.V))) / 2;
  return (spread + 0.05) * (1 + Math.round(lift / 0.04));
};
/** A raised interface block on a screen face (a bar, a bubble, a chip): `poly` in kit units from the screen's top-left
 *  corner (x right, y down), `h` its height out of the glass, `lift` a gap under it (a block on another block). Drawn
 *  as a solid, so the depth order places it (faceMatrix markup is for lines only). */
export const facePrism = (A: Assembly, s: ScreenRect, name: string, poly: number[][], h = 0.04, o: FaceOpts & {lift?: number} = {}) => {
  const lift = o.lift ?? 0;
  return A.prism(name, faceFrame(s), poly, -lift - h, -lift, {...o, bias: faceBias(A, s, lift), meta: {...(o.meta ?? {}), face: true}});
};

/** A round interface element (a dot, an avatar, a button) on a screen face, centre (x, y) in kit units. */
export const faceDisc = (A: Assembly, s: ScreenRect, name: string, x: number, y: number, r: number, h = 0.04, o: FaceOpts & {lift?: number} = {}) => {
  const F = faceFrame(s);
  const lift = o.lift ?? 0;
  return A.disc(name, -lift - h, -lift, r, {...F, o: ptOf(F, x, y)}, {...o, bias: faceBias(A, s, lift), meta: {...(o.meta ?? {}), face: true}});
};

/** A smartphone leaning on its back at frame F (leanFrame): back cover, frame band, bumper step, glass, screen, earpiece,
 *  front camera and sensors, power and volume keys, switch, SIM tray and eject hole, antenna breaks, port, speaker and
 *  mic holes, bottom screws, home bar: 35 parts, every large body bevelled. `w` × `d` × 1.65 kit units (D3 of «Как
 *  работает Claude»: 72 × 152.8 × 8.5 mm at 6 units per room unit). The bottom face sits 0.04 above a support (the holes
 *  touch it). Returns the screen rectangle (faceMatrix, screenCorners, facePrism) and the frame. */
export const standingPhone = (A: Assembly, F: Frame, o: {w?: number; d?: number; lit?: 'screen' | 'button'; ui?: (screen: ScreenRect) => string} = {}) => {
  const W = o.w ?? 14;
  const D = o.d ?? 29.7;
  const hw = W / 2;
  const R = 2.4;
  const own = (n: string) => ({meta: {owner: `phone.${n}`}});
  // the case, back to front: back cover (inset), frame band, a bumper step (the edge's bevel as a body), glass
  A.prism('phone.back', F, roundRect(-hw + 0.15, 0.15, hw - 0.15, D - 0.15, R - 0.15), 0, 0.35, {tone: 'mid', bevel: 0.3, shadow: 'hero'});
  A.prism('phone.rim', F, roundRect(-hw, 0, hw, D, R), 0.35, 1.35, {tone: 'mid', bevel: 0.4});
  A.prism('phone.bumper', F, roundRect(-hw + 0.1, 0.1, hw - 0.1, D - 0.1, R - 0.1), 1.35, 1.45, {tone: 'lo', bevel: 0.4});
  A.prism('phone.glass', F, roundRect(-hw + 0.2, 0.2, hw - 0.2, D - 0.2, R - 0.2), 1.45, 1.65, {tone: 'lo', bevel: 0.4});
  // the screen: top-left corner, right, down (kit vectors) for the interface
  const sx = hw - 0.7;
  const top = D - 1.8;
  const bottom = 1.4;
  const rect: ScreenRect = {o: ptOf(F, -sx, top, 1.69), u: G.mul3(F.u, 2 * sx) as Point3, v: G.mul3(F.v, -(top - bottom)) as Point3};
  A.prism('phone.screen', F, roundRect(-sx, bottom, sx, top, 1.6), 1.65, 1.69, {tone: 'hi', bevel: 0.4, lit: o.lit === 'screen', over: o.ui ? o.ui(rect) : ''});
  // top bezel: earpiece slot, front camera, proximity and light sensors (on the glass)
  const yb = D - 0.95;
  A.prism('phone.earpiece', F, roundRect(-1.6, yb - 0.17, 1.6, yb + 0.17, 0.17), 1.65, 1.69, {tone: 'lo', ...own('glass')});
  for (const [n, x, r] of [
    ['frontcam', 2.7, 0.34],
    ['proximity', -2.5, 0.2],
    ['light', -3.2, 0.2],
  ] as const)
    A.disc(`phone.${n}`, 1.65, 1.69, r, {...F, o: ptOf(F, x, yb)}, {tone: 'lo', ...own('glass')});
  // the home bar on the screen
  A.prism('phone.homebar', F, roundRect(-2.4, bottom + 0.5, 2.4, bottom + 0.82, 0.16), 1.69, 1.73, {tone: 'lo', ...own('screen')});
  // the sides: a frame whose axis is the side's outward normal (u: up the phone, v: out of the face)
  const side = (k: 1 | -1): Frame => ({o: F.o, a: G.mul3(F.u, k) as Point3, u: F.v, v: F.a});
  const key = (n: string, k: 1 | -1, y0: number, y1: number, out = 0.3, tone: K.Tone = 'mid') => A.prism(`phone.${n}`, side(k), roundRect(y0, 0.55, y1, 1.15, 0.25), hw - 0.02, hw + out, {tone, lit: o.lit === 'button' && n === 'power', ...own('rim')});
  key('power', 1, D * 0.62, D * 0.62 + 3.4);
  key('volume0', -1, D * 0.62, D * 0.62 + 2.6);
  key('volume1', -1, D * 0.62 - 3.2, D * 0.62 - 0.6);
  key('switch', -1, D * 0.62 + 3.6, D * 0.62 + 4.6);
  A.prism('phone.sim', side(-1), roundRect(D * 0.4, 0.6, D * 0.4 + 4.2, 1.1, 0.25), hw - 0.02, hw + 0.06, {tone: 'mid', ...own('rim')});
  A.disc('phone.simhole', hw + 0.06, hw + 0.09, 0.13, {...side(-1), o: G.add3(F.o, G.add3(G.mul3(F.v, D * 0.4 + 0.6), G.mul3(F.a, 0.85))) as Point3}, {tone: 'lo', meta: {owner: 'phone.sim'}});
  for (const [i, [k, y]] of ([
    [1, 3],
    [1, D - 3],
    [-1, 3],
    [-1, D - 3],
  ] as const).entries())
    A.prism(`phone.band${i}`, side(k), [[y - 0.2, 0.35], [y + 0.2, 0.35], [y + 0.2, 1.35], [y - 0.2, 1.35]], hw - 0.02, hw + 0.03, {tone: 'lo', ...own('rim')});
  // the bottom face: port, six speaker and six mic holes, two screws (axis down the phone)
  const base: Frame = {o: F.o, a: G.mul3(F.v, -1) as Point3, u: F.u, v: F.a};
  A.prism('phone.port', base, roundRect(-1.2, 0.6, 1.2, 1.1, 0.25), -0.02, 0.04, {tone: 'lo', ...own('rim')});
  for (let i = 0; i < 6; i++) {
    const x = 1.85 + i * 0.48;
    A.prism(`phone.speaker${i}`, base, [[x, 0.7], [x + 0.3, 0.7], [x + 0.3, 1.0], [x, 1.0]], -0.02, 0.04, {tone: 'lo', ...own('rim')});
    A.prism(`phone.mic${i}`, base, [[-x - 0.3, 0.7], [-x, 0.7], [-x, 1.0], [-x - 0.3, 1.0]], -0.02, 0.04, {tone: 'lo', ...own('rim')});
  }
  for (const [i, x] of [-1.5, 1.5].entries()) A.disc(`phone.screw${i}`, -0.02, 0.04, 0.17, {...base, o: G.add3(F.o, G.add3(G.mul3(F.u, x), G.mul3(F.a, 0.85))) as Point3}, {tone: 'mid', ...own('rim')});
  return {screen: rect, frame: F, port: ptOf(F, 0, -0.04, 0.85)};
};

/** A desk stand for a phone leaning at frame F (leanFrame; the phone's foot is F.o, `w` its width): feet, base plate,
 *  a rubber mat at the front, screw caps, a hinge (two blocks with a cable channel, barrel, end caps, axle heads), the back plate (spine) on the
 *  hinge with two ribs to the base and two pads under the phone, and a front lip in two halves (a gap for the charging
 *  plug) with rubber pads and side stops: 26 parts, every tilted body bevelled. The table top is z = 0; F.o must be
 *  8 units above it. Returns the plate's top height and the frame of the base (o under the foot, u across, v toward the
 *  viewer, a up) for parts a scene adds on the plate (a cable clip). */
export const phoneStand = (A: Assembly, F: Frame, o: {w?: number} = {}) => {
  const hw = (o.w ?? 14) / 2;
  const fwd = unit3([F.a[0], F.a[1], 0]);
  // plan frame on the table under the phone's foot: u across, v toward the viewer, a up
  const plan: Frame = {o: [F.o[0], F.o[1], 0], a: [0, 0, 1], u: F.u, v: fwd};
  const PLATE = {z0: 0.6, z1: 2, x: hw + 3, y0: -10, y1: 6};
  for (const [i, [x, y]] of ([
    [-PLATE.x + 2, PLATE.y0 + 2],
    [PLATE.x - 2, PLATE.y0 + 2],
    [-PLATE.x + 2, PLATE.y1 - 2],
    [PLATE.x - 2, PLATE.y1 - 2],
  ] as const).entries())
    A.disc(`stand.foot${i}`, 0, PLATE.z0, 1.1, {...plan, o: ptOf(plan, x, y)}, {tone: 'lo', ground: true});
  A.prism('stand.plate', plan, roundRect(-PLATE.x, PLATE.y0, PLATE.x, PLATE.y1, 2), PLATE.z0, PLATE.z1, {tone: 'mid', bevel: 0.6, shadow: 'hero'});
  A.prism('stand.mat', plan, roundRect(-PLATE.x + 1, 3, PLATE.x - 1, 5.6, 0.6), PLATE.z1, PLATE.z1 + 0.2, {tone: 'lo', bevel: 0.3});
  for (const [i, x] of [-PLATE.x + 1.6, PLATE.x - 1.6].entries()) A.disc(`stand.cap${i}`, PLATE.z1, PLATE.z1 + 0.15, 0.5, {...plan, o: ptOf(plan, x, PLATE.y0 + 1.6)}, {tone: 'lo', meta: {owner: 'stand.plate'}});
  // the hinge on the plate: the spine's centre plane is 1 unit behind the phone's back (pads 0.4 + half its 1.2)
  const HR = 0.75;
  const zH = PLATE.z1 + 1 + HR;
  const d0 = (F.o[2] - F.a[2] - zH) / F.v[2]; // how far down the lean the hinge axis is
  const hinge = ptOf(F, 0, -d0, -1);
  const hy = G.dot3(G.sub3(hinge, plan.o), fwd) as number;
  // the barrel sits on two blocks with a channel between them for the charging cable
  for (const [i, [x0, x1]] of [
    [-hw, -1.2],
    [1.2, hw],
  ].entries())
    A.prism(`stand.block${i}`, plan, roundRect(x0, hy - 0.9, x1, hy + 0.9, 0.3), PLATE.z1, PLATE.z1 + 1, {tone: 'mid', bevel: 0.3});
  const axis = (k: 1 | -1) => G.frameAlong(hinge, G.mul3(F.u, k));
  A.turned('stand.hinge', [[-hw, HR], [hw, HR]], axis(1), {tone: 'mid', meta: {touch: ['stand.block0', 'stand.block1']}});
  for (const k of [1, -1] as const) {
    const n = k > 0 ? 'r' : 'l';
    A.disc(`stand.hingecap.${n}`, hw, hw + 0.3, HR + 0.15, axis(k), {tone: 'lo', meta: {owner: 'stand.hinge'}});
    A.turned(`stand.axle.${n}`, [[hw + 0.3, 0.45], [hw + 0.6, 0.45], [hw + 0.75, 0.2, 1]], axis(k), {tone: 'mid', meta: {owner: 'stand.hinge'}});
  }
  // the spine leans on the hinge (its rounded end on the barrel) and holds the phone through two pads
  const top = 18;
  A.prism('stand.spine', F, roundRect(-hw + 0.5, -d0 + HR, hw - 0.5, top, 1.2), -1.6, -0.4, {tone: 'mid', bevel: 0.5, meta: {touch: ['stand.hinge']}});
  for (const [i, y] of [6, 14].entries()) A.prism(`stand.pad${i}`, F, roundRect(-hw + 2, y - 1, hw - 2, y + 1, 0.4), -0.4, 0, {tone: 'lo', bevel: 0.2, meta: {owner: 'stand.spine'}});
  // two ribs from the spine's back down to the plate (a trapezoid in the plan's v–z plane, across at ±(hw − 1.8))
  const back = (y: number) => ptOf(F, 0, y, -1.6);
  const [b1, b2] = [back(10), back(-2)];
  const yz = (p: Point3) => [G.dot3(G.sub3(p, plan.o), fwd) as number, p[2]];
  const [q1, q2] = [yz(b1), yz(b2)];
  const rib: Frame = {o: plan.o, a: F.u, u: fwd, v: [0, 0, 1]};
  for (const [i, k] of [1, -1].entries()) {
    const x = k * (hw - 1.8);
    A.prism(`stand.rib${i}`, rib, [[q1[0], q1[1]], [q2[0], q2[1]], [q2[0], PLATE.z1], [q1[0], PLATE.z1]], x - 0.45, x + 0.45, {tone: 'mid', bevel: 0.3, meta: {touch: ['stand.spine', 'stand.plate']}});
  }
  // the front lip: two halves on the spine's front (a gap for the plug), rubber pads under the phone, side stops
  const lip: Frame = {o: F.o, a: F.u, u: F.v, v: F.a};
  for (const [i, k] of [1, -1].entries()) {
    const [s0, s1] = k > 0 ? [1.4, hw + 0.9] : [-hw - 0.9, -1.4];
    A.prism(`stand.lip${i}`, lip, roundRect(-1.6, -0.4, -0.34, 2.6, 0.3), s0, s1, {tone: 'mid', bevel: 0.4, meta: {touch: ['stand.spine']}});
    const [p0, p1] = k > 0 ? [1.6, hw - 0.6] : [-hw + 0.6, -1.6];
    A.prism(`stand.lippad${i}`, lip, roundRect(-0.34, 0.2, -0.04, 1.5, 0.1), p0, p1, {tone: 'lo', meta: {owner: `stand.lip${i}`}});
    const [t0, t1] = k > 0 ? [hw + 0.1, hw + 0.9] : [-hw - 0.9, -hw - 0.1];
    A.prism(`stand.stop${i}`, lip, roundRect(-0.34, -0.4, 2.2, 1.3, 0.3), t0, t1, {tone: 'mid', bevel: 0.2, meta: {owner: `stand.lip${i}`}});
  }
  return {plateTop: PLATE.z1, matTop: PLATE.z1 + 0.2, plan, plate: PLATE, hinge};
};

export type ChatChip = {name: string; poly: number[][]; x: number; y: number; w: number; h: number};

/** A literal messenger layout as raised blocks on a screen (§20.1: an interface is shown literally; no logos, no brand
 *  layout): status bar (time, four signal bars, battery and its nub), header (bar, back chevron, avatar, title line,
 *  three menu dots), divider, the question bubble with its tail (x 0.16·W … W − 0.8, y 5.2 … 5.2 + questionH), answer chips (one per piece of text, widths in kit
 *  units, flowed into lines) and the input (field, hint line, send button, arrow): 21 parts + one per chip. Readable
 *  text never goes on the face: pin a frontal Word or Plate to the chip centres (screenOf). Returns the chips in order. */
export const chatUi = (A: Assembly, s: ScreenRect, chips: number[], o: {chipTone?: K.Tone; chipH?: number; questionH?: number} = {}) => {
  const W = G.len3(s.u) as number;
  const H = G.len3(s.v) as number;
  const blk = (n: string, poly: number[][], c: FaceOpts & {lift?: number} = {}, h = 0.04) => facePrism(A, s, `chat.${n}`, poly, h, {tone: 'lo', ...c});
  const on = (owner: string) => ({lift: 0.04, meta: {owner: `chat.${owner}`}});
  // status bar: time, signal, battery
  blk('time', roundRect(0.8, 0.55, 2.9, 1.1, 0.2));
  for (let i = 0; i < 4; i++) blk(`signal${i}`, [[W - 4.4 + i * 0.42, 1.1 - 0.16 - i * 0.12], [W - 4.1 + i * 0.42, 1.1 - 0.16 - i * 0.12], [W - 4.1 + i * 0.42, 1.1], [W - 4.4 + i * 0.42, 1.1]]);
  blk('battery', roundRect(W - 2.3, 0.6, W - 1.0, 1.1, 0.12));
  blk('battery.nub', [[W - 1.0, 0.75], [W - 0.82, 0.75], [W - 0.82, 0.95], [W - 1.0, 0.95]], {meta: {owner: 'chat.battery'}});
  // header: a bar with a back chevron, an avatar circle (no sign in it), a title line and three menu dots
  blk('header', roundRect(0.3, 1.7, W - 0.3, 4.1, 0.4), {tone: 'mid'});
  blk('back', [[1.0, 2.9], [1.6, 2.35], [1.6, 3.45]], on('header'));
  faceDisc(A, s, 'chat.avatar', 2.9, 2.9, 0.65, 0.04, {tone: 'hi', ...on('header')});
  blk('title', roundRect(4.0, 2.65, Math.min(9, W - 3.2), 3.15, 0.25), on('header'));
  for (let i = 0; i < 3; i++) faceDisc(A, s, `chat.dot${i}`, W - 1.2, 2.35 + i * 0.55, 0.16, 0.04, {tone: 'lo', ...on('header')});
  blk('divider', [[0.3, 4.35], [W - 0.3, 4.35], [W - 0.3, 4.5], [0.3, 4.5]]);
  // the question: a bubble on the right with its tail
  const qb = 5.2 + (o.questionH ?? 3);
  blk('question', roundRect(W * 0.16, 5.2, W - 0.8, qb, 0.8), {tone: 'mid'});
  blk('question.tail', [[W - 1.9, qb], [W - 0.9, qb], [W - 0.6, qb + 0.7]], {tone: 'mid', meta: {owner: 'chat.question'}});
  // the answer: chips flowed into lines from the left
  const out: ChatChip[] = [];
  let x = 0.8;
  let y = qb + 1.5;
  const ch = o.chipH ?? 1.3;
  for (const [i, w] of chips.entries()) {
    if (x + w > W - 0.8 && x > 0.8) {
      x = 0.8;
      y += ch + 0.45;
    }
    const poly = roundRect(x, y, x + w, y + ch, 0.35);
    blk(`chip${i}`, poly, {tone: o.chipTone ?? 'mid'}, 0.06);
    out.push({name: `chat.chip${i}`, poly, x: x + w / 2, y: y + ch / 2, w, h: ch});
    x += w + 0.25;
  }
  // the input: field with a hint line, a send button with an arrow
  blk('input', roundRect(0.6, H - 3.3, W - 2.6, H - 1.5, 0.9), {tone: 'mid'});
  blk('hint', roundRect(1.4, H - 2.55, W * 0.5, H - 2.25, 0.15), on('input'));
  faceDisc(A, s, 'chat.send', W - 1.45, H - 2.4, 0.85, 0.04, {tone: 'mid'});
  blk('arrow', [[W - 1.45, H - 2.95], [W - 1.0, H - 2.2], [W - 1.9, H - 2.2]], {tone: 'hi', ...on('send')});
  return out;
};

/** A chip (or any block of chatUi) as a moving part: the same body, `lift` out of the glass (a chip settling onto the
 *  screen), lit for the one coral piece. The scene hides the static chip (svg `hide`) while it draws this one. */
export const faceDyn = (P: K.Projection, s: ScreenRect, name: string, poly: number[][], o: {h?: number; lift?: number; lit?: boolean; tone?: K.Tone; opacity?: number} = {}): Dyn => {
  const F = faceFrame(s);
  const h = o.h ?? 0.06;
  const lift = o.lift ?? 0;
  const [s0, s1] = [-lift - h, -lift];
  const cx = poly.reduce((t, p) => t + p[0], 0) / poly.length;
  const cy = poly.reduce((t, p) => t + p[1], 0) / poly.length;
  const paths = G.prismOf(F, poly, s0, s1, P);
  // a lit block faces the viewer: its face lands in a shade band and takes the dark lit shade (#B13D30), not the
  // accent, so the one coral piece read as dark red and still-check found no coral. The face of a block on a screen
  // is its top: draw it (and its hair-thin sides) in the top band.
  if (o.lit) asTopFace(paths);
  return dynSolid(name, ptOf(F, cx, cy, (s0 + s1) / 2), K.solidSvg(paths, {tone: o.tone ?? (o.lit ? 'hi' : 'mid'), lit: o.lit}), AK.prism(F, poly, s0, s1, {name}), o.opacity);
};

/** The 3D point at (x, y) kit units from a screen's top-left corner, `out` units in front of the glass (pins a frontal
 *  Word or Plate to a chip). */
export const facePoint = (s: ScreenRect, x: number, y: number, out = 0): Point3 => ptOf(faceFrame(s), x, y, -out);
