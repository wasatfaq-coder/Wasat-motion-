import React from 'react';
import {COLORS, STROKE} from '../theme/tokens';
import {iso, P3, pts} from '../lib/iso';

type BoxProps = {
  s: number;
  at: P3; // min corner (x0, y0, z0)
  size: P3; // (dx, dy, dz)
  top?: string;
  left?: string; // face y = y1 (lower-left on screen)
  right?: string; // face x = x1 (lower-right on screen)
  stroke?: number;
  ink?: string;
};

/** Solid isometric box: draws the three visible faces with light fills that occlude back lines. */
export const Box: React.FC<BoxProps> = ({
  s,
  at,
  size,
  top = COLORS.fillLight,
  left = COLORS.fillMid,
  right = COLORS.fillDark,
  stroke = STROKE.main,
  ink = COLORS.ink,
}) => {
  const [x0, y0, z0] = at;
  const [dx, dy, dz] = size;
  const x1 = x0 + dx;
  const y1 = y0 + dy;
  const z1 = z0 + dz;
  const common = {stroke: ink, strokeWidth: stroke, strokeLinejoin: 'round' as const};
  return (
    <g>
      <polygon {...common} fill={left} points={pts(s, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])} />
      <polygon {...common} fill={right} points={pts(s, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])} />
      <polygon {...common} fill={top} points={pts(s, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} />
    </g>
  );
};

/** Polyline in 3D. */
export const Line3: React.FC<{
  s: number;
  points: P3[];
  width?: number;
  color?: string;
  dash?: string;
  close?: boolean;
  fill?: string;
}> = ({s, points, width = STROKE.secondary, color = COLORS.ink, dash, close, fill = 'none'}) => {
  const d =
    points
      .map((p, i) => {
        const [x, y] = iso(s)(p);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ') + (close ? ' Z' : '');
  return (
    <path
      d={d}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
    />
  );
};
