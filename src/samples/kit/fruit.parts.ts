import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {Point3} from '../../lib/assembly';
import {blob, capsule, loft, petal, planeFrame} from '../../lib/organic';
import KEYS from './fruit.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── organic: a fruit bowl (loft bowl, loft pears, capsule stems, petal leaves, a blob bunch of grapes)
const fruit = new Assembly('fruit', P, {role: 'secondary', allow: [['fruit.grapes.*', 'fruit.grapes.*']]});
fruit.ring('foot', 0, 1.4, 6, 9, {o: [30, 30, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0]}, {tone: 'lo', ground: true, shadow: 'hero'});
loft(fruit, 'bowl', [30, 30, 1.4], [0, 0, 1], [[0, 9], [2, 14], [5, 19], [8, 22], [9, 22.4]], {tone: 'hi'});
// the bowl top is at z 10.4; fruit lie on it, spaced so no two bodies sink into each other
const TOP = 10.4;
const pears: Point3[] = [
  [20, 24, TOP],
  [31, 17, TOP],
  [42, 22, TOP],
];
pears.forEach((at, i) => {
  loft(fruit, `pear${i}`, at, [0, 0, 1], [[0, 0.0001], [1.6, 4.4], [4.2, 5.4], [7.4, 3.4], [10, 2.6], [12, 1.6], [12.6, 0.0001]], {tone: 'hi', meta: {owner: 'fruit.bowl'}});
  const top: Point3 = [at[0], at[1], at[2] + 12.4];
  capsule(fruit, `pear${i}.stem`, top, [top[0] + 0.6, top[1], top[2] + 3], 0.4, {tone: 'lo', meta: {owner: `fruit.pear${i}`}});
  petal(fruit, `pear${i}.leaf`, planeFrame([top[0] + 0.5, top[1], top[2] + 2], [1, 0.4, 0.5], [0, 0, 1]), 5, 2.4, 0.3, {tone: 'mid', meta: {owner: `fruit.pear${i}.stem`}});
});
loft(fruit, 'apple', [21, 37, TOP], [0, 0, 1], [[0, 0.0001], [0.6, 3.6], [3, 5.4], [6, 5], [7.6, 2.4], [7.8, 0.0001]], {tone: 'hi', meta: {owner: 'fruit.bowl'}});
capsule(fruit, 'apple.stem', [21, 37, TOP + 7.4], [21.4, 37.2, TOP + 9.6], 0.35, {tone: 'lo', meta: {owner: 'fruit.apple'}});
petal(fruit, 'apple.leaf', planeFrame([21.3, 37.1, TOP + 8.8], [-1, 0.3, 0.5], [0, 0, 1]), 4.4, 2.2, 0.3, {tone: 'mid', meta: {owner: 'fruit.apple.stem'}});
// a bunch of grapes as a pyramid of touching balls lying on the bowl (26 grapes, rows 7-6-5-4-3-1)
const grapes: {at: Point3; r: number}[] = [];
const GR = 1.5;
[7, 6, 5, 4, 3, 1].forEach((n, row) => {
  const rr = n === 1 ? 0 : (n * 2 * GR) / (2 * Math.PI) + 0.4;
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + row * 0.5;
    grapes.push({at: [36 + rr * Math.cos(a), 35 + rr * Math.sin(a), TOP + GR + row * GR * 1.3], r: GR});
  }
});
blob(fruit, 'grapes', grapes, {tone: 'mid'});
const crown = grapes[grapes.length - 1].at;
capsule(fruit, 'grapes.stalk', [crown[0], crown[1], crown[2] + GR - 0.3], [crown[0] - 1, crown[1] - 0.6, crown[2] + GR + 3.4], 0.4, {tone: 'lo', meta: {owner: 'fruit.grapes'}});
export const FRUIT = keyed(fruit, 'FRUIT');

