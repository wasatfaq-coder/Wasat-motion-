import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam, RoomSvg, ROOM_S, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {Building, FlowerBed, Ground, IsoPerson, LampPost, Paving, Road, Tree} from '../illustrations/CityKit';
import {Box, Line3} from '../illustrations/primitives';
import {planeMatrix, P3} from '../lib/iso';
import {Cam2D, FrontalSvg, FrontCrowd, lerpCam2D, StreetBackdrop} from '../illustrations/Board';
import {Box2DPosts} from './SurveyBoard';
import {SurveyBoard} from './SurveyBoard';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// Square layout (room units, same isometric projection as the room).
const LINE_Y = 6.2; // painted age line on the ground
const CROWD = Array.from({length: 22}, (_, i) => i);
const crowdPos = (i: number): P3 => [1.6 + (i % 11) * 0.78, LINE_Y - 0.6 + Math.floor(i / 11) * 0.9 + (random(`cy${i}`) - 0.5) * 0.2, 0];
const STAND: P3 = [4.6, 2.2, 0];

/** City info stand: two legs and a corkboard panel facing the viewer (front plane y = const). */
const InfoStand: React.FC<{s: number}> = ({s}) => {
  const [x, y] = STAND;
  return (
    <g>
      <Box s={s} at={[x, y, 0]} size={[0.15, 0.15, 3.0]} stroke={STROKE.secondary} />
      <Box s={s} at={[x + 2.85, y, 0]} size={[0.15, 0.15, 3.0]} stroke={STROKE.secondary} />
      <Box s={s} at={[x - 0.1, y - 0.05, 1.0]} size={[3.2, 0.2, 2.3]} top={COLORS.fillMid} left={COLORS.fillMid} right={COLORS.fillMid} />
      <g transform={planeMatrix(s, 'wallX', [x + 0.1, y + 0.15, 3.15])}>
        <rect x={0.2} y={0.25} width={1.0} height={0.75} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
        <polyline points="1.5,1.6 1.9,1.4 2.3,1.0 2.7,1.0" fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" />
        <line x1={1.4} y1={1.7} x2={2.8} y2={1.7} stroke={COLORS.ink} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  );
};

/** Scene 3: a city square. An interviewer with a clipboard walks along a crowd standing on an age line (14 → 94);
 *  the counter rolls to 499; then the camera dives into the info stand where the answers become a chart. */
export const Scene03Survey: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const people = beat(scene, 'people');
  const month = beat(scene, 'month');
  const same = beat(scene, 'same');
  const dive = month - 1.7 * fps; // into the stand → frontal chart
  const crowdP = (i: number) => interpolate(frame, [people - 30 + i * 3, people - 10 + i * 3], [0, 1], {...cl, easing: EASE.overshoot});
  const interviewerX = interpolate(frame, [0, people + 1.5 * fps], [2.4, 9.0], cl);
  const interviewerY = interpolate(frame, [people - 40, people], [4.9, LINE_Y + 1.0], {...cl, easing: EASE.inOut});
  const count = Math.round(interpolate(frame, [people - 20, people + 0.9 * fps], [0, 499], {...cl, easing: EASE.out}));
  const tick = Math.floor(frame / 12) % 2;
  const isoShots: [number, Cam][] = [
    [0, {focus: roomPoint([2.9, 4.6, 0.7]), zoom: 4.2, screen: [484, 820]}], // interviewer asks a passer-by, close
    [people - 40, {focus: roomPoint([5.8, LINE_Y, 0.8]), zoom: 1.75, screen: [484, 860]}], // the whole crowd appears
    [people + 1.5 * fps, {focus: roomPoint([2.6, LINE_Y, 0.6]), zoom: 2.2, screen: [484, 860]}], // the youngest end: 14
    [people + 2.8 * fps, {focus: roomPoint([9.0, LINE_Y, 0.6]), zoom: 2.2, screen: [484, 860]}], // the oldest end: 94
    [dive - 30, {focus: roomPoint([STAND[0] + 1.5, STAND[1], 2.2]), zoom: 3.4, screen: [484, 760]}], // dive into the stand
  ];
  const cam = shotCam(frame, isoShots, 28);
  const toBoard = interpolate(frame, [dive, dive + 14], [0, 1], cl);
  const boardShots: [number, Cam2D][] = [
    [dive, {focus: [490, 800], zoom: 0.8, screen: [484, 720]}],
    [dive + 20, {focus: [490, 820], zoom: 0.78, screen: [484, 720]}], // the stand in the street: board ≤ 65 % width, houses at the sides, crowd in front
    [same + 0.3 * fps, {focus: [490, 780], zoom: 0.82, screen: [484, 720]}],
  ];
  let bcam = boardShots[0][1];
  for (let i = 1; i < boardShots.length; i++) bcam = lerpCam2D(bcam, boardShots[i][1], interpolate(frame, [boardShots[i][0], boardShots[i][0] + 0.6 * fps], [0, 1], cl));
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      {toBoard < 1 ? (
        <RoomSvg cam={cam}>
          <Ground s={ROOM_S} at={[0, 0, 0]} w={12} d={10} fill={COLORS.floor} />
          <Paving s={ROOM_S} at={[0, 1.4, 0.005]} w={12} d={8.6} step={0.8} />
          <Road s={ROOM_S} at={[0, 0, 0.01]} len={12} dir="x" />
          <Building s={ROOM_S} at={[0.4, -2.4, 0]} size={[2.6, 2.0, 4.2]} floors={4} lit={0.2} />
          <Building s={ROOM_S} at={[3.4, -2.6, 0]} size={[3.0, 2.2, 5.6]} floors={5} lit={0.3} />
          <Building s={ROOM_S} at={[6.9, -2.4, 0]} size={[2.4, 2.0, 3.6]} floors={3} accent lit={0.2} />
          <Building s={ROOM_S} at={[9.6, -2.6, 0]} size={[2.2, 2.2, 4.8]} floors={4} lit={0.25} />
          <InfoStand s={ROOM_S} />
          {[[1.0, 3.4], [10.6, 3.6], [0.6, 8.6], [11.2, 8.4]].map(([x, y], i) => (
            <Tree key={i} s={ROOM_S} at={[x, y, 0]} t={t} seed={`sq${i}`} />
          ))}
          {[[0.4, 2.0], [11.2, 2.0], [0.4, 9.2]].map(([x, y], i) => (
            <LampPost key={i} s={ROOM_S} at={[x, y, 0]} />
          ))}
          <FlowerBed s={ROOM_S} at={[8.4, 2.4, 0]} t={t} />
          <FlowerBed s={ROOM_S} at={[1.6, 2.4, 0]} t={t} />
          {/* passers-by who are there before the crowd appears */}
          {[[3.4, 3.6], [7.0, 3.2], [10.2, 5.0]].map(([x, y], i) => (
            <IsoPerson key={`pb${i}`} s={ROOM_S} at={[x + Math.sin(t * 0.6 + i) * 0.3, y, 0]} h={1.0} />
          ))}
          {/* painted age line with ticks and labels */}
          <g transform={planeMatrix(ROOM_S, 'floor', [1.2, LINE_Y + 1.6, 0.01])}>
            <line x1={0} y1={0} x2={9.0} y2={0} stroke={COLORS.ink} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" />
            {Array.from({length: 10}, (_, k) => (
              <line key={k} x1={k} y1={-0.15} x2={k} y2={0.15} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {/* benches */}
          {[[2.0, 4.2], [8.0, 4.2]].map(([x, y], i) => (
            <g key={i}>
              <Box s={ROOM_S} at={[x, y, 0.4]} size={[1.4, 0.45, 0.08]} stroke={STROKE.secondary} />
              <Box s={ROOM_S} at={[x, y, 0.48]} size={[1.4, 0.08, 0.4]} stroke={STROKE.secondary} />
              <Line3 s={ROOM_S} points={[[x + 0.1, y + 0.4, 0], [x + 0.1, y + 0.4, 0.4]]} width={STROKE.secondary} />
              <Line3 s={ROOM_S} points={[[x + 1.3, y + 0.4, 0], [x + 1.3, y + 0.4, 0.4]]} width={STROKE.secondary} />
            </g>
          ))}
          {/* the crowd: faceless figures from 14 to 94 along the line */}
          {CROWD.map((i) => (
            <IsoPerson key={i} s={ROOM_S} at={crowdPos(i)} h={0.85 + random(`h${i}`) * 0.3} accent={i % 7 === 3} bob={Math.sin(t * 3 + i) * 0.02} p={crowdP(i)} />
          ))}
          {/* interviewer with a clipboard */}
          <IsoPerson s={ROOM_S} at={[interviewerX, interviewerY, 0]} h={1.1} accent />
          {frame < people ? <IsoPerson s={ROOM_S} at={[interviewerX + 0.9, interviewerY - 0.3, 0]} h={0.95} /> : null}
          <Box s={ROOM_S} at={[interviewerX + 0.3, interviewerY + 0.3, 0.6]} size={[0.35, 0.05, 0.45]} stroke={STROKE.secondary} left={tick ? COLORS.fillLight : COLORS.fillLight} />
        </RoomSvg>
      ) : null}
      {/* 499 counter floats over the crowd */}
      {frame >= people - 20 && frame < dive ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${484} ${cam.zoom < 1.6 ? 430 : 400})`} opacity={interpolate(frame, [people - 20, people], [0, 1], cl)}>
            <rect x={-250} y={-90} width={530} height={150} rx={30} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={5} />
            <text x={-200} y={40} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={110} fill={COLORS.ink} style={{fontVariantNumeric: 'tabular-nums'}}>
              {count}
            </text>
            <text x={70} y={30} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={40} fill={COLORS.ink}>человек</text>
          </g>
        </svg>
      ) : null}
      {toBoard > 0 ? (
        <AbsoluteFill style={{opacity: toBoard}}>
          <FrontalSvg cam={bcam}>
            <StreetBackdrop frame={frame} />
            <Box2DPosts />
            <SurveyBoard
              s={{
                frame,
                tick: 1,
                clipboardOut: 1,
                people: 1,
                count: 1,
                lines: interpolate(frame, [month - 1.2 * fps, month + 0.2 * fps], [0, 1], cl),
                dimShort: 0,
                decade: 0,
                peak: 0,
                small: 0,
              }}
            />
        <FrontCrowd y={1215} react={0} frame={frame} />
          </FrontalSvg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
