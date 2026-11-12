import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {lerpCam, ROOM_S, roomPoint} from './RoomScene';
import {CAL, Calendar, DESK, TRAY} from '../illustrations/Room';
import {shotCam} from './shots';
import {FlyingCard, Suitcase} from '../illustrations/Props';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {RoomSvg} from './RoomScene';
import {Building, Ground, IsoPerson, Sea, Tree, Umbrella} from '../illustrations/CityKit';
import {Box} from '../illustrations/primitives';
import {Suitcase as Suitcase3D} from '../illustrations/Props';
import {P3} from '../lib/iso';

export const HOLIDAY_CARDS = 8;
const SUITCASE: P3 = [4.2, 2.9, 0];

/** Scene 7: holiday paradox. The calendar flips fast (days fly), but a thick pile of bright cards comes out of the suitcase into memory. */
export const Scene07Holiday: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const fast = beat(scene, 'fast');
  const long = beat(scene, 'long');
  const flutter = interpolate(frame, [fast - 10, fast, fast + 0.9 * fps, fast + 1.1 * fps], [0, 1, 1, 0], clamp) * Math.abs(Math.sin(frame * 1.3));
  const open = interpolate(frame, [long - 40, long - 10], [0, 1], {...clamp, easing: EASE.out});
  const starts = Array.from({length: HOLIDAY_CARDS}, (_, i) => long - 12 + i * 5);
  const flight = Math.round(0.45 * fps);
  const landed = starts.filter((st) => frame >= st + flight).length;
  const cards = [...plainCards(HOOK_CARDS), ...Array.from({length: landed}, () => ({novel: true}))];
  const camStart = {focus: roomPoint([5.0, 1.8, 2.6]), zoom: 1.9, screen: [484, 780] as [number, number]};
  const camEnd = {focus: roomPoint([6.2, 1.6, 3.0]), zoom: 2.2, screen: [484, 760] as [number, number]};
  void lerpCam;
  const calCam = {focus: roomPoint([CAL.u + 0.75, 0, CAL.z - 1.0]), zoom: 3.0, screen: [484, 760] as [number, number]};
  const suitCam = {focus: roomPoint([SUITCASE[0] + 0.9, SUITCASE[1] + 0.35, 1.0]), zoom: 2.6, screen: [484, 860] as [number, number]};
  void calCam;
  const cam = shotCam(frame, [
    [0, camStart],
    [long - 70, suitCam], // the suitcase opens
    [long + 10, camEnd], // bright cards pile up in memory
    [beat(scene, 'how') - 10, {...camEnd, zoom: 1.8}],
  ]);
  const src: P3 = [SUITCASE[0] + 0.3, SUITCASE[1] + 0.1, 1.4];
  const pileTop = (n: number) => DESK.h + 0.06 + n * 0.09;
  // part 1: the beach — the sun races across the sky three times (days fly)
  const home = long - 75;
  const beachCam = shotCam(frame, [
    [0, {focus: roomPoint([6.4, 2.8, 1.6]), zoom: 1.55, screen: [484, 720]}],
    [fast - 20, {focus: roomPoint([7.0, 2.6, 1.8]), zoom: 1.55, screen: [484, 740]}],
    [fast + 1.2 * fps, {focus: roomPoint([6.6, 4.8, 0.9]), zoom: 2.2, screen: [484, 680]}], // suitcase and towel close
  ]);
  const sunP = interpolate(frame, [fast - 10, home], [0, 3], clamp);
  const sunA = Math.PI * (sunP % 1);
  const [scx, scy] = [484 - Math.cos(sunA) * 360, 720 - Math.sin(sunA) * 300];
  if (frame < home) {
    return (
      <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
        <AbsoluteFill>
          <RoomSvg cam={beachCam}>
            <Sea s={ROOM_S} at={[0, 0, 0]} w={12} d={3.2} t={t} />
            <Ground s={ROOM_S} at={[0, 3.2, 0]} w={12} d={6} fill="#F3E3C3" />
            <Building s={ROOM_S} at={[8.6, -2.2, 0]} size={[3.0, 2.0, 4.4]} floors={4} accent lit={0.3} />
            <Box s={ROOM_S} at={[2.0, 1.0, 0.02]} size={[1.6, 0.6, 0.3]} stroke={2.5} left={COLORS.fillLight} right={COLORS.accentSoft} />
            <Umbrella s={ROOM_S} at={[5.4, 4.6, 0]} />
            <Umbrella s={ROOM_S} at={[9.0, 5.6, 0]} />
            <Box s={ROOM_S} at={[5.6, 5.0, 0.01]} size={[1.8, 0.8, 0.03]} stroke={2.5} top={COLORS.accentSoft} />
            <IsoPerson s={ROOM_S} at={[4.2, 5.4, 0]} h={1.0} accent bob={Math.sin(t * 2) * 0.02} />
            <Suitcase3D s={ROOM_S} at={[7.6, 5.4, 0]} />
            <Tree s={ROOM_S} at={[1.2, 6.2, 0]} t={t} seed="palm1" h={2.2} />
            <Tree s={ROOM_S} at={[10.4, 6.6, 0]} t={t} seed="palm2" h={1.8} />
            {[[2.2, 7.6], [8.8, 7.8], [3.6, 8.4]].map(([x, y], i) => (
              <Box key={i} s={ROOM_S} at={[x, y, 0]} size={[0.3, 0.3, 0.12]} stroke={2} top={COLORS.fillLight} />
            ))}
          </RoomSvg>
        </AbsoluteFill>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {sunP > 0 && sunP < 3 ? (
            <g>
              <circle cx={scx} cy={scy} r={56} fill="#F8E7B5" stroke={COLORS.ink} strokeWidth={5} />
              {Array.from({length: 8}, (_, k) => {
                const a = (k / 8) * Math.PI * 2 + frame * 0.05;
                return <line key={k} x1={scx + Math.cos(a) * 70} y1={scy + Math.sin(a) * 70} x2={scx + Math.cos(a) * 92} y2={scy + Math.sin(a) * 92} stroke={COLORS.ink} strokeWidth={4} strokeLinecap="round" />;
              })}
            </g>
          ) : null}
        </svg>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage
        cam={cam}
        t={t}
        cards={cards}
        hideChair
        behind={<Calendar s={ROOM_S} flutter={flutter} />}
        front={
          <>
            <Suitcase s={ROOM_S} at={SUITCASE} open={open} />
            {starts.map((st, i) => {
              const p = (frame - st) / flight;
              if (p <= 0 || p >= 1) return null;
              const e = EASE.inOut(p);
              const to: P3 = [TRAY.x + 0.2, TRAY.y + 0.2, pileTop(HOOK_CARDS + i)];
              const at: P3 = [mix(src[0], to[0], e), mix(src[1], to[1], e), mix(src[2], to[2], e) + Math.sin(Math.PI * p) * 1.4];
              return <FlyingCard key={i} s={ROOM_S} at={at} novel />;
            })}
          </>
        }
      />
    </AbsoluteFill>
  );
};
