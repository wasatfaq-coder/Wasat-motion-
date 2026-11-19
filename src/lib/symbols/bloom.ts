import {Assembly, G, Point3} from '../assembly';
import * as K from '../../vendor/anatomy/iso-kit';
import {capsule, loft, petal, planeFrame} from '../organic';


// Mechanical flower (MASTER_PROMPT_FINAL §24.1, symbol «bloom»: joy, relief, pleasure). A pot, a stem with leaf
// plates, sepals and two rings of petal plates on hinge pins round a hub with stamens. On the event the petals open
// (they turn about their base pins); when the joy passes they fold back. Petals rotate, so a state rebuilds the
// flower (`at(state)`, cached in steps); the audit checks the open build (`bloom(..., 1)`), which a scene shows most.

const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);

/** The flower standing on the floor at `at` with its petals at `open` 0 (closed bud) .. 1 (open). */
export const bloom = (name: string, P: K.Projection, [x, y, z]: Point3, open = 1, o: {lit?: boolean} = {}) => {
  const A = new Assembly(name, P, {role: 'secondary', allow: [[`${name}.petal*`, `${name}.petal*`], [`${name}.petal*`, `${name}.hub`], [`${name}.sepal*`, `${name}.hub`], [`${name}.stamen*`, `${name}.hub`], [`${name}.sepal*`, `${name}.sepal*`], [`${name}.leaf*`, `${name}.stem*`]]});
  // pot: foot, body, rim, soil
  A.turned('pot.foot', [[0, 7], [1.2, 7.2]], up(x, y, z), {tone: 'lo', ground: true, shadow: 'hero'});
  loft(A, 'pot', [x, y, z + 1.2], [0, 0, 1], [[0, 7], [5, 8.4], [10, 9.6], [12, 10]], {tone: 'mid'});
  A.ring('pot.rim', 12, 13.6, 8.6, 10.8, up(x, y, z + 1.2), {tone: 'hi'});
  A.disc('pot.soil', 12, 12.8, 8.4, up(x, y, z + 1.2), {tone: 'lo', meta: {owner: `${name}.pot`}});
  const base = z + 13.4;
  const top = base + 26;
  // stem in four slices with a collar disc between each (a ring round a whole rod cannot be painted in order)
  const cuts = [6, 13, 20];
  let s0 = z + 1.2 + 12.8; // on the soil
  [...cuts, top - base].forEach((s, i) => {
    const s1 = base + s;
    A.turned(i ? `stem.${i}` : 'stem', [[0, 1.1], [s1 - s0, 1.1]], up(x, y, s0), {tone: 'mid', meta: {owner: `${name}.pot`}});
    if (i < cuts.length) A.disc(`stem.collar${s}`, 0, 0.8, 1.7, up(x, y, s1), {tone: 'hi', meta: {owner: `${name}.pot`}});
    s0 = s1 + 0.8;
  });
  [
    [6, 0.4],
    [9, 2.5],
    [15, 4.0],
    [18, 5.6],
  ].forEach(([s, a], i) => {
    const dir: Point3 = [Math.cos(a), Math.sin(a), 0.55];
    petal(A, `leaf${i}`, planeFrame([x + Math.cos(a) * 1, y + Math.sin(a) * 1, base + s], dir, [0, 0, 1]), 9, 4.2, 0.5, {tone: 'mid', meta: {owner: `${name}.stem`}});
  });
  // hub (the coral heart when joy is the topic's coral meaning), sepals, two rings of petals on pins
  A.turned('hub', [[0, 2.6], [1.6, 3.6, 1], [3.2, 3, 1], [4, 0.0001]], up(x, y, top - 0.6), {tone: 'hi', lit: o.lit, meta: {owner: `${name}.pot`}});
  const ringPetals = (prefix: string, n: number, len: number, w: number, zOff: number, phase: number, closed: number, opened: number) => {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2;
      const out: Point3 = [Math.cos(a), Math.sin(a), 0];
      const tilt = closed + (opened - closed) * open; // angle from vertical
      const dir: Point3 = [out[0] * Math.sin(tilt), out[1] * Math.sin(tilt), Math.cos(tilt)];
      const o0: Point3 = [x + out[0] * 2.6, y + out[1] * 2.6, top + zOff];
      A.ball(`${prefix}${i}.pin`, o0, 0.55, {tone: 'lo', meta: {owner: `${name}.hub`}});
      petal(A, `${prefix}${i}`, planeFrame(o0, dir, out), len, w, 0.45, {tone: 'hi', meta: {owner: `${name}.hub`}});
    }
  };
  ringPetals('sepal', 5, 4, 2.6, 0.2, 0.3, 1.2, 1.9);
  ringPetals('petal', 8, 11, 5.4, 1.2, 0, 0.18, 1.25);
  ringPetals('petalIn', 6, 8, 4.2, 2.2, 0.4, 0.1, 0.8);
  // stamens round the hub top
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const from: Point3 = [x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2, top + 2.8];
    capsule(A, `stamen${i}`, from, [from[0] + Math.cos(a) * 1.4 * open, from[1] + Math.sin(a) * 1.4 * open, top + 5.2 + open * 0.8], 0.35, {tone: 'mid', meta: {owner: `${name}.hub`}});
  }
  return A;
};

/** Frames of the flower in `steps` states of opening, built on demand (rotating petals change the shape). */
export const bloomStates = (name: string, P: K.Projection, at: Point3, o: {lit?: boolean; steps?: number} = {}) => {
  const steps = o.steps ?? 24;
  const cache = new Map<number, string>();
  return (open: number) => {
    const k = Math.round(Math.max(0, Math.min(1, open)) * steps);
    if (!cache.has(k)) cache.set(k, bloom(name, P, at, k / steps, o).svg());
    return cache.get(k) as string;
  };
};
