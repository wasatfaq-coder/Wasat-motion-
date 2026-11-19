// Deliberately broken motion for `node scripts/motion-check.mjs --selftest`: a clean reel and one copy per defect
// kind. Each case lists the kinds the check MUST report; the clean case must report none. Not under src/, so the
// normal motion check and object-audit never pick it up.
import {Assembly, dynTube, Point3} from '../../src/lib/assembly';
import {anatomyProjection} from '../../src/lib/anatomy';
import {boxCorners, Cam, camFit, safeRect} from '../../src/lib/camera';
import {MotionPose, MotionSpec, settle} from '../../src/lib/motion';
import {basisOf} from '../../src/lib/depth';

const U = 8;
const P = anatomyProjection(U);
const BASE = new Assembly('fixture', P, {role: 'secondary'});
BASE.slab('base', {x: 0, y: 0, w: 40, d: 40, r: 1}, 0, 2, {ground: true});
BASE.slab('wall', {x: 30, y: 5, w: 4, d: 30, r: 0.5}, 2, 18);
BASE.cyl('post', 15, 20, 1, 2, 12);
BASE.settle();

const rect = safeRect({captions: false});
const room = (pts: Point3[]) => pts.map((p) => [p[0] / U, p[1] / U, p[2] / U] as Point3);
const HERO = boxCorners([0, 0, 0], [40, 40, 20]) as Point3[];
const CAM = camFit(room(HERO), {rect});
const FRAMES = 60;

type Opts = {reach?: number; tailOff?: number; cam?: Cam; jumpAt?: number; hideArrowAt?: number; halfTurn?: boolean; extra?: (f: number) => MotionPose['extra']};
const pose = (f: number, o: Opts): MotionPose => {
  let theta = ((o.halfTurn ? Math.PI : 2 * Math.PI) * f) / FRAMES;
  if (o.jumpAt !== undefined && f >= o.jumpAt) theta += 1.2;
  const reach = o.reach ?? 7;
  const end: Point3 = [15 + reach * Math.cos(theta), 20 + reach * Math.sin(theta), 10];
  const bar = dynTube('arm', [[15, 20, 10], end], 1, P, {lit: true});
  const off = o.tailOff ?? 0;
  const opacity = o.hideArrowAt !== undefined && f >= o.hideArrowAt ? 0 : 1;
  return {
    cam: o.cam ?? CAM,
    rect,
    unit: U,
    assembly: BASE,
    extra: [...bar, ...(o.extra?.(f) ?? [])],
    arrows: [{name: 'arm.force', owner: 'arm', tail: [end[0], end[1], end[2] + off], opacity}],
    keep: HERO.map((at, i) => ({name: `hero${i}`, at})),
    plates: [],
    touch: [['arm', 'post']],
  };
};
const spec = (id: string, o: Opts, extra: Partial<MotionSpec> = {}): MotionSpec => ({id, frames: FRAMES, fps: 60, loop: true, pose: (f) => pose(f, o), ...extra});

// three long sticks around a triangle ON SCREEN, each near the viewer at its own corner and far at the next one:
// every stick lies over the one before it, a cycle no painter's order can draw (separate parts, not a joint).
// Built in the camera basis (screen u, v and depth w), so the crossings are exact whatever the projection.
const sticks = (): MotionPose['extra'] => {
  const B = basisOf(P);
  const world = (u: number, v: number, w: number): Point3 => [0, 1, 2].map((i) => u * B.R[i] + v * B.D[i] + w * B.V[i]) as Point3;
  const c = [20, 20, 10] as Point3;
  const cu = c[0] * B.R[0] + c[1] * B.R[1] + c[2] * B.R[2];
  const cv = c[0] * B.D[0] + c[1] * B.D[1] + c[2] * B.D[2];
  const cw = c[0] * B.V[0] + c[1] * B.V[1] + c[2] * B.V[2];
  const corner = (k: number) => [cu + 9 * Math.cos((k * 2 * Math.PI) / 3 + 0.3), cv + 9 * Math.sin((k * 2 * Math.PI) / 3 + 0.3)];
  const out: MotionPose['extra'] = [];
  for (let k = 0; k < 3; k++) {
    const a = corner(k);
    const b = corner(k + 1);
    const at = (t: number) => world(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, cw + 4 - 8 * t);
    out.push(...dynTube(`stick${k}`, [at(-0.3), at(1.3)], 0.8, P, {maxLength: 100}));
  }
  return out;
};

const ease = (x: number) => settle(x);
export const CASES: [string, MotionSpec, string[]][] = [
  ['clean turning arm', spec('clean', {}), []],
  ['arm through the wall', spec('through', {reach: 17}), ['through']],
  ['arrow in the air', spec('air', {tailOff: 6}), ['air']],
  ['hero out of frame', spec('crop', {cam: {...CAM, zoom: CAM.zoom * 1.8}}), ['crop']],
  ['hero small in the top part', spec('layout', {cam: {...CAM, zoom: CAM.zoom * 0.45, screen: [CAM.screen![0], rect.y0 + 160]}}), ['layout']],
  ['arm jumps', spec('jerk', {jumpAt: 30}), ['jerk']],
  ['arrow vanishes', spec('pop', {hideArrowAt: 30}), ['pop']],
  ['loop does not close', spec('seam', {halfTurn: true}), ['seam']],
  ['three sticks over each other', spec('depth', {extra: sticks}), ['depth']],
  ['a solid without shapes', spec('noshape', {extra: () => [{name: 'lid', at: [10, 10, 10] as Point3, svg: '<path/>', shapes: []}]}), ['depth']],
  ['declared cut is allowed', spec('cut', {jumpAt: 30}, {cuts: [30], loop: false}), []],
  ['held beat, then an eased move', {id: 'eased', frames: FRAMES, fps: 60, loop: false, pose: (f) => pose(f < 20 ? 0 : 20 * ease((f - 20) / 40), {})}, []],
];
