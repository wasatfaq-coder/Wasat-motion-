import React from 'react';
import {COLORS, STROKE, TYPE, TYPE_FLOOR} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {SAFE, ZONES} from '../theme/layout';

// Frontal plates and charts (MASTER_PROMPT_FINAL v3.0, section 10): labels and data are never drawn on a slanted plane.
// They live in screen space (FrontalLayer, over RoomSvg), keep their pixel size at any zoom and point to the object
// with a leader. Pin them to 3D points with screenOf(cam, roomPoint) from src/lib/camera.tsx.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Text width estimate for Rubik (bold digits/Cyrillic ≈ 0.6 em); plates add padding, so a small error is safe. */
export const textWidth = (text: string, size: number) => text.length * size * 0.6;

/** Screen-space SVG over the scene, masked to the graphics band like RoomSvg. */
export const FrontalLayer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
    {children}
  </svg>
);

type PlateProps = {
  at: [number, number]; // plate centre, screen px
  text: string;
  to?: [number, number]; // leader end on the object, screen px
  size?: number;
  accent?: boolean; // coral text: the key meaning (one per frame)
  show?: number; // 0..1 appearance (scale + fade from the leader end)
};

/** A label plate: light fill, ink contour, offset shadow, bold Rubik; optional leader with a dot on the object. */
export const Plate: React.FC<PlateProps> = ({at, text, to, size = TYPE.label, accent = false, show = 1}) => {
  const k = clamp01(show);
  if (k <= 0) return null;
  const w = textWidth(text, size) + size * 1.1;
  const h = size * 1.55;
  // keep the plate inside the safe zone
  const x = Math.max(SAFE.left + w / 2, Math.min(1080 - SAFE.right + 120 - w / 2, at[0]));
  const y = Math.max(ZONES.graphicsTop + h / 2, Math.min(ZONES.graphicsBottom - h / 2, at[1]));
  const s = 0.85 + 0.15 * k;
  return (
    <g opacity={k}>
      {to ? (
        <g>
          <line x1={x} y1={y} x2={x + (to[0] - x) * k} y2={y + (to[1] - y) * k} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinecap="round" />
          <circle cx={to[0]} cy={to[1]} r={7 * k} fill={COLORS.ink} />
        </g>
      ) : null}
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <rect x={-w / 2 + 5} y={-h / 2 + 5} width={w} height={h} rx={h * 0.28} fill={COLORS.fillDark} />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.28} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
        <text y={size * 0.36} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={size} fill={accent ? COLORS.accent : COLORS.ink}>
          {text}
        </text>
      </g>
    </g>
  );
};

export type Datum = {label: string; value: number};

type ChartProps = {
  x: number; // top-left of the plate, screen px
  y: number;
  w: number;
  h: number;
  kind: 'bar' | 'line';
  data: Datum[];
  unit: string; // REQUIRED: the unit the voice names (§20.5 «не та единица»)
  title?: string;
  max?: number; // axis top; the axis always starts at 0 (no cropped axes)
  progress?: number; // 0..1: bars grow / the line draws, in data order
  highlight?: number; // index drawn in coral (the key value)
  values?: boolean; // print values over the marks
  format?: (v: number) => string;
  source?: string; // source and date of the data, printed under the chart (regulation v3.0, section 10)
};

/** A literal chart on a frontal plate: zero baseline, labelled axis with its unit, values from the source. */
export const FrontalChart: React.FC<ChartProps> = ({x, y, w, h, kind, data, unit, title, max, progress = 1, highlight, values = true, format = (v) => String(v), source}) => {
  const pad = 28;
  const head = title ? 58 : 18;
  const foot = 56;
  const top = Math.max(max ?? 0, ...data.map((d) => d.value)) || 1;
  const px0 = x + pad + 8;
  const px1 = x + w - pad;
  const py0 = y + h - foot; // zero line
  const py1 = y + head + 60; // top of the scale (leave room for value labels under the header)
  const step = (px1 - px0) / data.length;
  const vy = (v: number) => py0 - (v / top) * (py0 - py1);
  const p = clamp01(progress);
  const grow = (i: number) => clamp01(p * data.length - i);
  const font = {fontFamily, fontWeight: TYPE.weightBold} as const;
  const valueSize = TYPE_FLOOR.figure; // numbers the sentence needs, ≥ 32 px (§5)
  const labelSize = 28; // auxiliary names, above the 26 px floor (§5)
  const linePts = data.map((d, i) => [px0 + step * (i + 0.5), vy(d.value)] as [number, number]);
  const drawn = (() => {
    if (kind !== 'line') return '';
    const n = p * (data.length - 1);
    const pts = linePts.slice(0, Math.floor(n) + 1);
    const f = n - Math.floor(n);
    if (f > 0 && Math.floor(n) + 1 < linePts.length) {
      const [a, b] = [linePts[Math.floor(n)], linePts[Math.floor(n) + 1]];
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('');
  })();
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={w} height={h} rx={22} fill={COLORS.fillDark} />
      <rect x={x} y={y} width={w} height={h} rx={22} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
      {title ? (
        <text x={x + pad} y={y + 46} fontSize={34} fill={COLORS.ink} {...font}>
          {title}
        </text>
      ) : null}
      <text x={x + w - pad} y={y + (title ? 46 : 40)} textAnchor="end" fontSize={TYPE_FLOOR.auxiliary} fill={COLORS.inkSoft} {...font}>
        {unit}
      </text>
      {/* zero baseline: the axis starts at 0 */}
      <line x1={px0 - 8} y1={py0} x2={px1} y2={py0} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinecap="round" />
      {kind === 'line' ? <path d={drawn} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {data.map((d, i) => {
        const cx = px0 + step * (i + 0.5);
        const g = grow(i);
        const on = highlight === i;
        return (
          <g key={i}>
            {kind === 'bar' && g > 0 ? (
              <rect x={cx - step * 0.3} y={vy(d.value * g)} width={step * 0.6} height={py0 - vy(d.value * g)} rx={6} fill={on ? COLORS.accent : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
            ) : null}
            {kind === 'line' && g > 0 ? <circle cx={cx} cy={vy(d.value)} r={9} fill={on ? COLORS.accent : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} /> : null}
            {values && g >= 1 ? (
              <text x={cx} y={vy(d.value) - 16} textAnchor="middle" fontSize={valueSize} fill={on ? COLORS.accent : COLORS.ink} {...font}>
                {format(d.value)}
              </text>
            ) : null}
            <text x={cx} y={py0 + 38} textAnchor="middle" fontSize={labelSize} fill={COLORS.inkSoft} {...font}>
              {d.label}
            </text>
          </g>
        );
      })}
      {source ? <SourceLine x={x + pad} y={y + h + 34} text={source} /> : null}
    </g>
  );
};

/** The source and date under a plate, ≥ 26 px (regulation v3.0, section 10). */
export const SourceLine: React.FC<{x: number; y: number; text: string; dark?: boolean}> = ({x, y, text, dark}) => (
  <text x={x} y={y} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={TYPE_FLOOR.auxiliary} fill={dark ? COLORS.fillMid : COLORS.inkSoft}>
    {text}
  </text>
);

/** A counter value at progress t (0..1): fast at first, a strong slow-down, landing exactly on `to` at t = 1, the
 *  anchor word (regulation v3.0, section 10). Pure. */
export const counterValue = (t: number, from: number, to: number) => {
  const k = clamp01(t);
  const eased = 1 - Math.pow(1 - k, 4);
  return from + (to - from) * eased;
};

const plateBox = (x: number, y: number, w: number, h: number, dark?: boolean) => (
  <>
    <rect x={x + 6} y={y + 6} width={w} height={h} rx={22} fill={dark ? COLORS.ink : COLORS.fillDark} opacity={dark ? 0.6 : 1} />
    <rect x={x} y={y} width={w} height={h} rx={22} fill={dark ? COLORS.plateDark : COLORS.fillLight} stroke={dark ? COLORS.inkSoft : COLORS.ink} strokeWidth={STROKE.main} />
  </>
);

/** A counter plate: the number counts up with a strong slow-down and lands on the anchor word; unit and source. */
export const CounterPlate: React.FC<{x: number; y: number; t: number; to: number; from?: number; unit: string; source?: string; format?: (v: number) => string; dark?: boolean; accent?: boolean}> = ({x, y, t, to, from = 0, unit, source, format = (v) => Math.round(v).toLocaleString('ru-RU'), dark, accent}) => {
  const text = format(counterValue(t, from, to));
  const size = 72;
  const w = Math.max(textWidth(format(to), size), textWidth(unit, TYPE.label)) + 64;
  const h = 150;
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  return (
    <g>
      {plateBox(x, y, w, h, dark)}
      <text x={x + 32} y={y + 82} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={size} fill={accent ? COLORS.accent : ink} style={{fontVariantNumeric: 'tabular-nums'}}>
        {text}
      </text>
      <text x={x + 32} y={y + 128} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={TYPE_FLOOR.figure} fill={dark ? COLORS.fillMid : COLORS.inkSoft}>
        {unit}
      </text>
      {source ? <SourceLine x={x + 8} y={y + h + 34} text={source} dark={dark} /> : null}
    </g>
  );
};

/** A list or comparison plate: rows of «name — value», one row may carry the topic's coral meaning. Data and lists
 *  only, never a thesis (regulation v3.0, section 10). `show` 0..1 brings rows in one by one. */
export const ListPlate: React.FC<{x: number; y: number; w: number; rows: [string, string?][]; title?: string; foot?: string; highlight?: number; show?: number; dark?: boolean}> = ({x, y, w, rows, title, foot, highlight, show = 1, dark}) => {
  const rowH = 52;
  const head = title ? 56 : 18;
  const h = head + rows.length * rowH + (foot ? 44 : 18);
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  const font = {fontFamily, fontWeight: TYPE.weightBold} as const;
  return (
    <g>
      {plateBox(x, y, w, h, dark)}
      {title ? (
        <text x={x + 28} y={y + 42} fontSize={34} fill={ink} {...font}>
          {title}
        </text>
      ) : null}
      {rows.map(([a, b], i) => {
        const k = clamp01(show * rows.length - i);
        const on = highlight === i;
        return (
          <g key={i} opacity={k}>
            <text x={x + 28} y={y + head + rowH * (i + 0.7)} fontSize={36} fill={on ? COLORS.accent : ink} {...font}>
              {a}
            </text>
            {b ? (
              <text x={x + w - 28} y={y + head + rowH * (i + 0.7)} textAnchor="end" fontSize={36} fill={on ? COLORS.accent : ink} {...font} style={{fontVariantNumeric: 'tabular-nums'}}>
                {b}
              </text>
            ) : null}
          </g>
        );
      })}
      {foot ? <SourceLine x={x + 28} y={y + h - 16} text={foot} dark={dark} /> : null}
    </g>
  );
};

/** The moment of truth beside a mechanism (regulation v3.0, section 6): a sourced fact and «упрощённо». */
export const TruthPlate: React.FC<{x: number; y: number; w: number; fact: string; source: string; dark?: boolean}> = ({x, y, w, fact, source, dark}) => (
  <ListPlate x={x} y={y} w={w} rows={[[fact]]} title="Упрощённо. На деле:" foot={source} dark={dark} />
);
