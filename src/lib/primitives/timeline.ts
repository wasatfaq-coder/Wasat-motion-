import * as K from '../../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from '../assembly';

// A chronicle as a physical axis (MASTER_PROMPT_FINAL §24.3): time runs along a rail (+x), events are stations
// standing on it, a carriage rides from station to station, and a cause is a mechanical link between two stations
// (meshing gears or a tube), never an arrow. Distance along the rail is proportional to time (`perYear`), so
// equal gaps mean equal durations; a broken scale is shown by a visible gap piece in the rail, not silently.

const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

export type Station = {id: string; year: number; lit?: boolean};

/** The rail from `from` to `to` (years) along +x: a bed, two rails, sleepers every `sleeper` kit units, end stops.
 *  Returns x(year) for stations, carriages and cameras. */
export const rail = (A: Assembly, [x0, y0, z0]: Point3, o: {from: number; to: number; perYear: number; sleeper?: number}) => {
  const L = (o.to - o.from) * o.perYear + 16;
  const xOf = (year: number) => x0 + 8 + (year - o.from) * o.perYear;
  A.slab('rail.bed', {x: x0, y: y0, w: L, d: 14, r: 1}, z0, 2, {tone: 'lo', ground: true, bevel: 0.5, shadow: 'hero'});
  const step = o.sleeper ?? 6;
  for (let x = x0 + 4.5; x < x0 + L - 6; x += step) A.slab(`rail.sleeper${Math.round(x)}`, {x, y: y0 + 1, w: 2.4, d: 12, r: 0.3}, z0 + 2, 1, {tone: 'mid', bevel: 0.2});
  for (const y of [y0 + 3.5, y0 + 9.5]) A.slab(`rail.track${y}`, {x: x0 + 3.5, y, w: L - 7, d: 1, r: 0.2}, z0 + 3, 1.2, {tone: 'hi', bevel: 0.15});
  for (const x of [x0 + 0.5, x0 + L - 3.5]) A.slab(`rail.stop${Math.round(x)}`, {x, y: y0 + 2, w: 3, d: 10, r: 0.6}, z0 + 2, 4, {tone: 'mid', bevel: 0.4});
  return {xOf, top: z0 + 4.2, y0, length: L};
};

/** A station beside the rail at its year: a platform, a post and a plate turned to the viewer (the frontal label is
 *  pinned to `sign`), a lamp. The `lit` station is the event the voice is about. */
export const station = (A: Assembly, s: Station, xOf: (year: number) => number, y0: number, z0: number) => {
  const x = xOf(s.year);
  const p = `station.${s.id}`;
  const own = {meta: {owner: `${A.name}.${p}`}};
  A.slab(p, {x: x - 6, y: y0 + 15, w: 12, d: 8, r: 0.8}, z0, 3, {tone: 'mid', ground: true, bevel: 0.4});
  A.slab(`${p}.edge`, {x: x - 6, y: y0 + 15, w: 12, d: 1, r: 0.2}, z0 + 3, 0.4, {tone: 'hi', bevel: 0.1, ...own});
  A.cyl(`${p}.post`, x, y0 + 20, 0.8, z0 + 3, 14, {tone: 'hi', bevel: 0.2, ...own});
  A.slab(`${p}.sign`, {x: x - 4, y: y0 + 20.8, w: 8, d: 1.2, r: 0.4}, z0 + 12, 5, {tone: 'hi', bevel: 0.3, lit: s.lit, ...own});
  A.ball(`${p}.lamp`, [x, y0 + 20, z0 + 17.8], 1.2, {tone: 'mid', ...own});
  return {sign: [x, y0 + 22, z0 + 14.5] as Point3, top: [x, y0 + 20, z0 + 19] as Point3, at: [x, y0 + 19, z0 + 3] as Point3};
};

/** A carriage on the rail at kit x: a body, a cab roof, four wheels on two axles. Build it once at x0; the scene moves
 *  it with piece `carriage` (move = travel along +x, share 0..1). */
export const carriage = (A: Assembly, x: number, y0: number, top: number, travel: number) => {
  const c = {piece: 'carriage', move: [travel, 0, 0] as Point3, meta: {owner: `${A.name}.carriage`}};
  for (const dx of [-3.5, 3.5])
    for (const y of [y0 + 4, y0 + 10]) A.disc(`carriage.wheel${dx}_${y}`, -0.6, 0.6, 1.8, G.frameAlong([x + dx, y, top + 1.8], [0, 1, 0]), {tone: 'lo', ...c});
  A.slab('carriage.chassis', {x: x - 6, y: y0 + 2.6, w: 12, d: 8.8, r: 0.6}, top + 2.2, 1.6, {tone: 'mid', bevel: 0.3, ...c, ground: true});
  A.slab('carriage.body', {x: x - 5, y: y0 + 3.2, w: 10, d: 7.6, r: 1.2}, top + 3.8, 5, {tone: 'hi', bevel: 0.6, ...c});
  A.slab('carriage.roof', {x: x - 5.6, y: y0 + 2.6, w: 11.2, d: 8.8, r: 1.6}, top + 8.8, 1, {tone: 'mid', bevel: 0.4, ...c});
  A.turned('carriage.lamp', [[0, 1.2], [0.8, 1.2, 1], [1.2, 0.0001]], G.frameAlong([x + 5, y0 + 7, top + 6.2], [1, 0, 0]), {tone: 'hi', ...c});
};

/** An upright spur gear standing on a plate whose top is at z: a spacer, the toothed plate, an axle cap. `phase`
 *  turns the teeth (rebuild per frame or export them from dynamicShapes). Two gears mesh when their centre distance
 *  = r1 + r2 and the tooth counts are in the radius ratio. */
export const gear = (A: Assembly, name: string, [cx, cy, z]: Point3, o: {r: number; teeth: number; h?: number; phase?: number; lit?: boolean; piece?: string}) => {
  const h = o.h ?? 2;
  const depth = Math.min(1.6, o.r * 0.18);
  const ring: K.Plane[] = [];
  const per = 4;
  for (let t = 0; t < o.teeth; t++)
    for (let k = 0; k < per; k++) {
      const a = (o.phase ?? 0) + ((t + k / per) / o.teeth) * Math.PI * 2;
      const rr = k === 1 || k === 2 ? o.r + depth / 2 : o.r - depth / 2;
      ring.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  const own = {meta: {owner: `${A.name}.${name}`}, ...(o.piece ? {piece: o.piece} : {})};
  A.cyl(`${name}.spacer`, cx, cy, o.r * 0.3, z, 1, {tone: 'mid', bevel: 0.2, ...own});
  A.extruded(name, ring, z + 1, h, {tone: 'hi', lit: o.lit, ...(o.piece ? {piece: o.piece} : {})});
  A.cyl(`${name}.cap`, cx, cy, o.r * 0.22, z + 1 + h, 0.6, {tone: 'lo', bevel: 0.15, ...own});
};

/** A plate for a gear train beside the rail (the gears stand on it, `gear(..., [x, y, top])`). */
export const gearPlate = (A: Assembly, name: string, [x, y, z]: Point3, w: number, d: number) => {
  A.slab(name, {x, y, w, d, r: 1.2}, z, 1.6, {tone: 'mid', ground: true, bevel: 0.4});
  for (const [bx, by] of [
    [x + 2, y + 2],
    [x + w - 2, y + 2],
    [x + 2, y + d - 2],
    [x + w - 2, y + d - 2],
  ])
    A.turned(`${name}.bolt${Math.round(bx)}_${Math.round(by)}`, [[0, 0.8], [0.4, 0.8], [0.7, 0.0001]], up(bx, by, z + 1.6), {tone: 'hi', meta: {owner: `${A.name}.${name}`}});
  return z + 1.6;
};

/** A causal link between two stations as a tube on posts above the rail (when gears would not fit): from the cause's
 *  post top to the effect's, arched `lift` above. The tube is the one coral part when the link is the subject. */
export const link = (A: Assembly, name: string, a: Point3, b: Point3, o: {lift?: number; lit?: boolean} = {}) => {
  const lift = o.lift ?? 8;
  const mid: Point3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(a[2], b[2]) + lift];
  return A.pipe(name, [a, [a[0], a[1], a[2] + lift * 0.6], mid, [b[0], b[1], b[2] + lift * 0.6], b], 0.6, {bend: 4, lit: o.lit, tone: 'hi'});
};
