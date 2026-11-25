import {A as A2, Assembly, Dyn, G, K, Point3} from '../lib/assembly';
import {anatomyProjection} from '../lib/anatomy';
import {particles} from '../lib/nature';
import {COLORS} from '../theme/tokens';

// The kettle world of the «Как работает чайник» demo (not a topic): a kitchen, a kettle that can be cut open, a mug and
// the thermostat for the loupe. Kit bodies only; part names carry the object's name (k.<variant>.<part>).

export const U = 10;
export const P = anatomyProjection(U);
export const Z0 = 36; // the counter top
export const KC: [number, number] = [34, 20]; // the kettle on the counter
export const R = 13;
const VIEW = Math.atan2(new Assembly('v', P).V[1], new Assembly('v', P).V[0]); // plan angle of the near side

export const kitchen = (A: Assembly) => {
  A.slab('floor', {x: 0, y: 0, w: 90, d: 60, r: 0}, -1, 1, {tone: 'mid', ground: true, bevel: 0, bias: -3000});
  for (let i = 1; i < 6; i++) A.slab(`floor.board${i}`, {x: i * 15 - 0.12, y: 0.5, w: 0.24, d: 59, r: 0}, 0, 0.03, {tone: 'lo', bevel: 0, bias: -2999});
  A.slab('wall.back', {x: 0, y: -2, w: 90, d: 2, r: 0}, 0, 70, {tone: 'hi', bevel: 0.2, bias: -4000});
  A.slab('wall.left', {x: -2, y: -2, w: 2, d: 62, r: 0}, 0, 70, {tone: 'hi', bevel: 0.2, bias: -4000});
  for (let r = 0; r < 8; r++) A.slab(`tile${r}`, {x: 0.5, y: -0.05, w: 89, d: 0.05, r: 0}, Z0 + 2 + r * 4, 0.2, {tone: 'lo', bevel: 0, bias: -3900});
  A.slab('counter', {x: 2, y: 2, w: 82, d: 34, r: 0.6}, 0, Z0, {tone: 'mid', ground: true, bevel: 0.5, bias: -2000});
  A.slab('counter.top', {x: 1, y: 1, w: 84, d: 36, r: 0.6}, Z0, 2.4, {tone: 'hi', bevel: 0.5, bias: -1900});
  for (let i = 0; i < 4; i++) A.slab(`door${i}`, {x: 4 + i * 20, y: 36, w: 18, d: 0.3, r: 0.3}, 4, Z0 - 8, {tone: 'lo', bevel: 0.15, bias: -1800});
  for (let i = 0; i < 4; i++) A.cyl(`knob${i}`, 20 + i * 20, 36.4, 0.7, Z0 - 8, 0.4, {tone: 'mid', bevel: 0.1, bias: -1700});
};

export const mug = (A: Assembly, x: number, y: number) => {
  A.cyl('mug', x, y, 4, Z0 + 2.4, 8, {tone: 'hi', bevel: 0.5, shadow: 'part'});
  A.cyl('mug.tea', x, y, 3.4, Z0 + 10, 0.5, {tone: 'lo', bevel: 0});
  A.pipe('mug.handle', [[x + 4, y, Z0 + 8], [x + 7, y, Z0 + 8], [x + 7, y, Z0 + 5], [x + 4, y, Z0 + 4]], 0.7, {bend: 1.5, tone: 'hi'});
};

// the outline of a jug kettle: [height above the base top, outer radius]. Real proportions: a 1.7 l jug kettle is about
// 1.6–1.8 times as tall as it is wide (Bosch DesignLine TWK5P471GB: 267 mm tall, 150 mm deep), nearly upright, a little
// narrower at the top — not the round belly of a teapot
const OUTLINE: [number, number][] = [[0, 8.3], [1.2, 8.7], [4, 8.8], [12, 8.6], [20, 8.2], [25, 7.8], [27, 7.6], [28, 7.5]];
const rAt = (z: number) => {
  for (let i = 0; i < OUTLINE.length - 1; i++) {
    const [z0, r0] = OUTLINE[i];
    const [z1, r1] = OUTLINE[i + 1];
    if (z <= z1) return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
  }
  return OUTLINE[OUTLINE.length - 1][1];
};
const BODY0 = 3.4; // the body starts this high above the kettle's base plane
const AH = VIEW + Math.PI * 0.5 + 0.2; // the handle (left of the viewer)
const AS = VIEW + Math.PI * 1.5 - 0.2; // the spout (right of the viewer)

/** What is INSIDE a cordless jug kettle and under it: the power base with a gap and a contact pad, the cord to a wall
 *  socket and the water. Drawn first, then the coil, then the shell, which may be made translucent (an x-ray, like a
 *  glass kettle). */
export const kettleInside = (A: Assembly, [cx, cy]: [number, number], z0: number) => {
  A.cyl('base', cx, cy, 10.2, z0, 2.2, {tone: 'mid', ground: true, bevel: 0.6, shadow: 'hero'});
  A.cyl('base.gap', cx, cy, 9.2, z0 + 2.2, 0.5, {tone: 'lo', bevel: 0});
  A.cyl('base.pad', cx, cy, 8.4, z0 + 2.7, 0.7, {tone: 'hi', bevel: 0.3});
  A.cyl('floor', cx, cy, 7.8, z0 + 3.4, 0.8, {tone: 'lo', bevel: 0.1});
  A.slab('socket', {x: cx - 24, y: 0.4, w: 6, d: 1.4, r: 0.4}, z0 + 9, 6, {tone: 'mid', bevel: 0.3, bias: -1000});
  A.slab('plug', {x: cx - 23, y: 1.6, w: 4, d: 3, r: 0.5}, z0 + 10, 4, {tone: 'lo', bevel: 0.3, bias: -900});
  A.pipe('cord', [[cx - 2, cy - 10, z0 + 1.2], [cx - 10, 8, z0 + 0.8], [cx - 21, 4, z0 + 0.8], [cx - 21, 3.2, z0 + 10]], 0.7, {bend: 2.5, tone: 'lo', limp: true, ends: [true, true], free: 'cord'});
  A.cyl('water', cx, cy, 7.6, z0 + 4.2, 14, {tone: 'lo'});
  // the limescale filter: a curved mesh plate in a slot behind the spout, following the curve of the body
  const rf = rAt(22) - 1.4;
  A.arc('filter', [cx, cy], rf - 0.25, rf, AS - 0.42, AS + 0.42, z0 + BODY0 + 19, 7.5, {tone: 'mid'});
};

/** The heating coil on its feet: two closed rings of a tube. Drawn after the water and before the shell, so it shows through
 *  clear water and a translucent shell. `coilOn` lights it (coral). */
export const kettleCoil = (A: Assembly, [cx, cy]: [number, number], z0: number, o: {coilOn?: boolean} = {}) => {
  const on = o.coilOn ?? true;
  const ring = (r: number, n = 20): Point3[] => Array.from({length: n}, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2), z0 + 5.4]);
  A.pipe('coil.a', ring(5.4), 0.7, {closed: true, bend: 2.5, lit: on, tone: 'hi'});
  A.pipe('coil.b', ring(3.1), 0.7, {closed: true, bend: 2, lit: on, tone: 'hi'});
  for (let i = 0; i < 4; i++) A.cyl(`coil.foot${i}`, cx + 4.25 * Math.cos((i * Math.PI) / 2 + 0.4), cy + 4.25 * Math.sin((i * Math.PI) / 2 + 0.4), 0.7, z0 + 4.2, 1.2, {tone: 'lo', bevel: 0.1});
};

/** The shell of a cordless jug kettle: an upright molded body with a pouring lip from the rim, a flat flip lid, a tall handle with the lid button on top and the rocker switch at its foot. Drawn over the inside. */
export const kettleShell = (A: Assembly, [cx, cy]: [number, number], z0: number, o: {coilOn?: boolean} = {}) => {
  const on = o.coilOn ?? true;
  const at = (r: number, z: number, a = AH): Point3 => [cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + z];
  const F = G.frameAlong([cx, cy, z0 + BODY0], [0, 0, 1]);
  // the water window: flush in the body, following its curve, with MIN and MAX ticks (surface markup, not a part)
  const aw = VIEW + 0.6;
  const surf = (z: number, da: number): Point3 => {
    const r = rAt(z) + 0.06;
    return [cx + r * Math.cos(aw + da), cy + r * Math.sin(aw + da), z0 + BODY0 + z];
  };
  const fl = (p: Point3) => K.iso(p, P);
  const zs = Array.from({length: 9}, (_, i) => 5 + i * 2);
  const ring = [...zs.map((z) => fl(surf(z, -0.13))), ...zs.reverse().map((z) => fl(surf(z, 0.13)))];
  const tick = (z: number) => `<path d="${K.pathOf([fl(surf(z, -0.13)), fl(surf(z, 0.13)), fl(surf(z, 0.36))])}" fill="none" stroke="${COLORS.ink}" stroke-width="3.2" stroke-linecap="round"/>`;
  const level = Array.from({length: 7}, (_, i) => fl(surf(14, -0.13 + (i / 6) * 0.26)));
  const window = `<path d="${K.pathOf(ring, true)}" fill="${COLORS.inkSoft}" fill-opacity="0.6"/>` + K.lineSvg(K.pathOf(ring, true), {tone: 'lo'}) + K.lineSvg(K.pathOf(level), {tone: 'hi'}) + tick(7) + tick(19);
  // the body: one molded jug (src/lib/molded.ts). As on a real jug kettle the spout is no tube: the front of the rim
  // rises and pulls forward into a pointed open lip, the same plastic as the body; the lid sits behind it
  const LIP = 3.4; // how far the lip reaches out past the round body
  const RISE = 1.8; // how far the rim rises at the lip
  const wLip = (th: number) => Math.pow(Math.max(0, Math.cos(th - AS)), 9);
  const ZS = Array.from({length: 57}, (_, i) => i * 0.5);
  const NTH = 128;
  const rings: Point3[][] = ZS.map((z) =>
    Array.from({length: NTH}, (_, j) => {
      const th = (j / NTH) * Math.PI * 2;
      const k = Math.max(0, (z - 20) / 8);
      const r = rAt(z) + LIP * wLip(th) * k * k;
      return [cx + r * Math.cos(th), cy + r * Math.sin(th), z0 + BODY0 + z + RISE * wLip(th) * Math.pow(z / 28, 6)] as Point3;
    }),
  );
  // the open channel of the lip in front of the lid, and the limescale filter seen down in it
  const TOP = BODY0 + 28; // the rim, above z0
  const lipTip = at(rAt(28) + LIP - 0.5, TOP + RISE, AS);
  const ch = (r: number, da: number) => fl(at(r, TOP + RISE * wLip(AS + da) + 0.05, AS + da));
  const channel = `<path d="${K.pathOf([ch(rAt(28) - 1.1, -0.36), ch(rAt(28) + LIP - 0.8, 0), ch(rAt(28) - 1.1, 0.36)], true)}" fill="${COLORS.inkSoft}" fill-opacity="0.35"/>` + K.lineSvg(K.pathOf([ch(rAt(28) - 1.1, -0.36), ch(rAt(28) + LIP - 0.8, 0), ch(rAt(28) - 1.1, 0.36)]), {tone: 'lo'});
  A.molded('body', rings, A2.solid(F, OUTLINE.map(([z, r]) => [z, r, 1])), {tone: 'hi', molded: {cap: 'top', smooth: true}, over: window + channel});
  A.turned('band.low', [[0, rAt(0) + 0.25], [2.4, rAt(2.4) + 0.12, 1]], F, {tone: 'mid'});
  // the lid: a flat flip lid sunk in the rim, hinged at the handle side (opened by the button on the handle), no knob
  A.cyl('lid', cx, cy, rAt(28) - 1.0, z0 + TOP - 0.45, 0.6, {tone: 'hi', bevel: 0.3});
  const hg = at(rAt(28) - 1.6, 0);
  A.slab('lid.hinge', {x: hg[0] - 1.2, y: hg[1] - 1.2, w: 2.4, d: 2.4, r: 0.6}, z0 + TOP - 0.3, 0.9, {tone: 'mid', bevel: 0.2});
  // the handle: a tall upright grip, its top grows out of the rim level with the lid, its foot joins the lower body
  A.pipe('handle', [at(rAt(27.5) - 0.6, TOP - 1.2), at(rAt(27) + 2.4, TOP - 0.7), at(rAt(26) + 5, TOP - 1.4), at(rAt(23) + 5.9, TOP - 4.5), at(rAt(16) + 6.1, BODY0 + 16), at(rAt(9) + 5.8, BODY0 + 9), at(rAt(5) + 4.4, BODY0 + 5.2), at(rAt(3) + 1.8, BODY0 + 3.2), at(rAt(3) - 0.6, BODY0 + 3)], 1.7, {bend: 4, tone: 'lo'});
  // on top of the handle the lid-release button; the on/off rocker at the foot of the handle with its light
  const rb = at(rAt(27) + 2.6, 0);
  A.slab('lid.release', {x: rb[0] - 1, y: rb[1] - 1, w: 2, d: 2, r: 0.6}, z0 + TOP + 0.7, 0.5, {tone: 'mid', bevel: 0.2});
  const sw = at(rAt(2) + 1.3, 0);
  A.slab('switch', {x: sw[0] - 1.2, y: sw[1] - 1.2, w: 2.4, d: 2.4, r: 0.7}, z0 + BODY0 + 0.4, 1.3, {tone: 'lo', bevel: 0.3});
  A.cyl('switch.led', sw[0], sw[1], 0.45, z0 + BODY0 + 1.7, 0.3, {tone: 'hi', bevel: 0.1, lit: on});
  return {at, AH, AS, spout: lipTip};
};

/** the thermostat for the loupe: a bimetal strip that bends with `bend` 0..1 and opens the contact at the end */
export const thermostat = (bend: number) => {
  const T = new Assembly('therm', P, {role: 'mechanism'});
  const z = 0;
  T.slab('plate', {x: 0, y: 0, w: 30, d: 14, r: 1}, z, 2, {tone: 'mid', ground: true, bevel: 0.5, shadow: 'hero'});
  T.slab('post.a', {x: 2, y: 4, w: 3, d: 6, r: 0.5}, z + 2, 9, {tone: 'lo', bevel: 0.3});
  T.slab('post.b', {x: 22, y: 4, w: 3, d: 6, r: 0.5}, z + 2, 15, {tone: 'lo', bevel: 0.3});
  T.cyl('contact.a', 17.5, 7, 1.3, z + 2, 6.4, {tone: 'hi', bevel: 0.3});
  T.cyl('contact.b', 17.5, 7, 1.0, z + 12.4 + Math.max(0, bend - 0.75) * 12, 1.2, {tone: 'hi', bevel: 0.2});
  const strip = (dz: number): Point3[] => Array.from({length: 7}, (_, i) => [5 + (i / 6) * 13, 7, z + 8.4 + dz + bend * 6 * Math.pow(i / 6, 2)] as Point3);
  T.pipe('strip.steel', strip(0), 0.7, {bend: 3, tone: 'mid', limp: true, ends: [false, false], free: 'sketch'});
  T.pipe('strip.brass', strip(1.5), 0.7, {bend: 3, tone: 'hi', lit: bend > 0.4, limp: true, ends: [false, false], free: 'sketch'});
  T.slab('lever', {x: 22, y: 5, w: 6, d: 4, r: 0.6}, z + 17 + bend * 4, 1.4, {tone: 'hi', bevel: 0.3});
  for (let i = 0; i < 3; i++) T.cyl(`screw${i}`, 4 + i * 11, 12, 0.6, z + 2, 0.5, {tone: 'lo', bevel: 0});
  return T;
};

/** steam from the spout and the lid, `rate` particles, at time `t` seconds */
export const steam = (spout: Point3, rate: number, t: number): Dyn[] => particles(P, 'steam', {at: [spout[0], spout[1], spout[2] + 1], spread: 1.6, rate}, t);
/** bubbles rising in the water */
export const bubbles = (c: [number, number], rate: number, t: number): Dyn[] => particles(P, 'gas', {at: [c[0], c[1], Z0 + 8], spread: 5, rate}, t);
