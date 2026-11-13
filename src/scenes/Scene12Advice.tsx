import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {ROOM_S, roomPoint} from './RoomScene';
import {DESK, TRAY} from '../illustrations/Room';
import {FlyingCard} from '../illustrations/Props';
import {P3} from '../lib/iso';
import {CAM_COVER, CAM_TRAY} from './Scene01Hook';
import {shotCam} from './shots';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';
import {CoverA} from '../Cover';
import {CLOCK} from '../illustrations/Room';
import {RoomSvg} from './RoomScene';
import {CityLoop, LOOP} from './CityLoop';


/** Scene 12: advice and loop. The home-work loop opens into a new branching road; new bright cards arrive; the past may grow longer; the clock still runs evenly. */
export const Scene12Advice: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const nw = beat(scene, 'new');
  const memory = beat(scene, 'memory');
  const longer = beat(scene, 'longer');
  const hour = beat(scene, 'hour');
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  const toRoom = memory - 30;
  if (frame < toRoom) {
    // the city: the ring opens into new roads (park, museum, mountains); bright cards fly home
    const open = interpolate(frame, [0.2 * fps, nw + 20], [0, 1], {...clamp, easing: EASE.inOut});
    const cam = shotCam(frame, [
      [0, {focus: roomPoint([LOOP.c[0] + LOOP.rx, LOOP.c[1], 0.4]), zoom: 2.3, screen: [484, 800]}], // the ring breaks open
      [nw - 50, {focus: roomPoint([12.0, 5.4, 1.2]), zoom: 1.4, screen: [484, 800]}], // new roads to new places
      [nw + 30, {focus: roomPoint([7.6, 4.6, 2.0]), zoom: 1.1, screen: [484, 760]}], // cards fly home
    ]);
    return (
      <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
        <RoomSvg cam={cam}>
          <CityLoop t={t} frame={frame} carSpeed={(2 * Math.PI) / (3.4 * fps)} open={open} cards={interpolate(frame, [nw, toRoom], [0, 1], clamp)} />
        </RoomSvg>
      </AbsoluteFill>
    );
  }
  const starts = Array.from({length: 5}, (_, i) => toRoom + 4 + i * 8);
  const flight = Math.round(0.5 * fps);
  const landed = starts.filter((st) => frame >= st + flight).length;
  const cards = [...plainCards(n), ...Array.from({length: landed}, () => ({novel: true}))];
  const dashed = interpolate(frame, [longer - 10, longer + 0.8 * fps], [0, 1.35], {...clamp, easing: EASE.out});
  const cam = shotCam(frame, [
    [toRoom, {...CAM_TRAY, zoom: 2.9, screen: [484, 900]}],
    [longer - 10, {...CAM_TRAY, zoom: 2.2, screen: [484, 980]}],
    [hour - 30, CAM_COVER],
  ]);
  const src: P3 = [TRAY.x + 1.6, TRAY.y - 1.4, 5.0];
  // loop: in the last second the room clock grows into the cover composition (frame 0 of the video)
  const loopP = interpolate(frame, [hour + 8, scene.durationInFrames - 4], [0, 1], {...clamp, easing: EASE.inOut});
  const clockRoom = roomPoint([CLOCK.u, 0, CLOCK.z]);
  const cs: [number, number] = [CAM_COVER.screen![0] + (clockRoom[0] - CAM_COVER.focus[0]) * CAM_COVER.zoom, CAM_COVER.screen![1] + (clockRoom[1] - CAM_COVER.focus[1]) * CAM_COVER.zoom];
  const startScale = (CLOCK.r * ROOM_S * CAM_COVER.zoom) / 218;
  const coverScale = startScale + (1 - startScale) * loopP;
  const coverX = (cs[0] - 490) * (1 - loopP);
  const coverY = (cs[1] - 980) * (1 - loopP);
  const pileTop = (i: number) => DESK.h + 0.06 + i * 0.09 * 0.28;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <AbsoluteFill>
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
            {starts.map((st, i) => {
              const p = (frame - st) / flight;
              if (p <= 0 || p >= 1) return null;
              const e = EASE.inOut(p);
              const to: P3 = [TRAY.x + 0.2, TRAY.y + 0.2, pileTop(n + i)];
              const at: P3 = [mix(src[0], to[0], e), mix(src[1], to[1], e), mix(src[2], to[2], e)];
              return <FlyingCard key={i} s={ROOM_S} at={at} novel />;
            })}
          </g>
        }
      />
      </AbsoluteFill>
      {loopP > 0 ? (
        <AbsoluteFill style={{backgroundColor: COLORS.bg, clipPath: 'inset(240px 0 710px 0)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 240px, black 330px, black 1120px, transparent 1210px)', maskImage: 'linear-gradient(to bottom, transparent 240px, black 330px, black 1120px, transparent 1210px)'}}>
          <div style={{position: 'absolute', inset: 0, transform: `translate(${coverX}px, ${coverY}px) scale(${coverScale})`, transformOrigin: '490px 980px'}}>
            <CoverA frame={Math.round(loopP * 40) - 40} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
