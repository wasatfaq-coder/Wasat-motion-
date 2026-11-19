import {Assembly, G} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {vessel} from '../../lib/nature';
import KEYS from './nature.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── substances: a lab bench with three vessels at different levels and a burner under a tripod (the flame and the
// steam are particles drawn by the scene over this static build)
const lab = new Assembly('lab', P, {role: 'secondary'});
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const W = 80;
const D = 34;
const H = 30;
for (const [x, y] of [
  [3, 3],
  [W - 3, 3],
  [3, D - 3],
  [W - 3, D - 3],
]) {
  lab.cyl(`foot${x}_${y}`, x, y, 2, 0, 1, {tone: 'lo', ground: true, bevel: 0.3});
  lab.cyl(`leg${x}_${y}`, x, y, 1.4, 1, H - 3, {tone: 'mid', bevel: 0.3});
}
lab.slab('shelf', {x: 3.8, y: 3.8, w: W - 7.6, d: D - 7.6, r: 0.5}, 8, 1.2, {tone: 'mid', bevel: 0.3});
for (const [i, sx] of [6, 23, 40, 57].entries()) lab.slab(`shelf.box${i}`, {x: sx, y: 8, w: 14, d: 16, r: 0.6}, 9.2, 6, {tone: 'hi', bevel: 0.4});
lab.slab('apron', {x: 4.4, y: 4.4, w: W - 8.8, d: D - 8.8, r: 0.5}, H - 4, 2, {tone: 'lo', bevel: 0.3});
lab.slab('top', {x: 0, y: 0, w: W, d: D, r: 1}, H - 2, 2, {tone: 'hi', bevel: 0.6, shadow: 'hero'});
const T = H;
vessel(lab, 'glassA', [12, 14, T], {r: 5, h: 14, level: 10});
vessel(lab, 'glassB', [26, 20, T], {r: 4, h: 10, level: 4});
// the burner: base, body, air collar, knob, and the gas hose to a tap on the bench edge
lab.turned('burner.base', [[0, 4], [0.8, 4], [1.2, 3.2, 1], [1.4, 1.4]], up(52, 16, T), {tone: 'mid'});
// the burner tube in two slices with the air collar between them (a collar round a whole tube has no paint order)
lab.turned('burner', [[0, 1.2], [2, 1.2]], up(52, 16, T + 1.4), {tone: 'hi', meta: {owner: 'burner.base'}});
lab.turned('burner.collar', [[0, 1.8], [1.6, 1.8]], up(52, 16, T + 3.4), {tone: 'lo', meta: {owner: 'burner.base'}});
lab.turned('burner.top', [[0, 1.2], [5.6, 1.2], [6, 1.5, 1], [6.6, 1.5]], up(52, 16, T + 5), {tone: 'hi', meta: {owner: 'burner.base'}});
lab.turned('burner.knob', [[0, 0.6], [1.6, 0.9, 1], [2.2, 0.0001]], G.frameAlong([52, 14.8, T + 2.3], [0, -1, 0]), {tone: 'lo', meta: {owner: 'burner.base'}});
lab.slab('tap', {x: 66, y: 28, w: 4, d: 4, r: 0.6}, T, 2, {tone: 'mid', bevel: 0.3});
lab.turned('tap.handle', [[0, 0.5], [2, 0.5], [2.6, 1.2, 1], [3, 0.0001]], up(68, 30, T + 2), {tone: 'hi', meta: {owner: 'tap'}});
// the nozzle points straight at the burner, so the hose runs without a corner (a 90° turn in plan is ~120° on screen)
const toBurner = G.unit3([52 - 68, 16 - 28, 0]);
lab.turned('tap.nozzle', [[0, 0.7], [3, 0.7], [3.4, 0.9]], G.frameAlong([68, 28, T + 1.2], toBurner), {tone: 'hi', meta: {owner: 'tap'}});
const from = G.add3([68, 28, T + 1.2], G.mul3(toBurner, 3.4));
// the hose goes into the side of the burner tube (the inlet), whose face is taller than the hose (the low base rim
// is not: a hose end wider than its mount face never seats)
const to = G.add3([52, 16, T + 2.4], G.mul3(toBurner, -1.1));
lab.pipe('hose', [from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, T + 0.75], G.add3(to, G.mul3(toBurner, -2.6)), to], 0.55, {bend: 4, limp: true, meta: {touch: ['top', 'burner.base']}});
// a tripod over the burner (a ring on three legs) and a flask of water on it. The ring stands 8 units over the burner
// mouth (T + 11.6): at 2.4 the flame had no room and the ring and flask hid it (gate round 1)
const RING = T + 20;
lab.ring('tripod', 0, 0.8, 5.2, 6.4, up(52, 16, RING), {tone: 'lo'});
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + 0.3;
  lab.pipe(`tripod.leg${i}`, [[52 + Math.cos(a) * 5.8, 16 + Math.sin(a) * 5.8, RING], [52 + Math.cos(a) * 8.2, 16 + Math.sin(a) * 8.2, T]], 0.45);
}
vessel(lab, 'flask', [52, 16, RING + 0.8], {r: 4.6, h: 9, level: 6});
// a small sink with a faucet on the near front of the bench (behind the burner the flask hid the drips) (the drops page: water drips from the spout into the basin)
lab.slab('sink.floor', {x: 31, y: 21, w: 12, d: 12, r: 1}, T, 0.8, {tone: 'lo', bevel: 0.2});
lab.slab('sink.n', {x: 31, y: 21, w: 12, d: 0.8, r: 0.2}, T + 0.8, 5, {tone: 'mid', bevel: 0.2});
lab.slab('sink.s', {x: 31, y: 32.2, w: 12, d: 0.8, r: 0.2}, T + 0.8, 5, {tone: 'mid', bevel: 0.2});
lab.slab('sink.w', {x: 31, y: 21.8, w: 0.8, d: 10.4, r: 0.2}, T + 0.8, 5, {tone: 'mid', bevel: 0.2});
lab.slab('sink.e', {x: 42.2, y: 21.8, w: 0.8, d: 10.4, r: 0.2}, T + 0.8, 5, {tone: 'mid', bevel: 0.2});
lab.cyl('sink.drain', 37, 27, 1, T + 0.8, 0.1, {tone: 'lo', bevel: 0});
lab.cyl('faucet.base', 29, 27, 1.4, T, 0.6, {tone: 'mid', bevel: 0.2});
lab.cyl('faucet', 29, 27, 0.8, T + 0.6, 11.4, {tone: 'hi', bevel: 0.2, meta: {owner: 'faucet.base'}});
lab.cyl('faucet.cap', 29, 27, 1.1, T + 12, 0.8, {tone: 'mid', bevel: 0.2, meta: {owner: 'faucet.base'}});
lab.slab('faucet.lever', {x: 27.4, y: 26.6, w: 0.8, d: 0.8, r: 0.3}, T + 12.8, 3, {tone: 'lo', bevel: 0.1, meta: {owner: 'faucet.base'}});
lab.turned('faucet.spout', [[0, 0.5], [7.2, 0.5]], G.frameAlong([29.8, 27, T + 11.2], [1, 0, 0]), {tone: 'hi', meta: {owner: 'faucet.base'}});
lab.turned('faucet.aerator', [[0, 0.65], [1.4, 0.65]], G.frameAlong([36.3, 27, T + 10.7], [0, 0, -1]), {tone: 'mid', meta: {owner: 'faucet.base'}});
/** where the drips leave the faucet (kit units) and the box round the sink and faucet, for the drops page */
export const SPOUT: [number, number, number] = [36.3, 27, T + 5.9]; // a drop's base: the drop is 3.4 tall, its tip at the aerator
export const SINK_BOX: [[number, number, number], [number, number, number]] = [[28, 21, T], [12, 12, 13]]; // the basin and the spout: a close shot
export const LAB = keyed(lab, 'LAB');
