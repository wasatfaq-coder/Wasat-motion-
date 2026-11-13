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
  /** System-wide detail level: 'auto' adds construction details by size (bevel on top, shading hatch on the shadow face, base line). */
  detail?: 'auto' | 'none';
};

/** Detail system (MASTER_PROMPT_FINAL §19.7): every isometric box gets construction details automatically. */
const DETAIL = {minFace: 0.3, bevel: 0.06, hatchStep: 0.16, hatchShare: 0.38} as const;

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
  detail = 'auto',
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
      {detail === 'auto' ? <BoxDetail s={s} x0={x0} y0={y0} z0={z0} x1={x1} y1={y1} z1={z1} /> : null}
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

const BoxDetail: React.FC<{s: number; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number}> = ({s, x0, y0, z0, x1, y1, z1}) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const out: React.ReactNode[] = [];
  const thin = {stroke: COLORS.inkSoft, strokeWidth: STROKE.micro * 0.8, fill: 'none', strokeLinecap: 'round' as const};
  // 1) bevel: inner outline on the top face (reads as material thickness / lid edge)
  if (dx >= DETAIL.minFace && dy >= DETAIL.minFace && dz >= 0.06) {
    const b = Math.min(DETAIL.bevel, dx / 6, dy / 6);
    out.push(<polygon key="bev" {...thin} points={pts(s, [[x0 + b, y0 + b, z1], [x1 - b, y0 + b, z1], [x1 - b, y1 - b, z1], [x0 + b, y1 - b, z1]])} />);
  }
  // 2) shading hatch at the bottom of the shadow face (light comes from the upper left)
  if (dy >= DETAIL.minFace && dz >= DETAIL.minFace) {
    const n = Math.floor(dy / DETAIL.hatchStep);
    for (let i = 1; i < n; i++) {
      const y = y0 + i * DETAIL.hatchStep;
      out.push(<polyline key={`h${i}`} {...thin} points={pts(s, [[x1, y, z0 + 0.02], [x1, y, z0 + dz * DETAIL.hatchShare]])} />);
    }
  }
  // 3) base line on the front-left face (contact with the ground)
  if (dx >= DETAIL.minFace && dz >= DETAIL.minFace) {
    out.push(<polyline key="base" {...thin} points={pts(s, [[x0 + 0.03, y1, z0 + Math.min(0.08, dz * 0.1)], [x1 - 0.03, y1, z0 + Math.min(0.08, dz * 0.1)]])} />);
  }
  return <g>{out}</g>;
};
