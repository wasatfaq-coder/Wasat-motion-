import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {lerpCam, ROOM_S, roomPoint} from './RoomScene';
import {DESK, TRAY} from '../illustrations/Room';
import {FlyingCard} from '../illustrations/Props';
import {planeMatrix, P3} from '../lib/iso';
import {CAM_COVER, CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';

const LOOP_C: P3 = [5.9, 6.1, 0.01];

/** Scene 12: advice and loop. The home-work loop opens into a new branching road; new bright cards arrive; the past may grow longer; the clock still runs evenly. */
export const Scene12Advice: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const nw = beat(scene, 'new');
  const longer = beat(scene, 'longer');
  const hour = beat(scene, 'hour');
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  const openLoop = interpolate(frame, [0.2 * fps, nw], [0, 1], {...clamp, easing: EASE.inOut});
  const starts = Array.from({length: 5}, (_, i) => nw + i * 14);
  const flight = Math.round(0.6 * fps);
  const landed = starts.filter((st) => frame >= st + flight).length;
  const cards = [...plainCards(n), ...Array.from({length: landed}, () => ({novel: true}))];
  const dashed = interpolate(frame, [longer - 10, longer + 0.8 * fps], [0, 1.35], {...clamp, easing: EASE.out});
  const loopCam = {focus: roomPoint([6.4, 3.8, 1.0]), zoom: 1.55, screen: [484, 720] as [number, number]};
  const toTray = interpolate(frame, [nw + 40, nw + 100], [0, 1], {...clamp, easing: EASE.inOut});
  const toCover = interpolate(frame, [hour - 30, hour + 0.6 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const cam = lerpCam(lerpCam(loopCam, {...CAM_TRAY, zoom: 2.2, screen: [484, 880]}, toTray), CAM_COVER, toCover);
  // the loop opens: the ellipse gap widens and a road with branches grows out of it
  const gap = openLoop * 22;
  const road = (k: number) => interpolate(openLoop, [0.3 + k * 0.15, 0.8 + k * 0.1], [0, 1], clamp);
  const src: P3 = [LOOP_C[0] + 2.0, LOOP_C[1], 0.3];
  const pileTop = (i: number) => DESK.h + 0.06 + i * 0.09 * 0.28;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage
        cam={cam}
        t={t}
        cards={cards}
        squash={0.28}
        dashedExtra={dashed}
        clockAccent={interpolate(frame, [hour - 6, hour + 8], [0, 1], clamp)}
        hideChair
        front={
          <g>
            <g transform={planeMatrix(ROOM_S, 'floor', LOOP_C)}>
              <ellipse cx={0} cy={0} rx={2.0} ry={1.4} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.main} pathLength={100} strokeDasharray={`${100 - gap} ${gap}`} strokeDashoffset={-gap / 2} vectorEffect="non-scaling-stroke" />
              <path d="M2.0,0 L3.2,0.4" fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main} pathLength={1} strokeDasharray={`${road(0)} 1`} vectorEffect="non-scaling-stroke" />
              <path d="M3.2,0.4 L3.9,-0.6" fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main} pathLength={1} strokeDasharray={`${road(1)} 1`} vectorEffect="non-scaling-stroke" />
              <path d="M3.2,0.4 L4.0,1.4" fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main} pathLength={1} strokeDasharray={`${road(2)} 1`} vectorEffect="non-scaling-stroke" />
            </g>
            {starts.map((st, i) => {
              const p = (frame - st) / flight;
              if (p <= 0 || p >= 1) return null;
              const e = EASE.inOut(p);
              const to: P3 = [TRAY.x + 0.2, TRAY.y + 0.2, pileTop(n + i)];
              const at: P3 = [mix(src[0], to[0], e), mix(src[1], to[1], e), mix(src[2], to[2], e) + Math.sin(Math.PI * p) * 1.6];
              return <FlyingCard key={i} s={ROOM_S} at={at} novel />;
            })}
          </g>
        }
      />
    </AbsoluteFill>
  );
};
