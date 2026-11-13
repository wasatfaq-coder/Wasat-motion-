import React from 'react';
import {interpolateColors, random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {iso, P3, planeMatrix, pts} from '../lib/iso';
import {Box, Line3} from './primitives';

// Room in isometric units. Back corner floor = (0,0,0).
export const ROOM = {W: 10, D: 10, H: 7} as const;
export const DESK = {x: 3.4, y: 0.5, w: 5.2, d: 2.1, h: 2.4} as const;
export const TRAY = {x: 6.2, y: 0.65, w: 1.8, d: 1.4, h: 0.45} as const;
export const CLOCK = {u: 7.0, z: 5.0, r: 0.85} as const;
export const CAL = {u: 3.9, z: 5.9, w: 1.5, h: 2.1} as const;

const ns = {vectorEffect: 'non-scaling-stroke' as const};

/** Walls, floor, window with blinds, bookshelf, rug. */
export const RoomShell: React.FC<{s: number; t: number}> = React.memo(({s, t}) => {
  const {W, D, H} = ROOM;
  const blinds = Array.from({length: 9}, (_, i) => i);
  return (
    <g>
      {/* walls */}
      <polygon points={pts(s, [[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])} fill={COLORS.wallRight} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]])} fill={COLORS.wallLeft} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill={COLORS.floor} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      {/* skirting */}
      <Line3 s={s} points={[[0, D, 0.25], [0, 0, 0.25], [W, 0, 0.25]]} width={STROKE.micro} color={COLORS.inkSoft} />
      {/* floor boards */}
      {Array.from({length: 7}, (_, i) => (
        <Line3 key={i} s={s} points={[[0, 1.4 * (i + 1), 0], [W, 1.4 * (i + 1), 0]]} width={STROKE.micro} color={COLORS.inkSoft} />
      ))}
      {/* window with blinds on the left wall (plane x = 0) */}
      <g transform={planeMatrix(s, 'wallY', [0, 1.6, 5.8])}>
        <rect x={0} y={0} width={3.2} height={3.4} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
        <line x1={1.6} y1={0} x2={1.6} y2={3.4} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
        {blinds.map((i) => {
          // blinds sway very slightly (period 8 s), phase per slat
          const sway = 0.02 * Math.sin((t / 8) * Math.PI * 2 + random(`bl${i}`) * 6.28);
          return (
            <line key={i} x1={0.08} x2={3.12} y1={0.3 + i * 0.32 + sway} y2={0.3 + i * 0.32 + sway} stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
          );
        })}
        <rect x={-0.15} y={3.4} width={3.5} height={0.18} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
      </g>
      {/* framed line drawing on the back wall */}
      <g transform={planeMatrix(s, 'wallX', [1.0, 0, 5.7])}>
        <rect x={0} y={0} width={1.9} height={1.4} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
        <rect x={0.15} y={0.15} width={1.6} height={1.1} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
        <polyline points="0.25,1.1 0.7,0.55 1.0,0.85 1.3,0.45 1.65,1.1" fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round" {...ns} />
        <circle cx={1.4} cy={0.4} r={0.12} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
      </g>
      {/* power outlet */}
      <g transform={planeMatrix(s, 'wallX', [2.2, 0, 1.1])}>
        <rect x={0} y={0} width={0.35} height={0.45} rx={0.05} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
        <circle cx={0.12} cy={0.22} r={0.03} fill={COLORS.ink} />
        <circle cx={0.23} cy={0.22} r={0.03} fill={COLORS.ink} />
      </g>
      {/* blinds cord */}
      <g transform={planeMatrix(s, 'wallY', [0, 1.6, 5.8])}>
        <line x1={2.95} y1={0.1} x2={2.95} y2={2.3} stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
        <circle cx={2.95} cy={2.38} r={0.07} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
      </g>
      {/* bookshelf against the left wall */}
      <Bookshelf s={s} />
      {/* rug */}
      <g transform={planeMatrix(s, 'floor', [3.2, 4.0, 0])}>
        <rect x={0} y={0} width={5.4} height={4.2} rx={0.15} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
        <rect x={0.3} y={0.3} width={4.8} height={3.6} rx={0.1} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} strokeDasharray="6 6" {...ns} />
      </g>
    </g>
  );
});

const Bookshelf: React.FC<{s: number}> = ({s}) => {
  const x0 = 0;
  const y0 = 6.0;
  const depth = 1.1;
  const width = 2.8;
  const height = 5.0;
  const shelves = [0.2, 1.4, 2.6, 3.8];
  const books: React.ReactNode[] = [];
  shelves.forEach((z, si) => {
    let y = y0 + 0.15;
    let k = 0;
    while (y < y0 + width - 0.4) {
      const bw = 0.22 + random(`bw${si}-${k}`) * 0.18;
      const bh = 0.75 + random(`bh${si}-${k}`) * 0.3;
      const tilt = si === 2 && k === 5;
      if (!tilt) {
        const fx = x0 + 0.15 + depth - 0.3;
        books.push(
          <g key={`b${si}-${k}`}>
            <Box s={s} at={[x0 + 0.15, y, z + 0.08]} size={[depth - 0.3, bw, bh]} stroke={STROKE.micro} top={COLORS.fillLight} left={k % 4 === 1 ? COLORS.fillDark : COLORS.fillLight} right={k % 5 === 2 ? COLORS.fillDark : COLORS.fillMid} />
            <Line3 s={s} points={[[fx, y, z + 0.08 + bh - 0.15], [fx, y + bw, z + 0.08 + bh - 0.15]]} width={STROKE.micro} />
            <Line3 s={s} points={[[fx, y, z + 0.25], [fx, y + bw, z + 0.25]]} width={STROKE.micro} />
          </g>,
        );
      }
      y += bw + 0.03;
      k++;
    }
  });
  return (
    <g>
      {/* back panel and sides */}
      <Box s={s} at={[x0, y0, 0]} size={[depth, 0.12, height]} />
      {books}
      {shelves.map((z, i) => (
        <Box key={i} s={s} at={[x0, y0, z]} size={[depth, width, 0.08]} stroke={STROKE.secondary} />
      ))}
      <Box s={s} at={[x0, y0 + width - 0.12, 0]} size={[depth, 0.12, height]} />
      <Box s={s} at={[x0, y0, height]} size={[depth, width, 0.1]} />
      {/* vase and a small box on top */}
      <Box s={s} at={[x0 + 0.3, y0 + 0.4, height + 0.1]} size={[0.45, 0.45, 0.7]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x0 + 0.52, y0 + 0.62, height + 0.8], [x0 + 0.45, y0 + 0.5, height + 1.4]]} width={STROKE.micro} />
      <Line3 s={s} points={[[x0 + 0.52, y0 + 0.62, height + 0.8], [x0 + 0.6, y0 + 0.8, height + 1.3]]} width={STROKE.micro} />
      <Box s={s} at={[x0 + 0.25, y0 + 1.5, height + 0.1]} size={[0.7, 0.9, 0.35]} stroke={STROKE.secondary} />
    </g>
  );
};

/** Wall clock on the back-right wall (plane y = 0). Hands turn at a steady rate. */
export const WallClock: React.FC<{s: number; t: number; accent?: number}> = ({s, t, accent = 0}) => {
  const {u, z, r} = CLOCK;
  const sec = (t / 6) * 360; // one turn per 6 s: steady, readable
  const min = 40 + (t / 60) * 360;
  return (
    <g transform={planeMatrix(s, 'wallX', [u, 0, z])}>
      <circle cx={0} cy={0} r={r + 0.08} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
      <circle cx={0} cy={0} r={r - 0.06} fill={COLORS.fillLight} stroke={accent > 0 ? COLORS.accent : COLORS.ink} strokeWidth={STROKE.secondary + accent * 2} {...ns} />
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = i % 3 === 0 ? r - 0.28 : r - 0.18;
        return <line key={i} x1={Math.sin(a) * r1} y1={-Math.cos(a) * r1} x2={Math.sin(a) * (r - 0.1)} y2={-Math.cos(a) * (r - 0.1)} stroke={COLORS.ink} strokeWidth={i % 3 === 0 ? STROKE.secondary : STROKE.micro} {...ns} />;
      })}
      <line x1={0} y1={0} x2={Math.sin((min * Math.PI) / 180) * (r * 0.55)} y2={-Math.cos((min * Math.PI) / 180) * (r * 0.55)} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinecap="round" {...ns} />
      <line x1={0} y1={0} x2={Math.sin((sec * Math.PI) / 180) * (r * 0.78)} y2={-Math.cos((sec * Math.PI) / 180) * (r * 0.78)} stroke={COLORS.accent} strokeWidth={STROKE.secondary} strokeLinecap="round" {...ns} />
      <circle cx={0} cy={0} r={0.06} fill={COLORS.ink} />
    </g>
  );
};

/** Calendar page artwork in local units (w × h), month grid without numbers. */
export const CalendarPage: React.FC<{w: number; h: number; stroke?: string; accent?: number}> = ({w, h, stroke = COLORS.ink, accent = 1}) => (
  <g>
    <rect x={0} y={0} width={w} height={h} fill={COLORS.fillLight} stroke={stroke} strokeWidth={STROKE.secondary} {...ns} />
    <rect x={0.12} y={0.14} width={w * 0.45} height={0.16} fill={interpolateColors(accent, [0, 1], [COLORS.ink, COLORS.accent])} />
    <rect x={w - 0.45} y={0.12} width={0.3} height={0.2} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
    {Array.from({length: 5}, (_, r) =>
      Array.from({length: 5}, (_, c) => (
        <rect key={`${r}-${c}`} x={0.12 + c * ((w - 0.24) / 5)} y={0.45 + r * ((h - 0.6) / 5)} width={(w - 0.24) / 5 - 0.05} height={(h - 0.6) / 5 - 0.05} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
      )),
    )}
  </g>
);

/** Tear-off calendar on the back wall. */
export const Calendar: React.FC<{s: number; flutter: number}> = ({s, flutter}) => {
  const {u, z, w, h} = CAL;
  return (
    <g transform={planeMatrix(s, 'wallX', [u, 0, z])}>
      <rect x={-0.08} y={-0.1} width={w + 0.16} height={h + 0.2} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
      <rect x={0} y={0} width={w} height={0.4} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
      <g transform={`translate(0.05 0.45) skewX(${flutter * 6})`}>
        <CalendarPage w={w - 0.1} h={h - 0.5} />
      </g>
      {[0.35, w - 0.35].map((x) => (
        <circle key={x} cx={x} cy={0.2} r={0.07} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
      ))}
    </g>
  );
};

/** Desk with legs, lamp, cup and notebook. */
export const Desk: React.FC<{s: number; t: number}> = React.memo(({s, t}) => {
  const {x, y, w, d, h} = DESK;
  const leg = 0.18;
  return (
    <g>
      {[[x + 0.1, y + 0.1], [x + w - 0.3, y + 0.1], [x + 0.1, y + d - 0.3], [x + w - 0.3, y + d - 0.3]].map(([lx, ly], i) => (
        <Box key={i} s={s} at={[lx, ly, 0]} size={[leg, leg, h - 0.15]} stroke={STROKE.secondary} />
      ))}
      <Box s={s} at={[x + w - 1.7, y + 0.1, 0.2]} size={[1.5, d - 0.3, 1.6]} />
      {/* drawer handles */}
      <Line3 s={s} points={[[x + w - 0.2, y + 0.7, 1.3], [x + w - 0.2, y + 1.3, 1.3]]} width={STROKE.secondary} />
      <Line3 s={s} points={[[x + w - 0.2, y + 0.7, 0.7], [x + w - 0.2, y + 1.3, 0.7]]} width={STROKE.secondary} />
      {/* lamp cable: drawn before the desk top so the top hides it (no lines showing through) */}
      <Line3 s={s} points={[[x + 0.3, y + 0.25, h - 0.15], [x + 0.15, y + 0.1, 1.2], [x + 0.2, 0.02, 0.6], [2.4, 0.02, 0.88]]} width={STROKE.micro} color={COLORS.inkSoft} />
      <Box s={s} at={[x, y, h - 0.15]} size={[w, d, 0.15]} />
      {/* lamp */}
      <DeskLamp s={s} base={[x + 0.7, y + 0.6, h]} />
      {/* layout on the desk (no overlaps): lamp back-left · cup front-left · notebook · papers · memory tray · pen cup front-right */}
      {/* coffee cup on a saucer, with a handle and steam */}
      <g transform={planeMatrix(s, 'floor', [x + 0.4, y + 1.65, h + 0.005])}>
        <ellipse cx={0} cy={0} rx={0.3} ry={0.3} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
      </g>
      <Box s={s} at={[x + 0.25, y + 1.5, h + 0.02]} size={[0.3, 0.3, 0.36]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x + 0.55, y + 1.6, h + 0.3], [x + 0.68, y + 1.62, h + 0.27], [x + 0.68, y + 1.68, h + 0.12], [x + 0.55, y + 1.7, h + 0.1]]} width={STROKE.secondary} />
      <Line3 s={s} points={[[x + 0.4, y + 1.65, h + 0.5], [x + 0.4 + 0.05 * Math.sin(t * 2), y + 1.65, h + 0.75], [x + 0.4, y + 1.65, h + 1.0]]} width={STROKE.micro} color={COLORS.inkSoft} />
      {/* notebook: cover, spiral, a pen lying on it */}
      <Box s={s} at={[x + 0.95, y + 1.1, h]} size={[1.25, 0.9, 0.09]} stroke={STROKE.secondary} top={COLORS.fillLight} />
      {Array.from({length: 7}, (_, i) => (
        <Line3 key={i} s={s} points={[[x + 1.0, y + 1.17 + i * 0.12, h + 0.09], [x + 1.08, y + 1.17 + i * 0.12, h + 0.14]]} width={STROKE.micro} />
      ))}
      <Line3 s={s} points={[[x + 1.25, y + 1.3, h + 0.095], [x + 2.0, y + 1.3, h + 0.095]]} width={STROKE.micro} color={COLORS.inkSoft} />
      <Line3 s={s} points={[[x + 1.25, y + 1.5, h + 0.095], [x + 1.85, y + 1.5, h + 0.095]]} width={STROKE.micro} color={COLORS.inkSoft} />
      <Box s={s} at={[x + 1.3, y + 1.72, h + 0.1]} size={[0.75, 0.06, 0.05]} stroke={STROKE.micro} top={COLORS.fillDark} />
      {/* stack of papers with a binder clip */}
      <Box s={s} at={[x + 2.35, y + 1.25, h]} size={[0.7, 0.55, 0.04]} stroke={STROKE.micro} />
      <Box s={s} at={[x + 2.38, y + 1.22, h + 0.04]} size={[0.7, 0.55, 0.04]} stroke={STROKE.micro} />
      <Box s={s} at={[x + 2.4, y + 1.2, h + 0.08]} size={[0.7, 0.55, 0.04]} stroke={STROKE.micro} />
      <Box s={s} at={[x + 2.6, y + 1.18, h + 0.12]} size={[0.25, 0.08, 0.06]} stroke={STROKE.micro} top={COLORS.ink} />
      {/* pen cup with pencils, front-right corner */}
      <Box s={s} at={[x + 4.7, y + 1.55, h]} size={[0.32, 0.32, 0.45]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x + 4.8, y + 1.67, h + 0.45], [x + 4.72, y + 1.6, h + 0.95]]} width={STROKE.secondary} />
      <Line3 s={s} points={[[x + 4.9, y + 1.7, h + 0.45], [x + 5.02, y + 1.66, h + 0.9]]} width={STROKE.secondary} />
      <Line3 s={s} points={[[x + 4.85, y + 1.75, h + 0.45], [x + 4.88, y + 1.85, h + 1.0]]} width={STROKE.secondary} />
    </g>
  );
});

export type CardSpec = {novel: boolean};

/** Open tray (card file) on the desk with a pile of memory cards lying flat. */
export const CardTray: React.FC<{
  s: number;
  cards: CardSpec[];
  thickness?: number;
  dashedExtra?: number; // dashed outline of a taller possible pile, in units
  squash?: number; // 1 = normal, <1 compresses the pile height
  highlight?: number;
}> = ({s, cards, thickness = 0.09, dashedExtra = 0, squash = 1, highlight = 0}) => {
  const {x, y, w, d, h} = TRAY;
  const z0 = DESK.h;
  const wall = 0.06;
  const cardW = w - 0.3;
  const cardD = d - 0.3;
  const pileTop = z0 + 0.06 + cards.length * thickness * squash;
  return (
    <g>
      {/* soft hatch shadow on the desk (light from the upper left → shadow to the lower right) */}
      <g transform={planeMatrix(s, 'floor', [x + 0.15, y + 0.2, z0 + 0.003])}>
        {Array.from({length: 9}, (_, i) => (
          <line key={i} x1={w + 0.02} y1={0.1 + i * 0.16} x2={w + 0.18} y2={-0.02 + i * 0.16} stroke={COLORS.inkSoft} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {/* back walls */}
      <Box s={s} at={[x, y, z0]} size={[w, wall, h]} stroke={STROKE.secondary} />
      <Box s={s} at={[x, y, z0]} size={[wall, d, h]} stroke={STROKE.secondary} />
      <Box s={s} at={[x, y, z0]} size={[w, d, 0.05]} stroke={STROKE.secondary} top={COLORS.fillMid} />
      {cards.map((c, i) => {
        const jx = (random(`cx${i}`) - 0.5) * 0.12;
        const jy = (random(`cy${i}`) - 0.5) * 0.1;
        const cz = z0 + 0.06 + i * thickness * squash;
        return (
          <g key={i}>
            <Box s={s} at={[x + 0.15 + jx, y + 0.15 + jy, cz]} size={[cardW, cardD, thickness * squash * 0.7]} stroke={STROKE.micro} top={COLORS.fillLight} left={COLORS.fillLight} right={COLORS.fillMid} />
            {c.novel ? (
              <polygon points={pts(s, [[x + 0.3 + jx, y + 0.3 + jy, cz + thickness * squash * 0.7], [x + 0.75 + jx, y + 0.3 + jy, cz + thickness * squash * 0.7], [x + 0.75 + jx, y + 0.5 + jy, cz + thickness * squash * 0.7], [x + 0.3 + jx, y + 0.5 + jy, cz + thickness * squash * 0.7]])} fill={COLORS.accent} />
            ) : null}
          </g>
        );
      })}
      {/* front walls */}
      <polygon points={pts(s, [[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z0 + h], [x, y + d, z0 + h]])} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z0 + h], [x + w, y, z0 + h]])} fill={COLORS.fillDark} stroke={highlight > 0 ? COLORS.accent : COLORS.ink} strokeWidth={STROKE.main + highlight * 1.5} strokeLinejoin="round" />
      {/* label: a head profile = "memory", drawn on the front wall of the tray (plane y = y + d) */}
      <g transform={planeMatrix(s, 'wallX', [x + 0.35, y + d, z0 + h - 0.04])}>
        <rect x={0} y={0} width={1.1} height={0.38} rx={0.06} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
        <path d="M0.42,0.33 L0.42,0.27 C0.33,0.26 0.3,0.2 0.32,0.16 L0.29,0.13 L0.33,0.11 C0.33,0.05 0.39,0.03 0.46,0.03 C0.56,0.03 0.62,0.1 0.6,0.19 C0.59,0.23 0.56,0.26 0.55,0.33" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} strokeLinejoin="round" {...ns} />
        <circle cx={0.48} cy={0.13} r={0.035} fill={COLORS.accent} />
        <line x1={0.68} y1={0.13} x2={0.98} y2={0.13} stroke={COLORS.fillLight} strokeWidth={STROKE.micro} {...ns} />
        <line x1={0.68} y1={0.23} x2={0.9} y2={0.23} stroke={COLORS.fillLight} strokeWidth={STROKE.micro} {...ns} />
      </g>
      {dashedExtra > 0
        ? // "possible" extra cards: dashed coral outlines rising above the real pile
          [0.45, 0.9, 1.35].filter((dz) => dz <= dashedExtra + 0.01).map((dz, i) => (
            <Line3
              key={i}
              s={s}
              close
              dash="10 8"
              color={COLORS.accent}
              width={STROKE.secondary}
              points={[[x + 0.15, y + 0.15, pileTop + dz], [x + 0.15 + cardW, y + 0.15, pileTop + dz], [x + 0.15 + cardW, y + 0.15 + cardD, pileTop + dz], [x + 0.15, y + 0.15 + cardD, pileTop + dz]]}
            />
          ))
        : null}
    </g>
  );
};

/** Desk lamp: round base, two-segment arm with joints, cone shade pointing at the desk. */
const DeskLamp: React.FC<{s: number; base: P3}> = ({s, base}) => {
  const [bx, by, bz] = base;
  const elbow: P3 = [bx - 0.15, by, bz + 1.25];
  const head: P3 = [bx + 0.55, by + 0.25, bz + 1.85];
  const aim: P3 = [bx + 1.0, by + 0.45, bz + 1.25];
  const [hx, hy] = iso(s)(head);
  const [ax, ay] = iso(s)(aim);
  const dx = ax - hx;
  const dy = ay - hy;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const r0 = 0.12 * s;
  const r1 = 0.42 * s;
  const shade = `M${hx + nx * r0},${hy + ny * r0} L${ax + nx * r1},${ay + ny * r1} L${ax - nx * r1},${ay - ny * r1} L${hx - nx * r0},${hy - ny * r0} Z`;
  const [ex, ey] = iso(s)(elbow);
  return (
    <g>
      <g transform={planeMatrix(s, 'floor', [bx, by, bz])}>
        <ellipse cx={0} cy={0} rx={0.35} ry={0.35} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
      </g>
      <Line3 s={s} points={[[bx, by, bz + 0.02], elbow, head]} width={STROKE.main} />
      <circle cx={ex} cy={ey} r={0.07 * s} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
      <path d={shade} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <ellipse cx={ax} cy={ay} rx={r1} ry={r1 * 0.35} transform={`rotate(${(Math.atan2(ny, nx) * 180) / Math.PI} ${ax} ${ay})`} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
      <circle cx={hx} cy={hy} r={0.08 * s} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
    </g>
  );
};

/** Armchair in front of the desk. */
export const Armchair: React.FC<{s: number}> = React.memo(({s}) => (
  <g>
    <Box s={s} at={[5.0, 4.4, 0]} size={[1.9, 1.7, 1.1]} />
    <Box s={s} at={[5.0, 5.8, 1.1]} size={[1.9, 0.35, 1.5]} />
    <Box s={s} at={[4.75, 4.4, 0.3]} size={[0.28, 1.75, 1.4]} />
    <Box s={s} at={[6.88, 4.4, 0.3]} size={[0.28, 1.75, 1.4]} />
    {/* seat cushion seam and back stitching */}
    <Line3 s={s} points={[[5.05, 5.1, 1.1], [6.85, 5.1, 1.1]]} width={STROKE.micro} color={COLORS.inkSoft} />
    <Line3 s={s} points={[[5.3, 5.8, 1.4], [5.3, 5.8, 2.4]]} width={STROKE.micro} color={COLORS.inkSoft} />
    <Line3 s={s} points={[[6.6, 5.8, 1.4], [6.6, 5.8, 2.4]]} width={STROKE.micro} color={COLORS.inkSoft} />
  </g>
));

/** Potted plant in the right corner; leaves sway slowly. */
export const Plant: React.FC<{s: number; t: number}> = ({s, t}) => {
  const base: P3 = [9.0, 0.6, 0];
  const leaves = Array.from({length: 7}, (_, i) => i);
  const [bx, by] = iso(s)([9.4, 1.0, 1.1]);
  return (
    <g>
      <Box s={s} at={base} size={[0.8, 0.8, 1.1]} />
      <Box s={s} at={[8.95, 0.55, 0.95]} size={[0.9, 0.9, 0.18]} stroke={STROKE.secondary} />
      {leaves.map((i) => {
        const a = -70 + i * 23 + 4 * Math.sin((t / 5) * Math.PI * 2 + random(`lf${i}`) * 6.28);
        const len = 70 + random(`ll${i}`) * 40;
        const rad = (a * Math.PI) / 180;
        const ex = bx + Math.sin(rad) * len;
        const ey = by - Math.cos(rad) * len;
        const cx1 = bx + Math.sin(rad) * len * 0.5 - Math.cos(rad) * 18;
        const cy1 = by - Math.cos(rad) * len * 0.5 - Math.sin(rad) * 18;
        const cx2 = bx + Math.sin(rad) * len * 0.5 + Math.cos(rad) * 18;
        const cy2 = by - Math.cos(rad) * len * 0.5 + Math.sin(rad) * 18;
        return (
          <path key={i} d={`M${bx},${by} Q${cx1},${cy1} ${ex},${ey} Q${cx2},${cy2} ${bx},${by} Z`} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round" />
        );
      })}
    </g>
  );
};
