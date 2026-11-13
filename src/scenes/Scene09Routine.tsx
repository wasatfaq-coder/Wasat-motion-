import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {RoomSvg, roomPoint} from './RoomScene';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';
import {shotCam} from './shots';
import {CityLoop, LOOP} from './CityLoop';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

/** Scene 9: routine. A city block: the car runs the same ring home → work → home; identical grey days leave few traces.
 *  After the pause, back home: the pile of years in memory compresses (the biggest transformation of the video). */
export const Scene09Routine: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const routine = beat(scene, 'routine');
  const traces = beat(scene, 'traces');
  const shrink = beat(scene, 'shrink');
  const backHome = shrink - 1.0 * fps;
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  if (frame < backHome) {
    const cam = shotCam(frame, [
      [0, {focus: roomPoint([6.0, 4.6, 1.0]), zoom: 1.4, screen: [484, 780]}], // the whole block
      [routine - 30, {focus: roomPoint([0.6, 4.4, 0.9]), zoom: 2.6, screen: [484, 800]}], // "дом"
      [routine + 0.9 * fps, {focus: roomPoint([11.9, 3.3, 1.9]), zoom: 2.1, screen: [484, 780]}], // "работа"
      [routine + 1.9 * fps, {focus: roomPoint([0.6, 4.4, 0.9]), zoom: 2.6, screen: [484, 800]}], // "дом" again
      [traces - 40, {focus: roomPoint([LOOP.c[0], LOOP.c[1], 0.4]), zoom: 1.5, screen: [484, 800]}], // the ring with faint traces
    ]);
    return (
      <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
        <RoomSvg cam={cam}>
          <CityLoop t={t} frame={frame} carSpeed={(2 * Math.PI) / (2.6 * fps)} grey={interpolate(frame, [traces - 40, traces], [0, 1], cl)} mystery={interpolate(frame, [0, 20, traces - 10, traces + 10], [0, 1, 1, 0], cl)} />
        </RoomSvg>
      </AbsoluteFill>
    );
  }
  const squash = interpolate(frame, [shrink - 5, shrink + 0.9 * fps], [1, 0.28], {...cl, easing: EASE.inOut});
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage cam={{...CAM_TRAY, zoom: interpolate(frame, [backHome, shrink], [2.0, 2.5], cl), screen: [484, 880]}} t={t} cards={plainCards(n)} squash={squash} hideChair />
    </AbsoluteFill>
  );
};
