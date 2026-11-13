import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {ROOM_S} from './RoomScene';
import {Building, FlowerBed, Ground, IsoPerson, LampPost, Paving, Road, Tree} from '../illustrations/CityKit';
import {Box, Line3} from '../illustrations/primitives';
import {iso, planeMatrix, P3} from '../lib/iso';
import {PEAK, PX0, PX1, PY0, SurveyBoard, SurveyState} from './SurveyBoard';

// Scenes 3–4 location: a city square with a big survey billboard (isometric carrier for the chart).
const s = ROOM_S;
export const LINE_Y = 6.4; // painted age line on the ground
const CROWD = Array.from({length: 22}, (_, i) => i);
export const crowdPos = (i: number): P3 => [1.6 + (i % 11) * 0.78, LINE_Y - 0.6 + Math.floor(i / 11) * 0.9 + (random(`cy${i}`) - 0.5) * 0.2, 0];

/** Billboard panel: board px region (X0..X0+780, Y0..Y0+480) mapped onto the front plane y = BILL.y. */
const X0 = 100;
const Y0 = 520;
const K = 6 / 780;
export const BILL = {x: 3.0, y: 2.8, z0: 1.5, w: 6, h: 480 * K} as const;
export const boardPt = (px: number, py: number): P3 => [BILL.x + (px - X0) * K, BILL.y, BILL.z0 + BILL.h - (py - Y0) * K];

/** Label on a small frontal plate (stays upright and readable; §19.7: labels on frontal plates). */
const Plate: React.FC<{at: P3; text: string; size?: number; fill?: string; color?: string; opacity?: number}> = ({at, text, size = 22, fill = COLORS.fillLight, color = COLORS.ink, opacity = 1}) => {
  const [x, y] = iso(s)(at);
  const w = text.length * size * 0.62 + size * 0.9;
  const h = size * 1.5;
  return (
    <g opacity={opacity}>
      <rect x={x - w / 2 + 3} y={y - h / 2 + 3} width={w} height={h} rx={h * 0.3} fill={COLORS.fillDark} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h * 0.3} fill={fill} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={size} fill={color}>
        {text}
      </text>
    </g>
  );
};

const Billboard: React.FC<{chart: SurveyState}> = ({chart}) => {
  const {x, y, z0, w, h} = BILL;
  return (
    <g>
      {/* posts with feet */}
      {[x + 0.9, x + w - 1.15].map((px) => (
        <g key={px}>
          <Box s={s} at={[px - 0.15, y - 0.45, 0]} size={[0.55, 0.55, 0.15]} stroke={STROKE.secondary} />
          <Box s={s} at={[px, y - 0.3, 0.15]} size={[0.25, 0.25, z0]} stroke={STROKE.secondary} />
        </g>
      ))}
      {/* frame and cornice */}
      <Box s={s} at={[x - 0.18, y - 0.32, z0 - 0.18]} size={[w + 0.36, 0.32, h + 0.36]} />
      <Box s={s} at={[x - 0.3, y - 0.42, z0 + h + 0.18]} size={[w + 0.6, 0.5, 0.14]} stroke={STROKE.secondary} />
      {/* two spot lamps on arms above the panel */}
      {[x + 1.2, x + w - 1.2].map((lx) => (
        <g key={`l${lx}`}>
          <Line3 s={s} width={STROKE.secondary} points={[[lx, y - 0.2, z0 + h + 0.32], [lx, y + 0.35, z0 + h + 0.55]]} />
          <Box s={s} at={[lx - 0.15, y + 0.3, z0 + h + 0.42]} size={[0.3, 0.22, 0.2]} stroke={STROKE.secondary} detail="none" />
        </g>
      ))}
      {/* board surface and the chart, drawn on the front plane */}
      <g transform={planeMatrix(s, 'wallX', [x, y + 0.004, z0 + h])}>
        <rect x={0} y={0} width={w} height={h} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
        <g transform={`scale(${K}) translate(${-X0} ${-Y0})`}>
          <SurveyBoard s={chart} iso />
        </g>
      </g>
    </g>
  );
};

export type SquareState = {
  t: number;
  chart: SurveyState;
  crowdP: (i: number) => number;
  react: number; // 0..1 crowd reaction (bobbing harder)
  interviewer?: {x: number; y: number; passerBy: boolean};
};

/** The square: road and buildings behind, billboard, benches, trees, crowd on the painted age line, interviewer. */
export const SurveySquare: React.FC<SquareState> = ({t, chart, crowdP, react, interviewer}) => {
  const labels = Math.max(chart.laneP ? chart.laneP[0] : chart.lines > 0.4 ? 1 : 0, chart.decade > 0 ? 1 : 0);
  return (
    <g>
      <Ground s={s} at={[0, 0, 0]} w={12} d={10} fill={COLORS.floor} />
      <Paving s={s} at={[0, 1.4, 0.005]} w={12} d={8.6} step={0.8} />
      <Road s={s} at={[0, 0, 0.01]} len={12} dir="x" />
      <Building s={s} at={[0.4, -2.4, 0]} size={[2.6, 2.0, 4.2]} floors={4} lit={0.2} t={t} />
      <Building s={s} at={[3.4, -2.6, 0]} size={[3.0, 2.2, 5.6]} floors={5} lit={0.3} t={t} />
      <Building s={s} at={[6.9, -2.4, 0]} size={[2.4, 2.0, 3.6]} floors={3} lit={0.2} t={t} />
      <Building s={s} at={[9.6, -2.6, 0]} size={[2.2, 2.2, 4.8]} floors={4} lit={0.25} t={t} />
      <Billboard chart={chart} />
      <Plate at={boardPt(PX0 + 40, PY0 + 42)} text="14" opacity={labels} />
      <Plate at={boardPt(PX1 - 40, PY0 + 42)} text="94" opacity={labels} />
      <Plate at={boardPt(PX1 - 170, PY0 - 175)} text="10 лет" color={COLORS.accent} opacity={Math.max(0, Math.min(1, (chart.decade - 0.9) * 10))} />
      <Plate at={boardPt(PEAK[0] - 110, PEAK[1] + 110)} text="≈50 лет" color={COLORS.accent} opacity={Math.min(1, chart.peak * 2)} />
      {[[1.0, 3.6], [10.6, 3.8], [0.6, 8.6], [11.2, 8.4]].map(([x, y], i) => (
        <Tree key={i} s={s} at={[x, y, 0]} t={t} seed={`sq${i}`} />
      ))}
      {[[0.4, 2.0], [11.2, 2.0], [0.4, 9.2]].map(([x, y], i) => (
        <LampPost key={i} s={s} at={[x, y, 0]} />
      ))}
      <FlowerBed s={s} at={[0.3, 5.2, 0]} t={t} />
      <FlowerBed s={s} at={[10.4, 5.6, 0]} t={t} />
      {/* passers-by */}
      {[[3.4, 3.9], [7.4, 3.6], [9.6, 4.8]].map(([x, y], i) => (
        <IsoPerson key={`pb${i}`} s={s} at={[x + Math.sin(t * 0.6 + i) * 0.3, y, 0]} h={1.0} walk={t * 5 + i} />
      ))}
      {/* painted age line with ticks */}
      <g transform={planeMatrix(s, 'floor', [1.2, LINE_Y + 1.6, 0.01])}>
        <line x1={0} y1={0} x2={9.0} y2={0} stroke={COLORS.ink} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" />
        {Array.from({length: 10}, (_, k) => (
          <line key={k} x1={k} y1={-0.15} x2={k} y2={0.15} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {/* benches */}
      {[[1.6, 4.4], [8.2, 4.4]].map(([x, y], i) => (
        <g key={i}>
          <Box s={s} at={[x, y, 0.4]} size={[1.4, 0.45, 0.08]} stroke={STROKE.secondary} />
          <Box s={s} at={[x, y, 0.48]} size={[1.4, 0.08, 0.4]} stroke={STROKE.secondary} />
          <Line3 s={s} points={[[x + 0.1, y + 0.4, 0], [x + 0.1, y + 0.4, 0.4]]} width={STROKE.secondary} />
          <Line3 s={s} points={[[x + 1.3, y + 0.4, 0], [x + 1.3, y + 0.4, 0.4]]} width={STROKE.secondary} />
        </g>
      ))}
      {/* the crowd from 14 to 94 along the line; reacts by bobbing when the chart line is drawn */}
      {CROWD.map((i) => (
        <IsoPerson key={i} s={s} at={crowdPos(i)} h={0.85 + random(`h${i}`) * 0.3} bob={Math.abs(Math.sin(t * (3 + react * 4) + i)) * (0.02 + react * 0.08)} p={crowdP(i)} />
      ))}
      {interviewer ? (
        <g>
          <IsoPerson s={s} at={[interviewer.x, interviewer.y, 0]} h={1.1} accent />
          {interviewer.passerBy ? <IsoPerson s={s} at={[interviewer.x + 0.9, interviewer.y - 0.3, 0]} h={0.95} /> : null}
          <Box s={s} at={[interviewer.x + 0.3, interviewer.y + 0.3, 0.6]} size={[0.35, 0.05, 0.45]} stroke={STROKE.secondary} />
        </g>
      ) : null}
    </g>
  );
};
