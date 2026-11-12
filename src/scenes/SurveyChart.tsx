import React from 'react';
import {interpolate, random} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {COLORS, STROKE, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {EASE} from '../lib/anim';

// Frontal 2D chart in sheet coordinates (sheet is ~820 × 860). No numbers on the speed axis: the source has none.
const PX0 = 120;
const PX1 = 760;
const PY0 = 700; // slow (bottom)
const PY1 = 250; // fast (top)
const ageX = (age: number) => PX0 + ((age - 14) / (94 - 14)) * (PX1 - PX0);

const label = (size: number, weight: number = TYPE.weightMedium) => ({fontFamily, fontSize: size, fontWeight: weight, fill: COLORS.ink});

/** Path of the "last 10 years" line: rises up to about 50, then stays level until the mid-90s. */
const DECADE_PATH = `M${ageX(14)},${PY0 - 190} C${ageX(30)},${PY0 - 215} ${ageX(42)},${PY0 - 300} ${ageX(50)},${PY0 - 320} L${ageX(94)},${PY0 - 320}`;

export const SurveyChart: React.FC<{
  axesP: number;
  dotsP: number;
  countP: number;
  linesP: number;
  decadeP: number;
  peakP: number;
  smallP: number;
  dimShort?: number;
}> = ({axesP, dotsP, countP, linesP, decadeP, peakP, smallP, dimShort = 0}) => {
  const dots = Array.from({length: 64}, (_, i) => i);
  const count = Math.round(interpolate(countP, [0, 1], [0, 499]));
  const evo = evolvePath(EASE.inOut(decadeP), DECADE_PATH);
  const shortLines = [
    {name: 'час', y: PY0 - 50},
    {name: 'неделя', y: PY0 - 95},
    {name: 'месяц', y: PY0 - 140},
  ];
  return (
    <g>
      {/* people counter */}
      <g opacity={countP > 0 ? 1 : 0}>
        <text x={PX0} y={150} {...label(120, TYPE.weightBold)} style={{fontVariantNumeric: 'tabular-nums'}}>
          {count}
        </text>
        <text x={PX0 + 250} y={150} {...label(48)}>
          человек
        </text>
      </g>
      {/* axes */}
      <g opacity={axesP}>
        <line x1={PX0} y1={PY0} x2={PX1} y2={PY0} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinecap="round" />
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1 - 20} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinecap="round" />
        <text x={PX0} y={PY0 + 56} {...label(44)} textAnchor="middle">
          14
        </text>
        <text x={PX1} y={PY0 + 56} {...label(44)} textAnchor="middle">
          94
        </text>
        <text x={(PX0 + PX1) / 2} y={PY0 + 56} {...label(44)} textAnchor="middle" fill={COLORS.inkSoft}>
          возраст
        </text>
        <text x={PX0 - 20} y={PY0 - 10} {...label(36)} textAnchor="start" fill={COLORS.inkSoft} transform={`rotate(-90 ${PX0 - 20} ${PY0 - 10})`}>
          медленно → быстро
        </text>
      </g>
      {/* respondents: dots along the age axis */}
      {dots.map((i) => {
        const delay = (i / dots.length) * 0.7;
        const p = interpolate(dotsP, [delay, delay + 0.3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.overshoot});
        const x = PX0 + 14 + random(`dx${i}`) * (PX1 - PX0 - 28);
        const y = PY0 + 100 + random(`dy${i}`) * 44;
        return <circle key={i} cx={x} cy={y} r={9 * p} fill={i % 9 === 0 ? COLORS.accent : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.micro} />;
      })}
      {/* short intervals: flat lines, no rise with age */}
      {shortLines.map((l, i) => {
        const p = interpolate(linesP, [i * 0.2, i * 0.2 + 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out});
        return (
          <g key={l.name} opacity={1 - dimShort * 0.6}>
            <line x1={PX0} y1={l.y} x2={PX0 + (PX1 - PX0) * p} y2={l.y} stroke={COLORS.inkSoft} strokeWidth={STROKE.secondary} strokeLinecap="round" />
            <text x={PX1 - 4} y={l.y - 8} {...label(36)} fill={COLORS.inkSoft} opacity={p} textAnchor="end">
              {l.name}
            </text>
          </g>
        );
      })}
      {/* last 10 years: coral line rising to ~50 then level */}
      {decadeP > 0 ? (
        <g>
          <path d={DECADE_PATH} fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main * 2} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
          <text x={PX1 - 4} y={PY0 - 340} {...label(44, TYPE.weightBold)} fill={COLORS.accent} opacity={decadeP > 0.95 ? 1 : 0} textAnchor="end">
            10 лет
          </text>
        </g>
      ) : null}
      {peakP > 0 ? (
        <g opacity={peakP}>
          <line x1={ageX(50)} y1={PY0 - 320} x2={ageX(50)} y2={PY0} stroke={COLORS.accent} strokeWidth={STROKE.secondary} strokeDasharray="8 8" />
          <circle cx={ageX(50)} cy={PY0 - 320} r={14 * peakP} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
          <text x={ageX(50) + 16} y={PY0 - 255} {...label(48, TYPE.weightBold)} textAnchor="start" fill={COLORS.accent}>
            ≈50 лет
          </text>
        </g>
      ) : null}
      {/* "small effect": a bracket that shows the rise is modest, not a number */}
      {smallP > 0 ? (
        <g opacity={smallP}>
          <path d={`M${ageX(94) + 26},${PY0 - 190} l14,0 l0,-130 l-14,0`} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
};
