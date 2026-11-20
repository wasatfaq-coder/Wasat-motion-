import React from 'react';
import {interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {COLORS, STROKE, TYPE, TYPE_FLOOR} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {SAFE, ZONES} from '../theme/layout';
import {textWidth} from './Frontal';

// The atlas signs of the house style (MASTER_PROMPT_FINAL v3.0, sections 2, 10, 11): the chapter mark «Табл. NN / NN»
// with the style's sound signature, and the atlas callouts (a thin leader, a dot on the detail, a numbered ring and a
// short name). Screen space, over RoomSvg; pin callouts to 3D points with screenOf(cam, roomPoint) (src/lib/camera.tsx).

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pad2 = (n: number) => String(n).padStart(2, '0');

/** The sound signature of the style: one mechanical click «into place» when the chapter mark appears (decision of
 *  20.11.2026). The file is licensed in public/audio/sfx/licenses.json. */
export const SIGNATURE_SFX = 'audio/sfx/switch.wav';
export const SIGNATURE_VOLUME = 0.5;

/** The chapter mark: «ТАБЛ. 02 / 04 —— title» in one place and one type in every video, under the captions. It appears
 *  at `from` (a frame of the scene) with the signature click. */
export const ChapterMark: React.FC<{n: number; of: number; title: string; from?: number; dark?: boolean; sound?: boolean}> = ({n, of, title, from = 0, dark, sound = true}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [from, from + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const color = dark ? COLORS.fillMid : COLORS.inkSoft;
  return (
    <>
      {sound ? (
        <Sequence from={from} durationInFrames={30} layout="none">
          <Audio src={staticFile(SIGNATURE_SFX)} volume={SIGNATURE_VOLUME} />
        </Sequence>
      ) : null}
      <div style={{position: 'absolute', left: SAFE.left, top: ZONES.chapterTop, display: 'flex', alignItems: 'center', gap: 16, fontFamily, fontSize: 30, letterSpacing: 4, color, opacity: k, transform: `translateX(${(1 - k) * -14}px)`}}>
        <span style={{fontWeight: TYPE.weightBold}}>
          ТАБЛ. {pad2(n)} / {pad2(of)}
        </span>
        <span style={{width: 60 * k, height: 2, background: 'currentColor'}} />
        <span>{title}</span>
      </div>
    </>
  );
};

export type Callout = {
  n: number; // the number in the ring
  label: string; // a short name: «клапан», «слои модели»
  at: [number, number]; // the detail, screen px
  to: [number, number]; // the ring, screen px (keep it inside the graphics band, away from the button column)
  show?: number; // 0..1: the leader draws from the detail, then the ring and the name appear (on the voice's word)
};

/** Atlas callouts: the leader ENDS ON THE DETAIL (a dot there); the name sits on a plate of the background colour so
 *  it reads over any body. Labels ≥ 26 px (section 10). */
export const Callouts: React.FC<{items: Callout[]; dark?: boolean}> = ({items, dark}) => {
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  const bg = dark ? COLORS.bgDark : COLORS.bg;
  const size = Math.max(TYPE_FLOOR.figure, 32);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      {items.map((c) => {
        const k = clamp01(c.show ?? 1);
        if (k <= 0) return null;
        const line = clamp01(k / 0.6);
        const ring = clamp01((k - 0.5) / 0.5);
        const x = c.at[0] + (c.to[0] - c.at[0]) * line;
        const y = c.at[1] + (c.to[1] - c.at[1]) * line;
        const right = c.to[0] > 540;
        const w = textWidth(c.label, size) * 0.82 + 24;
        return (
          <g key={c.n} fontFamily={fontFamily}>
            <path d={`M${c.at[0]} ${c.at[1]}L${x} ${y}`} stroke={ink} strokeWidth={STROKE.secondary} fill="none" strokeLinecap="round" />
            <circle cx={c.at[0]} cy={c.at[1]} r={6} fill={ink} />
            <g opacity={ring}>
              <circle cx={c.to[0]} cy={c.to[1]} r={23} fill={bg} stroke={ink} strokeWidth={STROKE.secondary} />
              <text x={c.to[0]} y={c.to[1] + 10} textAnchor="middle" fontSize={28} fontWeight={TYPE.weightBold} fill={ink}>
                {c.n}
              </text>
              <rect x={right ? c.to[0] - 34 - w : c.to[0] + 30} y={c.to[1] - 26} width={w} height={50} rx={10} fill={bg} opacity={0.92} />
              <text x={right ? c.to[0] - 42 : c.to[0] + 40} y={c.to[1] + 11} textAnchor={right ? 'end' : 'start'} fontSize={size} fontWeight={TYPE.weightMedium} fill={ink}>
                {c.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/** A callout's leader must end on its detail: true when `at` lies inside the detail's screen box (a guard for scenes). */
export const calloutOnDetail = (c: Callout, box: [number, number, number, number], tol = 4) => c.at[0] >= box[0] - tol && c.at[0] <= box[2] + tol && c.at[1] >= box[1] - tol && c.at[1] <= box[3] + tol;
