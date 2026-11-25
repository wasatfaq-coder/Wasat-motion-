import React from 'react';
import {COLORS, STROKE, TYPE_FLOOR} from '../theme/tokens';
import {fontFamily} from '../theme/font';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** A live meter in the lower band. The track and the ticks are neutral; only the value mark is coral,
 *  and only when that value is the topic's one meaning. It follows `value` 0..1, the same clock as the action. */
export const Sensor: React.FC<{x: number; y: number; w?: number; value: number; label: string; source?: string; dark?: boolean}> = ({
  x,
  y,
  w = 760,
  value,
  label,
  source,
  dark = false,
}) => {
  const v = clamp01(value);
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  const track = dark ? COLORS.inkSoft : COLORS.fillDark;
  const h = 78;
  const mark = x + 24 + (w - 48) * v;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <text x={x} y={y + 28} fill={ink} fontFamily={fontFamily} fontSize={TYPE_FLOOR.figure} fontWeight={700}>
        {label}
      </text>
      <line x1={x + 24} y1={y + 52} x2={x + w - 24} y2={y + 52} stroke={track} strokeWidth={STROKE.main} strokeLinecap="round" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={x + 24 + (w - 48) * t} y1={y + 44} x2={x + 24 + (w - 48) * t} y2={y + 60} stroke={ink} strokeWidth={STROKE.secondary} />
      ))}
      <circle cx={mark} cy={y + 52} r={11} fill={COLORS.accent} />
      {source ? (
        <text x={x} y={y + h} fill={dark ? COLORS.fillMid : COLORS.inkSoft} fontFamily={fontFamily} fontSize={TYPE_FLOOR.auxiliary}>
          {source}
        </text>
      ) : null}
    </svg>
  );
};
