import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE, TYPE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {fontFamily} from '../theme/font';
import {Armchair, CalendarPage, CardTray, Desk, DESK, Plant, RoomShell, TRAY, WallClock, Calendar} from '../illustrations/Room';
import {lerpCam, RoomSvg, ROOM_S, roomPoint} from './RoomScene';
import {CAM_TRAY, PAGE_COUNT} from './Scene01Hook';

export const Scene02Stake: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const answer = beat(scene, 'answer');
  const stretch = beat(scene, 'stretch');
  // camera: hold on the tray, gentle pan up as the possible taller pile appears
  const pan = interpolate(frame, [stretch - 20, stretch + 0.9 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const cam = lerpCam(CAM_TRAY, {...CAM_TRAY, screen: [540, 980], zoom: 1.65}, pan);
  const hl = interpolate(frame, [answer - 4, answer + 8, answer + 40], [0, 1, 0.35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const grow = interpolate(frame, [stretch - 5, stretch + 1.1 * fps], [0, 1.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out});
  const labelP = interpolate(frame, [stretch + 0.6 * fps, stretch + 1.0 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labelAt = roomPoint([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, DESK.h + 0.06 + PAGE_COUNT * 0.09 + 1.6]);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <RoomShell s={ROOM_S} t={t} />
        <WallClock s={ROOM_S} t={t} />
        <Calendar s={ROOM_S} flutter={0} />
        <Desk s={ROOM_S} t={t} />
        <CardTray s={ROOM_S} cards={Array.from({length: PAGE_COUNT}, () => ({novel: false}))} dashedExtra={grow} highlight={hl} />
        <Armchair s={ROOM_S} />
        <Plant s={ROOM_S} t={t} />
        {labelP > 0 ? (
          <g opacity={labelP} transform={`translate(${labelAt[0] - 540} ${labelAt[1] - 880 - 34})`}>
            <rect x={-82} y={-30} width={164} height={42} rx={21} fill={COLORS.bg} stroke={COLORS.accent} strokeWidth={STROKE.secondary / 1.65} />
            <text x={0} y={0} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={28} fill={COLORS.ink} textAnchor="middle">
              возможно
            </text>
          </g>
        ) : null}
      </RoomSvg>
    </AbsoluteFill>
  );
};

// keep import used for future page-to-card reuse
void CalendarPage;
