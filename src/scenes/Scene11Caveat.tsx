import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {LW, LW2, Marker} from '../illustrations/Board';
import {CARD_H, CARD_W, MemoryCard} from '../illustrations/MemoryCards';
import {RoomSvg, ROOM_S, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {Cylinder, Shell, SideWindow, Table, WallShelf} from '../illustrations/Interiors';
import {IsoPerson} from '../illustrations/CityKit';
import {Box, Line3} from '../illustrations/primitives';
import {iso, P3, planeMatrix} from '../lib/iso';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const s = ROOM_S;
const QUESTION = 'M380,520 C380,400 600,400 600,520 C600,600 490,610 490,690 L490,730';
const QLEN = getLength(QUESTION);
const BOARD = {x: 1.6, z: 6.1, w: 6.8, h: 3.4} as const;
const KQ = 0.0068; // question px → board units
const BENCH_Z = 2.2;
const SCI: P3[] = [[2.5, 2.3, 0], [7.2, 2.3, 0]];

const Bubble: React.FC<{x: number; y: number; flip?: boolean; p: number; jiggle: number}> = ({x, y, flip, p, jiggle}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -p : p} ${p}) rotate(${jiggle})`}>
    <path d="M-110,-60 Q-110,-110 -50,-110 L60,-110 Q120,-110 120,-60 L120,-10 Q120,40 60,40 L-20,40 L-60,80 L-50,40 Q-110,40 -110,-10 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} strokeLinejoin="round" />
    {[-70, -10, 50].map((cx) => (
      <circle key={cx} cx={cx} cy={-35} r={12} fill={COLORS.ink} />
    ))}
  </g>
);

/** Magnifier hovering over the bench: lens ring in the horizontal plane, handle, and a shadow on the bench top. */
const Magnifier: React.FC<{x: number; y: number; z: number}> = ({x, y, z}) => {
  const [sx, sy] = iso(s)([x, y, BENCH_Z + 0.01]);
  return (
    <g>
      <ellipse cx={sx} cy={sy} rx={0.62 * 1.22 * s * 0.8} ry={0.62 * 0.71 * s * 0.8} fill={COLORS.ink} opacity={0.1} />
      <Line3 s={s} width={STROKE.main * 2.4} points={[[x + 0.6, y, z], [x + 1.45, y, z + 0.12]]} />
      <Line3 s={s} width={STROKE.main * 1.2} color={COLORS.fillDark} points={[[x + 0.68, y, z + 0.01], [x + 1.42, y, z + 0.12]]} />
      <g transform={planeMatrix(s, 'floor', [x, y, z])}>
        <circle r={0.62} fill={COLORS.fillLight} fillOpacity={0.3} stroke={COLORS.ink} strokeWidth={STROKE.main * 1.6} vectorEffect="non-scaling-stroke" />
        <path d="M-0.35,-0.2 q0.15,-0.2 0.4,-0.25" fill="none" stroke={COLORS.fillLight} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  );
};

/** Scene 11 (lab, isometric): honest caveat. A marker writes a big question mark on the whiteboard; two scientists
 *  argue in speech bubbles; a magnifier over three memory cards on the bench finds attention and emotions. */
export const Scene11Caveat: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const hyp = beat(scene, 'hypotheses');
  const argue = beat(scene, 'argue');
  const attention = beat(scene, 'attention');
  const stretch = beat(scene, 'stretch');
  const q = interpolate(frame, [0, hyp + 0.9 * fps], [0, 1], cl);
  const evo = evolvePath(EASE.inOut(q), QUESTION);
  const pen = getPointAtLength(QUESTION, Math.max(0.01, QLEN * EASE.inOut(q)));
  const bub = interpolate(frame, [argue - 10, argue + 10], [0, 1], {...cl, easing: EASE.overshoot});
  const jig = Math.sin(frame * 0.6) * 6 * interpolate(frame, [argue, argue + 60, argue + 80], [1, 1, 0], cl);
  const icons = [0, 1, 2].map((i) => interpolate(frame, [argue + 40 + i * 8, argue + 60 + i * 8], [0, 1], {...cl, easing: EASE.overshoot}));
  const magX = interpolate(frame, [attention - 40, attention, attention + 40, attention + 70], [2.4, 4.6, 4.6, 6.2], {...cl, easing: EASE.inOut});
  const eyeLit = interpolate(frame, [attention - 4, attention + 4], [0, 1], cl);
  const heartLit = interpolate(frame, [attention + 50, attention + 58], [0, 1], cl);
  const boardFocus = roomPoint([BOARD.x + BOARD.w / 2, 0, BOARD.z - BOARD.h / 2]);
  const cam = shotCam(frame, [
    [0, {focus: roomPoint([5.0, 3.6, 3.0]), zoom: 1.35, screen: [500, 760]}], // the lab: board, scientists, bench
    [hyp - 10, {focus: boardFocus, zoom: 2.1, screen: [500, 720]}], // the question mark on the board
    [argue - 16, {focus: roomPoint([4.9, 2.3, 2.4]), zoom: 1.9, screen: [500, 760]}], // the scientists argue
    [attention - 50, {focus: roomPoint([4.9, 5.9, 2.4]), zoom: 2.6, screen: [500, 760]}], // magnifier over the cards
    [stretch - 30, {focus: roomPoint([5.0, 3.8, 3.0]), zoom: 1.45, screen: [500, 760]}], // open question to the viewer
  ]);
  const head = (p: P3, h: number) => iso(s)([p[0] + 0.15, p[1] + 0.12, h + 1.0]);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <Shell s={s} floor="tiles" />
        <SideWindow s={s} y={6.0} z={5.8} w={2.6} />
        <WallShelf s={s} y={1.2} z={4.0} len={3.4} seed="lab1" />
        <WallShelf s={s} y={1.2} z={2.6} len={3.4} seed="lab2" />
        {/* whiteboard with frame and tray; the question mark is written on it */}
        <g transform={planeMatrix(s, 'wallX', [BOARD.x, 0.03, BOARD.z])}>
          <rect x={-0.12} y={-0.12} width={BOARD.w + 0.24} height={BOARD.h + 0.24} rx={0.05} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" />
          <rect x={0} y={0} width={BOARD.w} height={BOARD.h} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
          <g transform={`translate(${BOARD.w / 2} 0.25) scale(${KQ}) translate(-490 -400)`}>
            <path d={QUESTION} fill="none" stroke={COLORS.ink} strokeWidth={LW * 3.2} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
            {q >= 1 ? <circle cx={490} cy={800} r={22} fill={COLORS.accent} /> : null}
            {q > 0 && q < 1 && pen ? <Marker x={pen.x} y={pen.y} /> : null}
          </g>
          {/* faint earlier notes on the board: arrows and boxes, no text */}
          {[[0.4, 0.5], [0.4, 1.7], [5.2, 0.6]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={1.2} height={0.6} rx={0.08} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
          ))}
          <path d="M1.7,0.8 L2.4,1.3 M1.7,2.0 L2.4,1.5 M5.0,0.9 L4.6,1.3" fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
        </g>
        <Box s={s} at={[BOARD.x + 0.4, 0, BOARD.z - BOARD.h - 0.2]} size={[BOARD.w - 0.8, 0.3, 0.08]} stroke={STROKE.secondary} />
        {/* scientists in lab coats, nodding while they argue */}
        <IsoPerson s={s} at={SCI[0]} h={1.75} bob={Math.abs(jig) * 0.006} />
        <IsoPerson s={s} at={SCI[1]} h={1.75} bob={Math.abs(jig) * 0.006} />
        <Box s={s} at={[SCI[0][0] + 0.38, SCI[0][1] + 0.2, 0.9]} size={[0.32, 0.05, 0.42]} stroke={STROKE.secondary} />
        {/* lab bench with three memory cards: a new place, a bright event (attention), an emotion */}
        <Table s={s} at={[2.2, 5.0, 0]} size={[5.6, 1.9, BENCH_Z]} />
        <Cylinder s={s} at={[7.3, 5.4, BENCH_Z]} r={0.18} h={0.5} stroke={STROKE.secondary} />
        <Cylinder s={s} at={[7.3, 5.4, BENCH_Z + 0.5]} r={0.07} h={0.25} stroke={STROKE.micro} />
        {(['street', 'ticket', 'party'] as const).map((k, i) => (
          <g key={k} transform={`${planeMatrix(s, 'floor', [2.8 + i * 1.5, 5.45, BENCH_Z + 0.01])} scale(${(1.15 / CARD_W) * icons[i]}) rotate(${(i - 1) * 6} ${CARD_W / 2} ${CARD_H / 2})`}>
            <MemoryCard kind={k} novel={(i === 1 && eyeLit > 0.5) || (i === 2 && heartLit > 0.5)} />
          </g>
        ))}
        {frame > attention - 45 ? <Magnifier x={magX + 0.55} y={5.85} z={BENCH_Z + 0.75 + Math.sin(t * 3) * 0.04} /> : null}
        {/* speech bubbles above the scientists (frontal plates) */}
        {SCI.map((p, i) => {
          const [hx, hy] = head(p, 1.75);
          return (
            <g key={i} transform={`translate(${hx + (i ? -0.6 : 0.6) * s} ${hy - 1.2 * s}) scale(0.32)`}>
              <Bubble x={0} y={0} flip={i === 1} p={bub} jiggle={i ? -jig : jig} />
            </g>
          );
        })}
      </RoomSvg>
    </AbsoluteFill>
  );
};
