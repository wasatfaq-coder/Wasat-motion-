import React from 'react';
import {COLORS, STROKE} from '../theme/tokens';
import {COS30, iso, P3, planeMatrix, SIN30} from '../lib/iso';
import {Box} from './primitives';
import {HEAD_PATH} from './MemoryCards';

// Isometric "memory cabinet" in the shape of a head profile: an extruded head with drawers on its front face.
export const HEAD_K = 0.017; // units per path pixel (path box ≈ 260 × 300 px → ≈ 4.4 × 5.1 units)
export const HEAD_DEPTH = 1.1;
export const DRAWER = {cols: 3, rows: 4, u0: 1.25, w0: 1.0, w: 0.82, h: 0.62, gap: 0.08} as const;

const CLOSED = HEAD_PATH + ' Z';

/** Front-face coordinates (u to the right, w down from the top) → room point on the front plane y = at[1]. */
export const headFacePoint = (at: P3, u: number, w: number): P3 => [at[0] + u, at[1], at[2] + 5.2 - w];

export const drawerCell = (k: number) => {
  const c = k % DRAWER.cols;
  const r = Math.floor(k / DRAWER.cols);
  return {u: DRAWER.u0 + c * (DRAWER.w + DRAWER.gap), w: DRAWER.w0 + r * (DRAWER.h + DRAWER.gap)};
};

/** at = left-bottom-front corner of the face box; open[k] 0..1 slides drawer k out; lit[k] marks it with the accent. */
export const HeadCabinet: React.FC<{s: number; at: P3; open: number[]; lit: number[]}> = ({s, at, open, lit}) => {
  const top: P3 = [at[0], at[1], at[2] + 5.2];
  const front = planeMatrix(s, 'wallX', top);
  // back copy shifted by the depth along −y (screen offset)
  const dx = COS30 * HEAD_DEPTH * s;
  const dy = -SIN30 * HEAD_DEPTH * s;
  const drawers = Array.from({length: DRAWER.cols * DRAWER.rows}, (_, k) => k);
  return (
    <g>
      {/* pedestal (shoulders) */}
      <Box s={s} at={[at[0] + 0.8, at[1] - HEAD_DEPTH - 0.1, at[2]]} size={[3.6, HEAD_DEPTH + 0.3, 0.5]} />
      {/* back face and side extrusion */}
      <g transform={`translate(${dx} ${dy})`}>
        <g transform={front}>
          <path d={CLOSED} transform={`scale(${HEAD_K})`} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>
      </g>
      {/* connecting edges at the silhouette extremes (crown, nose, chin, back of the head) */}
      {[[160, 10], [20, 150], [255, 130], [45, 170], [120, 290], [210, 290]].map(([px, py], i) => {
        const [x1, y1] = iso(s)(headFacePoint(at, px * HEAD_K, py * HEAD_K));
        return <line key={i} x1={x1} y1={y1} x2={x1 + dx} y2={y1 + dy} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinecap="round" />;
      })}
      {/* front face */}
      <g transform={front}>
        <path d={CLOSED} transform={`scale(${HEAD_K})`} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {/* ear and seam details */}
        <path d="M3.4,2.6 q0.35,0.05 0.35,0.5 q0,0.45 -0.35,0.5" fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
        <rect x={DRAWER.u0 - 0.12} y={DRAWER.w0 - 0.12} width={DRAWER.cols * (DRAWER.w + DRAWER.gap) + 0.16} height={DRAWER.rows * (DRAWER.h + DRAWER.gap) + 0.16} rx={0.08} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
      </g>
      {/* drawers: real boxes that slide out of the face */}
      {drawers.map((k) => {
        const {u, w} = drawerCell(k);
        const slide = 0.05 + (open[k] ?? 0) * 0.55;
        const [x, , z] = headFacePoint(at, u, w + DRAWER.h);
        return (
          <g key={k}>
            <Box s={s} at={[x, at[1], z]} size={[DRAWER.w, slide, DRAWER.h]} stroke={STROKE.secondary} left={(lit[k] ?? 0) > 0.5 ? COLORS.accentSoft : COLORS.fillLight} right={COLORS.fillMid} top={COLORS.fillLight} detail="none" />
            <g transform={planeMatrix(s, 'wallX', [x, at[1] + slide, z + DRAWER.h])}>
              <rect x={DRAWER.w / 2 - 0.16} y={DRAWER.h / 2 - 0.05} width={0.32} height={0.1} rx={0.05} fill={(lit[k] ?? 0) > 0.5 ? COLORS.accent : COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
              <rect x={0.1} y={0.08} width={0.22} height={0.12} fill={COLORS.fillLight} stroke={COLORS.inkSoft} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        );
      })}
    </g>
  );
};
