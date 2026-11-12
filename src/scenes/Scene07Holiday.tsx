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
  const cam = shotCam(frame, [
    [0, camStart],
    [fast - 30, calCam], // the calendar flips fast: days fly
    [long - 70, suitCam], // the suitcase opens
    [long + 10, camEnd], // bright cards pile up in memory
    [beat(scene, 'how') - 10, {...camEnd, zoom: 1.8}],
  ]);
  const src: P3 = [SUITCASE[0] + 0.3, SUITCASE[1] + 0.1, 1.4];
  const pileTop = (n: number) => DESK.h + 0.06 + n * 0.09;
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
