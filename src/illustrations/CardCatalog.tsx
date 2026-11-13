import React from 'react';
import {COLORS, STROKE} from '../theme/tokens';
import {P3, planeMatrix} from '../lib/iso';
import {Box, Line3} from './primitives';

// Library card catalogue (scene 8, memory archive): a tall cabinet on legs with a cornice and a grid of small
// drawers. New impressions arrive as cards and fill the drawers bottom-up. Front face is the plane y = at[1].
export const DRAWER = {cols: 3, rows: 4, u0: 0.2, w: 0.82, h: 0.6, gap: 0.1, top: 0.24} as const;
export const CATALOG = {
  W: 2 * DRAWER.u0 + DRAWER.cols * DRAWER.w + (DRAWER.cols - 1) * DRAWER.gap,
  D: 1.3,
  legs: 0.75,
  H: DRAWER.top + DRAWER.rows * DRAWER.h + (DRAWER.rows - 1) * DRAWER.gap + 0.42,
} as const;
export const CATALOG_TOP = CATALOG.legs + CATALOG.H;

/** Drawer k (0 = top-left) → left edge u and top z of its front. */
export const drawerCell = (k: number) => {
  const c = k % DRAWER.cols;
  const r = Math.floor(k / DRAWER.cols);
  return {u: DRAWER.u0 + c * (DRAWER.w + DRAWER.gap), zTop: CATALOG_TOP - DRAWER.top - r * (DRAWER.h + DRAWER.gap)};
};
export const drawerSlide = (open: number) => 0.04 + open * 0.62;

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

/** at = left-front-floor corner. open[k] slides drawer k out; holding[k] = a card lies in it; lit[k] = filled (accent). */
export const CardCatalog: React.FC<{s: number; at: P3; open: number[]; lit: number[]; holding?: number[]}> = ({s, at, open, lit, holding = []}) => {
  const [x0, y0, z0] = at;
  const {W, D, legs, H} = CATALOG;
  const yb = y0 - D; // back
  const bodyZ = z0 + legs;
  const n = DRAWER.cols * DRAWER.rows;
  return (
    <g>
      {/* legs with a lower stretcher */}
      {[[x0 + 0.08, yb + 0.08], [x0 + W - 0.26, yb + 0.08], [x0 + 0.08, y0 - 0.26], [x0 + W - 0.26, y0 - 0.26]].map(([lx, ly], i) => (
        <Box key={i} s={s} at={[lx, ly, z0]} size={[0.18, 0.18, legs]} stroke={STROKE.secondary} detail="none" />
      ))}
      <Line3 s={s} width={STROKE.secondary} points={[[x0 + 0.17, y0 - 0.17, z0 + 0.22], [x0 + W - 0.17, y0 - 0.17, z0 + 0.22]]} />
      {/* body with a base band and a cornice */}
      <Box s={s} at={[x0 - 0.04, yb - 0.04, bodyZ]} size={[W + 0.08, D + 0.08, 0.2]} stroke={STROKE.secondary} detail="none" />
      <Box s={s} at={[x0, yb, bodyZ + 0.2]} size={[W, D, H - 0.2]} top={COLORS.fillLight} left={COLORS.fillMid} right={COLORS.fillDark} />
      <Box s={s} at={[x0 - 0.12, yb - 0.12, bodyZ + H]} size={[W + 0.24, D + 0.24, 0.12]} stroke={STROKE.secondary} detail="none" />
      <Box s={s} at={[x0 - 0.06, yb - 0.06, bodyZ + H + 0.12]} size={[W + 0.12, D + 0.12, 0.1]} stroke={STROKE.secondary} detail="none" />
      {/* side panel inlay */}
      <g transform={planeMatrix(s, 'wallY', [x0 + W, yb + 0.15, bodyZ + H - 0.2])}>
        <rect x={0} y={0} width={D - 0.3} height={H - 0.6} rx={0.04} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
      </g>
      {/* on top: a small box of blank cards */}
      <Box s={s} at={[x0 + 0.3, yb + 0.35, bodyZ + H + 0.22]} size={[0.7, 0.5, 0.28]} stroke={STROKE.secondary} />
      {[0, 1, 2].map((i) => (
        <Line3 key={i} s={s} width={STROKE.micro} color={COLORS.inkSoft} points={[[x0 + 0.38 + i * 0.05, yb + 0.42, bodyZ + H + 0.5 + i * 0.03], [x0 + 0.38 + i * 0.05, yb + 0.78, bodyZ + H + 0.5 + i * 0.03]]} />
      ))}
      {/* drawers */}
      {Array.from({length: n}, (_, k) => {
        const {u, zTop} = drawerCell(k);
        const x = x0 + u;
        const z = z0 + zTop - DRAWER.h;
        const slide = drawerSlide(open[k] ?? 0);
        const isLit = (lit[k] ?? 0) > 0.5;
        const card = (holding[k] ?? 0) > 0 && slide > 0.2;
        return (
          <g key={k}>
            <Box s={s} at={[x, y0, z]} size={[DRAWER.w, slide, DRAWER.h]} stroke={STROKE.secondary} left={COLORS.fillLight} right={COLORS.fillMid} top={COLORS.fillLight} detail="none" />
            {card ? (
              <g transform={planeMatrix(s, 'floor', [x + DRAWER.w / 2, y0 + slide / 2, z + DRAWER.h + 0.01])}>
                <g transform={`scale(1 ${Math.min(1, (slide - 0.1) / 0.5)})`}>
                  <ImpressionCard />
                </g>
              </g>
            ) : null}
            {/* front: label holder frame + cup pull */}
            <g transform={planeMatrix(s, 'wallX', [x, y0 + slide, z + DRAWER.h])}>
              <rect x={DRAWER.w / 2 - 0.18} y={0.1} width={0.36} height={0.16} rx={0.02} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
              <line x1={DRAWER.w / 2 - 0.12} y1={0.18} x2={DRAWER.w / 2 + 0.1} y2={0.18} stroke={COLORS.inkSoft} strokeWidth={1} {...ns} />
              <path d={`M${DRAWER.w / 2 - 0.14},0.36 q0.14,0.14 0.28,0`} fill={isLit ? COLORS.accent : COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
            </g>
          </g>
        );
      })}
    </g>
  );
};
