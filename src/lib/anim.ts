import {Easing, interpolate} from 'remotion';

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;

/** Progress 0..1 between two moments given in seconds. */
export const progress = (
  frame: number,
  fps: number,
  startSec: number,
  durationSec: number,
  easing: (t: number) => number = EASE.out,
) =>
  interpolate(frame, [startSec * fps, (startSec + durationSec) * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Seconds or milliseconds to frames: one function for the whole project. Rounds up so clips are not cut. */
export const msToFrames = (ms: number, fps: number) => Math.ceil((ms / 1000) * fps);
