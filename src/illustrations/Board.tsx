import React from 'react';
import {interpolate, random} from 'remotion';
import {COLORS} from '../theme/tokens';
import {EASE} from '../lib/anim';

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
    <path d="M-20,0 L-20,-14 C-20,-28 -10,-30 0,-30 C10,-30 20,-28 20,-14 L20,0 Z" fill={accent ? COLORS.accentSoft : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3 / s} strokeLinejoin="round" />
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
export type Cam2D = {focus: [number, number]; zoom: number; screen?: [number, number]};
export const cam2dTransform = (c: Cam2D) => {
  const [sx, sy] = c.screen ?? [484, 760];
  return `translate(${sx} ${sy}) scale(${c.zoom}) translate(${-c.focus[0]} ${-c.focus[1]})`;
};
export const lerpCam2D = (a: Cam2D, b: Cam2D, t: number): Cam2D => {
  const e = EASE.inOut(Math.max(0, Math.min(1, t)));
  const as = a.screen ?? [484, 760];
  const bs = b.screen ?? [484, 760];
  return {
    focus: [a.focus[0] + (b.focus[0] - a.focus[0]) * e, a.focus[1] + (b.focus[1] - a.focus[1]) * e],
    zoom: a.zoom * Math.pow(b.zoom / a.zoom, e),
    screen: [as[0] + (bs[0] - as[0]) * e, as[1] + (bs[1] - as[1]) * e],
  };
};

/** Light frontal wall + desk edge background so 2D scenes stay inside the room world. */
export const WallBackdrop: React.FC = () => (
  <g>
    <rect x={-400} y={-400} width={1880} height={2000} fill={COLORS.wallRight} />
    <line x1={-400} y1={1160} x2={1480} y2={1160} stroke={COLORS.ink} strokeWidth={LW} />
    <rect x={-400} y={1160} width={1880} height={500} fill={COLORS.fillLight} />
    {Array.from({length: 7}, (_, i) => (
      <line key={i} x1={-400 + i * 300} y1={1160} x2={-460 + i * 300} y2={1300} stroke={COLORS.inkSoft} strokeWidth={1.5} />
    ))}
  </g>
);

/** Full-frame SVG for frontal scenes, with the same graphics band mask as the room (nothing under the captions). */
export const FrontalSvg: React.FC<{cam: Cam2D; children: React.ReactNode; top?: number}> = ({cam, children, top = 240}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, background: COLORS.bg}}>
    <defs>
      <linearGradient id="fBand" x1="0" y1="0" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
        <stop offset={top / 1920} stopColor="white" stopOpacity={0} />
        <stop offset={(top + 50) / 1920} stopColor="white" stopOpacity={1} />
        <stop offset={1170 / 1920} stopColor="white" stopOpacity={1} />
        <stop offset={1200 / 1920} stopColor="white" stopOpacity={0} />
      </linearGradient>
      <mask id="fMask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
        <rect x={0} y={0} width={1080} height={1920} fill="url(#fBand)" />
      </mask>
    </defs>
    <g mask="url(#fMask)">
      <g transform={cam2dTransform(cam)}>{children}</g>
    </g>
  </svg>
);

/** Frontal street backdrop: facades with windows behind, ground, trees. Fills the whole band (no empty wall). */
export const StreetBackdrop: React.FC<{frame?: number}> = ({frame = 0}) => {
  const facades = [
    {x: -260, w: 260, h: 520},
    {x: 10, w: 220, h: 640},
    {x: 240, w: 300, h: 460},
    {x: 550, w: 240, h: 700},
    {x: 800, w: 280, h: 540},
    {x: 1090, w: 260, h: 620},
  ];
  const ground = 1120;
  return (
    <g>
      <rect x={-600} y={-400} width={2400} height={2400} fill={COLORS.bg} />
      {facades.map((f, i) => (
        <g key={i}>
          <rect x={f.x} y={ground - f.h} width={f.w} height={f.h} fill={i % 2 ? COLORS.fillLight : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW2} />
          <rect x={f.x - 6} y={ground - f.h - 14} width={f.w + 12} height={14} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3} />
          {Array.from({length: Math.floor((f.h - 60) / 90)}, (_, r) =>
            Array.from({length: Math.floor(f.w / 70)}, (_, c) => (
              <rect key={`${r}${c}`} x={f.x + 18 + c * 70} y={ground - f.h + 30 + r * 90} width={40} height={52} rx={4} fill={random(`fw${i}${r}${c}`) < 0.25 ? COLORS.fillLight : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3 - 0.5} />
            )),
          )}
        </g>
      ))}
      <rect x={-600} y={ground} width={2400} height={900} fill={COLORS.floor} stroke={COLORS.ink} strokeWidth={LW} />
      {Array.from({length: 14}, (_, i) => (
        <line key={i} x1={-600 + i * 180} y1={ground} x2={-700 + i * 180} y2={ground + 300} stroke={COLORS.inkSoft} strokeWidth={1.5} />
      ))}
      {[-120, 980].map((x, i) => (
        <g key={x} transform={`rotate(${Math.sin(frame / 50 + i) * 1.5} ${x} ${ground})`}>
          <line x1={x} y1={ground} x2={x} y2={ground - 260} stroke={COLORS.ink} strokeWidth={LW} />
          {[[-50, -300, 70], [50, -310, 70], [0, -370, 80], [0, -310, 72]].map(([dx, dy, r], k) => (
            <circle key={k} cx={x + dx} cy={ground + dy} r={r} fill={k === 3 ? COLORS.fillLight : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW2} />
          ))}
        </g>
      ))}
    </g>
  );
};

/** Foreground crowd seen from behind (heads + shoulders); some raise an arm when `react` grows. */
export const FrontCrowd: React.FC<{y: number; react: number; frame: number}> = ({y, react, frame}) => (
  <g>
    {Array.from({length: 9}, (_, i) => {
      const x = 40 + i * 112 + (i % 2) * 20;
      const h = 1 + (random(`fc${i}`) - 0.5) * 0.2;
      const bob = Math.sin(frame / 20 + i) * 2;
      const arm = (i === 2 || i === 6) && react > 0;
      return (
        <g key={i} transform={`translate(${x} ${y + (i % 2) * 26 + bob}) scale(${h})`}>
          {arm ? <path d={`M18,-20 L${40},${-80 - 70 * react} `} stroke={COLORS.ink} strokeWidth={LW * 2.2} strokeLinecap="round" /> : null}
          {arm ? <path d={`M18,-20 L${40},${-80 - 70 * react} `} stroke={i === 2 ? COLORS.accentSoft : COLORS.fillMid} strokeWidth={LW * 1.2} strokeLinecap="round" /> : null}
          <path d="M-60,80 L-60,10 C-60,-30 -30,-40 0,-40 C30,-40 60,-30 60,10 L60,80 Z" fill={i % 4 === 1 ? COLORS.accentSoft : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} strokeLinejoin="round" />
          <circle cx={0} cy={-78} r={38} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
        </g>
      );
    })}
  </g>
);

/** Frontal room backdrop: wall, window with a city skyline and blinds, bookshelf, floor. Covers the whole band. */
export const RoomWallBackdrop: React.FC<{frame?: number; window?: [number, number]; shelf?: number}> = ({frame = 0, window = [640, 330], shelf = -60}) => {
  const floorY = 1120;
  const [wx, wy] = window;
  return (
    <g>
      <rect x={-600} y={-400} width={2400} height={1520} fill={COLORS.wallRight} />
      <line x1={-600} y1={floorY - 26} x2={1800} y2={floorY - 26} stroke={COLORS.inkSoft} strokeWidth={LW3} />
      <rect x={-600} y={floorY} width={2400} height={900} fill={COLORS.floor} stroke={COLORS.ink} strokeWidth={LW} />
      {Array.from({length: 10}, (_, i) => (
        <line key={i} x1={-600 + i * 260} y1={floorY} x2={-700 + i * 260} y2={floorY + 400} stroke={COLORS.inkSoft} strokeWidth={1.5} />
      ))}
      {/* window with skyline */}
      <rect x={wx} y={wy} width={300} height={360} rx={8} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
      <circle cx={wx + 230} cy={wy + 90} r={30} fill={COLORS.fillLight} stroke={COLORS.inkSoft} strokeWidth={2} />
      {[[wx + 20, 90], [wx + 110, 120], [wx + 200, 80]].map(([x, h], i) => (
        <path key={i} d={`M${x},${wy + 360} L${x},${wy + 360 - h} L${x + 40},${wy + 360 - h - 40} L${x + 80},${wy + 360 - h} L${x + 80},${wy + 360} Z`} fill={COLORS.fillMid} stroke={COLORS.inkSoft} strokeWidth={2} strokeLinejoin="round" />
      ))}
      <circle cx={wx + 190} cy={wy + 290} r={26} fill={COLORS.fillLight} stroke={COLORS.inkSoft} strokeWidth={2} />
      <line x1={wx + 190} y1={wy + 316} x2={wx + 190} y2={wy + 360} stroke={COLORS.inkSoft} strokeWidth={2} />
      {Array.from({length: 6}, (_, i) => (
        <line key={i} x1={wx + 6} y1={wy + 20 + i * 22 + Math.sin(frame / 40 + i) * 1.5} x2={wx + 294} y2={wy + 20 + i * 22 + Math.sin(frame / 40 + i) * 1.5} stroke={COLORS.inkSoft} strokeWidth={2} />
      ))}
      <line x1={wx + 150} y1={wy} x2={wx + 150} y2={wy + 360} stroke={COLORS.ink} strokeWidth={LW3} />
      <rect x={wx - 14} y={wy + 360} width={328} height={18} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3} />
      {/* bookshelf */}
      <g transform={`translate(${shelf} 420)`}>
        <rect x={0} y={0} width={190} height={700} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} />
        {[0, 1, 2, 3].map((r) => (
          <g key={r}>
            <line x1={0} y1={170 + r * 170} x2={190} y2={170 + r * 170} stroke={COLORS.ink} strokeWidth={LW3} />
            {Array.from({length: 6}, (_, k) => (
              <rect key={k} x={12 + k * 28} y={170 + r * 170 - 110 - (k % 3) * 12} width={22} height={110 + (k % 3) * 12} fill={k % 4 === 1 ? COLORS.fillDark : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={2} />
            ))}
          </g>
        ))}
      </g>
    </g>
  );
};

/** Top view of a wooden table surface with planks (for scenes seen from above). */
export const TableTop: React.FC = () => (
  <g>
    <rect x={-600} y={-400} width={2400} height={2600} fill={COLORS.fillMid} />
    {Array.from({length: 16}, (_, i) => (
      <line key={i} x1={-600} y1={-400 + i * 170} x2={1800} y2={-400 + i * 170} stroke={COLORS.inkSoft} strokeWidth={2} opacity={0.6} />
    ))}
    {Array.from({length: 40}, (_, i) => (
      <path key={i} d={`M${-500 + random(`gx${i}`) * 2000},${-300 + random(`gy${i}`) * 2300} q60,-8 120,0`} stroke={COLORS.inkSoft} strokeWidth={1.5} fill="none" opacity={0.5} />
    ))}
  </g>
);
