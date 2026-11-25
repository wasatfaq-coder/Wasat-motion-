import {Assembly, G, Point3} from '../../lib/assembly';
import {P} from './proj';
import KEYS from './organs.parts.keys.json';

// The stress chest, drawn for this topic. One large heart (apex below, wide ventricles,
// two atria), lungs beside it, a muscle belly, a stomach with a bowel, and the great vessels.
// Short supports only: the organs are the picture, not a row of beads on poles.
const own = (owner: string) => ({meta: {owner}});
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const body = new Assembly('body', P, {role: 'secondary'});

body.slab('floor', {x: -22, y: -10, w: 44, d: 32, r: 0}, -1.2, 1.6, {tone: 'lo', ground: true, bevel: 0.4, steps: 1});

// Heart: pointed apex on the floor, wide ventricles, shoulders. Coral is the body's answer.
body.turned(
  'heart.body',
  [
    [0, 0.9],
    [1.6, 2.8, 1],
    [5.2, 6.4, 1],
    [9.4, 6.8, 1],
    [12.4, 4.4, 1],
    [14.4, 2.6],
  ],
  up(-1, 2, 0.2),
  {tone: 'hi', lit: true, ...own('floor')},
);
body.ball('heart.apex', [-1, 7.4, 1.15], 0.85, {tone: 'hi', lit: true, ...own('floor')});
body.ball('heart.atrium.l', [-6.0, 6.1, 12.2], 1.55, {tone: 'hi', lit: true, ...own('heart.body')});
body.ball('heart.atrium.r', [3.2, 4.6, 13.0], 1.9, {tone: 'hi', lit: true, ...own('heart.body')});

// Aorta leaves the top of the heart. The other vessels stand on the floor beside the chest.
body.cyl('vessel.aorta', 0.8, 5.4, 0.85, 12.8, 3.2, {tone: 'mid', bevel: 0.2, ...own('heart.body')});
body.cyl('vessel.arch', 14.2, 3.6, 0.55, 0.4, 3.4, {tone: 'mid', bevel: 0.12, ...own('floor')});
body.cyl('vessel.toMuscle', -15.5, 8.5, 0.5, 0.4, 4.2, {tone: 'lo', bevel: 0.12, ...own('floor')});
body.cyl('vessel.toGut', 16.5, 8.2, 0.48, 0.4, 3.6, {tone: 'lo', bevel: 0.12, ...own('floor')});

// Lungs: a tall lobe and a smaller upper lobe, one each side of the heart.
const lung = (side: 'l' | 'r', x: number, y: number) => {
  body.turned(
    `lung.${side}`,
    [
      [0, 1.4],
      [2.2, 4.4, 1],
      [6.4, 5.2, 1],
      [10.2, 3.8, 1],
      [12.4, 1.6],
    ],
    up(x, y, 0.2),
    {tone: 'hi', ...own('floor')},
  );
  body.ball(`lung.lobe.${side}`, [x, y + 2.4, 12.2], 2.15, {tone: 'mid', ...own(`lung.${side}`)});
};
lung('l', -12.5, -1);
lung('r', 11, -0.6);

// Muscle belly: fibres standing together, one organ rather than three separate marks.
body.slab('muscle.tendon', {x: -10.2, y: 9.2, w: 7.2, d: 4.2, r: 0.4}, 0.4, 1.1, {tone: 'lo', bevel: 0.2, steps: 1, ...own('floor')});
[
  [-8.6, 10.2],
  [-6.6, 10.6],
  [-4.8, 11.2],
  [-7.4, 12.2],
].forEach(([x, y], i) => {
  body.cyl(`muscle.f${i}`, x, y, 0.72, 1.3, 7.4, {tone: i % 2 ? 'mid' : 'hi', bevel: 0.15, ...own('muscle.tendon')});
});

// Stomach, and a bowel of short loops in front of it.
body.ball('gut.stomach', [9.2, 11.4, 2.5], 2.5, {tone: 'mid', ...own('floor')});
[
  [12.2, 13.2, 2.4],
  [14.6, 11.2, 2.6],
  [15.4, 8.4, 2.3],
  [13.2, 6.2, 2.1],
].forEach(([x, y, z], i) => {
  body.cyl(`gut.bowel${i}.stem`, x, y, 0.32, 0.4, z - 0.85, {tone: 'lo', bevel: 0.08, ...own('floor')});
  body.ball(`gut.bowel${i}`, [x, y, z], 0.95, {tone: 'lo', ...own(`gut.bowel${i}.stem`)});
});

export const BODY = body.applyKeys((KEYS as {BODY: Record<string, number>}).BODY);

// Ribs in front of the heart. A scene fades this picture (the x-ray).
const shell = new Assembly('shell', P, {role: 'prop'});
shell.slab('floor', {x: -16, y: 14, w: 32, d: 6, r: 0}, -1, 1.2, {tone: 'lo', ground: true, bevel: 0.3, steps: 1});
for (let i = 0; i < 5; i++) {
  const z = 4.2 + i * 2.1;
  const x = -10 + i * 4.6;
  shell.cyl(`rib${i}.stem`, x, 16.5, 0.28, 0.2, z - 0.15, {tone: 'lo', bevel: 0.08, ...own('floor')});
  shell.cyl(`rib${i}`, x, 16.5, 0.42, z - 0.15, 1.35, {tone: 'hi', bevel: 0.1, ...own(`rib${i}.stem`)});
}
export const SHELL = shell.applyKeys((KEYS as {SHELL?: Record<string, number>}).SHELL);

export const HEART: Point3 = [-1, 2, 8];
export const LUNG: Point3 = [-12.5, -1, 7];
export const MUSCLE: Point3 = [-7, 11, 5];
export const GUT: Point3 = [9.2, 11.4, 2.5];
export const AIR: Point3 = [0, 16, 10];
export const BODY_BOX: [Point3, Point3] = [[-12, -4, 0], [22, 16, 17]];
export const HEART_BOX: [Point3, Point3] = [[-9, -2, 0], [14, 12, 18]];
export const MUSCLE_BOX: [Point3, Point3] = [[-12, 7, 0], [12, 10, 12]];
