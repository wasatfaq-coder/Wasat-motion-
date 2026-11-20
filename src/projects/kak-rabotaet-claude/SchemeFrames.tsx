import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit} from '../../lib/anatomy';
import {RoomSvg} from '../../lib/camera';
import {FrontalLayer, Plate, Word} from '../../components/Frontal';
import {Inset} from '../../components/Inset';
import {COLORS, STROKE} from '../../theme/tokens';
import {SCHEME} from './scheme.parts';
import {ROOM} from './desk.parts';
import {onTop} from '../../lib/assembly';
import {INSET_TEXT, PLATE_SIZE, SchemeState, schemeState} from './scheme.motion';

// Style frames of the scheme stand (STOP 2, scenes 5–8 and the inset of scene 9). The state of every frame is
// scheme.motion.ts (pure, read by scripts/motion-check.mjs); this file only draws it.

/** The inset of scene 9 in the Inset's 240-unit grid: a light patch (what the method shows) and blurred dashed outlines of
 *  the rest that run off the frame: no share, no percentage, no outline of a whole. */
/** the inset's height in grid units (800 × 640 px on the 240 grid) */
const IH = (640 * 240) / 800;
const LimitInset: React.FC = () => {
  const dash = (x: number, y: number, w: number, h: number, o: number) => <rect key={`${x}.${y}`} x={x} y={y} width={w} height={h} rx={9} fill="none" stroke={COLORS.ink} strokeWidth={2.4} strokeDasharray="7 6" opacity={o} />;
  return (
    <g>
      <defs>
        <filter id="schemeBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2.2} />
        </filter>
        <clipPath id="schemeInsetClip">
          <rect x={STROKE.main} y={STROKE.main} width={240 - 2 * STROKE.main} height={IH - 2 * STROKE.main} rx={20} />
        </clipPath>
      </defs>
      <g clipPath="url(#schemeInsetClip)">
        <rect x={0} y={0} width={240} height={IH} fill={COLORS.fillDark} opacity={0.55} />
        <g filter="url(#schemeBlur)">
          {dash(88, 20, 74, 30, 0.55)}
          {dash(170, 14, 90, 44, 0.45)}
          {dash(86, 62, 60, 34, 0.5)}
          {dash(156, 70, 100, 40, 0.4)}
          {dash(90, 108, 84, 36, 0.5)}
          {dash(184, 120, 70, 46, 0.32)}
          {dash(70, 152, 70, 40, 0.34)}
          {dash(150, 160, 100, 34, 0.26)}
          {dash(-20, 20, 40, 30, 0.34)}
        </g>
        <rect x={16} y={66} width={62} height={70} rx={10} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
        <rect x={24} y={78} width={30} height={10} rx={4} fill={COLORS.fillDark} />
        <rect x={24} y={96} width={46} height={10} rx={4} fill={COLORS.fillDark} />
        <rect x={24} y={114} width={38} height={10} rx={4} fill={COLORS.fillDark} />
      </g>
    </g>
  );
};

export const SchemeView: React.FC<{state: SchemeState}> = ({state}) => {
  if (state.inset)
    return (
      <AnatomyStage>
        <AbsoluteFill style={{background: COLORS.bg}} />
        <FrontalLayer>
          <Inset box={state.inset}>
            <LimitInset />
          </Inset>
          <Plate at={[state.inset.x + state.inset.w / 2, state.inset.y - 42]} text={INSET_TEXT.title} size={PLATE_SIZE} />
          <Plate at={[state.inset.x + state.inset.w / 2, state.inset.y + state.inset.h + 52]} text={INSET_TEXT.limit} size={PLATE_SIZE} />
        </FrontalLayer>
      </AnatomyStage>
    );
  // the stand stands on the podium of the room (desk.parts.ts ROOM: floor, back wall, podium): room first, stand over it
  const picture = onTop(ROOM.svg(), [SCHEME.svg({}, {extra: state.extra, hide: (n) => state.hide.has(n)})], 'the stand stands on the podium in front of the wall: room first, stand over it');
  return (
    <AnatomyStage>
      <RoomSvg cam={state.cam} sides={60} fade={80}>
        <Kit svg={picture} />
      </RoomSvg>
      <FrontalLayer>
        {state.words.map((w) => (
          <Word key={w.name} at={w.at} text={w.text} size={w.size} angle={state.angle} tone={w.tone} show={w.show ?? 1} />
        ))}
        {state.plates.map((p) => (
          <Plate key={p.name} at={p.at} to={p.to} text={p.text} size={p.size} show={p.show ?? 1} />
        ))}
      </FrontalLayer>
    </AnatomyStage>
  );
};

/** Style frames of the scheme stand (projects/kak-rabotaet-claude/content/stills.json). */
export const KakRabotaetClaudeScheme: React.FC = () => <SchemeView state={schemeState(useCurrentFrame())} />;
