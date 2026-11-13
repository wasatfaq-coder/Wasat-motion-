import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {LW2} from '../illustrations/Board';
import {RoomSvg, ROOM_S, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {Balloon, Bunting, Chair, Cylinder, IsoCake, Plate, Shell, SideWindow, Sofa, Table} from '../illustrations/Interiors';
import {IsoPerson} from '../illustrations/CityKit';
import {Box, Line3} from '../illustrations/primitives';
import {planeMatrix, P3} from '../lib/iso';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const s = ROOM_S;
const CAKE: P3 = [5.0, 4.3, 2.3];

/** Film strip (px units) with sprocket holes and small frames; it scrolls (speed) to show "pictures per day". */
const Film: React.FC<{id: string; x: number; y: number; w: number; frames: number; scroll: number; reveal: number}> = ({id, x, y, w, frames, scroll, reveal}) => {
  const fw = w / frames;
  return (
    <g>
      <defs>
        <clipPath id={`film-${id}`}>
          <rect x={x} y={y} width={w * reveal} height={120} />
        </clipPath>
      </defs>
      <g clipPath={`url(#film-${id})`}>
        <rect x={x} y={y} width={w} height={120} fill={COLORS.ink} />
        {Array.from({length: frames + 1}, (_, i) => {
          const fx = x + ((i * fw + scroll) % (w + fw)) - fw;
          return (
            <g key={i}>
              <rect x={fx + 6} y={y + 24} width={fw - 12} height={72} rx={4} fill={i % 3 === 0 ? COLORS.fillMid : COLORS.fillLight} />
              {i % 3 === 0 ? (
                <g>
                  <path d={`M${fx + 14},${y + 88} L${fx + 14},${y + 62} L${fx + fw / 2},${y + 40} L${fx + fw - 14},${y + 62} L${fx + fw - 14},${y + 88} Z`} fill="none" stroke={COLORS.ink} strokeWidth={2} strokeLinejoin="round" />
                </g>
              ) : i % 3 === 1 ? (
                <g>
                  <circle cx={fx + fw / 2} cy={y + 52} r={12} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={2} />
                  <path d={`M${fx + 10},${y + 88} Q${fx + fw / 2},${y + 66} ${fx + fw - 10},${y + 88}`} fill="none" stroke={COLORS.ink} strokeWidth={2} />
                </g>
              ) : (
                <g>
                  <circle cx={fx + fw / 2} cy={y + 55} r={16} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={2} />
                  <line x1={fx + fw / 2} y1={y + 71} x2={fx + fw / 2} y2={y + 90} stroke={COLORS.ink} strokeWidth={2} />
                </g>
              )}
              {[0.25, 0.75].map((k) => (
                <g key={k}>
                  <rect x={fx + fw * k - 5} y={y + 6} width={10} height={10} rx={2} fill={COLORS.fillLight} />
                  <rect x={fx + fw * k - 5} y={y + 104} width={10} height={10} rx={2} fill={COLORS.fillLight} />
                </g>
              ))}
            </g>
          );
        })}
      </g>
      <rect x={x} y={y} width={w * reveal} height={120} fill="none" stroke={COLORS.ink} strokeWidth={LW2} />
    </g>
  );
};

/** Scene 10 (birthday room, isometric): (2) a year is one slice of the cake of life — the cake grows, the slice gets thin;
 *  (3) on the sofa a child and a grandparent film the same day: the child's film has more frames. */
export const Scene10Versions: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const second = beat(scene, 'second');
  const tenth = beat(scene, 'tenth');
  const tiny = beat(scene, 'tiny');
  const third = beat(scene, 'third');
  const images = beat(scene, 'images');
  const grow = interpolate(frame, [tiny - 1.2 * fps, tiny + 0.2 * fps], [0, 1], {...cl, easing: EASE.inOut});
  const slices = Math.round(10 + grow * 40);
  const candles = Math.round(10 + grow * 6); // the slices show the 1/50; candles stay readable
  const r = 1.0 + grow * 0.35;
  const pull = interpolate(frame, [tenth - 14, tenth + 10], [0, 0.55], {...cl, easing: EASE.overshoot}) * (1 - grow * 0.3);
  const cakeIn = interpolate(frame, [0, 18], [0, 1], {...cl, easing: EASE.out});
  const filmP = interpolate(frame, [third + 10, third + 50], [0, 1], cl);
  const scroll = frame * 6;
  const k = 2.6 / 420; // film px → room units
  const cam = shotCam(frame, [
    [0, {focus: roomPoint([5.0, 4.6, 2.4]), zoom: 1.45, screen: [500, 760]}], // the festive room
    [60, {focus: roomPoint([5.0, 4.4, 2.8]), zoom: 1.8, screen: [500, 760]}], // «не единственная версия»: push in on the table
    [second - 4, {focus: roomPoint([CAKE[0], CAKE[1], 3.0]), zoom: 2.3, screen: [500, 760]}], // the cake
    [tenth - 20, {focus: roomPoint([CAKE[0] + 0.5, CAKE[1] + 0.5, 3.0]), zoom: 3.2, screen: [500, 760]}], // the slice comes out
    [tiny - 2.0 * fps, {focus: roomPoint([CAKE[0], CAKE[1], 3.0]), zoom: 2.0, screen: [500, 760]}], // pull back first («С годами»), then the cake grows in frame
    [third - 20, {focus: roomPoint([4.4, 8.9, 2.9]), zoom: 2.7, screen: [520, 740]}], // the sofa: child and grandparent
    [third + 60, {focus: roomPoint([4.4, 8.9, 3.0]), zoom: 3.0, screen: [520, 740]}], // the films: 8 frames vs 4 frames
    [images - 6, {focus: roomPoint([3.1, 8.9, 3.9]), zoom: 3.1, screen: [520, 720]}], // «больше картинок»: punch in on the child's long film,
  ]);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <Shell s={s} floor="parquet" />
        <SideWindow s={s} y={1.8} z={5.8} />
        <Bunting s={s} x0={1.0} x1={9.2} z={6.4} t={t} />
        {frame < third - 20 ? (
          <>
        <Chair s={s} at={[3.1, 1.7, 0]} />
        <Chair s={s} at={[6.0, 1.7, 0]} />
        <Table s={s} at={[2.4, 2.8, 0]} size={[5.2, 3.0, 2.3]} cloth />
        {[[3.1, 3.5], [7.0, 3.5], [3.1, 5.2], [7.0, 5.2]].map(([x, y], i) => (
          <Plate key={i} s={s} at={[x, y, 2.31]} />
        ))}
        {[[3.8, 3.2], [6.4, 5.4]].map(([x, y], i) => (
          <Cylinder key={`c${i}`} s={s} at={[x, y, 2.3]} r={0.16} h={0.32} stroke={STROKE.secondary} />
        ))}
        {/* gift with a ribbon (neutral) */}
        <Box s={s} at={[6.6, 3.0, 2.3]} size={[0.6, 0.6, 0.5]} />
        <Line3 s={s} width={STROKE.secondary} points={[[6.9, 3.6, 2.3], [6.9, 3.6, 2.8], [6.9, 3.0, 2.8]]} />
        <Line3 s={s} width={STROKE.secondary} points={[[6.6, 3.3, 2.8], [7.2, 3.3, 2.8], [7.2, 3.3, 2.3]]} />
        {/* confetti on the cloth */}
        <g transform={planeMatrix(s, 'floor', [2.6, 3.0, 2.31])}>
          {Array.from({length: 26}, (_, i) => (
            <rect key={i} x={random(`cf${i}`) * 4.8} y={random(`cg${i}`) * 2.6} width={0.12} height={0.06} transform={`rotate(${random(`cr${i}`) * 180} ${random(`cf${i}`) * 4.8} ${random(`cg${i}`) * 2.6})`} fill={i % 2 ? COLORS.fillDark : COLORS.inkSoft} />
          ))}
        </g>
        <g opacity={cakeIn}>
          <IsoCake s={s} at={[CAKE[0], CAKE[1], CAKE[2] + (1 - cakeIn) * 0.6]} r={r} h={0.7} slices={slices} candles={candles} pull={pull} frame={frame} />
        </g>
        <Balloon s={s} at={[6.75, 1.73, 2.32]} len={2.2} t={t} seed="b1" />
        <Balloon s={s} at={[6.75, 1.73, 2.32]} len={2.8} t={t + 1} seed="b2" fill={COLORS.fillMid} />
        <Balloon s={s} at={[6.75, 1.73, 2.32]} len={2.5} t={t + 2} seed="b3" />
          </>
        ) : null}
        {/* (3) sofa: the child (left) and the grandparent (right) film the same day */}
        <Sofa s={s} at={[2.8, 8.0, 0]} w={4.2} />
        <IsoPerson s={s} at={[3.6, 8.6, 1.2]} h={1.2} sit bob={Math.abs(Math.sin(t * 5)) * 0.05} />
        <Box s={s} at={[3.95, 8.8, 1.75]} size={[0.38, 0.14, 0.26]} stroke={STROKE.secondary} />
        <IsoPerson s={s} at={[5.6, 8.6, 1.2]} h={1.6} sit />
        <Box s={s} at={[5.95, 8.8, 2.05]} size={[0.38, 0.14, 0.26]} stroke={STROKE.secondary} />
        <Line3 s={s} width={STROKE.main} points={[[6.7, 9.6, 0], [6.55, 9.4, 1.6], [6.3, 9.4, 1.75]]} />
        {/* each camera "prints" its film: a strip above the head, linked to the lens by a dashed beam */}
        {[
          {x: 1.8, z: 4.2, n: 8, cam: [4.14, 8.94, 1.88] as P3},
          {x: 4.7, z: 4.6, n: 4, cam: [6.14, 8.94, 2.18] as P3},
        ].map(({x, z, n, cam}, i) => (
          <g key={`f${i}`} opacity={filmP > 0 ? 1 : 0}>
            <Line3 s={s} width={STROKE.micro} color={COLORS.inkSoft} dash="4 5" points={[cam, [x + 1.3, 8.9, z - 0.74]]} />
            <g transform={`${planeMatrix(s, 'wallX', [x, 8.9, z])} scale(${k}) translate(${-40} ${-380})`}>
              <Film id={`s10-${i}`} x={40} y={380} w={420} frames={n} scroll={scroll * (i ? 0.7 : 1.6)} reveal={filmP} />
            </g>
          </g>
        ))}
      </RoomSvg>
    </AbsoluteFill>
  );
};
