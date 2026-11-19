import type {Assembly, Point3} from './assembly';
import {A} from './assembly';
import {Cam, camFit, Rect, safeRect, boxCorners} from './camera';
import {blendCam, handOver, settle} from './motion';
import {P3} from './iso';

// Transition templates (MASTER_PROMPT_FINAL §24.4, §23 of the motion rules in motion.ts): the montage language every
// topic shares. Each template is a STATE function of t (0..1, the eased share of a move from beatClock): a camera, a
// hide test or opacities. The scene keeps them in its *.motion.ts, so motion-check walks every frame (§22, PR #21).
// Root cause this file removes: every topic invented its own cut, zoom and reveal, with zoom numbers that cropped the
// hero and cross-fades that showed two meanings at once.

type Box = [P3, P3]; // [min, size] in room units

const fit = (box: Box, rect: Rect, fill: number) => camFit(boxCorners(box[0], box[1]), {rect, fill});

/** Zoom into a detail: from the whole object to a detail box, keeping the whole in view until the last third so the
 *  viewer sees WHERE the detail is (a locator), then the detail fills the frame. */
export const zoomInto = (whole: Box, detail: Box, t: number, o: {rect?: Rect; fill?: number} = {}): {cam: Cam; context: number} => {
  const rect = o.rect ?? safeRect();
  const a = fit(whole, rect, o.fill ?? 0.94);
  const b = fit(detail, rect, o.fill ?? 0.94);
  const k = settle(t);
  return {cam: blendCam(a, b, k), context: 1 - Math.max(0, Math.min(1, (k - 0.66) / 0.34))};
};

/** Pull out to the surroundings (out of a window, up from a desk): the reverse of zoomInto, with the surroundings
 *  fading in over the first two thirds. */
export const pullOut = (detail: Box, whole: Box, t: number, o: {rect?: Rect; fill?: number} = {}): {cam: Cam; context: number} => {
  const r = zoomInto(whole, detail, 1 - t, o);
  return {cam: r.cam, context: r.context};
};

/** A section reveal: parts whose centre lies on the near side of a plane are removed, the plane sweeping from `from`
 *  to `to` along `axis` (kit units) as t goes 0 → 1. Returns a hide test for Assembly.svg({}, {hide}). Use it for
 *  «корпус → снятие крышки → слои → деталь» (§22.2): the cut moves, nothing pops. */
export const cutaway = (obj: Assembly, axis: Point3, from: number, to: number, t: number, o: {keep?: (name: string) => boolean} = {}) => {
  const items = obj.R.items as {name: string; shapes: unknown[]}[];
  const centre = new Map<string, number>();
  for (const i of items) {
    if (!i.shapes?.length) continue;
    const b = (i.shapes as unknown[]).map((s) => A.boundsOf(s) as {min: Point3; max: Point3});
    const c = [0, 1, 2].map((k) => (Math.min(...b.map((x) => x.min[k])) + Math.max(...b.map((x) => x.max[k]))) / 2);
    centre.set(i.name, c[0] * axis[0] + c[1] * axis[1] + c[2] * axis[2]);
  }
  const plane = from + (to - from) * settle(t);
  return (name: string) => !o.keep?.(name) && (centre.get(name) ?? -Infinity) > plane;
};

/** Peel layers one after another (a lid, then a cover, then a board): layer i leaves over its own slice of t, so at
 *  most one layer moves at a time. Returns the share (0 = home, 1 = gone) for each layer, for svg({[piece]: share}). */
export const peel = (layers: string[], t: number): Record<string, number> =>
  Object.fromEntries(layers.map((l, i) => [l, settle(Math.max(0, Math.min(1, t * layers.length - i)))]));

/** A meaning hand-over between two objects in the same place (the old one leaves in the first half of the move, the
 *  new one arrives in the second: two meanings never overlap, §20.5). */
export const swap = (t: number) => ({out: handOver(1, 0, t), in: handOver(0, 1, t)});
