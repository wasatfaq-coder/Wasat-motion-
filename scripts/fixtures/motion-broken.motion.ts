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
// the clean cases frame the post and the arm's sweep (a close-up that fills the rect's height); the 'wide' case
// frames the whole base: a wide, low picture in a vertical frame
const CORE = boxCorners([5, 10, 0], [20, 20, 30]) as Point3[];
const CAM = camFit(room(CORE), {rect});
const CAM_WIDE = camFit(room(HERO), {rect});
const FRAMES = 60;

type Opts = {thinHead?: boolean; angle?: (f: number) => number; arrowO?: (f: number) => number; fieldHead?: boolean; onBar?: boolean; meet?: boolean; wide?: boolean; reach?: number; tailOff?: number; cam?: Cam; jumpAt?: number; hideArrowAt?: number; halfTurn?: boolean; inset?: number; extra?: (f: number) => MotionPose['extra']; label?: (f: number) => number};
const pose = (f: number, o: Opts): MotionPose => {
  let theta = o.angle ? o.angle(f) : ((o.halfTurn ? Math.PI : 2 * Math.PI) * f) / FRAMES;
  if (o.jumpAt !== undefined && f >= o.jumpAt) theta += 1.2;
  const reach = o.reach ?? 7;
  const end: Point3 = [15 + reach * Math.cos(theta), 20 + reach * Math.sin(theta), 10];
  const bar = dynTube('arm', [[15, 20, 10], end], 1, P, {lit: true});
  const off = o.tailOff ?? 0;
  const opacity = o.arrowO ? o.arrowO(f) : o.hideArrowAt !== undefined && f >= o.hideArrowAt ? 0 : 1;
  return {
    cam: o.cam ?? (o.wide ? CAM_WIDE : CAM),
    rect,
    unit: U,
    assembly: BASE,
    extra: [...bar, ...(o.extra?.(f) ?? [])],
    arrows: [
      {name: 'arm.force', owner: 'arm', tail: [end[0], end[1], end[2] + off], tip: [end[0], end[1], end[2] + off + 3] as Point3, opacity, svg: `<path d="M0 0" style="fill:var(--anatomy-shade-3);stroke:var(--anatomy-hi);stroke-width:${o.thinHead ? 1.5 : 3}px"/>`},
      // 'meet': two arrows from the arm's ends to the axis, their heads touch over it
      // 'onBar': an arrow from the arm whose head lands on a separate moving bar
      ...(o.onBar ? [{name: 'arm.push', owner: 'arm', tail: end, tip: [22, 32, 10] as Point3, opacity: 1}] : []),
      ...(o.meet ? [{name: 'arm.inA', owner: 'arm', tail: end, tip: [15.3, 20, 10] as Point3, opacity: 1}, {name: 'arm.inB', owner: 'arm', tail: [15, 20, 10] as Point3, tip: [14.8, 20, 10] as Point3, opacity: 1}] : []),
    ],
    keep: (o.wide ? HERO : CORE).map((at, i) => ({name: `hero${i}`, at})),
    plates: [...(o.inset ? [{name: 'inset', kind: 'inset' as const, x: rect.x0, y: rect.y1 - o.inset, w: o.inset, h: o.inset, opacity: 1}] : []), ...(o.label ? [{name: 'label.field', text: 'Поле', x: rect.x0 + 40, y: (rect.y0 + rect.y1) / 2 - 40, w: 120, h: 80, opacity: o.label(f)}] : [])],
    touch: [['arm', 'post']],
    // 'fieldHead': the head of a field line exactly where the force arrow ends
    heads: o.fieldHead ? [{name: 'field0.head', at: [end[0], end[1], end[2] + 3] as Point3, opacity: 1}] : [],
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
  ['wide low picture in a vertical frame', spec('wide', {wide: true}), ['layout']],
  // the arm turns over frames 0–30 and stops; its arrow fades out at the start and back in long after the stop
  ['a white head with a hairline outline', spec('thinhead', {thinHead: true}), ['arrows']],
  ['arrow comes back late', spec('late', {angle: (f) => 1.2 * ease(Math.min(1, f / 30)), arrowO: (f) => (f < 2 ? 1 : f < 50 ? Math.max(0, 1 - (f - 2) / 4) : Math.min(1, (f - 50) / 4))}, {loop: false}), ['late']],
  ['arrow comes back as the arm stops', spec('ontime', {angle: (f) => 1.2 * ease(Math.min(1, f / 30)), arrowO: (f) => (f < 2 ? 1 : f < 28 ? Math.max(0, 1 - (f - 2) / 4) : Math.min(1, (f - 28) / 4))}, {loop: false}), []],
  ['a force tip on the head of a field line', spec('fieldhead', {fieldHead: true, extra: () => []}), ['arrows']],
  ['an arrow head lands on another bar', spec('onbar', {onBar: true, extra: () => dynTube('bar', [[22, 28, 10], [22, 36, 10]], 1, P, {lit: true})}), ['arrows']],
  ['two arrow heads meet over the axis', spec('meet', {meet: true}), ['arrows']],
  ['a 240 px inset', spec('inset', {inset: 240}), ['small']],
  ['a 320 px inset', spec('inset320', {inset: 320}), []],
  ['arm jumps', spec('jerk', {jumpAt: 30}), ['jerk']],
  ['arrow vanishes', spec('pop', {hideArrowAt: 30}), ['pop']],
  ['loop does not close', spec('seam', {halfTurn: true}), ['seam']],
  ['three sticks over each other', spec('depth', {extra: sticks}), ['depth']],
  ['a solid without shapes', spec('noshape', {extra: () => [{name: 'lid', at: [10, 10, 10] as Point3, svg: '<path/>', shapes: []}]}), ['depth']],
  // a label of four letters needs 4 ÷ 13 + 1.2 = 1.51 s; 200 frames are 3.3 s
  ['a label held for 3 s', spec('labelok', {label: (f) => (f < 6 ? f / 6 : f < 194 ? 1 : (200 - f) / 6)}, {frames: 200, loop: false}), []],
  ['a label up for 0.4 s', spec('labelshort', {label: (f) => (f < 6 ? f / 6 : f < 30 ? 1 : f < 36 ? (36 - f) / 6 : 0)}, {frames: 200, loop: false}), ['read']],
  ['declared cut is allowed', spec('cut', {jumpAt: 30}, {cuts: [30], loop: false}), []],
  ['held beat, then an eased move', {id: 'eased', frames: FRAMES, fps: 60, loop: false, pose: (f) => pose(f < 20 ? 0 : 15 * ease((f - 20) / 40), {})}, []],
];
