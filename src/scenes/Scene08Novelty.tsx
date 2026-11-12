import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, LW, LW2, LW3, RoomWallBackdrop} from '../illustrations/Board';
import {CARD_H, CARD_W, HEAD_PATH, MemoryCard} from '../illustrations/MemoryCards';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const KINDS = ['street', 'ticket', 'wave'] as const;

// World layout (frontal): a big head = memory cabinet with drawers; a suitcase on the floor; a tape measure.
const HEAD = {x: 70, y: 330, s: 2.2}; // HEAD_PATH box ≈ 260 × 300 → ≈ 600 × 690
const DRAWERS = {x: 200, y: 460, cols: 3, rows: 4, w: 116, h: 76, gap: 12};
const SUITCASE = {x: 740, y: 940, w: 230, h: 165};
const drawerPos = (k: number): [number, number] => {
  const c = k % DRAWERS.cols;
  const r = Math.floor(k / DRAWERS.cols);
  return [DRAWERS.x + c * (DRAWERS.w + DRAWERS.gap), DRAWERS.y + r * (DRAWERS.h + DRAWERS.gap)];
};

const Drawer: React.FC<{x: number; y: number; open: number; lit: number}> = ({x, y, open, lit}) => (
  <g transform={`translate(${x + open * 40} ${y})`}>
    <rect x={0} y={0} width={DRAWERS.w} height={DRAWERS.h} rx={8} fill={lit > 0.5 ? COLORS.accentSoft : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3} />
    <rect x={DRAWERS.w / 2 - 22} y={DRAWERS.h / 2 - 7} width={44} height={14} rx={7} fill={lit > 0.5 ? COLORS.accent : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3} />
  </g>
);

const Suitcase2D: React.FC<{open: number}> = ({open}) => {
  const {x, y, w, h} = SUITCASE;
  return (
    <g>
      <rect x={x + 8} y={y + 10} width={w} height={h} rx={18} fill={COLORS.fillDark} />
      <rect x={x} y={y} width={w} height={h} rx={18} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
      <path d={`M${x + 80},${y} L${x + 80},${y - 30} L${x + 160},${y - 30} L${x + 160},${y}`} fill="none" stroke={COLORS.ink} strokeWidth={LW} strokeLinejoin="round" />
      {[60, 180].map((u) => (
        <line key={u} x1={x + u} y1={y} x2={x + u} y2={y + h} stroke={COLORS.ink} strokeWidth={LW3} />
      ))}
      <circle cx={x + 120} cy={y + 85} r={28} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW3} />
      {/* lid flips open */}
      <g transform={`translate(${x} ${y}) scale(1 ${1 - open * 1.6})`}>
        <rect x={0} y={-20} width={w} height={20} rx={8} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3} />
      </g>
    </g>
  );
};

/** Scene 8: novelty. New impressions fly from a suitcase into the drawers of a head-shaped memory cabinet; a tape measure shows the period getting longer. */
export const Scene08Novelty: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const novelty = beat(scene, 'novelty');
  const streets = beat(scene, 'streets');
  const brain = beat(scene, 'brain');
  const memories = beat(scene, 'memories');
  const long = beat(scene, 'long');
  const open = interpolate(frame, [novelty - 10, novelty + 16], [0, 1], {...cl, easing: EASE.overshoot});
  // cards: three shown big near the suitcase on "улицы", then 9 more fly into drawers until "длинным"
  const big = KINDS.map((_, i) => interpolate(frame, [streets - 10 + i * 12, streets + 14 + i * 12], [0, 1], {...cl, easing: EASE.overshoot}));
  const flyStart = (k: number) => memories - 50 + k * 7;
  const flight = 0.5 * fps;
  const drawerCount = DRAWERS.cols * DRAWERS.rows;
  const filled = Array.from({length: drawerCount}, (_, k) => interpolate(frame, [flyStart(k) + flight - 4, flyStart(k) + flight + 6], [0, 1], cl));
  const tape = interpolate(frame, [brain - 10, brain + 0.8 * fps], [0, 1], {...cl, easing: EASE.out}) * (0.45 + 0.55 * interpolate(frame, [long - 1.0 * fps, long + 0.2 * fps], [0, 1], {...cl, easing: EASE.inOut}));
  const shots: [number, Cam2D][] = [
    [0, {focus: [500, 760], zoom: 0.85, screen: [484, 720]}], // wide: room with the head cabinet, window, shelf and suitcase
    [novelty - 20, {focus: [SUITCASE.x + 60, SUITCASE.y - 40], zoom: 1.7, screen: [484, 780]}], // suitcase opens
    [streets - 16, {focus: [SUITCASE.x - 60, SUITCASE.y - 200], zoom: 1.35, screen: [484, 760]}], // the three big cards
    [brain - 20, {focus: [430, 640], zoom: 1.3, screen: [484, 740]}], // the head = memory cabinet
    [memories - 30, {focus: [400, 700], zoom: 1.55, screen: [484, 760]}], // drawers fill
    [long - 1.1 * fps, {focus: [520, 720], zoom: 0.85, screen: [484, 720]}], // the tape measure grows: long period
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.55 * fps], [0, 1], cl));
  const tapeX = 680;
  const tapeBottom = 1090;
  const tapeTop = tapeBottom - tape * 760;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <RoomWallBackdrop frame={frame} window={[700, 300]} shelf={-260} />
        {/* head = memory cabinet */}
        <g transform={`translate(${HEAD.x} ${HEAD.y}) scale(${HEAD.s})`}>
          <path d="M40,420 L40,330 C40,300 80,288 120,288 L210,288 C250,288 290,300 290,330 L290,420 Z" fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW / HEAD.s} strokeLinejoin="round" />
          <path d={HEAD_PATH} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW / HEAD.s} strokeLinejoin="round" />
        </g>
        {Array.from({length: drawerCount}, (_, k) => {
          const [x, y] = drawerPos(k);
          const pulse = interpolate(frame, [flyStart(k) + flight - 6, flyStart(k) + flight, flyStart(k) + flight + 12], [0, 1, 0], cl);
          return <Drawer key={k} x={x} y={y} open={pulse} lit={filled[k]} />;
        })}
        <Suitcase2D open={open} />
        {/* three big new-impression cards rise from the suitcase */}
        {KINDS.map((k, i) => {
          const p = big[i];
          if (p <= 0 || frame > memories - 40) return null;
          const x = SUITCASE.x - 260 + i * 120;
          const y = SUITCASE.y - 300 - i * 40;
          return (
            <g key={k} transform={`translate(${x + CARD_W / 2} ${y + CARD_H / 2}) rotate(${(i - 1) * 8}) scale(${p}) translate(${-CARD_W / 2} ${-CARD_H / 2})`}>
              <MemoryCard kind={k} />
            </g>
          );
        })}
        {/* small cards fly from the suitcase into drawers */}
        {Array.from({length: drawerCount}, (_, k) => {
          const p = (frame - flyStart(k)) / flight;
          if (p <= 0 || p >= 1) return null;
          const e = EASE.inOut(p);
          const [dx, dy] = drawerPos(k);
          const x = mix(SUITCASE.x + 80, dx + 20, e);
          const y = mix(SUITCASE.y - 20, dy + 10, e) - Math.sin(Math.PI * p) * 160;
          return (
            <g key={k} transform={`translate(${x} ${y}) scale(0.35) rotate(${(1 - e) * 30})`}>
              <MemoryCard kind={KINDS[k % 3]} />
            </g>
          );
        })}
        {/* tape measure: no numbers, only ticks — "the period seems longer", not a measurement */}
        {tape > 0 ? (
          <g>
            <rect x={tapeX - 40} y={tapeBottom - 10} width={80} height={70} rx={14} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW} />
            <rect x={tapeX - 14} y={tapeTop} width={28} height={tapeBottom - tapeTop} fill="#F8E7B5" stroke={COLORS.ink} strokeWidth={LW3} />
            {Array.from({length: Math.floor((tapeBottom - tapeTop) / 30)}, (_, i) => (
              <line key={i} x1={tapeX - 14} y1={tapeBottom - i * 30} x2={tapeX + (i % 2 ? 0 : 6)} y2={tapeBottom - i * 30} stroke={COLORS.ink} strokeWidth={LW3} />
            ))}
            <path d={`M${tapeX - 24},${tapeTop + 4} L${tapeX},${tapeTop - 24} L${tapeX + 24},${tapeTop + 4}`} fill="none" stroke={COLORS.accent} strokeWidth={LW2} strokeLinejoin="round" />
          </g>
        ) : null}
      </FrontalSvg>
    </AbsoluteFill>
  );
};
