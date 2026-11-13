import React from 'react';
import {COLORS, STROKE} from '../theme/tokens';
import {P3, planeMatrix} from '../lib/iso';
import {Box, Line3} from './primitives';

const ns = {vectorEffect: 'non-scaling-stroke' as const};

/** Travel suitcase standing on the floor, with handle, straps and a travel sticker (neutral). */
export const Suitcase: React.FC<{s: number; at: P3; open?: number}> = ({s, at, open = 0}) => {
  const [x, y, z] = at;
  const w = 1.8;
  const d = 0.7;
  const h = 1.3;
  return (
    <g>
      <Box s={s} at={[x, y, z]} size={[w, d, h]} />
      {/* lid hinged on the back top edge: its free edge swings up and back */}
      {open > 0 ? (
        <Line3 s={s} close fill={COLORS.fillMid} width={STROKE.main} points={[[x, y, z + h], [x + w, y, z + h], [x + w, y + d * Math.cos(open * 1.7), z + h + d * Math.sin(open * 1.7)], [x, y + d * Math.cos(open * 1.7), z + h + d * Math.sin(open * 1.7)]]} />
      ) : null}
      {/* handle (on the closed lid) */}
      {open > 0.05 ? null : <Line3 s={s} width={STROKE.main} points={[[x + 0.6, y + d / 2, z + h], [x + 0.6, y + d / 2, z + h + 0.3], [x + 1.2, y + d / 2, z + h + 0.3], [x + 1.2, y + d / 2, z + h]]} />}
      {/* straps on the front face */}
      {[0.45, 1.35].map((u) => (
        <Line3 key={u} s={s} width={STROKE.secondary} points={[[x + u, y + d, z], [x + u, y + d, z + h]]} />
      ))}
      {/* sticker */}
      <g transform={planeMatrix(s, 'wallX', [x + 0.65, y + d, z + h - 0.25])}>
        <circle cx={0.25} cy={0.25} r={0.22} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
        <path d="M0.1,0.3 L0.25,0.15 L0.4,0.3" fill="none" stroke={COLORS.fillLight} strokeWidth={STROKE.micro} {...ns} />
      </g>
    </g>
  );
};

/** A single card moving in 3D (flat, floor-plane), used for cards flying into the tray. */
export const FlyingCard: React.FC<{s: number; at: P3; novel: boolean}> = ({s, at, novel}) => (
  <g>
    <Box s={s} at={at} size={[1.2, 0.85, 0.06]} stroke={STROKE.micro} top={COLORS.fillLight} />
    {novel ? <Box s={s} at={[at[0] + 0.15, at[1] + 0.15, at[2] + 0.06]} size={[0.35, 0.18, 0.01]} stroke={0.5} top={COLORS.accent} /> : null}
  </g>
);
