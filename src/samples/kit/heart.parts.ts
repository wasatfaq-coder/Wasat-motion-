import {Assembly, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import KEYS from './heart.parts.keys.json';

// A heart drawn as a machine, in the Anatomy kit: four pump housings, leaflet valves, and vessels
// with flanges and clamps. Illustrative geometry for a still, not the stress video.
export const HEART_U = 10;
export const HEART_P = anatomyProjection(HEART_U);
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const own = (owner: string) => ({meta: {owner}});

const heart = new Assembly('heart', HEART_P, {role: 'mechanism'});
heart.slab('floor', {x: -4, y: -2, w: 52, d: 40, r: 0}, -1.2, 1.6, {tone: 'lo', ground: true, bevel: 0.35, steps: 1, shadow: 'hero'});

const pump = (name: string, x: number, y: number, h: number, r: number) => {
  heart.turned(
    name,
    [
      [0, Math.max(0.4, r * 0.2)],
      [h * 0.2, r * 0.55, 1],
      [h * 0.55, r, 1],
      [h * 0.82, r * 0.72, 1],
      [h, Math.max(0.5, r * 0.4)],
    ],
    up(x, y, 0.2),
    {tone: 'hi', ...own('floor')},
  );
};

// Left ventricle is the large lower pump, right ventricle beside it, atria above and behind.
pump('lv', 16, 20, 14.5, 5.4);
pump('rv', 29, 25, 11, 3.8);
pump('la', 10, 11, 9, 3.1);
pump('ra', 26, 12, 9.2, 3.2);

const valve = (name: string, x: number, y: number, z: number, lit = false) => {
  heart.cyl(`${name}.stem`, x, y, 0.4, 0.4, z - 0.15, {tone: 'lo', bevel: 0.1, ...own('floor')});
  heart.disc(`${name}.seat`, 0, 0.4, 1.35, up(x, y, z - 0.1), {tone: 'mid', ...own(`${name}.stem`)});
  // A flap beside the seat, like a damper. Only the aortic flap is coral.
  const flap = G.frameAlong([x + 1.25, y, z + 0.1], [1, 0, 0]);
  heart.disc(`${name}.flap`, -0.15, 0.15, 0.9, flap, {tone: 'hi', lit, ...own(`${name}.seat`)});
};

// Clear of every pump housing. Coral marks the aortic flap: the one meaning, the valve.
valve('mitral', 16, 30, 6);
valve('tricuspid', 34, 30, 6);
valve('aortic', 20, 8, 12, true);
valve('pulmonary', 6, 22, 10);

const port = (name: string, x: number, y: number, z: number, r: number) => {
  heart.cyl(`${name}.stem`, x, y, 0.38, 0.4, Math.max(0.6, z - r + 0.35), {tone: 'lo', bevel: 0.08, ...own('floor')});
  heart.ball(name, [x, y, z], r, {tone: 'mid', ...own(`${name}.stem`)});
};

// Flange: a ring on its own post, with two clamp screws, standing clear of the pumps.
const flange = (name: string, x: number, y: number, z: number, r: number) => {
  heart.cyl(`${name}.post`, x, y, 0.4, 0.4, z - 0.2, {tone: 'lo', bevel: 0.08, ...own('floor')});
  heart.disc(`${name}.ring`, 0, 0.5, r, up(x, y, z - 0.1), {tone: 'mid', ...own(`${name}.post`)});
  heart.cyl(`${name}.clamp.a`, x + r + 0.6, y, 0.26, 0.4, z + 0.3, {tone: 'hi', bevel: 0.06, ...own('floor')});
  heart.cyl(`${name}.clamp.b`, x - r - 0.6, y, 0.26, 0.4, z + 0.3, {tone: 'hi', bevel: 0.06, ...own('floor')});
};

port('pa', 18, 6, 16.2, 1.45);
port('pb', 32, 5, 17.4, 1.4);
port('pc', 8, 6, 14.2, 1.4);
port('pd', 2, 6, 9, 1.35);
port('pe', 2, 20, 5.2, 1.3);

flange('fa', 22, 1, 16.2, 1.5);
flange('fb', 38, 12, 17.4, 1.4);
flange('fc', 4, 1, 14.2, 1.4);
flange('fd', 12, 1, 8.5, 1.35);

const link = (name: string, a: Point3, ra: number, b: Point3, rb: number, tube: number) => {
  const d = G.sub3(b, a) as Point3;
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const u = G.mul3(d, 1 / L) as Point3;
  const start = G.add3(a, G.mul3(u, ra)) as Point3;
  const end = G.sub3(b, G.mul3(u, rb)) as Point3;
  heart.pipe(name, [start, end], tube, {tone: 'hi', bend: 0});
};

const PA: Point3 = [18, 6, 16.2];
const PB: Point3 = [32, 5, 17.4];
const PC: Point3 = [8, 6, 14.2];
const PD: Point3 = [2, 6, 9];
const PE: Point3 = [2, 20, 5.2];
link('aorta', PA, 1.45, PB, 1.4, 0.42);
link('pulmonary', PC, 1.4, PA, 1.45, 0.4);
link('svc', PD, 1.35, PC, 1.4, 0.38);
link('ivc', PE, 1.3, PD, 1.35, 0.36);

export const HEART_MECH = heart.applyKeys((KEYS as {HEART_MECH: Record<string, number>}).HEART_MECH);
export const HEART_BOX: [Point3, Point3] = [[6, 4, 0], [32, 28, 18]];
export const VALVE_BOX: [Point3, Point3] = [[12, 8, 8], [14, 14, 10]];
export const AORTA_AT: Point3 = PA;
export const VALVE_AT: Point3 = [20, 14, 13.4];
export const APEX_AT: Point3 = [16, 20, 2];
