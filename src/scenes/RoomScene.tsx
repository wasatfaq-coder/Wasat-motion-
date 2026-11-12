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
          <stop offset={(ZONES.captionsTop - 70) / 1920} stopColor="white" stopOpacity={1} />
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
