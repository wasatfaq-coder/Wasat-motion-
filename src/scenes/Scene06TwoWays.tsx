import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {roomPoint} from './RoomScene';
import {CLOCK} from '../illustrations/Room';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';

/** Scene 6: two ways to judge time — the frame splits into the clock (while it passes) and the tray (looking back). */
export const Scene06TwoWays: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const two = beat(scene, 'two');
  const now = beat(scene, 'now');
  const later = beat(scene, 'later');
  const split = interpolate(frame, [two - 10, two + 0.8 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  // split line: from off-screen to the diagonal across the graphics band
  const yMid = 720;
  const tilt = 120;
  const clipTop = `polygon(0 0, 1080px 0, 1080px ${yMid - tilt + (1 - split) * 900}px, 0 ${yMid + tilt + (1 - split) * 900}px)`;
  const clipBottom = `polygon(0 ${yMid + tilt + (1 - split) * 900}px, 1080px ${yMid - tilt + (1 - split) * 900}px, 1080px 1920px, 0 1920px)`;
  const nowHl = interpolate(frame, [now - 6, now + 8, later - 20, later], [0, 1, 1, 0.2], clamp);
  const laterHl = interpolate(frame, [later - 6, later + 8], [0, 1], clamp);
  const clockCam = {focus: roomPoint([CLOCK.u, 0, CLOCK.z]), zoom: 2.4, screen: [520, 520] as [number, number]};
  const trayCam = {...CAM_TRAY, zoom: 2.4, screen: [460, 1000] as [number, number]};
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <AbsoluteFill style={{clipPath: clipBottom}}>
        <RoomStage cam={{...trayCam, zoom: 2.4 - (1 - split) * 0.2}} t={t} cards={plainCards(HOOK_CARDS)} squash={0.7} highlight={laterHl} />
      </AbsoluteFill>
      <AbsoluteFill style={{clipPath: clipTop}}>
        <RoomStage cam={clockCam} t={t} cards={plainCards(HOOK_CARDS)} squash={0.7} clockAccent={nowHl} />
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={0} y1={yMid + tilt + (1 - split) * 900} x2={1080} y2={yMid - tilt + (1 - split) * 900} stroke={COLORS.accent} strokeWidth={STROKE.main * 1.5} opacity={split} />
      </svg>
    </AbsoluteFill>
  );
};
