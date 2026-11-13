import React from 'react';
import {interpolate, random} from 'remotion';
import {COLORS} from '../theme/tokens';

// Frontal line-art objects drawn in screen pixels (for diagrams that must stay frontal and readable).
export const LW = 5; // main line at this scale
export const LW2 = 3.5;
export const LW3 = 2.5;

/** Corkboard with a wooden frame, cork speckles and pins. */
export const Corkboard: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => (
  <g>
    <rect x={x + 10} y={y + 14} width={w} height={h} rx={14} fill={COLORS.fillDark} />
    <rect x={x} y={y} width={w} height={h} rx={14} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} />
    <rect x={x + 22} y={y + 22} width={w - 44} height={h - 44} rx={6} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3} />
    {/* wood grain on the frame */}
    {[0.2, 0.5, 0.8].map((k) => (
      <line key={k} x1={x + w * k - 30} y1={y + 10} x2={x + w * k + 30} y2={y + 10} stroke={COLORS.inkSoft} strokeWidth={1.5} />
    ))}
    {/* cork speckles */}
    {Array.from({length: 90}, (_, i) => (
      <circle key={i} cx={x + 30 + random(`ck${i}`) * (w - 60)} cy={y + 30 + random(`cy${i}`) * (h - 60)} r={1.5 + random(`cr${i}`) * 1.5} fill={COLORS.inkSoft} opacity={0.35} />
    ))}
  </g>
);

export const Pin: React.FC<{x: number; y: number; color?: string}> = ({x, y, color = COLORS.accent}) => (
  <g>
    <ellipse cx={x + 4} cy={y + 6} rx={10} ry={5} fill={COLORS.fillDark} />
    <circle cx={x} cy={y} r={11} fill={color} stroke={COLORS.ink} strokeWidth={LW3} />
    <circle cx={x - 3} cy={y - 3} r={3} fill={COLORS.fillLight} />
  </g>
);

/** Sticky note with a curled corner. */
export const Sticky: React.FC<{x: number; y: number; w?: number; rot?: number; children?: React.ReactNode; fill?: string}> = ({x, y, w = 170, rot = 0, children, fill = COLORS.fillLight}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d={`M0,0 L${w},0 L${w},${w - 26} L${w - 26},${w} L0,${w} Z`} fill={fill} stroke={COLORS.ink} strokeWidth={LW3} strokeLinejoin="round" />
    <path d={`M${w},${w - 26} L${w - 22},${w - 22} L${w - 26},${w}`} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW3} strokeLinejoin="round" />
    {children}
  </g>
);

/** Line-art person (head + shoulders + body), faceless. */
export const Person: React.FC<{x: number; y: number; s?: number; accent?: boolean; p?: number}> = ({x, y, s = 1, accent = false, p = 1}) => (
  <g transform={`translate(${x} ${y + (1 - p) * 30}) scale(${s * p})`} opacity={Math.min(1, p * 2)}>
    <circle cx={0} cy={-46} r={14} fill={accent ? COLORS.accent : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3 / s} />
    <path d="M-20,0 L-20,-14 C-20,-28 -10,-30 0,-30 C10,-30 20,-28 20,-14 L20,0 Z" fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3 / s} strokeLinejoin="round" />
  </g>
);

/** Clipboard with a questionnaire; boxes get ticked one by one (tick 0..1). */
export const Clipboard: React.FC<{x: number; y: number; tick: number; rot?: number}> = ({x, y, tick, rot = 0}) => {
  const rows = 5;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={8} y={10} width={300} height={400} rx={18} fill={COLORS.fillDark} />
      <rect x={0} y={0} width={300} height={400} rx={18} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW} />
      <rect x={24} y={44} width={252} height={334} rx={6} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3} />
      <rect x={100} y={-12} width={100} height={46} rx={10} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW2} />
      {Array.from({length: rows}, (_, i) => {
        const p = interpolate(tick, [i / rows, (i + 0.6) / rows], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const yy = 84 + i * 58;
        return (
          <g key={i}>
            <rect x={44} y={yy} width={30} height={30} rx={5} fill="none" stroke={COLORS.ink} strokeWidth={LW3} />
            <path d={`M48,${yy + 15} L57,${yy + 25} L72,${yy + 4}`} fill="none" stroke={COLORS.accent} strokeWidth={LW2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
            <line x1={90} y1={yy + 10} x2={250 - (i % 2) * 40} y2={yy + 10} stroke={COLORS.inkSoft} strokeWidth={LW3} strokeLinecap="round" />
            <line x1={90} y1={yy + 24} x2={200 - (i % 3) * 20} y2={yy + 24} stroke={COLORS.inkSoft} strokeWidth={LW3} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

/** Marker pen pointing at (x, y), tilted. */
export const Marker: React.FC<{x: number; y: number; rot?: number}> = ({x, y, rot = -35}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M0,0 L12,-26 L26,-26 L38,0 Z" transform="translate(-19 0) rotate(180 19 0)" fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW3} strokeLinejoin="round" />
    <rect x={-17} y={26} width={34} height={150} rx={8} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} />
    <rect x={-17} y={120} width={34} height={56} rx={8} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW2} />
  </g>
);

/** 2D camera for frontal scenes: show `focus` at `screen` with `zoom`. */
