import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {lerpCam, roomPoint} from './RoomScene';
import {CLOCK} from '../illustrations/Room';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';

/** Scene 5: not the days speed up (the clock keeps its pace) — the years do, when we look back (the pile in memory compresses). */
export const Scene05Insight: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const day = beat(scene, 'day');
  const years = beat(scene, 'years');
  const clockCam = {focus: roomPoint([CLOCK.u, 0, CLOCK.z]), zoom: 2.6, screen: [484, 760] as [number, number]};
  const toClock = interpolate(frame, [0, day], [0, 1], {...clamp, easing: EASE.inOut});
  const toTray = interpolate(frame, [years - 30, years + 10], [0, 1], {...clamp, easing: EASE.inOut});
  const cam = lerpCam(lerpCam({...CAM_TRAY, zoom: 2.2, screen: [484, 900]}, clockCam, toClock), {...CAM_TRAY, zoom: 2.6, screen: [484, 860]}, toTray);
  const clockAccent = interpolate(frame, [day - 6, day + 6, years - 30, years], [0, 1, 1, 0], clamp);
  const squash = interpolate(frame, [years - 4, years + 1.0 * fps], [1, 0.7], {...clamp, easing: EASE.inOut});
  const hl = interpolate(frame, [years - 4, years + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage cam={cam} t={t} cards={plainCards(HOOK_CARDS)} squash={squash} highlight={hl} clockAccent={clockAccent} />
    </AbsoluteFill>
  );
};
