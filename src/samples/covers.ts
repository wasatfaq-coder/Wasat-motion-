import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import {CoverSpec} from '../lib/coverLayout';
import {toRoom} from '../lib/anatomy';
import {Point3} from '../lib/assembly';
import {P3} from '../lib/iso';
import {MOTOR, MOTOR_AXIS, MOTOR_CORNERS, MOTOR_HUM, MOTOR_OPEN, MOTOR_P, MOTOR_U} from './motor.parts';

// Sample covers for the template v2 (the kit's motor; illustrative, not a topic: numbers are not claims). Each
// picture carries its own hook; one coral spot, on the answer to the title's question; three techniques (§19.5).
/* eslint-disable @typescript-eslint/no-explicit-any */
const G: any = LatheKit;
const room = (pts: Point3[]): P3[] => pts.map((p) => toRoom(p, MOTOR_U));
/** Points round the motor axis at station s and radius r. */
const ring = (s: number, r: number): Point3[] =>
  [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2;
    const o = MOTOR_AXIS;
    return [0, 1, 2].map((i) => o.o[i] + o.a[i] * s + (o.u[i] * Math.cos(a) + o.v[i] * Math.sin(a)) * r) as Point3;
  });
const FLOOR = {x: -3, y: -3, w: 16, d: 13};
const arc = (s: number, r: number, from: number, to: number) => K.lineSvg(G.arcOf(MOTOR_AXIS, s, r, MOTOR_P, {least: -1, from, to}), {tone: 'hi'});

// a) gap — the coral stator housing hums: thick vibration arcs round it (the hum comes from the stator, not the pulley)
// vibration marks drawn in the screen plane, outside the housing's silhouette: ((( at the rear end, ))) at the
// front end, and ≈ above the middle (rings round the housing would cross its visible front and top)
const scr = (st: number) => K.iso(G.pointOf(MOTOR_AXIS, st, 0, 0), MOTOR_P) as [number, number];
const sArc = ([cx, cy]: [number, number], r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `<path class="iso-line" data-tone="hi" d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
};
const humArcs = [
  ...[96, 120].map((r) => sArc(scr(-4), r, 140, 200)),
  ...[96, 120].map((r) => sArc(scr(54), r, -40, 20)),
  ...[110, 134].map((r) => sArc(scr(25), r, 240, 300)),
].join('');

// b) specific — the pulley spins: trails round it and a rotation arrow with a flat head in the pulley's plane
const ARROW_R = 11.5;
const A1 = 4.4;
const trails = [8.2, 9.2].map((r, i) => arc(65, r, 0.2 + i * 0.4, 2.2 + i * 0.4)).join('');
const arrowArc = arc(67.5, ARROW_R, 0.4, A1);
const tip = G.pointOf(MOTOR_AXIS, 67.5, ARROW_R, A1 + 0.45);
const tan = G.tangentOf(MOTOR_AXIS, A1 + 0.45);
const rad = G.radialOf(MOTOR_AXIS, A1 + 0.45);
const head = [tip, G.add3(G.add3(tip, G.mul3(tan, -4.5)), G.mul3(rad, 2.6)), G.add3(G.add3(tip, G.mul3(tan, -4.5)), G.mul3(rad, -2.6))];
const arrowHead = `<path d="${K.pathOf(head.map((p: Point3) => K.iso(p, MOTOR_P)), true)}" style="fill:var(--anatomy-hi);stroke:var(--anatomy-hi);stroke-width:3px;stroke-linejoin:round"/>`;

// c) incomplete — the lid is ajar (hinged at its far edge, raised 20° on the near side); only a coral glint inside
const TILT = (32 * Math.PI) / 180;
const LID_O: Point3 = [29.5, 17.5, 47.8];
const lidF = G.frameOf(LID_O, [-Math.sin(TILT), 0, Math.cos(TILT)], [Math.cos(TILT), 0, Math.sin(TILT)], [0, 1, 0]);
const LID = K.solidSvg(G.prismOf(lidF, [[0, 0], [15, 0], [15, 15], [0, 15]], 0, 1.4, MOTOR_P), {tone: 'hi'});
const screws = [[2.1, 2.1], [12.9, 2.1], [2.1, 12.9], [12.9, 12.9]]
  .map(([u, v]) => {
    const o = G.add3(G.add3(LID_O, G.mul3(lidF.u, u)), G.mul3(lidF.v, v));
    return K.solidSvg(G.solidOf([[1.4, 0.9], [1.9, 0.9, 1], [2.2, 0]], G.frameAlong(o, lidF.a), MOTOR_P), {tone: 'hi'});
  })
  .join('');

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {
    technique: 'gap',
    hook: 'коралловый корпус статора дрожит: вокруг него толстые дуги вибрации',
    lines: ['Что в нём', 'гудит?'],
    layout: 'top',
    art: MOTOR_HUM.svg(),
    signs: humArcs,
    frame: room([...MOTOR_CORNERS, ...ring(25, 24.5)]),
    hero: room([...ring(2, 16.8), ...ring(48, 16.8)]),
    floor: FLOOR,
    crop: 1,
  },
  b: {
    technique: 'specific',
    hook: 'коралловый шкив крутится: следы вращения и толстая стрелка вокруг него',
    lines: ['50 оборотов', 'в секунду'],
    layout: 'top',
    art: MOTOR.svg(),
    signs: trails + arrowArc + arrowHead,
    frame: room([...ring(30, 18), ...ring(80, 16)]), // a close-up of the drive end
    hero: room([...ring(60, 13), ...ring(70, 13)]),
    floor: FLOOR,
    crop: 1,
  },
  c: {
    technique: 'incomplete',
    hook: 'крышка коробки приоткрыта на треть, из щели виден коралловый отблеск клемм',
    lines: ['Что под', 'крышкой?'],
    layout: 'top',
    art: MOTOR_OPEN.svg() + LID + screws,
    frame: room([[22, 10, 30], [52, 40, 30], [22, 40, 30], [52, 10, 30], [37, 25, 60], [29.5, 17.5, 56], [44.5, 32.5, 56]]), // a close-up of the box
    hero: room([29.5, 44.5].flatMap((x) => [17.5, 32.5].flatMap((y) => [44, 54].map((z) => [x, y, z] as Point3)))),
    floor: FLOOR,
    crop: 1,
  },
};
