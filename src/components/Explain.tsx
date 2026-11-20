import React from 'react';
import {COLORS, STROKE, TYPE, TYPE_FLOOR} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {counterValue, SourceLine, textWidth} from './Frontal';

// The devices of explanation (MASTER_PROMPT_FINAL v3.0, section 5, «Приёмы объяснения»; taken from the three reference
// videos as a WAY of explaining, not as a picture): honesty tags, the card of the unknown, a number derived on screen
// step by step, and one quantity in three views from one clock. Frontal screen-space SVG over the scene; pure per frame.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const HONESTY = {
  scale: 'НЕ В МАСШТАБЕ',
  simplified: 'УПРОЩЁННО',
  exaggerated: 'ПРЕУВЕЛИЧЕНО',
  slowed: 'ЗАМЕДЛЕНО',
} as const;
export type HonestyKind = keyof typeof HONESTY;

/** The honesty tag: a dashed box with a caps word, ≥ 26 px. Put it beside the moment of truth, at a scale jump, at a
 *  simplification and at an invented mechanism: the viewer never takes a simplification for a fact. */
export const HonestyTag: React.FC<{x: number; y: number; kind: HonestyKind; note?: string; dark?: boolean; show?: number}> = ({x, y, kind, note, dark, show = 1}) => {
  const k = clamp01(show);
  if (k <= 0) return null;
  const text = note ? `${HONESTY[kind]} · ${note}` : HONESTY[kind];
  const w = textWidth(text, TYPE_FLOOR.auxiliary) * 1.12 + 36 + text.length * 2;
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  return (
    <g opacity={k}>
      <rect x={x} y={y} width={w} height={46} rx={10} fill={dark ? COLORS.plateDark : COLORS.fillLight} stroke={ink} strokeWidth={STROKE.secondary} strokeDasharray="10 7" />
      <text x={x + 18} y={y + 32} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={TYPE_FLOOR.auxiliary} letterSpacing={2} fill={ink}>
        {text}
      </text>
    </g>
  );
};

/** The card of the unknown: «не известно» with who says so and when, instead of silence (politics, health, faith). */
export const UnknownCard: React.FC<{x: number; y: number; w?: number; title: string; source: string; dark?: boolean}> = ({x, y, w = 420, title, source, dark}) => {
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={w} height={150} rx={22} fill={dark ? COLORS.ink : COLORS.fillDark} opacity={dark ? 0.6 : 1} />
      <rect x={x} y={y} width={w} height={150} rx={22} fill={dark ? COLORS.plateDark : COLORS.fillLight} stroke={dark ? COLORS.inkSoft : COLORS.ink} strokeWidth={STROKE.main} />
      <text x={x + 28} y={y + 46} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={TYPE_FLOOR.figure} fill={dark ? COLORS.fillMid : COLORS.inkSoft}>
        {title}
      </text>
      <text x={x + 28} y={y + 102} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={52} fill={ink}>
        не известно
      </text>
      <SourceLine x={x + 28} y={y + 136} text={source} dark={dark} />
    </g>
  );
};

export type DeriveStep = {text: string; value?: string};

/** A number derived on screen: input → action → result, revealed one step at a time as `progress` goes 0..1; the last
 *  step is the result in the topic's coral. «780 импульсов ÷ 2 в с = 390 с». Rows, left aligned, ≥ 32 px. */
export const DeriveChain: React.FC<{x: number; y: number; w?: number; steps: DeriveStep[]; progress: number; dark?: boolean; source?: string}> = ({x, y, w = 560, steps, progress, dark, source}) => {
  const rowH = 64;
  const h = 28 + steps.length * rowH + (source ? 44 : 14);
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  const font = {fontFamily, fontWeight: TYPE.weightBold, fontSize: 38} as const;
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={w} height={h} rx={22} fill={dark ? COLORS.ink : COLORS.fillDark} opacity={dark ? 0.6 : 1} />
      <rect x={x} y={y} width={w} height={h} rx={22} fill={dark ? COLORS.plateDark : COLORS.fillLight} stroke={dark ? COLORS.inkSoft : COLORS.ink} strokeWidth={STROKE.main} />
      {steps.map((s, i) => {
        const k = clamp01(progress * steps.length - i);
        const last = i === steps.length - 1;
        return (
          <g key={i} opacity={k} transform={`translate(0 ${(1 - k) * 10})`}>
            <text x={x + 28} y={y + 28 + rowH * (i + 0.72)} fill={last ? COLORS.accent : ink} {...font}>
              {last ? '= ' : i ? '÷ ' : ''}
              {s.text}
            </text>
            {s.value ? (
              <text x={x + w - 28} y={y + 28 + rowH * (i + 0.72)} textAnchor="end" fill={last ? COLORS.accent : ink} {...font} style={{fontVariantNumeric: 'tabular-nums'}}>
                {s.value}
              </text>
            ) : null}
          </g>
        );
      })}
      {source ? <SourceLine x={x + 28} y={y + h - 14} text={source} dark={dark} /> : null}
    </g>
  );
};

/** One quantity in three views from one clock (`t` 0..1): a counter, a step graph with a running dot, and a bar of the
 *  same value, for the object in the world to follow with the same `t`. The graph's x is the progress of the process,
 *  y the value read off `curve` (zero baseline, unit named). */
export const TriSync: React.FC<{x: number; y: number; w?: number; t: number; total: number; curve: [number, number][]; unit: string; yUnit: string; yMax: number; source?: string; dark?: boolean}> = ({x, y, w = 540, t, total, curve, unit, yUnit, yMax, source, dark}) => {
  const k = clamp01(t);
  const h = 380;
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  const px0 = x + 70;
  const px1 = x + w - 30;
  const py0 = y + h - 70;
  const py1 = y + 190;
  const at = (u: number) => curve.reduce((v, [cx, cy]) => (cx <= u ? cy : v), curve[0][1]);
  const vx = (u: number) => px0 + (px1 - px0) * u;
  const vy = (v: number) => py0 - (py0 - py1) * (v / yMax);
  const path = curve.map(([cx, cy], i) => `${i ? `L${vx(cx).toFixed(1)} ${vy(curve[i - 1][1]).toFixed(1)}` : `M${vx(cx).toFixed(1)} ${vy(cy).toFixed(1)}`}L${vx(cx).toFixed(1)} ${vy(cy).toFixed(1)}`).join('') + `L${vx(1).toFixed(1)} ${vy(curve[curve.length - 1][1]).toFixed(1)}`;
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={w} height={h} rx={22} fill={dark ? COLORS.ink : COLORS.fillDark} opacity={dark ? 0.6 : 1} />
      <rect x={x} y={y} width={w} height={h} rx={22} fill={dark ? COLORS.plateDark : COLORS.fillLight} stroke={dark ? COLORS.inkSoft : COLORS.ink} strokeWidth={STROKE.main} />
      <text x={x + 28} y={y + 78} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={72} fill={COLORS.accent} style={{fontVariantNumeric: 'tabular-nums'}}>
        {Math.round(counterValue(k, 0, total)).toLocaleString('ru-RU')}
      </text>
      <text x={x + 28} y={y + 126} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={TYPE_FLOOR.figure} fill={dark ? COLORS.fillMid : COLORS.inkSoft}>
        {unit}
      </text>
      <text x={x + w - 28} y={y + 126} textAnchor="end" fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={TYPE_FLOOR.auxiliary} fill={dark ? COLORS.fillMid : COLORS.inkSoft}>
        {yUnit}
      </text>
      <line x1={px0 - 8} y1={py0} x2={px1} y2={py0} stroke={ink} strokeWidth={STROKE.main} strokeLinecap="round" />
      <path d={path} fill="none" stroke={ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <line x1={vx(k)} y1={py0} x2={vx(k)} y2={vy(at(k))} stroke={COLORS.accent} strokeWidth={STROKE.secondary} strokeDasharray="6 6" />
      <circle cx={vx(k)} cy={vy(at(k))} r={11} fill={COLORS.accent} stroke={ink} strokeWidth={STROKE.secondary} />
      {source ? <SourceLine x={x + 28} y={y + h - 22} text={source} dark={dark} /> : null}
    </g>
  );
};
