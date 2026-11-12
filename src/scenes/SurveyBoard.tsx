import React from 'react';
import {interpolate} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {COLORS, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {EASE} from '../lib/anim';
import {Clipboard, Corkboard, LW, LW2, LW3, Marker, Person, Pin, Sticky} from '../illustrations/Board';

// World coordinates (frontal). Board 80..900 × 300..1100.
export const BOARD = {x: 80, y: 300, w: 820, h: 800};
export const PX0 = 210;
export const PX1 = 820;
export const PY0 = 900;
const ageX = (age: number) => PX0 + ((age - 14) / 80) * (PX1 - PX0);
export const DECADE_PATH = `M${ageX(14)},${PY0 - 150} C${ageX(30)},${PY0 - 170} ${ageX(42)},${PY0 - 260} ${ageX(50)},${PY0 - 280} L${ageX(94)},${PY0 - 280}`;
const DECADE_LEN = getLength(DECADE_PATH);
export const PEAK: [number, number] = [ageX(50), PY0 - 280];

const t = (size: number, weight: number = TYPE.weightBold, fill: string = COLORS.ink) => ({fontFamily, fontSize: size, fontWeight: weight, fill});
const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

export type SurveyState = {
  tick: number; // clipboard questionnaire 0..1
  clipboardOut: number; // 0 = clipboard on the board, 1 = slid away
  people: number; // 0..1 cascade
  count: number; // 0..1 counter
  lines: number; // short-interval lines 0..1
  dimShort: number;
  decade: number; // coral line drawn 0..1
  peak: number;
  small: number;
  frame: number;
};

/** Icons for the short-interval lanes: clock = hour, 7-cell strip = week, calendar sheet = month. */
const LaneIcon: React.FC<{kind: string; x: number; y: number; p: number}> = ({kind, x, y, p}) => (
  <g transform={`translate(${x} ${y}) scale(${p})`}>
    {kind === 'час' ? (
      <g>
        <circle r={24} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3} />
        <path d="M0,0 L0,-14 M0,0 L10,6" stroke={COLORS.ink} strokeWidth={LW3} strokeLinecap="round" />
      </g>
    ) : kind === 'неделя' ? (
      <g>
        {Array.from({length: 7}, (_, k) => (
          <rect key={k} x={-30 + k * 9} y={-10} width={8} height={20} rx={2} fill={k === 6 ? COLORS.accentSoft : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={1.8} />
        ))}
      </g>
    ) : (
      <g>
        <rect x={-22} y={-26} width={44} height={52} rx={6} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3} />
        <rect x={-22} y={-26} width={44} height={14} rx={6} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW3} />
        {Array.from({length: 6}, (_, k) => (
          <rect key={k} x={-15 + (k % 3) * 11} y={-6 + Math.floor(k / 3) * 13} width={7} height={8} fill="none" stroke={COLORS.inkSoft} strokeWidth={1.5} />
        ))}
      </g>
    )}
  </g>
);

export const SurveyBoard: React.FC<{s: SurveyState}> = ({s}) => {
  const count = Math.round(interpolate(s.count, [0, 1], [0, 499]));
  const evo = evolvePath(EASE.inOut(s.decade), DECADE_PATH);
  const pen = getPointAtLength(DECADE_PATH, Math.max(0.01, DECADE_LEN * EASE.inOut(s.decade)));
  const shortLines = [
    {name: 'час', y: PY0 - 50},
    {name: 'неделя', y: PY0 - 90},
    {name: 'месяц', y: PY0 - 130},
  ];
  const crowd = Array.from({length: 26}, (_, i) => i);
  return (
    <g>
      <Corkboard {...BOARD} />
      {[BOARD.x + 50, BOARD.x + BOARD.w - 50].map((x) => (
        <Pin key={x} x={x} y={BOARD.y + 50} />
      ))}
      {/* counter on a sticky note */}
      <g opacity={s.count > 0 ? 1 : 0} transform={`translate(0 ${(1 - Math.min(1, s.count * 4)) * -40})`}>
        <Sticky x={BOARD.x + 260} y={BOARD.y + 40} w={300} rot={-3}>
          <text x={22} y={120} {...t(100)} style={{fontVariantNumeric: 'tabular-nums'}}>
            {count}
          </text>
          <text x={26} y={180} {...t(36, TYPE.weightMedium)}>
            человек
          </text>
        </Sticky>
        <Pin x={BOARD.x + 410} y={BOARD.y + 50} color={COLORS.ink} />
      </g>
      {/* axes drawn like marker on paper */}
      <line x1={PX0} y1={PY0} x2={PX1} y2={PY0} stroke={COLORS.ink} strokeWidth={LW} strokeLinecap="round" />
      <g opacity={s.decade > 0 ? Math.min(1, s.decade * 4) : 0}>
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY0 - 330} stroke={COLORS.ink} strokeWidth={LW} strokeLinecap="round" />
        <path d={`M${PX0 - 12},${PY0 - 314} L${PX0},${PY0 - 336} L${PX0 + 12},${PY0 - 314}`} fill="none" stroke={COLORS.ink} strokeWidth={LW} strokeLinejoin="round" />
        {/* speed icon instead of words: a small clock with motion lines at the top of the axis */}
        <circle cx={PX0 - 44} cy={PY0 - 320} r={20} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3} />
        <path d={`M${PX0 - 44},${PY0 - 320} l0,-12 M${PX0 - 44},${PY0 - 320} l9,5`} stroke={COLORS.ink} strokeWidth={LW3} strokeLinecap="round" />
        {[0, 1, 2].map((k) => (
          <line key={k} x1={PX0 - 92 - k * 4} y1={PY0 - 330 + k * 10} x2={PX0 - 72 - k * 4} y2={PY0 - 330 + k * 10} stroke={COLORS.inkSoft} strokeWidth={LW3} strokeLinecap="round" />
        ))}
      </g>
      <text x={PX0} y={PY0 + 48} {...t(40)} textAnchor="middle">14</text>
      <text x={PX1} y={PY0 + 48} {...t(40)} textAnchor="middle">94</text>
      {/* respondents: a crowd of faceless figures standing along the age axis */}
      {crowd.map((i) => {
        const delay = (i / crowd.length) * 0.7;
        const p = interpolate(s.people, [delay, delay + 0.3], [0, 1], {...cl, easing: EASE.overshoot});
        const bob = Math.sin((s.frame / 60) * Math.PI * 2 * 0.5 + i) * 2;
        const row = i % 2;
        return <Person key={i} x={PX0 + 12 + ((i * 23.5) % (PX1 - PX0 - 10))} y={PY0 + 120 + row * 34 + bob} s={0.7 + row * 0.08} accent={i % 7 === 3} p={p} />;
      })}
      {/* short intervals: three separate lanes (no shared speed axis), each flat across ages = no change with age */}
      {shortLines.map((l, i) => {
        const p = interpolate(s.lines, [i * 0.2, i * 0.2 + 0.5], [0, 1], {...cl, easing: EASE.out});
        const y = PY0 - 70 - i * 95;
        return (
          <g key={l.name} opacity={1 - s.dimShort}>
            <rect x={PX0 - 10} y={y - 34} width={PX1 - PX0 + 20} height={68} rx={34} fill={COLORS.fillLight} stroke={COLORS.inkSoft} strokeWidth={LW3} opacity={p} />
            <LaneIcon kind={l.name} x={PX0 + 30} y={y} p={p} />
            <line x1={PX0 + 70} y1={y} x2={PX0 + 70 + (PX1 - PX0 - 90) * p} y2={y} stroke={COLORS.ink} strokeWidth={LW2} strokeLinecap="round" />
          </g>
        );
      })}
      {/* last 10 years: drawn by a marker */}
      {s.decade > 0 ? (
        <g>
          <path d={DECADE_PATH} fill="none" stroke={COLORS.accent} strokeWidth={LW * 2} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
          <text x={PX1 - 6} y={PY0 - 300} {...t(44, TYPE.weightBold, COLORS.accent)} textAnchor="end" opacity={s.decade > 0.97 ? 1 : 0}>
            10 лет
          </text>
          {s.decade < 1 && pen ? <Marker x={pen.x} y={pen.y} /> : null}
        </g>
      ) : null}
      {s.peak > 0 ? (
        <g opacity={Math.min(1, s.peak * 2)}>
          <line x1={PEAK[0]} y1={PEAK[1]} x2={PEAK[0]} y2={PY0} stroke={COLORS.accent} strokeWidth={LW3} strokeDasharray="10 10" />
          <g transform={`translate(${PEAK[0]} ${PEAK[1] - (1 - s.peak) * 60})`}>
            <Pin x={0} y={0} />
          </g>
          <Sticky x={PEAK[0] + 20} y={PEAK[1] + 30} w={180} rot={4} fill={COLORS.accentSoft}>
            <text x={22} y={88} {...t(52, TYPE.weightBold, COLORS.ink)}>≈50</text>
            <text x={24} y={134} {...t(34, TYPE.weightMedium)}>лет</text>
          </Sticky>
        </g>
      ) : null}
      {s.small > 0 ? (
        <g opacity={s.small}>
          <path d={`M${PX1 + 22},${PY0 - 150} l16,0 l0,-130 l-16,0`} fill="none" stroke={COLORS.ink} strokeWidth={LW2} strokeLinejoin="round" />
        </g>
      ) : null}
      {/* clipboard with the questionnaire, slides away when the crowd appears */}
      <g transform={`translate(${s.clipboardOut * 700} ${s.clipboardOut * 120})`} opacity={1 - s.clipboardOut}>
        <Clipboard x={560} y={560} tick={s.tick} rot={6} />
      </g>
    </g>
  );
};

/** Two posts holding the board to the ground (frontal). */
export const Box2DPosts: React.FC = () => (
  <g>
    {[BOARD.x + 120, BOARD.x + BOARD.w - 150].map((x) => (
      <rect key={x} x={x} y={BOARD.y + BOARD.h - 20} width={30} height={160} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} />
    ))}
  </g>
);
