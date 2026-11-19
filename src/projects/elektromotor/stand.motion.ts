import * as K from '../../vendor/anatomy/iso-kit';
import {Dyn, Point3} from '../../lib/assembly';
import {toRoom} from '../../lib/anatomy';
import {boxCorners, Cam, camFit, Rect, safeRect, screenOf} from '../../lib/camera';
import {forceOnWire} from '../../lib/handed';
import {ArrowProbe, beatClock, blendCam, handOver, lerp, MotionPose, MotionSpec, PlateProbe, reelFrames} from '../../lib/motion';
import {FORMAT} from '../../theme/format';
import {AX, AY, commutatorItems, LOOP_R, LOOP_Z0, LOOP_Z1, loopItems, PLATE_TOP, STAND, STAND_P, STAND_U, WIRE_Y, wireItems} from './stand.parts';

// The field stand as STATES (src/lib/motion.ts): the style frames (scenes 2–5) and the silent test reel are the same
// four states. The picture of any frame is rebuilt from its state; between beats the loop TURNS (it does not
// cross-fade), and the parts that change meaning (the straight wire ↔ the loop, the field lines, the inset) fade.
// Three arrow looks, the same in every scene (decisions.md): current — thin dark with a small head · force — THICK flat
// (dark outline, light body) · field — dashed with heads. Arrows are annotations drawn over the object (§20.4); their
// tails sit on the conductor they belong to (motion-check verifies it).
const P = STAND_P;
const at = (p: Point3) => K.iso(p, P);
const FIELD: Point3 = [1, 0, 0]; // N → S, along +x
/** the force on a conductor segment with the given current direction: I·L × B by the right-hand rule (src/lib/handed.ts) */
export const forceDir = (current: Point3): Point3 => forceOnWire(current, FIELD);
export {FIELD};
const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Point3): Point3 => a.map((v) => v / (len(a) || 1)) as Point3;
const back = (p: Point3, u: Point3, d: number): Point3 => [p[0] - u[0] * d, p[1] - u[1] * d, p[2] - u[2] * d];
const along = (p: Point3, u: Point3, s: number): Point3 => [p[0] + u[0] * s, p[1] + u[1] * s, p[2] + u[2] * s];
const tri = (tip: Point3, u: Point3, size: number, wide: Point3, fill: string, stroke = fill, outline = 1.5) => {
  const base = along(tip, u, -size);
  const w = (k: number): Point3 => along(base, wide, size * 0.5 * k);
  return `<path d="${K.pathOf([at(tip), at(w(1)), at(w(-1))], true)}" style="fill:${fill};stroke:${stroke};stroke-width:${outline}px;stroke-linejoin:round"/>`;
};
const line = (a: Point3, b: Point3, width: number, color: string, dash = '') =>
  `<path d="${K.pathOf([at(a), at(b)])}" style="fill:none;stroke:${color};stroke-width:${width}px;stroke-linecap:round;${dash ? `stroke-dasharray:${dash};` : ''}"/>`;

/** force arrow length on the loop sides: at the dead position (90°) both point along the radius, so they stop well
 *  short of the axis (LOOP_R) and never meet over it (R4) */
const LOOP_FORCE = 5;
const FORCE_DZ = 5;
/** the current arrows run along the side between these heights (kit units) */
const CUR_LO = LOOP_Z0 + 2;
const CUR_HI = LOOP_Z1 - 6;

export type Arrow = ArrowProbe & {svg: string};
/** current: thin dark shaft with a small head */
const currentArrow = (name: string, owner: string, from: Point3, to: Point3, wide: Point3, opacity: number): Arrow => {
  const u = unit(sub(to, from));
  return {name, owner, tail: from, tip: to, along: [owner.split('.')[0]], opacity, svg: line(from, back(to, u, 2.5), 3.2, 'var(--anatomy-hi)') + tri(to, u, 3.6, wide, 'var(--anatomy-hi)')};
};
/** force: a thick flat arrow, dark outline and a light body; the tail starts on the conductor */
const forceArrow = (name: string, owner: string, from: Point3, dir: Point3, reach: number, wide: Point3, opacity: number): Arrow => {
  const to = along(from, dir, reach);
  const neck = back(to, dir, 3);
  return {name, owner, tail: from, tip: to, opacity, svg: line(from, neck, 10, 'var(--anatomy-hi)') + line(from, neck, 5.2, 'var(--anatomy-shade-3)') + tri(to, dir, 3.3, wide, 'var(--anatomy-shade-3)', 'var(--anatomy-hi)', 3)};
};
/** field: dashed lines from the N pole face to the S pole face, with two heads each (no shapes: an annotation) */
const FIELD_YS = [AY - 9, AY + 9];
const FIELD_Z = PLATE_TOP + 24;
const FIELD_HEADS = [24, 69];
/** the heads of the field lines (motion-check keeps arrow tips off them) */
export const fieldHeads = (opacity: number) => FIELD_YS.flatMap((y, i) => FIELD_HEADS.map((x, k) => ({name: `field${i}.head${k}`, at: [x, y, FIELD_Z] as Point3, base: [x - 3.4, y, FIELD_Z] as Point3, opacity})));
const fieldLines = (ys: number[], z: number, opacity: number): Dyn[] =>
  ys.map((y, i) => {
    const heads = FIELD_HEADS.map((x) => tri([x, y, z], [1, 0, 0], 3.4, [0, 0, 1], 'var(--anatomy-mid)'));
    return {name: `field${i}`, at: [AX, y, z] as Point3, svg: line([21, y, z], [69, y, z], 2.4, 'var(--anatomy-mid)', '7 6') + heads.join(''), shapes: [], opacity, annotation: true};
  });

/** One beat of the stand. theta is the loop angle; wire/loop/field/inset/labels are opacities 0…1. */
export type StandState = {theta: number; wire: number; loop: number; forces: number; field: number; inset: number; labels: number; cam: Cam};

// What the camera must hold on EVERY pose (the hero of scenes 2–5 is the conductor in the gap): a CLOSE-UP of the
// loop's full sweep with the commutator, the brushes and the arch (kit units), and the pole pieces' inner faces with
// their labels (decisions.md: variant Б, 2026-11-19). The magnet bodies, the plate, rails and terminals are
// environment: past the frame they fade out (RoomSvg sides), they are never cut by a hard edge. The labels С / Ю
// stand on the pole pieces (N at its back corner, S at its front corner, so both plates sit inside the close-up),
// so they always point at a visible part.
const HERO_MIN: Point3 = [31, 8, PLATE_TOP];
const HERO_SIZE: Point3 = [28, 36, 33.4];
export const LABEL_ANCHORS = {N: [20, AY - 8, PLATE_TOP + 21] as Point3, S: [70, AY + 8, PLATE_TOP + 21] as Point3};
export const LABEL_LIFT = 70; // px from the anchor to the plate centre
export const LABEL_SIZE = 66;
/** the plate drawn by Frontal Plate for one letter at LABEL_SIZE (textWidth + padding, 1.55 em high) */
const PLATE_W = LABEL_SIZE * 0.6 + LABEL_SIZE * 1.1;
const PLATE_H = LABEL_SIZE * 1.55;
export const INSET = {w: 320, h: 320};
const room = (pts: Point3[]) => pts.map((p) => toRoom(p, STAND_U));
const heroPoints = () => [...boxCorners(HERO_MIN, HERO_SIZE), LABEL_ANCHORS.N, LABEL_ANCHORS.S] as Point3[];

/** The four beats: 0 scene 2 (straight wire in the field, with the section inset), 1 scene 3 (loop at 30°),
 *  2 scene 4 (dead position, 90°), 3 scene 5 (the commutator after the swap: the loop has turned on past 180°).
 *  One camera holds the whole hero and its labels on every beat. */
export const beats = (rect: Rect): StandState[] => {
  // the label plates are pinned above the pole pieces: the fit holds the hero AND the plates
  const pins = [LABEL_ANCHORS.N, LABEL_ANCHORS.S].map((a) => ({at: toRoom(a, STAND_U), box: [-PLATE_W / 2, -LABEL_LIFT - PLATE_H / 2, PLATE_W / 2, 0] as [number, number, number, number]}));
  const wide = camFit(room(heroPoints()), {rect, pins});
  return [
    {theta: Math.PI / 6, wire: 1, loop: 0, forces: 1, field: 1, inset: 1, labels: 1, cam: wide},
    {theta: Math.PI / 6, wire: 0, loop: 1, forces: 1, field: 1, inset: 0, labels: 1, cam: wide},
    {theta: Math.PI / 2, wire: 0, loop: 1, forces: 1, field: 1, inset: 0, labels: 1, cam: wide},
    {theta: 0.35 + Math.PI, wire: 0, loop: 1, forces: 1, field: 0, inset: 0, labels: 1, cam: wide},
  ];
};

/** The loop's current and force arrows annotate a BEAT (current and force at that angle): during a turn they fade out
 *  early and come back at the end, so a head never sweeps over the bars, the commutator or a field-line head
 *  (motion-check `arrows`, R4/R5). Placement on the sides: current low, force high, field heads at the pole faces. */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** out: on the linear share (an eased t rushes at the start, a fade on it pops); back in: on the eased t, i.e. on the
 *  loop's own settling, so the arrows return as the loop comes to rest, not after it (R6) */
const between = (raw: number, eased: number) => (raw < 0.5 ? clamp01(1 - raw / 0.08) : clamp01((eased - IN_FROM) / (1 - IN_FROM - 0.005)));
const IN_FROM = 0.96;

/** The state between two beats. A loop that is invisible on one side takes the angle of the other side (it fades in
 *  or out where it is; it does not spin while hidden). */
export const blend = (a: StandState, b: StandState, t: number, raw = t): StandState => ({
  theta: a.loop === 0 ? b.theta : b.loop === 0 ? a.theta : lerp(a.theta, b.theta, t),
  wire: handOver(a.wire, b.wire, t),
  loop: handOver(a.loop, b.loop, t),
  forces: Math.min(a.forces, b.forces) * between(raw, t),
  field: lerp(a.field, b.field, t),
  inset: handOver(a.inset, b.inset, t),
  labels: lerp(a.labels, b.labels, t),
  cam: blendCam(a.cam, b.cam, t),
});

/** Inset rect (screen px): the bottom left corner of the safe rect, over the front of the plate (environment), clear of the hero. */
export const insetRect = (rect: Rect) => ({x: rect.x0, y: rect.y1 - INSET.h, ...INSET});

/** Moving parts and arrows of a state. */
export const partsOf = (s: StandState): {extra: Dyn[]; arrows: Arrow[]} => {
  const extra: Dyn[] = [];
  const arrows: Arrow[] = [];
  if (s.field > 0) extra.push(...fieldLines(FIELD_YS, FIELD_Z, s.field));
  if (s.wire > 0) {
    // scene 2: the wire (coral) in the field; current up, force along +y (I·L×B with B along +x)
    extra.push(...wireItems(0, s.wire));
    arrows.push(currentArrow('wire.current', 'sceneWire.drop', [AX + 2.4, WIRE_Y, PLATE_TOP + 9], [AX + 2.4, WIRE_Y, PLATE_TOP + 27], [0, 1, 0], s.wire));
    arrows.push(forceArrow('wire.force', 'sceneWire.drop', [AX, WIRE_Y + 1.4, PLATE_TOP + 14], forceDir([0, 0, 1]), 11, [0, 0, 1], s.wire));
  }
  if (s.loop > 0) {
    const th = s.theta;
    const d: Point3 = [Math.cos(th), Math.sin(th), 0];
    const wide: Point3 = [-d[1], d[0], 0];
    const sd = (k: number, z: number): Point3 => [AX + d[0] * k, AY + d[1] * k, z];
    extra.push(...loopItems(th, s.loop), ...commutatorItems(th, s.loop));
    // the current runs up the side at +direction and down the other: the commutator keeps it so whatever the angle
    arrows.push(currentArrow('loop.current+', 'loop.plus', sd(LOOP_R + 2.2, CUR_LO), sd(LOOP_R + 2.2, CUR_HI), wide, s.loop * s.forces));
    arrows.push(currentArrow('loop.current-', 'loop.minus', sd(-LOOP_R - 2.2, CUR_HI), sd(-LOOP_R - 2.2, CUR_LO), wide, s.loop * s.forces));
    // the force on each vertical side follows from ITS current (up on the + side, down on the − side): I·L × B
    const mz = (LOOP_Z0 + LOOP_Z1) / 2 + FORCE_DZ;
    arrows.push(forceArrow('loop.force+', 'loop.plus', sd(LOOP_R, mz), forceDir([0, 0, 1]), LOOP_FORCE, [0, 0, 1], s.loop * s.forces));
    arrows.push(forceArrow('loop.force-', 'loop.minus', sd(-LOOP_R, mz), forceDir([0, 0, -1]), LOOP_FORCE, [0, 0, 1], s.loop * s.forces));
  }
  return {extra, arrows};
};

/** Screen rects of the label plates and the inset (for the check and the scene). */
export const platesOf = (s: StandState, rect: Rect): PlateProbe[] => {
  const plate = (name: string, a: Point3, text: string): PlateProbe => {
    const [x, y] = screenOf(s.cam, toRoom(a, STAND_U));
    return {name, x: x - PLATE_W / 2, y: y - LABEL_LIFT - PLATE_H / 2, w: PLATE_W, h: PLATE_H, opacity: s.labels, text};
  };
  const ins = insetRect(rect);
  return [plate('label.N', LABEL_ANCHORS.N, 'С'), plate('label.S', LABEL_ANCHORS.S, 'Ю'), {name: 'inset', kind: 'inset', ...ins, opacity: s.inset}];
};

const poseOf = (s: StandState, rect: Rect): MotionPose => {
  const {extra, arrows} = partsOf(s);
  return {
    cam: s.cam,
    rect,
    unit: STAND_U,
    assembly: STAND,
    extra,
    arrows,
    keep: heroPoints().map((p, i) => ({name: `hero${i}`, at: p})),
    plates: platesOf(s, rect),
    heads: fieldHeads(s.field),
    // the loop's leads end in the half-rings; the brushes press on the commutator; the hub sits on the axis
    touch: [
      ['loop.lead', 'commutator'],
      ['commutator', 'axis'],
      ['commutator', 'bearing'],
      ['commutator', 'brush'],
      ['loop', 'axis'],
      ['sceneWire', 'wire.clamp'],
      ['sceneWire', 'wire.post'],
    ],
  };
};

// Style frames (stills): frame k is beat k, framed for a scene WITH captions.
const STILL_RECT = safeRect({captions: true});
export const stillState = (frame: number) => beats(STILL_RECT)[Math.min(3, Math.max(0, frame))];
export const STILL_RECT_OF = STILL_RECT;

// Silent test reel: four beats, each held 1.5 s, moves of 0.75 s; the last beat moves back to the first, so the file loops.
export const REEL_RECT = safeRect({captions: false});
export const REEL_TIMING = {count: 4, hold: 90, move: 45, loop: true} as const;
export const REEL_FRAMES = reelFrames(REEL_TIMING);
const REEL_BEATS = beats(REEL_RECT);
export const reelState = (frame: number) => {
  const c = beatClock(frame, REEL_TIMING);
  return c.moving ? blend(REEL_BEATS[c.from], REEL_BEATS[c.to], c.t, c.raw) : REEL_BEATS[c.from];
};

/** Motion specs walked by scripts/motion-check.mjs (no rendering). */
export const MOTION: MotionSpec[] = [
  {id: 'ElektromotorReel', frames: REEL_FRAMES, fps: FORMAT.fps, loop: true, pose: (f) => poseOf(reelState(f), REEL_RECT)},
  {id: 'ElektromotorStand', frames: 4, fps: FORMAT.fps, loop: false, stills: true, cuts: [1, 2, 3], pose: (f) => poseOf(stillState(f), STILL_RECT)},
];
