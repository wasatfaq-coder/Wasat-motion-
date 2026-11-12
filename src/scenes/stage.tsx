import React from 'react';
import {interpolate} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {EASE} from '../lib/anim';
import {SAFE} from '../theme/layout';
import {Armchair, Calendar, CardSpec, CardTray, Desk, Plant, RoomShell, TRAY, DESK, WallClock} from '../illustrations/Room';
import {Cam, RoomSvg, ROOM_S, roomPoint} from './RoomScene';

export const HOOK_CARDS = 10;
export const plainCards = (n: number): CardSpec[] => Array.from({length: n}, () => ({novel: false}));

/** The room with the memory tray; extra layers go after the tray (front). */
export const RoomStage: React.FC<{
  cam: Cam;
  t: number;
  cards: CardSpec[];
  squash?: number;
  dashedExtra?: number;
  highlight?: number;
  clockAccent?: number;
  top?: number;
  behind?: React.ReactNode;
  front?: React.ReactNode;
  hideChair?: boolean;
}> = ({cam, t, cards, squash, dashedExtra, highlight, clockAccent, top, behind, front, hideChair}) => (
  <RoomSvg cam={cam} top={top}>
    <RoomShell s={ROOM_S} t={t} />
    <WallClock s={ROOM_S} t={t} accent={clockAccent} />
    <Calendar s={ROOM_S} flutter={0} />
    {behind}
    <Desk s={ROOM_S} t={t} />
    <CardTray s={ROOM_S} cards={cards} squash={squash} dashedExtra={dashedExtra} highlight={highlight} />
    {front}
    {hideChair ? null : <Armchair s={ROOM_S} />}
    <Plant s={ROOM_S} t={t} />
  </RoomSvg>
);

export const TRAY_TOP = (n: number) => roomPoint([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, DESK.h + 0.06 + n * 0.09]);

/** Frontal sheet (charts, diagrams): fronts the camera, grows out of a point (the tray), inside the safe area. */
export const Sheet: React.FC<{
  p: number; // 0..1 open progress
  from: [number, number]; // screen point it grows from
  children: React.ReactNode;
  top?: number;
  height?: number;
}> = ({p, from, children, top = 300, height = 860}) => {
  const left = SAFE.left + 10;
  const width = 1080 - SAFE.left - SAFE.right - 20;
  const e = EASE.out(p);
  const cx = left + width / 2;
  const cy = top + height / 2;
  const sx = interpolate(e, [0, 1], [0.08, 1]);
  const tx = interpolate(e, [0, 1], [from[0] - cx, 0]);
  const ty = interpolate(e, [0, 1], [from[1] - cy, 0]);
  if (p <= 0) return null;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(${tx} ${ty}) translate(${cx} ${cy}) scale(${sx}) translate(${-cx} ${-cy})`} opacity={Math.min(1, p * 3)}>
        <rect x={left} y={top} width={width} height={height} rx={22} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
        <g transform={`translate(${left} ${top})`}>{children}</g>
      </g>
    </svg>
  );
};

export const SHEET_W = 1080 - SAFE.left - SAFE.right - 20;
