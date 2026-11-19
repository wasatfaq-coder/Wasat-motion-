// Shared camera for every topic (moved from src/scenes/RoomScene.tsx): room projection, RoomSvg, camOn, lerpCam.
import React from 'react';
import {COLORS} from '../theme/tokens';
import {iso, P3} from './iso';
import {SAFE, ZONES} from '../theme/layout';

/** Top of the illustration band (no headings inside the video, only the opening preview title). */
export const GRAPHICS_TOP = 240;

export const ROOM_S = 54; // px per room unit at camera scale 1
export const ROOM_ORIGIN: [number, number] = [540, 880]; // screen point of the back floor corner

/** Screen position of a room point at camera scale 1. */
export const roomPoint = (p: P3): [number, number] => {
  const [x, y] = iso(ROOM_S)(p);
  return [ROOM_ORIGIN[0] + x, ROOM_ORIGIN[1] + y];
};

export type Cam = {focus: [number, number]; zoom: number; screen?: [number, number]};

/** Full-frame SVG with a camera: the focus point is shown at `screen` with `zoom`.
 *  `bottom` is where the graphics band ends (default: the caption zone; a reel without captions passes
 *  FRAME_BOTTOM). `sides` softens the left and right edges over that many pixels, so environment that runs past the
 *  frame (a bench, a floor) fades out instead of being cut by the frame edge. The hero must still stay inside the
 *  safe rect (camFit, motion-check). */
export const RoomSvg: React.FC<{cam: Cam; children: React.ReactNode; top?: number; bottom?: number; sides?: number}> = ({cam, children, top = GRAPHICS_TOP, bottom = ZONES.captionsTop, sides = 0}) => {
  const [fx, fy] = cam.focus;
  const [sx, sy] = cam.screen ?? [540, 760];
  return (
    <svg className="iso-svg" width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, background: COLORS.bg}}>
      <defs>
        {/* Graphics live only in the band between the thesis and the caption zone; edges fade to the background. */}
        <linearGradient id="graphicsBand" x1="0" y1="0" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset={top / 1920} stopColor="white" stopOpacity={0} />
          <stop offset={(top + 50) / 1920} stopColor="white" stopOpacity={1} />
          <stop offset={(bottom - 40) / 1920} stopColor="white" stopOpacity={1} />
          <stop offset={(bottom - 10) / 1920} stopColor="white" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="graphicsSides" x1="0" y1="0" x2="1080" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor="white" stopOpacity={sides ? 0 : 1} />
          <stop offset={sides / 1080} stopColor="white" stopOpacity={1} />
          <stop offset={1 - sides / 1080} stopColor="white" stopOpacity={1} />
          <stop offset={1} stopColor="white" stopOpacity={sides ? 0 : 1} />
        </linearGradient>
        <mask id="graphicsMask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <rect x={0} y={0} width={1080} height={1920} fill="url(#graphicsBand)" />
        </mask>
        <mask id="graphicsSideMask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <rect x={0} y={0} width={1080} height={1920} fill="url(#graphicsSides)" />
        </mask>
      </defs>
      <g mask="url(#graphicsMask)">
        <g mask="url(#graphicsSideMask)">
          <g transform={`translate(${sx} ${sy}) scale(${cam.zoom}) translate(${-fx} ${-fy})`}>
            <g transform={`translate(${ROOM_ORIGIN[0]} ${ROOM_ORIGIN[1]})`}>{children}</g>
          </g>
        </g>
      </g>
    </svg>
  );
};

/** Lowest graphics line of a reel or a scene without captions (the bottom of the safe zone). */
export const FRAME_BOTTOM = 1920 - SAFE.bottom;

export type Rect = {x0: number; y0: number; x1: number; y1: number};

/** The rect the hero must stay inside: the platform safe zone (SAFE) cut to the graphics band.
 *  `captions: false` for a reel or a scene without captions: the band runs down to the bottom of the safe zone. */
export const safeRect = ({captions = true, top = GRAPHICS_TOP}: {captions?: boolean; top?: number} = {}): Rect => ({
  x0: SAFE.left,
  x1: 1080 - SAFE.right,
  y0: Math.max(top + 50, SAFE.top),
  y1: captions ? ZONES.graphicsBottom - 40 : FRAME_BOTTOM - 40,
});

/** A frontal plate pinned to a room point: its rect in screen px relative to the pinned point (x0, y0, x1, y1). */
export type Pin = {at: P3; box: [number, number, number, number]};

/** Camera that fits a set of room points INSIDE a rect of the vertical frame (default: the safe rect with captions),
 *  centred in it, filling `fill` of its width or height (whichever is tighter). `pins` are frontal plates (labels)
 *  pinned to room points: they keep their pixel size at any zoom, so the fit solves the zoom at which the points AND
 *  the plates fit. Pass every extreme point of every pose the camera has to hold (boxCorners of the hero), so nothing
 *  leaves the frame on any pose. `margin` reserves extra pixels (an inset beside the hero). */
export const camFit = (
  points: P3[],
  {rect = safeRect(), fill = 0.94, margin = {}, pins = []}: {rect?: Rect; fill?: number; margin?: Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>; pins?: Pin[]} = {},
): Cam => {
  if (points.length < 4) throw new Error(`camFit: ${points.length} point(s); pass the corners of a box (boxCorners) or every extreme point`);
  const m = {top: 0, bottom: 0, left: 0, right: 0, ...margin};
  const room = points.map((p) => roomPoint(p));
  const pinned = pins.map((p) => ({xy: roomPoint(p.at), box: p.box}));
  const rw = (rect.x1 - rect.x0 - m.left - m.right) * fill;
  const rh = (rect.y1 - rect.y0 - m.top - m.bottom) * fill;
  // extents of everything at zoom z, relative to an origin at room (0, 0)
  const extents = (z: number) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y] of room) (x0 = Math.min(x0, z * x)), (x1 = Math.max(x1, z * x)), (y0 = Math.min(y0, z * y)), (y1 = Math.max(y1, z * y));
    for (const {xy, box} of pinned) (x0 = Math.min(x0, z * xy[0] + box[0])), (x1 = Math.max(x1, z * xy[0] + box[2])), (y0 = Math.min(y0, z * xy[1] + box[1])), (y1 = Math.max(y1, z * xy[1] + box[3]));
    return {x0, x1, y0, y1};
  };
  const fits = (z: number) => {
    const e = extents(z);
    return e.x1 - e.x0 <= rw && e.y1 - e.y0 <= rh;
  };
  let lo = 0;
  let hi = 1;
  while (fits(hi) && hi < 1e4) hi *= 2;
  if (!fits(lo + 1e-6)) throw new Error('camFit: the pinned plates alone do not fit the rect');
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  const z = lo;
  const e = extents(z);
  const screen: [number, number] = [(rect.x0 + m.left + rect.x1 - m.right) / 2, (rect.y0 + m.top + rect.y1 - m.bottom) / 2];
  // the union's centre goes to the rect's centre: focus is the room point that lands on `screen`
  return {focus: [(e.x0 + e.x1) / 2 / z, (e.y0 + e.y1) / 2 / z], zoom: z, screen};
};

/** Room points of `points` that a camera puts outside the rect (by more than `tol` px): empty when the framing holds. */
export const outside = (cam: Cam, points: P3[], rect: Rect, tol = 1): P3[] =>
  points.filter((p) => {
    const [x, y] = screenOf(cam, p);
    return x < rect.x0 - tol || x > rect.x1 + tol || y < rect.y0 - tol || y > rect.y1 + tol;
  });

export const lerpCam = (a: Cam, b: Cam, t: number): Cam => ({
  focus: [a.focus[0] + (b.focus[0] - a.focus[0]) * t, a.focus[1] + (b.focus[1] - a.focus[1]) * t],
  zoom: a.zoom * Math.pow(b.zoom / a.zoom, t),
  screen: [
    (a.screen ?? [540, 760])[0] + ((b.screen ?? [540, 760])[0] - (a.screen ?? [540, 760])[0]) * t,
    (a.screen ?? [540, 760])[1] + ((b.screen ?? [540, 760])[1] - (a.screen ?? [540, 760])[1]) * t,
  ],
});

/** Camera that frames a set of 3D points (an object's corners): the projected box fills `fill` of the frame width
 *  (or of the graphics band height, whichever is tighter). Use it so the main object meets §19.2 (≥ 35–40 %)
 *  without guessing zoom numbers. */
export const camOn = (points: P3[], fill = 0.55, screen: [number, number] = [540, 720]): Cam => {
  // root cause of a past miss: a camera built from three points that were not the extremes of the object came out far
  // too close. Pass the corners of a BOX (boxCorners / camOnBox) or at least every extreme point of the object.
  if (points.length < 4) throw new Error(`camOn: ${points.length} point(s); pass the corners of a box (boxCorners, camOnBox) so the framing covers the whole object`);
  const xy = points.map((p) => roomPoint(p));
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const band = 1170 - GRAPHICS_TOP;
  const zoom = Math.min((1080 * fill) / w, (band * fill) / h);
  return {focus: [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2], zoom, screen};
};

/** The eight corners of an axis-aligned box (at, size) for camOn. */
export const boxCorners = ([x, y, z]: P3, [dx, dy, dz]: P3): P3[] =>
  [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => [x + i * dx, y + j * dy, z + k * dz] as P3)));

/** Screen pixel of a room point under a camera (what RoomSvg shows). Use it to pin frontal plates (FrontalLayer)
 *  to objects: plates stay screen-aligned and keep their pixel size whatever the zoom (§20.4). */
export const screenOf = (cam: Cam, p: P3): [number, number] => {
  const [rx, ry] = roomPoint(p);
  const [sx, sy] = cam.screen ?? [540, 760];
  return [sx + cam.zoom * (rx - cam.focus[0]), sy + cam.zoom * (ry - cam.focus[1])];
};

/** Camera on an axis-aligned box in room units: the safe way to frame an object (all eight corners). */
export const camOnBox = (min: P3, size: P3, fill = 0.55, screen: [number, number] = [540, 720]): Cam => camOn(boxCorners(min, size), fill, screen);
