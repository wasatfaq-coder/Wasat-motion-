import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {RoomSvg, ROOM_S, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {Calendar, Desk, Plant, RoomShell, WallClock} from '../illustrations/Room';
import {HeadCabinet, drawerCell, headFacePoint, DRAWER} from '../illustrations/HeadCabinet';
import {FlyingCard, Suitcase} from '../illustrations/Props';
import {Box, Line3} from '../illustrations/primitives';
import {P3} from '../lib/iso';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const HEAD_AT: P3 = [1.4, 6.4, 0];
const SUIT: P3 = [6.8, 6.6, 0];
const TAPE: P3 = [9.1, 5.4, 0];

/** Scene 8 (isometric): new impressions fly out of the suitcase as cards, land in the drawers of a head-shaped memory
 *  cabinet (drawers slide out, take the card, close and light up); a tape measure rises: the period seems longer. */
export const Scene08Novelty: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const novelty = beat(scene, 'novelty');
  const streets = beat(scene, 'streets');
  const brain = beat(scene, 'brain');
  const memories = beat(scene, 'memories');
  const long = beat(scene, 'long');
  const lid = interpolate(frame, [novelty - 10, novelty + 14], [0, 1], {...cl, easing: EASE.overshoot});
  const n = DRAWER.cols * DRAWER.rows;
  const start = (k: number) => streets - 10 + k * ((memories + 20 - streets) / n);
  const flight = Math.round(0.55 * fps);
  const cardIn = Array.from({length: n}, (_, k) => frame - start(k) - flight);
  const open = cardIn.map((d) => interpolate(d, [-14, 0, 10], [0, 1, 0], cl));
  const lit = cardIn.map((d) => (d > 4 ? 1 : 0));
  const tape = interpolate(frame, [brain, brain + 0.8 * fps], [0, 1.6], {...cl, easing: EASE.out}) + interpolate(frame, [long - 1.0 * fps, long + 0.2 * fps], [0, 2.6], {...cl, easing: EASE.overshoot});
  const cam = shotCam(frame, [
    [0, {focus: roomPoint([4.6, 5.6, 2.4]), zoom: 1.35, screen: [484, 760]}], // the room: head cabinet and suitcase
    [novelty - 20, {focus: roomPoint([SUIT[0] + 0.6, SUIT[1] + 0.4, 0.6]), zoom: 2.1, screen: [484, 700]}], // the suitcase opens
    [streets - 10, {focus: roomPoint([5.4, 6.4, 2.4]), zoom: 1.9, screen: [484, 780]}], // cards fly out
    [brain - 20, {focus: roomPoint([3.6, 6.4, 3.0]), zoom: 1.9, screen: [484, 760]}], // the head cabinet
    [memories - 30, {focus: roomPoint([3.4, 6.4, 2.6]), zoom: 2.4, screen: [484, 760]}], // drawers take the cards
    [long - 1.2 * fps, {focus: roomPoint([5.6, 6.8, 2.4]), zoom: 1.5, screen: [484, 760]}], // the tape rises: long period
  ]);
  const src: P3 = [SUIT[0] + 0.6, SUIT[1] - 0.2, 1.4];
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <RoomShell s={ROOM_S} t={t} />
        <WallClock s={ROOM_S} t={t} />
        <Calendar s={ROOM_S} flutter={0} />
        <Desk s={ROOM_S} t={t} />
        <HeadCabinet s={ROOM_S} at={HEAD_AT} open={open} lit={lit} />
        <Suitcase s={ROOM_S} at={SUIT} open={lid} />
        {/* cards: rise from the suitcase, arc with a little spin, slide into the open drawer */}
        {Array.from({length: n}, (_, k) => {
          const p = (frame - start(k)) / flight;
          if (p <= 0 || p >= 1) return null;
          const {u, w} = drawerCell(k);
          const target = headFacePoint(HEAD_AT, u + 0.1, w + DRAWER.h * 0.6);
          const to: P3 = [target[0], target[1] + 0.4, target[2]];
          const e = EASE.inOut(p);
          const at: P3 = [mix(src[0], to[0], e), mix(src[1], to[1], e), mix(src[2], to[2], e) + 4 * p * (1 - p) * 1.6];
          return <FlyingCard key={k} s={ROOM_S} at={at} novel />;
        })}
        {/* tape measure: case on the floor, the blade rises (ticks, no numbers) */}
        <Box s={ROOM_S} at={TAPE} size={[0.5, 0.5, 0.4]} left={COLORS.accent} right={COLORS.accentSoft} />
        {tape > 0 ? (
          <g>
            <Box s={ROOM_S} at={[TAPE[0] + 0.15, TAPE[1] + 0.2, 0.4]} size={[0.3, 0.08, tape]} stroke={STROKE.secondary} left={COLORS.fillLight} detail="none" />
            {Array.from({length: Math.floor(tape / 0.25)}, (_, i) => (
              <Line3 key={i} s={ROOM_S} width={STROKE.micro} points={[[TAPE[0] + 0.15, TAPE[1] + 0.26, 0.4 + (i + 1) * 0.25], [TAPE[0] + (i % 2 ? 0.25 : 0.3), TAPE[1] + 0.26, 0.4 + (i + 1) * 0.25]]} />
            ))}
          </g>
        ) : null}
        <Plant s={ROOM_S} t={t} />
      </RoomSvg>
    </AbsoluteFill>
  );
};
