import React from 'react';
import {COLORS, STROKE} from '../theme/tokens';
import {COS30, iso, P3, planeMatrix, SIN30} from '../lib/iso';
import {Box} from './primitives';

// Isometric "memory cabinet" in the shape of a head profile (facing left): an extruded head with drawers in the
// back of the head (where memory "lives"), standing on a plinth. Path units: px, box ≈ 260 × 300.
export const HEAD_PROFILE =
  'M150,300 L150,252 C212,238 254,192 258,130 C262,58 208,8 140,8 C88,8 50,38 43,84 L41,104 C40,116 31,128 22,141 ' +
  'Q17,150 24,154 Q30,158 38,158 L40,168 Q33,172 37,177 Q33,182 39,186 L41,194 Q42,208 57,212 C72,216 86,214 96,220 L96,300 Z';
export const HEAD_K = 0.017; // units per path px (≈ 4.4 × 5.1 units)
export const HEAD_H = 300 * HEAD_K;
export const HEAD_DEPTH = 1.1;
export const PLINTH_H = 0.4;
export const DRAWER = {cols: 3, rows: 3, u0: 1.38, w0: 0.92, w: 0.76, h: 0.62, gap: 0.08} as const;

/** Front-face coordinates (u to the right, w down from the top) → point on the front plane y = at[1]. */
export const headFacePoint = (at: P3, u: number, w: number): P3 => [at[0] + u, at[1], at[2] + HEAD_H - w];

export const drawerCell = (k: number) => {
  const c = k % DRAWER.cols;
  const r = Math.floor(k / DRAWER.cols);
  return {u: DRAWER.u0 + c * (DRAWER.w + DRAWER.gap), w: DRAWER.w0 + r * (DRAWER.h + DRAWER.gap)};
};

export const drawerSlide = (open: number) => 0.05 + open * 0.6;

const ns = {vectorEffect: 'non-scaling-stroke' as const};

/** One impression card lying flat (floor plane), local size 0.62 × 0.42, origin at the card centre. */
export const ImpressionCard: React.FC<{lit?: boolean}> = ({lit = true}) => (
  <g>
    <rect x={-0.31} y={-0.21} width={0.62} height={0.42} rx={0.04} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
    <rect x={-0.25} y={-0.15} width={0.22} height={0.16} rx={0.02} fill={lit ? COLORS.accent : COLORS.fillDark} />
    <line x1={0.02} y1={-0.1} x2={0.24} y2={-0.1} stroke={COLORS.inkSoft} strokeWidth={1.2} {...ns} />
    <line x1={0.02} y1={-0.02} x2={0.18} y2={-0.02} stroke={COLORS.inkSoft} strokeWidth={1.2} {...ns} />
    <line x1={-0.25} y1={0.1} x2={0.22} y2={0.1} stroke={COLORS.inkSoft} strokeWidth={1.2} {...ns} />
  </g>
);

/**
 * at = left-bottom-front corner of the head (on top of the plinth). open[k] 0..1 slides drawer k out;
 * holding[k] = a card lies in drawer k (visible while the drawer is open); lit[k] marks a filled drawer with the accent.
 */
export const HeadCabinet: React.FC<{s: number; at: P3; open: number[]; lit: number[]; holding?: number[]; t?: number}> = ({s, at, open, lit, holding = [], t = 0}) => {
  const top: P3 = [at[0], at[1], at[2] + HEAD_H];
  const front = planeMatrix(s, 'wallX', top);
  const dx = COS30 * HEAD_DEPTH * s;
  const dy = -SIN30 * HEAD_DEPTH * s;
  const drawers = Array.from({length: DRAWER.cols * DRAWER.rows}, (_, k) => k);
  return (
    <g>
      {/* plinth under the neck */}
      <Box s={s} at={[at[0] + 1.2, at[1] - HEAD_DEPTH - 0.25, at[2] - PLINTH_H]} size={[1.8, HEAD_DEPTH + 0.5, PLINTH_H]} />
      {/* back face, shifted by the depth */}
      <g transform={`translate(${dx} ${dy})`}>
        <g transform={front}>
          <path d={HEAD_PROFILE} transform={`scale(${HEAD_K})`} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} strokeLinejoin="round" />
        </g>
      </g>
      {/* side band: connecting edges where the silhouette turns (crown, back of the head, neck) */}
      {[[118, 9], [205, 26], [250, 92], [257, 150], [228, 214], [150, 300], [150, 252]].map(([px, py], i) => {
        const [x1, y1] = iso(s)(headFacePoint(at, px * HEAD_K, py * HEAD_K));
        return <line key={i} x1={x1} y1={y1} x2={x1 + dx} y2={y1 + dy} stroke={COLORS.ink} strokeWidth={i % 2 ? STROKE.secondary : STROKE.main} strokeLinecap="round" />;
      })}
      {/* front face: profile with eye, brow, nostril, lips line, ear, jaw */}
      <g transform={front}>
        <path d={HEAD_PROFILE} transform={`scale(${HEAD_K})`} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} strokeLinejoin="round" />
        <g transform={`scale(${HEAD_K})`} fill="none" stroke={COLORS.ink} strokeLinecap="round" {...ns}>
          {/* eye blinks every ~4 s (living detail) */}
          <path d={`M52,${114 - (Math.sin(t * 1.6) > 0.985 ? 0 : 3)} q8,-4 15,1`} strokeWidth={STROKE.secondary} />
          <path d="M48,100 q10,-6 22,-2" strokeWidth={STROKE.micro} />
          <path d="M30,150 q4,2 8,0" strokeWidth={STROKE.micro} />
          <path d="M60,212 q30,-6 40,-30" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} />
          {/* ear */}
          <path d="M174,190 q16,-6 20,8 q4,18 -12,23 q-6,2 -8,-4" strokeWidth={STROKE.secondary} />
          <path d="M180,197 q8,-2 9,8" strokeWidth={STROKE.micro} />
        </g>
        {/* drawer panel in the back of the head */}
        <rect x={DRAWER.u0 - 0.12} y={DRAWER.w0 - 0.12} width={DRAWER.cols * (DRAWER.w + DRAWER.gap) + 0.16} height={DRAWER.rows * (DRAWER.h + DRAWER.gap) + 0.16} rx={0.08} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
      </g>
      {/* drawers: real boxes that slide out of the face; a landed card lies inside while the drawer is open */}
      {drawers.map((k) => {
        const {u, w} = drawerCell(k);
        const slide = drawerSlide(open[k] ?? 0);
        const [x, , z] = headFacePoint(at, u, w + DRAWER.h);
        const isLit = (lit[k] ?? 0) > 0.5;
        const card = (holding[k] ?? 0) > 0 && slide > 0.2;
        return (
          <g key={k}>
            <Box s={s} at={[x, at[1], z]} size={[DRAWER.w, slide, DRAWER.h]} stroke={STROKE.secondary} left={isLit ? COLORS.accentSoft : COLORS.fillLight} right={COLORS.fillMid} top={COLORS.fillLight} detail="none" />
            {card ? (
              // the card lies on top of the open drawer and slides in with it (its depth shrinks with the drawer)
              <g transform={planeMatrix(s, 'floor', [x + DRAWER.w / 2, at[1] + slide / 2, z + DRAWER.h + 0.01])}>
                <g transform={`scale(1 ${Math.min(1, (slide - 0.1) / 0.5)})`}>
                  <ImpressionCard />
                </g>
              </g>
            ) : null}
            <g transform={planeMatrix(s, 'wallX', [x, at[1] + slide, z + DRAWER.h])}>
              <rect x={DRAWER.w / 2 - 0.16} y={DRAWER.h / 2 - 0.05} width={0.32} height={0.1} rx={0.05} fill={isLit ? COLORS.accent : COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
              <rect x={0.1} y={0.08} width={0.22} height={0.12} fill={COLORS.fillLight} stroke={COLORS.inkSoft} strokeWidth={1} {...ns} />
            </g>
          </g>
        );
      })}
    </g>
  );
};
