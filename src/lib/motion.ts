import type {Assembly, Dyn, Point3} from './assembly';
import type {Cam, Rect} from './camera';
import {SPRING_MECHANICAL, spring} from './physics';

// Beats and transitions for every topic (MASTER_PROMPT_FINAL §19.3, §22.3), and the pose contract that
// scripts/motion-check.mjs reads. Root cause of a past defect (the motor stand reel): beats were separate pictures,
// and the move between them cross-faded one picture into the next while the camera slid, so the loop jumped from
// one angle to the next and the arrows of the old beat hung over the new one. Here a beat is a STATE (numbers: an
// angle, a share, an opacity, a camera), the move between two beats interpolates the state with a mechanical spring,
// and the picture is rebuilt from the state on every frame. A part that turns turns; a part that leaves fades.
// Pure TypeScript, no React.

/** Mechanical ease 0 → 1 over a move: the critical spring (no overshoot, §22.3), scaled to end exactly at 1. */
export const settle = (x: number, seconds = 0.6) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return spring(x * seconds, SPRING_MECHANICAL) / spring(seconds, SPRING_MECHANICAL);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Opacity across a move where one part gives way to another: what leaves fades in the first half, what arrives in
 *  the second, so two meanings are never seen on top of each other. */
export const handOver = (a: number, b: number, t: number) => (b < a ? lerp(a, b, Math.min(1, 2 * t)) : lerp(a, b, Math.max(0, 2 * t - 1)));

/** Where a reel of beats stands at a frame: beat `from`, beat `to` and the eased share t between them.
 *  Each beat holds for `hold` frames, then moves to the next over `move` frames. With `loop` the last beat moves back
 *  to the first, so the last frame leads straight into the first (a seamless loop). */
export const beatClock = (frame: number, {count, hold, move, loop = true}: {count: number; hold: number; move: number; loop?: boolean}) => {
  const slot = hold + move;
  const total = loop ? count * slot : count * slot - move;
  const f = Math.max(0, Math.min(total - 1, frame));
  const from = Math.min(count - 1, Math.floor(f / slot));
  const local = f - from * slot;
  const last = from === count - 1;
  if (local < hold || (last && !loop)) return {from, to: from, t: 0, raw: 0, moving: false, total};
  // t is eased (the object's motion); raw is the plain share of the move, for annotations that fade out and back in
  // during it (an eased t rushes at the start, a fade on it pops)
  const raw = (local - hold) / move;
  return {from, to: (from + 1) % count, t: settle(raw), raw, moving: true, total};
};

/** Frames of a reel built by beatClock. */
export const reelFrames = ({count, hold, move, loop = true}: {count: number; hold: number; move: number; loop?: boolean}) => (loop ? count * (hold + move) : count * (hold + move) - move);

/** Linear blend of two cameras (focus, screen point and zoom). Zoom is blended geometrically. */
export const blendCam = (a: Cam, b: Cam, t: number): Cam => ({
  focus: [lerp(a.focus[0], b.focus[0], t), lerp(a.focus[1], b.focus[1], t)],
  zoom: a.zoom * Math.pow(b.zoom / a.zoom, t),
  screen: [lerp((a.screen ?? [540, 760])[0], (b.screen ?? [540, 760])[0], t), lerp((a.screen ?? [540, 760])[1], (b.screen ?? [540, 760])[1], t)],
});

/** An arrow (current, force, field) as the motion check sees it: its tail must sit on its owner part. */
/** `tip` (optional): where the head ends; motion-check keeps the tips of two arrows apart (they must not read as one
 *  bar) and off moving bodies other than the owner. `along`: name prefixes the head may run onto (a current arrow
 *  that follows its conductor round a corner). */
export type ArrowProbe = {name: string; tail: Point3; owner: string; opacity: number; tip?: Point3; along?: string[]; svg?: string};
/** A frontal plate or inset in screen pixels. `kind: 'inset'` marks a drawn inset (a section, a plan view): its side
 *  must be at least LIMITS.insetMin px (scripts/motion-check.mjs), smaller its glyphs vanish on a phone (N6).
 *  `text` is the label a plate shows (omit it for an inset): motion-check keeps every plate with text fully visible
 *  long enough to be read (kind `read`, LIMITS.read*). */
export type PlateProbe = {name: string; x: number; y: number; w: number; h: number; opacity: number; kind?: 'label' | 'inset'; text?: string};

/** Everything scripts/motion-check.mjs needs to judge one frame without rendering it. */
export type MotionPose = {
  cam: Cam;
  /** the rect the hero and the plates must stay inside (camera.ts safeRect) */
  rect: Rect;
  /** kit units per room unit of the assembly (anatomyProjection(unit)) */
  unit: number;
  /** the static object */
  assembly: Assembly;
  /** moving parts with their shapes and opacity (dynTube, dynBall, dynSolid, Assembly.dyn) */
  extra: Dyn[];
  /** arrows over the object; `owner` is the name prefix of a moving part, or the name of a static part */
  arrows: ArrowProbe[];
  /** kit points that must stay inside the rect on this frame (hero corners, label anchors) */
  keep: {name: string; at: Point3}[];
  /** frontal plates and insets in screen pixels */
  plates: PlateProbe[];
  /** heads of annotation arrows that are not ArrowProbes (the heads of field lines): motion-check keeps every arrow
   *  head (tip back to `base`) at least LIMITS.tips px away from them, so two heads never fuse into one figure (R5) */
  heads?: {name: string; at: Point3; base?: Point3; opacity: number}[];
  /** moving × static name prefixes allowed to touch or sink (an axle in its bearing, a brush on the commutator) */
  touch?: [string, string][];
  /** static parts the frame does not draw (Assembly.svg `hide`): a part handed over to a moving copy of itself (a tile
   *  that starts to move, the coral tile drawn lit) is skipped by the checks, so the copy is not reported as sinking into
   *  its hidden original and no `touch` pair has to excuse it (a broad pair excused real sinks too) */
  hide?: (name: string) => boolean;
};

/** A reel or scene the motion check walks frame by frame. `cuts` are frames where a hard cut is intended.
 *  `stills`: the frames are separate style frames (one per beat), not a timeline, so no time-based rule (read) applies. */
export type MotionSpec = {id: string; frames: number; fps: number; loop: boolean; cuts?: number[]; stills?: boolean; pose: (frame: number) => MotionPose};
