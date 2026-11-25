import {settle} from './motion';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** One heartbeat, 0 at the edges of the beat and 1 in the middle. `hz` is beats per second. */
export const pulse = (frame: number, fps: number, hz: number) => {
  const u = (frame / fps) * hz;
  const w = u - Math.floor(u);
  return Math.sin(w * Math.PI);
};

/** A move that starts at `from` and lands with the mechanical spring (no overshoot, no jerk). `dur` is frames. */
export const act = (frame: number, from: number, dur: number) => settle(clamp01((frame - from) / Math.max(1, dur)));

/** Shell opacity for an x-ray: 1 until `from`, then down to `floor` over `dur` frames. */
export const xray = (frame: number, from: number, dur: number, floor = 0.14) => 1 - (1 - floor) * act(frame, from, dur);

/** A value that eases from `a` to `b` on the same spring, for a sensor locked to the action. */
export const track = (frame: number, from: number, dur: number, a: number, b: number) => a + (b - a) * act(frame, from, dur);
