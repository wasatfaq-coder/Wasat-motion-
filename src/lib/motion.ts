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
  if (local < hold || (last && !loop)) return {from, to: from, t: 0, moving: false, total};
  return {from, to: (from + 1) % count, t: settle((local - hold) / move), moving: true, total};
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
export type ArrowProbe = {name: string; tail: Point3; owner: string; opacity: number};
/** A frontal plate or inset in screen pixels. */
export type PlateProbe = {name: string; x: number; y: number; w: number; h: number; opacity: number};

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
  /** moving × static name prefixes allowed to touch or sink (an axle in its bearing, a brush on the commutator) */
  touch?: [string, string][];
};

/** A reel or scene the motion check walks frame by frame. `cuts` are frames where a hard cut is intended. */
export type MotionSpec = {id: string; frames: number; fps: number; loop: boolean; cuts?: number[]; pose: (frame: number) => MotionPose};
