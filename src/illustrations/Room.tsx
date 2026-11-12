import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {iso, P3, planeMatrix, pts} from '../lib/iso';
import {Box, Line3} from './primitives';

// Room in isometric units. Back corner floor = (0,0,0).
export const ROOM = {W: 10, D: 10, H: 7} as const;
export const DESK = {x: 3.4, y: 0.5, w: 5.2, d: 2.1, h: 2.4} as const;
export const TRAY = {x: 6.1, y: 0.75, w: 1.8, d: 1.4, h: 0.45} as const;
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
        books.push(
          <Box key={`b${si}-${k}`} s={s} at={[x0 + 0.15, y, z + 0.08]} size={[depth - 0.3, bw, bh]} stroke={STROKE.micro} top={COLORS.fillLight} left={k % 4 === 1 ? COLORS.fillDark : COLORS.fillLight} right={COLORS.fillMid} />,
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
export const CalendarPage: React.FC<{w: number; h: number; stroke?: string}> = ({w, h, stroke = COLORS.ink}) => (
  <g>
    <rect x={0} y={0} width={w} height={h} fill={COLORS.fillLight} stroke={stroke} strokeWidth={STROKE.secondary} {...ns} />
    <rect x={0.12} y={0.14} width={w * 0.45} height={0.16} fill={COLORS.ink} />
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
      <rect x={0} y={0} width={w} height={0.4} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
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
      <Box s={s} at={[x, y, h - 0.15]} size={[w, d, 0.15]} />
      {/* lamp */}
      <Box s={s} at={[x + 0.4, y + 0.3, h]} size={[0.6, 0.6, 0.08]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x + 0.7, y + 0.6, h + 0.08], [x + 0.7, y + 0.6, h + 1.6], [x + 1.4, y + 0.9, h + 2.0]]} width={STROKE.main} />
      <Line3 s={s} close fill={COLORS.fillLight} points={[[x + 1.2, y + 0.6, h + 2.1], [x + 1.8, y + 1.1, h + 1.8], [x + 1.7, y + 1.3, h + 1.5], [x + 1.1, y + 0.9, h + 1.8]]} width={STROKE.main} />
      {/* notebook */}
      <Box s={s} at={[x + 1.5, y + 1.1, h]} size={[1.3, 0.85, 0.08]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x + 1.7, y + 1.3, h + 0.09], [x + 2.6, y + 1.3, h + 0.09]]} width={STROKE.micro} color={COLORS.inkSoft} />
      <Line3 s={s} points={[[x + 1.7, y + 1.55, h + 0.09], [x + 2.4, y + 1.55, h + 0.09]]} width={STROKE.micro} color={COLORS.inkSoft} />
      {/* cup with a faint steam line */}
      <Box s={s} at={[x + 3.2, y + 1.4, h]} size={[0.35, 0.35, 0.4]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x + 3.37, y + 1.57, h + 0.55], [x + 3.37 + 0.05 * Math.sin(t * 2), y + 1.57, h + 0.8], [x + 3.37, y + 1.57, h + 1.05]]} width={STROKE.micro} color={COLORS.inkSoft} />
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
      {/* label holder */}
      <polygon points={pts(s, [[x + 0.5, y + d, z0 + 0.12], [x + 1.3, y + d, z0 + 0.12], [x + 1.3, y + d, z0 + 0.32], [x + 0.5, y + d, z0 + 0.32]])} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} />
      {dashedExtra > 0 ? (
        <Line3
          s={s}
          close
          dash="10 8"
          color={COLORS.accent}
          width={STROKE.secondary}
          points={[[x + 0.15, y + 0.15 + cardD, pileTop + dashedExtra], [x + 0.15 + cardW, y + 0.15 + cardD, pileTop + dashedExtra], [x + 0.15 + cardW, y + 0.15, pileTop + dashedExtra], [x + 0.15 + cardW, y + 0.15, pileTop], [x + 0.15 + cardW, y + 0.15 + cardD, pileTop], [x + 0.15, y + 0.15 + cardD, pileTop]]}
        />
      ) : null}
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
