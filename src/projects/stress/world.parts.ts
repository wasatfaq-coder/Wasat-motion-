import {Assembly, G, Point3} from '../../lib/assembly';
import {figure} from '../../lib/crowd';
import {P} from './proj';
import KEYS from './world.parts.keys.json';

const keyed = <T extends Assembly>(A: T, name: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[name]) as T;

const own = (owner: string) => ({meta: {owner}});

const person = (A: Assembly, at: Point3, yaw: number, scale: number) =>
  figure(A, 'hero', {at, yaw, scale, lit: false});

/** Walls on the floor, a window on the back wall. Gaps keep faces from sinking into each other. */
const shell = (A: Assembly, w: number, d: number, h: number, window: boolean) => {
  A.slab('floor', {x: 0, y: 0, w, d, r: 0}, -2.2, 2.2, {tone: 'mid', ground: true, bevel: 0.5, steps: 1, shadow: 'hero', texture: 'grain'});
  // r 0 and steps 1: a rounded wall has 8 outline points and the arc lint reads it as a ring around a post
  const wall = {steps: 1, bevel: 0.45};
  const plan = (x: number, y: number, w: number, d: number) => ({x, y, w, d, r: 0});
  A.slab('wall.back', plan(2, 2, w - 4, 2.2), 0.15, h, {tone: 'hi', texture: 'dots', ...wall, ...own('floor')});
  A.slab('wall.left', plan(2, 4.6, 2.2, d - 8), 0.15, h, {tone: 'lo', texture: 'dots', ...wall, ...own('floor')});
  A.slab('wall.right', plan(w - 4.2, 4.6, 2.2, d - 8), 0.15, h, {tone: 'lo', texture: 'dots', ...wall, ...own('floor')});
  A.slab('board', plan(4.4, 4.5, w - 8.8, 0.7), 0.15, 1.6, {tone: 'lo', bevel: 0.2, steps: 1, ...own('floor')});
  if (!window) return;
  // Posts stand on a sill that stands on the floor, so nothing hangs off the wall.
  A.slab('win.sill', {x: 20, y: 5.2, w: 22, d: 2.6, r: 0}, 0, 1.3, {tone: 'mid', ground: true, bevel: 0.35, steps: 1, texture: 'grain'});
  A.cyl('win.l', 22.2, 6.4, 0.45, 1.3, 15.5, {tone: 'lo', bevel: 0.2, ...own('win.sill')});
  A.cyl('win.r', 39.4, 6.4, 0.45, 1.3, 15.5, {tone: 'lo', bevel: 0.2, ...own('win.sill')});
  A.slab('win.top', {x: 21.6, y: 5.9, w: 18.2, d: 1.1, r: 0}, 16.8, 0.9, {tone: 'mid', bevel: 0.25, steps: 1, ...own('win.l')});
};

const home = new Assembly('home', P, {role: 'secondary'});
shell(home, 78, 62, 36, true);
person(home, [30, 36, 0], Math.PI / 4, 1.5);
home.cyl('pot', 12, 18, 2.3, 0, 3.4, {tone: 'lo', ground: true, bevel: 0.4, texture: 'dots'});
home.cyl('soil', 12, 18, 1.9, 3.4, 0.7, {tone: 'mid', bevel: 0.2, texture: 'dots', ...own('pot')});
home.cyl('stem', 12, 18, 0.45, 4.1, 6.4, {tone: 'mid', bevel: 0.2, ...own('soil')});
home.cyl('bud', 12, 18, 1.15, 10.5, 1.8, {tone: 'hi', bevel: 0.3, texture: 'dots', ...own('stem')});
home.slab('table', {x: 50, y: 40, w: 16, d: 10, r: 0}, 10, 1.1, {tone: 'hi', bevel: 0.4, steps: 1, texture: 'grain', shadow: 'part'});
for (const [i, x, y] of [[0, 51.2, 41.2], [1, 63.6, 41.2], [2, 51.2, 48.4], [3, 63.6, 48.4]] as const)
  home.cyl(`table.leg${i}`, x, y, 0.55, 0, 10, {tone: 'mid', ground: true, bevel: 0.2, ...own('floor')});
home.cyl('lamp', 56, 44, 1.1, 11.1, 0.8, {tone: 'lo', bevel: 0.25, ...own('table')});
home.cyl('lamp.stem', 56, 44, 0.35, 11.9, 5.5, {tone: 'mid', bevel: 0.15, ...own('lamp')});
home.ball('lamp.head', [56, 44, 18.2], 1.35, {tone: 'hi', ...own('lamp.stem')});

const shop = new Assembly('shop', P, {role: 'mechanism'});
shell(shop, 78, 64, 34, true);
person(shop, [16, 42, 0], Math.PI / 5, 1.45);

// The relay stands on its own bench, beside the person, never inside the body.
const bx = 36;
const by = 14;
const bw = 36;
const bd = 18;
const top = 15;
for (const [i, x, y] of [[0, bx + 3, by + 3], [1, bx + bw - 3, by + 3], [2, bx + 3, by + bd - 3], [3, bx + bw - 3, by + bd - 3]] as const) {
  shop.cyl(`stand.foot${i}`, x, y, 1.25, 0, 1.3, {tone: 'lo', ground: true, bevel: 0.35});
  shop.cyl(`stand.leg${i}`, x, y, 0.85, 1.3, top - 2.6, {tone: 'mid', bevel: 0.3, ...own(`stand.foot${i}`)});
}
shop.slab('stand.top', {x: bx, y: by, w: bw, d: bd, r: 0}, top - 1.4, 1.5, {tone: 'hi', bevel: 0.5, steps: 1, shadow: 'hero', texture: 'ridges', ...own('stand.foot0')});
const z0 = top + 0.1;

// Bell: hypothalamus. The dome starts where the post ends.
shop.cyl('bell.base', bx + 7, by + 9, 2.6, z0, 1.2, {tone: 'mid', bevel: 0.35, ...own('stand.top')});
shop.cyl('bell.post', bx + 7, by + 9, 0.9, z0 + 1.2, 7.2, {tone: 'hi', bevel: 0.25, ...own('bell.base')});
shop.turned('bell.dome', [[0, 2.1], [1.4, 2.8], [3.2, 1.6], [4.2, 0.35]], G.frameAlong([bx + 7, by + 9, z0 + 8.4], [0, 0, 1]), {tone: 'hi', ...own('bell.post')});
shop.ball('bell.clapper', [bx + 8.5, by + 9, z0 + 6.4], 0.55, {tone: 'lo', ...own('bell.post')});

// Gate: pituitary. The leaf sits in the gap, not inside a post.
shop.cyl('gate.l', bx + 16.2, by + 9, 0.75, z0, 8.2, {tone: 'mid', bevel: 0.25, ...own('stand.top')});
shop.cyl('gate.r', bx + 21.4, by + 9, 0.75, z0, 8.2, {tone: 'mid', bevel: 0.25, ...own('stand.top')});
shop.slab('gate.lintel', {x: bx + 15.2, y: by + 8, w: 7.2, d: 2, r: 0}, z0 + 8.2, 1.15, {tone: 'hi', bevel: 0.3, steps: 1, ...own('gate.l')});
shop.slab('gate.leaf', {x: bx + 17.5, y: by + 8.55, w: 2.6, d: 0.85, r: 0}, z0, 5.4, {tone: 'lo', bevel: 0.25, steps: 1, ...own('stand.top')});

// Two vessels: fast adrenaline (coral — the body's response) and slow cortisol.
shop.cyl('fast.body', bx + 29, by + 8, 3.3, z0, 6.2, {tone: 'hi', lit: true, bevel: 0.45, ...own('stand.top')});
shop.cyl('fast.neck', bx + 29, by + 8, 1.15, z0 + 6.2, 1.6, {tone: 'hi', lit: true, bevel: 0.25, ...own('fast.body')});
shop.prism('fast.arrow', G.frameAlong([bx + 29, by + 8 - 3.3, z0 + 4.2], [0, -1, 0]), [[-0.9, 0], [0.9, 0], [0, 1.8]], 0, 4.2, {tone: 'hi', lit: true, ...own('fast.body')});
shop.cyl('slow.body', bx + 29, by + 14.2, 2.5, z0, 5.4, {tone: 'mid', bevel: 0.4, ...own('stand.top')});
shop.cyl('slow.rim', bx + 29, by + 14.2, 2.9, z0 + 5.4, 0.7, {tone: 'lo', bevel: 0.2, ...own('slow.body')});

// One-way steps on the bench, in the gaps between the stations.
for (const [i, x] of [[0, bx + 11.2], [1, bx + 13.6], [2, bx + 24.2], [3, bx + 26.2]] as const)
  shop.slab(`step${i}`, {x, y: by + 8.3, w: 1.5, d: 1.4, r: 0}, z0, 0.7, {tone: 'lo', bevel: 0.2, steps: 1, texture: 'ridges', ...own('stand.top')});

// Four outlets of the fast response, on the near lip of the bench.
for (const [, name, x] of [[0, 'heart', 6], [1, 'breath', 12], [2, 'muscle', 18], [3, 'gut', 24]] as const)
  shop.cyl(`out.${name}`, bx + x, by + bd - 2.4, 0.55, z0, 2.6, {tone: 'hi', bevel: 0.2, ...own('stand.top')});

const stand = new Assembly('stand', P, {role: 'secondary'});
shell(stand, 78, 62, 34, false);
person(stand, [22, 40, 0], Math.PI / 4, 1.45);
// Two times: minutes (coral, the response that leaves) and days (neutral).
stand.cyl('min.foot', 46, 22, 3.2, 0, 1.4, {tone: 'lo', ground: true, bevel: 0.4});
stand.cyl('min.post', 46, 22, 1.3, 1.4, 12, {tone: 'mid', bevel: 0.3, ...own('min.foot')});
stand.cyl('min.cap', 46, 22, 2.4, 13.4, 1.5, {tone: 'hi', lit: true, bevel: 0.35, ...own('min.post')});
stand.cyl('day.foot', 62, 22, 3.2, 0, 1.4, {tone: 'lo', ground: true, bevel: 0.4});
stand.cyl('day.post', 62, 22, 1.3, 1.4, 12, {tone: 'mid', bevel: 0.3, ...own('day.foot')});
stand.cyl('day.cap', 62, 22, 2.4, 13.4, 1.5, {tone: 'hi', bevel: 0.35, ...own('day.post')});
stand.slab('plinth', {x: 44, y: 40, w: 12, d: 12, r: 0}, 0, 1.4, {tone: 'lo', ground: true, bevel: 0.4, steps: 1, texture: 'dots'});

export const HOME = keyed(home, 'HOME');
export const SHOP = keyed(shop, 'SHOP');
export const STAND = keyed(stand, 'STAND');

/** Tail of the response arrow: the top face of the coral neck. */
export const ARROW_TAIL: Point3 = [bx + 29, by + 8 - 3.3, z0 + 4.2];
export const ARROW_TIP: Point3 = [bx + 29, by + 4.2, z0 + 9.2];
/** Open air above the steps, clear of the stations. The signal ball rides this line. */
export const SIGNAL_A: Point3 = [bx + 9, by + 5.2, z0 + 4];
export const SIGNAL_B: Point3 = [bx + 27, by + 5.2, z0 + 4];
/** Where the slow weight settles, above the slow rim. */
export const WEIGHT_AT: Point3 = [bx + 29, by + 14.2, z0 + 8.2];
export const HOME_BOX: [Point3, Point3] = [[12, 16, 0], [40, 32, 54]];
export const SHOP_BOX: [Point3, Point3] = [[8, 12, 0], [64, 40, 32]];
export const STAND_BOX: [Point3, Point3] = [[10, 16, 0], [60, 36, 28]];
