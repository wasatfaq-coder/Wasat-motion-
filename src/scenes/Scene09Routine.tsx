import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {lerpCam, ROOM_S, roomPoint} from './RoomScene';
import {Box} from '../illustrations/primitives';
import {planeMatrix, P3} from '../lib/iso';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';

const LOOP_C: P3 = [5.9, 6.1, 0.01];
const RX = 2.0;
const RY = 1.4;
const loopPoint = (a: number): P3 => [LOOP_C[0] + Math.cos(a) * RX, LOOP_C[1] + Math.sin(a) * RY, 0.02];

/** House (left of the loop) and office block (right): simple boxes with roofs. */
const House: React.FC<{at: P3}> = ({at}) => (
  <g>
    <Box s={ROOM_S} at={at} size={[0.7, 0.7, 0.6]} stroke={STROKE.secondary} />
    <path
      d={(() => {
        const [x, y, z] = at;
        const pts: P3[] = [[x, y + 0.7, z + 0.6], [x + 0.35, y + 0.35, z + 1.0], [x + 0.7, y + 0.7, z + 0.6]];
        return pts.map((p, i) => {
          const sx = Math.cos(Math.PI / 6) * (p[0] - p[1]) * ROOM_S;
          const sy = 0.5 * (p[0] + p[1]) * ROOM_S - p[2] * ROOM_S;
          return `${i ? 'L' : 'M'}${sx},${sy}`;
        }).join(' ') + ' Z';
      })()}
      fill={COLORS.fillLight}
      stroke={COLORS.ink}
      strokeWidth={STROKE.secondary}
      strokeLinejoin="round"
    />
  </g>
);

/** Scene 9: routine. Identical grey days run the home → work → home loop and leave few traces; then the years in memory compress. */
export const Scene09Routine: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const routine = beat(scene, 'routine');
  const shrink = beat(scene, 'shrink');
  const loopCam = {focus: roomPoint([6.3, 4.2, 0.8]), zoom: 1.55, screen: [484, 720] as [number, number]};
  const toTray = interpolate(frame, [shrink - 1.0 * fps, shrink - 0.3 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const cam = lerpCam(loopCam, {...CAM_TRAY, zoom: 2.4, screen: [484, 880]}, toTray);
  const loopDraw = interpolate(frame, [routine - 40, routine + 20], [0, 1], {...clamp, easing: EASE.inOut});
  // the big transformation: the pile compresses (after the pause in the voice)
  const squash = interpolate(frame, [shrink - 5, shrink + 1.4 * fps], [1, 0.28], {...clamp, easing: EASE.inOut});
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  const runners = Array.from({length: 6}, (_, i) => i);
  const speed = (2 * Math.PI) / (3.0 * fps); // one lap per 3 s: steady, monotonous
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage
        cam={cam}
        t={t}
        cards={plainCards(n)}
        squash={squash}
        hideChair
        front={
          <g>
            <g transform={planeMatrix(ROOM_S, 'floor', LOOP_C)}>
              <ellipse cx={0} cy={0} rx={RX} ry={RY} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.main} strokeDasharray={`${loopDraw * 100} 100`} pathLength={100} vectorEffect="non-scaling-stroke" />
            </g>
            <House at={[LOOP_C[0] - RX - 0.35, LOOP_C[1] - 0.35, 0]} />
            <Box s={ROOM_S} at={[LOOP_C[0] + RX - 0.35, LOOP_C[1] - 0.4, 0]} size={[0.7, 0.8, 1.2]} stroke={STROKE.secondary} />
            {loopDraw >= 1
              ? runners.map((i) => {
                  const a = frame * speed + (i / runners.length) * Math.PI * 2;
                  const p = loopPoint(a);
                  return <Box key={i} s={ROOM_S} at={[p[0] - 0.25, p[1] - 0.18, 0.02]} size={[0.5, 0.36, 0.05]} stroke={STROKE.micro} top={COLORS.fillDark} />;
                })
              : null}
          </g>
        }
      />
    </AbsoluteFill>
  );
};
