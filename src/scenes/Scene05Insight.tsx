import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {lerpCam, roomPoint} from './RoomScene';
import {CLOCK, DESK} from '../illustrations/Room';
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
  const back = beat(scene, 'back');
  const wide = {focus: roomPoint([6.6, 0.8, 3.9]), zoom: 1.9, screen: [484, 760] as [number, number]};
  const toWide = interpolate(frame, [back - 30, back], [0, 1], {...clamp, easing: EASE.inOut});
  const cam = lerpCam(lerpCam(lerpCam({...CAM_TRAY, zoom: 2.2, screen: [484, 900]}, clockCam, toClock), {...CAM_TRAY, zoom: 2.6, screen: [484, 860]}, toTray), wide, toWide);
  const arrow = interpolate(frame, [back - 10, back + 0.7 * fps], [0, 1], clamp);
  const c0 = roomPoint([CLOCK.u - 0.6, 0, CLOCK.z - 0.9]);
  const c1 = roomPoint([7.0, 1.4, DESK.h + 1.4]);
  const clockAccent = interpolate(frame, [day - 6, day + 6, years - 30, years], [0, 1, 1, 0], clamp);
  const squash = interpolate(frame, [years - 4, years + 1.0 * fps], [1, 0.7], {...clamp, easing: EASE.inOut});
  const hl = interpolate(frame, [years - 4, years + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage
        cam={cam}
        t={t}
        cards={plainCards(HOOK_CARDS)}
        squash={squash}
        highlight={hl}
        clockAccent={clockAccent}
        front={
          arrow > 0 ? (
            <path
              d={`M${c0[0] - 540},${c0[1] - 880} Q${(c0[0] + c1[0]) / 2 - 540 - 120},${(c0[1] + c1[1]) / 2 - 880} ${c1[0] - 540},${c1[1] - 880}`}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="12 10"
              pathLength={1}
              style={{strokeDasharray: `${arrow} 1`}}
            />
          ) : null
        }
      />
    </AbsoluteFill>
  );
};
