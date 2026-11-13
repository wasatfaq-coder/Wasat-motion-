import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {z} from 'zod';
import {COLORS, TYPE} from './theme/tokens';
import {Thesis} from './components/Thesis';
import {fontFamily} from './theme/font';
import {COS30, SIN30} from './lib/iso';

export const coverSchema = z.object({variant: z.enum(['a', 'b', 'c'])});
export type CoverProps = z.infer<typeof coverSchema>;

// Cover art is drawn as standalone objects (not crops of the room), big and whole, centred in the 420–1210 px zone.
const W = 7; // main line width at cover scale
const W2 = 4.5;
const TITLE_TOP = 410;

/** A calendar page in frontal view; header in coral; grid without numbers. */
const Page: React.FC<{x: number; y: number; w: number; h: number; rot?: number; header?: string}> = ({x, y, w, h, rot = 0, header = COLORS.accent}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`}>
    <rect x={0} y={0} width={w} height={h} rx={8} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={W2} />
    <rect x={0} y={0} width={w} height={h * 0.2} rx={8} fill={header} stroke={COLORS.ink} strokeWidth={W2} />
    {Array.from({length: 4}, (_, r) =>
      Array.from({length: 5}, (_, c) => (
        <rect key={`${r}${c}`} x={w * 0.1 + c * w * 0.165} y={h * 0.3 + r * h * 0.16} width={w * 0.12} height={h * 0.11} rx={3} fill="none" stroke={COLORS.inkSoft} strokeWidth={2.5} />
      )),
    )}
  </g>
);

/** Wall clock in frontal view. */
const Clock: React.FC<{cx: number; cy: number; r: number; ring?: string}> = ({cx, cy, r, ring = COLORS.ink}) => (
  <g>
    <circle cx={cx + 10} cy={cy + 14} r={r + 18} fill={COLORS.fillDark} />
    <circle cx={cx} cy={cy} r={r + 18} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={W} />
    <circle cx={cx} cy={cy} r={r} fill={COLORS.fillLight} stroke={ring} strokeWidth={W2} />
    {Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const r1 = i % 3 === 0 ? r * 0.72 : r * 0.82;
      return <line key={i} x1={cx + Math.sin(a) * r1} y1={cy - Math.cos(a) * r1} x2={cx + Math.sin(a) * r * 0.92} y2={cy - Math.cos(a) * r * 0.92} stroke={COLORS.ink} strokeWidth={i % 3 === 0 ? W : W2} strokeLinecap="round" />;
    })}
    <line x1={cx} y1={cy} x2={cx + r * 0.32} y2={cy - r * 0.42} stroke={COLORS.ink} strokeWidth={W + 2} strokeLinecap="round" />
    <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.72} stroke={COLORS.ink} strokeWidth={W} strokeLinecap="round" />
    <line x1={cx} y1={cy + r * 0.2} x2={cx} y2={cy - r * 0.8} stroke={COLORS.accent} strokeWidth={W2 - 1} strokeLinecap="round" />
    <circle cx={cx} cy={cy} r={12} fill={COLORS.ink} />
  </g>
);


type M2 = [number, number, number, number];
const PLANE: Record<'wallX' | 'wallY' | 'floor', M2> = {
  wallX: [COS30, SIN30, 0, 1],
  wallY: [-COS30, SIN30, 0, 1],
  floor: [COS30, SIN30, -COS30, SIN30],
};
const mixM = (a: M2, b: M2, t: number): M2 => a.map((v, i) => v + (b[i] - v) * t) as M2;

/** Calendar page in the isometric projection: lies in a mix of two iso planes (tumbling), centred at (x, y). */
const IsoPage: React.FC<{x: number; y: number; w: number; h: number; from: 'wallX' | 'wallY'; tumble: number; rot: number}> = ({x, y, w, h, from, tumble, rot}) => {
  const m = mixM(PLANE[from], PLANE.floor, tumble);
  return (
    <g transform={`matrix(${m.join(',')},${x},${y})`}>
      <g transform={`rotate(${rot}) translate(${-w / 2} ${-h / 2})`}>
        <Page x={0} y={0} w={w} h={h} />
      </g>
    </g>
  );
};

/** Wall clock in the isometric projection (plane y = const, like the room clock): extruded disc with a rim. */
const IsoClock: React.FC<{cx: number; cy: number; r: number; sec?: number}> = ({cx, cy, r, sec = 0}) => {
  const R = r + 18;
  const [a, b, c, d] = PLANE.wallX;
  const v: [number, number] = [COS30 * 34, -SIN30 * 34]; // depth towards the wall
  const th = Math.atan2(c * v[1] - d * v[0], a * v[1] - b * v[0]);
  const pt = (t: number): [number, number] => [cx + R * (a * Math.cos(t) + c * Math.sin(t)), cy + R * (b * Math.cos(t) + d * Math.sin(t))];
  const p1 = pt(th);
  const p2 = pt(th + Math.PI);
  const local = `matrix(${a},${b},${c},${d},${cx},${cy})`;
  const ns = {vectorEffect: 'non-scaling-stroke' as const};
  return (
    <g>
      {/* back rim, side band, front rim */}
      <g transform={`translate(${v[0]} ${v[1]})`}>
        <g transform={local}>
          <circle r={R} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={W} {...ns} />
        </g>
      </g>
      <polygon points={`${p1[0]},${p1[1]} ${p1[0] + v[0]},${p1[1] + v[1]} ${p2[0] + v[0]},${p2[1] + v[1]} ${p2[0]},${p2[1]}`} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={W} strokeLinejoin="round" />
      <g transform={local}>
        <circle r={R} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={W} {...ns} />
        <circle r={r} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={W2} {...ns} />
        {Array.from({length: 12}, (_, i) => {
          const an = (i / 12) * Math.PI * 2;
          const r1 = i % 3 === 0 ? r * 0.72 : r * 0.82;
          return <line key={i} x1={Math.sin(an) * r1} y1={-Math.cos(an) * r1} x2={Math.sin(an) * r * 0.92} y2={-Math.cos(an) * r * 0.92} stroke={COLORS.ink} strokeWidth={i % 3 === 0 ? W : W2} strokeLinecap="round" {...ns} />;
        })}
        <line x1={0} y1={0} x2={r * 0.32} y2={-r * 0.42} stroke={COLORS.ink} strokeWidth={W + 2} strokeLinecap="round" {...ns} />
        <line x1={0} y1={0} x2={0} y2={-r * 0.72} stroke={COLORS.ink} strokeWidth={W} strokeLinecap="round" {...ns} />
        <line x1={0} y1={r * 0.2} x2={0} y2={-r * 0.8} transform={`rotate(${sec})`} stroke={COLORS.accent} strokeWidth={W2 - 1} strokeLinecap="round" {...ns} />
        <circle r={12} fill={COLORS.ink} />
      </g>
    </g>
  );
};

/** A — contrast: a big calm clock; calendar pages burst away from it in a widening, accelerating spiral. */
export const CoverA: React.FC<{frame?: number}> = ({frame = 0}) => {
  const cx = 470;
  const cy = 960;
  const drift = frame / 30; // pages fly outward and turn from frame 1 (the cover is not a frozen still)
  const pages = Array.from({length: 9}, (_, i) => i);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(${cx + 20} ${cy + 20}) scale(1.0) translate(${-cx} ${-cy})`}>
      {pages.map((i) => {
        const a = -2.5 + i * 0.62 + drift * 0.35;
        const d = 230 + i * 24 + drift * (40 + i * 12);
        const size = 1 - i * 0.07;
        // keep every page whole inside the frame (no page cut by the edge)
        const px = Math.max(110, Math.min(900, cx + Math.cos(a) * d));
        const py = cy + Math.sin(a) * d * 0.55 - 6;
        return <IsoPage key={i} x={px} y={py} w={110 * size} h={140 * size} from={i % 2 ? 'wallY' : 'wallX'} tumble={Math.min(1, Math.max(0, 0.15 + 0.6 * random(`tb${i}`) + 0.2 * Math.sin(drift * 1.4 + i)))} rot={a * 40 + random(`r${i}`) * 30} />;
      })}
      {/* speed lines behind the pages, along the iso x axis */}
      {[0, 1, 2].map((i) => (
        <line key={i} x1={cx + 250} y1={cy - 150 + i * 36} x2={cx + 250 + 150 * COS30} y2={cy - 150 + i * 36 - 150 * SIN30} stroke={COLORS.inkSoft} strokeWidth={3} strokeLinecap="round" />
      ))}
      <IsoClock cx={cx} cy={cy} r={200} sec={frame * 3} />
      </g>
    </svg>
  );
};

/** B — broken expectation: the same hour at 14 and at 94 — two identical clocks. */
const CoverB: React.FC = () => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <Clock cx={260} cy={930} r={150} />
    <Clock cx={690} cy={930} r={150} />
    <text x={260} y={1170} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={64} fill={COLORS.ink}>в 14</text>
    <text x={690} y={1170} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={64} fill={COLORS.ink}>в 94</text>
    <text x={475} y={950} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={90} fill={COLORS.accent}>=</text>
  </svg>
);

/** C — contrast: a thick stack of bright cards (new experiences) next to a thin flattened stack (routine). */
const Stack: React.FC<{x: number; base: number; n: number; gap: number; novel: boolean}> = ({x, base, n, gap, novel}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const y = base - i * gap;
      const jx = (random(`sx${novel}${i}`) - 0.5) * (novel ? 18 : 4);
      return (
        <g key={i}>
          <rect x={x + jx} y={y - Math.max(gap - 2, 3)} width={260} height={Math.max(gap - 2, 3)} rx={Math.min(6, gap / 3)} fill={novel ? COLORS.fillLight : COLORS.fillDark} stroke={COLORS.ink} strokeWidth={novel ? W2 : 2.5} />
          {novel && i % 2 === 0 ? <rect x={x + jx + 14} y={y - gap + 6} width={50} height={Math.max(gap - 14, 6)} rx={3} fill={COLORS.accent} /> : null}
        </g>
      );
    })}
  </g>
);

const CoverC: React.FC = () => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <line x1={70} y1={1150} x2={900} y2={1150} stroke={COLORS.ink} strokeWidth={W} strokeLinecap="round" />
    <Stack x={110} base={1150} n={13} gap={30} novel />
    <Stack x={560} base={1150} n={13} gap={6} novel={false} />
    {/* suitcase icon over the thick stack, house icon over the thin one */}
    <g transform="translate(170 655) scale(1.35)">
      <rect x={0} y={20} width={110} height={80} rx={12} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={W2} />
      <path d="M35,20 L35,4 L75,4 L75,20" fill="none" stroke={COLORS.ink} strokeWidth={W2} />
      <circle cx={55} cy={60} r={14} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={2.5} />
    </g>
    <g transform="translate(600 900) scale(1.7)">
      <path d="M0,60 L0,30 L50,0 L100,30 L100,60 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={W2} strokeLinejoin="round" />
      <rect x={40} y={36} width={22} height={24} fill="none" stroke={COLORS.ink} strokeWidth={2.5} />
      <path d="M115,30 a30,30 0 1 1 -10,-22" fill="none" stroke={COLORS.inkSoft} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M100,2 l8,8 l-12,4" fill="none" stroke={COLORS.inkSoft} strokeWidth={3.5} strokeLinejoin="round" />
    </g>
  </svg>
);

const TITLES: Record<CoverProps['variant'], [string, string, number]> = {
  a: ['Почему годы', 'летят?', 112],
  b: ['Час', 'не ускоряется', 108],
  c: ['Рутина сжимает', 'годы в памяти?', 92],
};

export const Cover: React.FC<CoverProps> = ({variant}) => {
  const [l1, l2, size] = TITLES[variant];
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      {variant === 'a' ? <CoverA /> : variant === 'b' ? <CoverB /> : <CoverC />}
      <Thesis lines={[l1, l2]} startFrame={-60} size={size} accentLine={1} top={TITLE_TOP} />
    </AbsoluteFill>
  );
};
