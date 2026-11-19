import React from 'react';
import {camOn, boxCorners, Cam, ROOM_S} from './camera';
import {iso, P3} from './iso';

// Scale chain (MASTER_PROMPT_FINAL §24.3): cell → organ → body → city → planet as nested models with one continuous
// camera move. Every level is drawn in its own room space at its own detail; only two neighbouring levels are on
// screen at a time, so the SVG never holds a 10⁶ zoom. The inner level sits inside a marked spot of the outer one,
// `factor` times smaller, and the camera zooms log-linearly from the outer box to that spot (lerpCam).

export type ScaleLevel = {
  id: string;
  /** what the level is about (shown on the frontal plate by the scene, with the factor) */
  label: string;
  /** the level's box in its own room units: [min, size] — the camera frames it */
  box: [P3, P3];
  /** where the NEXT level sits in this level's room units (its origin) and how many times smaller it is */
  inner?: {at: P3; factor: number};
  draw: () => React.ReactNode;
};

const roomPx = (p: P3) => iso(ROOM_S)(p);

/** Camera and layers for position `s` in [0, levels.length − 1]: 0 = the first level framed, 1 = the second, …
 *  The scene passes a frame-driven `s` (spring or interpolate per step) and renders `layers` inside RoomSvg. */
export const scaleView = (levels: ScaleLevel[], s: number, fill = 0.6) => {
  const n = levels.length;
  const k = Math.max(0, Math.min(n - 1, s));
  const i = Math.min(n - 2, Math.floor(k));
  const f = n === 1 ? 0 : k - i;
  if (n === 1) {
    const [min, size] = levels[0].box;
    return {cam: camOn(boxCorners(min, size), fill), layers: [{id: levels[0].id, node: levels[0].draw(), transform: '', opacity: 1}], level: 0, f: 0};
  }
  const outer = levels[i];
  const inner = levels[i + 1];
  if (!outer.inner) throw new Error(`scaleView: level «${outer.id}» has no inner spot for «${inner.id}»`);
  const {at, factor} = outer.inner;
  const [imin, isize] = inner.box;
  // the inner box mapped into the outer room space
  const mapped: [P3, P3] = [[at[0] + imin[0] / factor, at[1] + imin[1] / factor, at[2] + imin[2] / factor], [isize[0] / factor, isize[1] / factor, isize[2] / factor]];
  const a = camOn(boxCorners(...outer.box), fill);
  const b = camOn(boxCorners(...mapped), fill);
  const zoom = a.zoom * Math.pow(b.zoom / a.zoom, f);
  // the focus follows the zoom (not the frame share), so the spot stays put on screen as it grows
  const w = Math.abs(b.zoom - a.zoom) < 1e-9 ? f : (zoom - a.zoom) / (b.zoom - a.zoom);
  const cam: Cam = {focus: [a.focus[0] + (b.focus[0] - a.focus[0]) * w, a.focus[1] + (b.focus[1] - a.focus[1]) * w], zoom, screen: a.screen};
  const [tx, ty] = roomPx(at);
  // the inner model fades in over the last part of the move; the outer one gives way only at the very end
  const innerIn = Math.max(0, Math.min(1, (f - 0.45) / 0.35));
  const outerOut = 1 - Math.max(0, Math.min(1, (f - 0.85) / 0.15));
  return {
    cam,
    level: f > 0.999 ? i + 1 : i,
    f,
    layers: [
      {id: outer.id, node: outer.draw(), transform: '', opacity: outerOut},
      {id: inner.id, node: inner.draw(), transform: `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${1 / factor})`, opacity: innerIn},
    ],
  };
};

/** Renders the layers of scaleView inside RoomSvg. */
export const ScaleLayers: React.FC<{layers: ReturnType<typeof scaleView>['layers']}> = ({layers}) => (
  <>
    {layers.map((l) =>
      l.opacity <= 0.001 ? null : (
        <g key={l.id} transform={l.transform || undefined} opacity={l.opacity}>
          {l.node}
        </g>
      ),
    )}
  </>
);
