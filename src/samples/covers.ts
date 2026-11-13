import {CoverSpec} from '../lib/coverLayout';
import {toRoom} from '../lib/anatomy';
import {Point3} from '../lib/assembly';
import {MOTOR, MOTOR_AXIS, MOTOR_CORNERS, MOTOR_U} from './motor.parts';

// Sample covers for the template (the kit's motor; illustrative titles, not a topic). Three techniques (§19.5).
const art = MOTOR.svg();
const room = (pts: Point3[]) => pts.map((p) => toRoom(p, MOTOR_U));
const along = (s: number, r: number): Point3[] =>
  [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2;
    const o = MOTOR_AXIS;
    return [0, 1, 2].map((i) => o.o[i] + o.a[i] * s + (o.u[i] * Math.cos(a) + o.v[i] * Math.sin(a)) * r) as Point3;
  });

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {technique: 'gap', lines: ['Почему мотор', 'гудит?'], accent: [1, 0], layout: 'top', art, frame: room(MOTOR_CORNERS)},
  b: {technique: 'specific', lines: ['До 3000', 'оборотов'], accent: [0, 1], layout: 'bottom', art, frame: room(MOTOR_CORNERS)},
  // a close-up: the image frames the pulley end only (the rest of the motor runs off the frame)
  c: {technique: 'incomplete', lines: ['Что внутри?'], accent: [0, 1], layout: 'top', art, frame: room([...along(48, 17), ...along(70, 8)])},
};
