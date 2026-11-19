import {Assembly, G, Point3} from '../assembly';
import * as K from '../../vendor/anatomy/iso-kit';

// Trapdoor (MASTER_PROMPT_FINAL §24.1, symbol «trapdoor»: shame, failure, loss of footing). A floor section of
// boards with a two-leaf hatch under the character. On the event the leaves swing down on their hinges and the
// character sinks (gravity.sink); when the footing returns the leaves close and the character comes up. Leaves
// rotate, so a state rebuilds the section (`trapdoorStates`); the audit checks the closed build.

/** A floor section `w` × `d` with its top at z; the hatch (2 leaves, hinged on the x sides) is `hw` × `hd` at the
 *  centre. `open` 0..1 swings the leaves down to 80°. */
export const trapdoor = (name: string, P: K.Projection, [x, y, z]: Point3, open = 0, o: {w?: number; d?: number; hw?: number; hd?: number; lit?: boolean} = {}) => {
  const w = o.w ?? 60;
  const d = o.d ?? 40;
  const hw = o.hw ?? 22;
  const hd = o.hd ?? 18;
  const A = new Assembly(name, P, {role: 'secondary', allow: [[`${name}.leaf*`, `${name}.hinge*`]]});
  const hx = x + (w - hw) / 2;
  const hy = y + (d - hd) / 2;
  const T = 2; // floor thickness
  // the pit below the hatch: floor and four walls. The x walls stand clear of a fully open leaf with its battens
  // (thickness 1.6·T swung to 80°): a wall flush with the opening was hit by the battens (found by stateSweep).
  const P0 = 1.8 * T + 0.4;
  A.slab('pit', {x: hx - P0 - 1, y: hy - 1, w: hw + 2 * P0 + 2, d: hd + 2, r: 0.3}, z - 18, 1.2, {tone: 'lo', ground: true});
  A.slab('pit.n', {x: hx - P0 - 1, y: hy - 1, w: hw + 2 * P0 + 2, d: 1, r: 0.1}, z - 16.8, 16.8 - T, {tone: 'lo'});
  A.slab('pit.s', {x: hx - P0 - 1, y: hy + hd, w: hw + 2 * P0 + 2, d: 1, r: 0.1}, z - 16.8, 16.8 - T, {tone: 'lo'});
  A.slab('pit.w', {x: hx - P0 - 1, y: hy, w: 1, d: hd, r: 0.1}, z - 16.8, 16.8 - T, {tone: 'lo'});
  A.slab('pit.e', {x: hx + hw + P0, y: hy, w: 1, d: hd, r: 0.1}, z - 16.8, 16.8 - T, {tone: 'lo'});
  // floor boards round the hatch: strips along x, cut where the hatch is
  const board = 4;
  let i = 0;
  let cutFrom = hy;
  let cutTo = hy + hd;
  for (let by = y; by < y + d - 1e-6; by += board, i++) {
    const bd = Math.min(board, y + d - by) - 0.3;
    const crosses = by + bd > hy && by < hy + hd;
    if (crosses) [cutFrom, cutTo] = [Math.min(cutFrom, by), Math.max(cutTo, by + bd)];
    const spans: [number, number][] = crosses ? [[x, hx], [hx + hw, x + w]] : [[x, x + w]];
    spans.forEach(([a, b], j) => {
      if (b - a < 1) return;
      A.slab(`board${i}.${j}`, {x: a, y: by, w: b - a, d: bd, r: 0.3}, z - T, T, {tone: i % 2 ? 'hi' : 'mid', bevel: 0.25, ground: true});
    });
  }
  // the frame round the hatch fills the cut rows up to the opening
  A.slab('frame.n', {x: hx, y: cutFrom, w: hw, d: hy - cutFrom, r: 0.2}, z - T, T, {tone: 'mid', bevel: 0.2});
  A.slab('frame.s', {x: hx, y: hy + hd, w: hw, d: cutTo - hy - hd, r: 0.2}, z - T, T, {tone: 'mid', bevel: 0.2});
  // two leaves hinged on the west and east edges; angle 0 = flush, swings down
  const ang = open * (80 * Math.PI) / 180;
  ([-1, 1] as const).forEach((side, li) => {
    const pivotX = side < 0 ? hx : hx + hw;
    const inward = -side; // +1: the leaf runs east from a west hinge
    const along: Point3 = [inward * Math.cos(ang), 0, -Math.sin(ang)];
    // the leaf: a prism in the frame (u = along y, v = along the leaf from the hinge), thickness down
    // the axis is at the leaf's BOTTOM edge and the leaf body lies above it: swinging down, the body turns into the
    // opening. With the axis at the top edge the leaf's thickness swept into the floor board (found by stateSweep).
    const F = {o: [pivotX, hy, z - T * 0.9] as Point3, a: G.cross3(along, [0, 1, 0]) as Point3, u: [0, 1, 0] as Point3, v: along};
    if (F.a[2] < 0) F.a = G.mul3(F.a, -1) as Point3;
    const lw = hw / 2 - 0.3;
    A.prism(`leaf${li}`, F, [[0.3, 0], [hd - 0.3, 0], [hd - 0.3, lw], [0.3, lw]], 0, T * 0.9, {tone: 'hi', lit: o.lit});
    // battens under the leaf
    for (const b of [0.25, 0.75]) A.prism(`leaf${li}.batten${b}`, F, [[hd * b - 0.8, 1], [hd * b + 0.8, 1], [hd * b + 0.8, lw - 1], [hd * b - 0.8, lw - 1]], -T * 0.7, 0, {tone: 'mid', meta: {owner: `${name}.leaf${li}`}});
    // three hinges per leaf: barrel along y at the pivot, and a strap on the leaf
    for (const t of [0.2, 0.5, 0.8]) {
      const hyy = hy + hd * t;
      A.turned(`hinge${li}.${t}`, [[-1.4, 0.6], [1.4, 0.6]], G.frameAlong([pivotX + inward * 0.6, hyy, z - T * 0.9], [0, 1, 0]), {tone: 'lo', meta: {owner: `${name}.leaf${li}`}});
      A.prism(`hinge${li}.${t}.strap`, F, [[hd * t - 0.7, 0.2], [hd * t + 0.7, 0.2], [hd * t + 0.7, 4], [hd * t - 0.7, 4]], T * 0.9, T * 0.9 + 0.25, {tone: 'lo', meta: {owner: `${name}.leaf${li}`}});
    }
  });
  return A;
};

/** Frames of the section in `steps` states of opening (the leaves rotate, so each state is its own build). */
export const trapdoorStates = (name: string, P: K.Projection, at: Point3, o: {lit?: boolean; steps?: number} = {}) => {
  const steps = o.steps ?? 24;
  const cache = new Map<number, string>();
  return (open: number) => {
    const k = Math.round(Math.max(0, Math.min(1, open)) * steps);
    if (!cache.has(k)) cache.set(k, trapdoor(name, P, at, k / steps, o).svg());
    return cache.get(k) as string;
  };
};
