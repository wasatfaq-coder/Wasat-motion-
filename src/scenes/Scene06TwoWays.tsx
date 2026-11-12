import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {roomPoint} from './RoomScene';
import {CLOCK} from '../illustrations/Room';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {RoomSvg, ROOM_S} from './RoomScene';
import {BusStop, Car, Ground, IsoPerson, LampPost, Paving, Road, Tree, Building} from '../illustrations/CityKit';

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
  void CLOCK;
  const stopCam = {focus: roomPoint([5.4, 3.8, 1.6]), zoom: interpolate(frame, [0, scene.durationInFrames], [2.1, 2.5]), screen: [520, 560] as [number, number]};
  const trayCam = {...CAM_TRAY, zoom: 2.4, screen: [460, 1000] as [number, number]};
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <AbsoluteFill style={{clipPath: clipBottom}}>
        <RoomStage cam={{...trayCam, zoom: 2.4 - (1 - split) * 0.2}} t={t} cards={plainCards(HOOK_CARDS)} squash={0.7} highlight={laterHl} />
      </AbsoluteFill>
      <AbsoluteFill style={{clipPath: clipTop}}>
        {/* "while it passes": a bus stop, a person waiting, the stop clock ticking, a car passing */}
        <RoomSvg cam={stopCam}>
          <Ground s={ROOM_S} at={[0, 0, 0]} w={12} d={8} />
          <Paving s={ROOM_S} at={[0, 3.0, 0.005]} w={12} d={5} step={0.8} />
          <Road s={ROOM_S} at={[0, 1.2, 0.01]} len={12} dir="x" width={1.6} />
          <Building s={ROOM_S} at={[0.5, -2.6, 0]} size={[3.0, 2.0, 4.0]} floors={4} lit={0.2} />
          <Building s={ROOM_S} at={[4.2, -2.6, 0]} size={[2.6, 2.0, 3.2]} floors={3} accent lit={0.2} />
          <Building s={ROOM_S} at={[7.4, -2.6, 0]} size={[3.2, 2.0, 4.6]} floors={4} lit={0.3} />
          <Car s={ROOM_S} at={[interpolate(frame, [now - 60, now + 60], [-2, 13], clamp), 1.5, 0.01]} accent />
          <BusStop s={ROOM_S} at={[3.4, 3.6, 0]} t={t * (1 + nowHl)} />
          <Tree s={ROOM_S} at={[1.4, 4.2, 0]} t={t} seed="bs1" />
          <LampPost s={ROOM_S} at={[9.4, 3.4, 0]} />
          <IsoPerson s={ROOM_S} at={[4.6, 4.1, 0]} h={1.05} accent bob={Math.sin(t * 4) * 0.02} />
          <IsoPerson s={ROOM_S} at={[5.4, 4.3, 0]} h={0.95} />
        </RoomSvg>
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={0} y1={yMid + tilt + (1 - split) * 900} x2={1080} y2={yMid - tilt + (1 - split) * 900} stroke={COLORS.accent} strokeWidth={STROKE.main * 1.5} opacity={split} />
      </svg>
    </AbsoluteFill>
  );
};
