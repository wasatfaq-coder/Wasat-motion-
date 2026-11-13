import React from 'react';
import {COLORS} from '../theme/tokens';
import {iso, P3} from '../lib/iso';
import {ZONES} from '../theme/layout';

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

/** Full-frame SVG with a camera: the focus point is shown at `screen` with `zoom`. */
export const RoomSvg: React.FC<{cam: Cam; children: React.ReactNode; top?: number}> = ({cam, children, top = GRAPHICS_TOP}) => {
  const [fx, fy] = cam.focus;
  const [sx, sy] = cam.screen ?? [540, 760];
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, background: COLORS.bg}}>
      <defs>
        {/* Graphics live only in the band between the thesis and the caption zone; edges fade to the background. */}
        <linearGradient id="graphicsBand" x1="0" y1="0" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset={top / 1920} stopColor="white" stopOpacity={0} />
          <stop offset={(top + 50) / 1920} stopColor="white" stopOpacity={1} />
          <stop offset={(ZONES.captionsTop - 40) / 1920} stopColor="white" stopOpacity={1} />
          <stop offset={(ZONES.captionsTop - 10) / 1920} stopColor="white" stopOpacity={0} />
        </linearGradient>
        <mask id="graphicsMask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <rect x={0} y={0} width={1080} height={1920} fill="url(#graphicsBand)" />
        </mask>
      </defs>
      <g mask="url(#graphicsMask)">
        <g transform={`translate(${sx} ${sy}) scale(${cam.zoom}) translate(${-fx} ${-fy})`}>
          <g transform={`translate(${ROOM_ORIGIN[0]} ${ROOM_ORIGIN[1]})`}>{children}</g>
        </g>
      </g>
    </svg>
  );
};

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
