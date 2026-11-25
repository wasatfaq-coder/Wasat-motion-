import {Assembly, Point3} from '../../lib/assembly';
import {P} from './proj';
import KEYS from './axis.parts.keys.json';

// The HPA axis as anatomy, not a bench: a hypothalamic cluster, a pituitary, two kidneys with adrenal glands.
// It stands on its own floor, beside the idea of the body, never inside a head.
const own = (owner: string) => ({meta: {owner}});
const axis = new Assembly('axis', P, {role: 'mechanism'});

axis.slab('floor', {x: -8, y: -16, w: 70, d: 34, r: 0}, -2, 2, {tone: 'lo', ground: true, bevel: 0.5, steps: 1, shadow: 'hero'});

const stalk = (name: string, x: number, y: number, h: number, owner = 'floor') => {
  axis.cyl(name, x, y, 0.85, 0, h, {tone: 'lo', bevel: 0.25, ...own(owner)});
};

// Hypothalamus: a stalk and a knot of nuclei.
stalk('hypo.stalk', 4, 0, 16);
axis.ball('hypo.core', [4, 0, 18.2], 2.3, {tone: 'hi', ...own('hypo.stalk')});
const hypoRing: [number, number, number][] = [
  [4 + 3.1, 0, 18.2],
  [4 - 3.1, 0, 18.2],
  [4, 3.1, 18.6],
  [4, -2.6, 18.4],
  [4 + 1.6, 1.6, 20.6],
  [4 - 1.6, -1.2, 20.4],
];
hypoRing.forEach(([x, y, z], i) => axis.ball(`hypo.n${i}`, [x, y, z], 1.15, {tone: i % 2 ? 'mid' : 'hi', ...own('hypo.core')}));

// Pituitary on its own stalk. Portal beads stand in the gap, each on a stem.
stalk('pit.stalk', 16, 1, 10.2 - 1.7 + 0.45);
axis.ball('pit.gland', [16, 1, 10.2], 1.7, {tone: 'hi', ...own('pit.stalk')});
axis.ball('pit.lobe', [17.6, 2.2, 11.4], 0.85, {tone: 'mid', ...own('pit.gland')});
for (const [i, x, z, r] of [
  [0, 8, 12, 0.7],
  [1, 11, 11, 0.7],
  [2, 13.5, 10.2, 0.65],
] as const) {
  stalk(`portal.${i}.stem`, x, 4, z - r + 0.45);
  axis.ball(`portal.${i}`, [x, 4, z], r, {tone: 'mid', ...own(`portal.${i}.stem`)});
}

// Two kidneys. The adrenal sits beside the top of the kidney, medulla in coral.
const kidney = (side: 'l' | 'r', x: number) => {
  const kz = 11;
  const kr = 3.2;
  stalk(`kidney.${side}.stem`, x, 2, kz - kr + 0.45);
  axis.ball(`kidney.${side}`, [x, 2, kz], kr, {tone: 'mid', ...own(`kidney.${side}.stem`)});
  const az = 15.4;
  const ar = 1.7;
  stalk(`adrenal.${side}.stem`, x, 7.2, az - ar + 0.45);
  axis.ball(`adrenal.${side}`, [x, 7.2, az], ar, {tone: 'hi', ...own(`adrenal.${side}.stem`)});
  axis.ball(`adrenal.${side}.core`, [x, 8.6, az + 1.1], 0.85, {tone: 'hi', lit: true, ...own(`adrenal.${side}`)});
  stalk(`vessel.${side}.stem`, x + 4, 4, 9.2 - 0.7 + 0.45);
  axis.ball(`vessel.${side}`, [x + 4, 4, 9.2], 0.7, {tone: 'lo', ...own(`vessel.${side}.stem`)});
};
kidney('l', 30);
kidney('r', 48);

export const AXIS = axis.applyKeys((KEYS as {AXIS: Record<string, number>}).AXIS);
export const ADRENAL: Point3 = [30, 7.2, 15.4];
export const HYPO: Point3 = [4, 0, 18.2];
export const AXIS_BOX: [Point3, Point3] = [[0, -2, 2], [52, 12, 18]];
export const ADRENAL_BOX: [Point3, Point3] = [[24, -4, 8], [14, 12, 12]];
