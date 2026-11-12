import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {ROOM_S} from './RoomScene';
import {Building, Car, Ground, House, IsoPerson, LampPost, Paving, Tree, FlowerBed} from '../illustrations/CityKit';
import {Line3} from '../illustrations/primitives';
import {planeMatrix, P3} from '../lib/iso';

export const LOOP: {c: P3; rx: number; ry: number} = {c: [6.0, 5.0, 0.01], rx: 3.4, ry: 2.2};
export const loopPt = (a: number): P3 => [LOOP.c[0] + Math.cos(a) * LOOP.rx, LOOP.c[1] + Math.sin(a) * LOOP.ry, 0.02];

/** City block: home (left) and office (right) on a ring road. `open` 0..1 opens the ring into new roads (scene 12). */
export const CityLoop: React.FC<{t: number; frame: number; carSpeed: number; open?: number; grey?: number; cards?: number; mystery?: number}> = ({t, frame, carSpeed, open = 0, grey = 0, cards = 0, mystery = 0}) => {
  const a = frame * carSpeed;
  const car = loopPt(a);
  const gap = open * 18;
  const road = (k: number) => Math.max(0, Math.min(1, (open - 0.25 - k * 0.15) / 0.35));
  return (
    <g>
      <Ground s={ROOM_S} at={[-1, -1, 0]} w={15} d={12} fill={COLORS.floor} />
      <Paving s={ROOM_S} at={[-1, -1, 0.004]} w={15} d={12} step={1} />
      {/* ring road */}
      <g transform={planeMatrix(ROOM_S, 'floor', LOOP.c)}>
        <ellipse cx={0} cy={0} rx={LOOP.rx} ry={LOOP.ry} fill="none" stroke={COLORS.fillDark} strokeWidth={0.7} pathLength={100} strokeDasharray={`${100 - gap} ${gap}`} strokeDashoffset={-gap / 2} />
        <ellipse cx={0} cy={0} rx={LOOP.rx} ry={LOOP.ry} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} pathLength={100} strokeDasharray={`${100 - gap} ${gap}`} strokeDashoffset={-gap / 2} vectorEffect="non-scaling-stroke" />
        {/* new roads branching out of the opened ring */}
        <path d={`M${LOOP.rx},0 L${LOOP.rx + 2.0},0.6`} fill="none" stroke={COLORS.accent} strokeWidth={0.55} pathLength={1} strokeDasharray={`${road(0)} 1`} strokeLinecap="butt" opacity={road(0) > 0 ? 1 : 0} />
        <path d={`M${LOOP.rx + 2.0},0.6 L${LOOP.rx + 3.0},-1.6`} fill="none" stroke={COLORS.accent} strokeWidth={0.55} pathLength={1} strokeDasharray={`${road(1)} 1`} strokeLinecap="butt" opacity={road(1) > 0 ? 1 : 0} />
        <path d={`M${LOOP.rx + 2.0},0.6 L${LOOP.rx + 3.2},2.6`} fill="none" stroke={COLORS.accent} strokeWidth={0.55} pathLength={1} strokeDasharray={`${road(2)} 1`} strokeLinecap="butt" opacity={road(2) > 0 ? 1 : 0} />
      </g>
      {/* inside the ring: a small park */}
      <FlowerBed s={ROOM_S} at={[5.2, 4.7, 0]} t={t} />
      <Tree s={ROOM_S} at={[6.6, 4.4, 0]} t={t} seed="c1" />
      {/* home and office */}
      <House s={ROOM_S} at={[1.0, 3.6, 0]} size={[1.8, 1.6, 1.4]} />
      <Building s={ROOM_S} at={[9.4, 2.4, 0]} size={[2.4, 2.0, 4.2]} floors={5} lit={0.4} />
      <LampPost s={ROOM_S} at={[3.0, 2.0, 0]} />
      <LampPost s={ROOM_S} at={[9.0, 7.6, 0]} />
      {/* new places revealed by the open roads */}
      {open > 0.45 ? (
        <g opacity={Math.min(1, (open - 0.45) * 3)}>
          <Building s={ROOM_S} at={[12.4, 1.2, 0]} size={[1.6, 1.4, 2.0]} floors={2} accent />
          <Tree s={ROOM_S} at={[12.6, 7.6, 0]} t={t} seed="n1" />
          <Tree s={ROOM_S} at={[13.4, 8.2, 0]} t={t} seed="n2" />
          <Line3 s={ROOM_S} close fill={COLORS.fillMid} width={STROKE.main} points={[[13.0, 4.0, 0], [14.8, 4.0, 0], [13.9, 4.6, 2.6]]} />
          <Line3 s={ROOM_S} close fill={COLORS.fillLight} width={STROKE.main} points={[[13.6, 5.0, 0], [15.4, 5.0, 0], [14.5, 5.6, 2.0]]} />
        </g>
      ) : null}
      {/* grey identical "days" left behind on the ring: few traces */}
      {grey > 0
        ? Array.from({length: 10}, (_, i) => {
            const p = loopPt(i * 0.63 + 0.3);
            return (
              <g key={i} opacity={grey * (0.35 + 0.3 * random(`gd${i}`))} transform={planeMatrix(ROOM_S, 'floor', p)}>
                <rect x={-0.25} y={-0.15} width={0.5} height={0.3} rx={0.04} fill={COLORS.fillDark} stroke={COLORS.inkSoft} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })
        : null}
      {/* bright cards fly from the new places */}
      {cards > 0
        ? Array.from({length: 5}, (_, i) => {
            const q = Math.max(0, Math.min(1, cards * 1.6 - i * 0.15));
            if (q <= 0 || q >= 1) return null;
            const p: P3 = [12.6 - q * 6, 4.0 - q * 2, 0.5 + Math.sin(Math.PI * q) * 3];
            return (
              <g key={i} transform={planeMatrix(ROOM_S, 'floor', p)}>
                <rect x={-0.3} y={-0.2} width={0.6} height={0.4} rx={0.05} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                <rect x={-0.24} y={-0.14} width={0.2} height={0.1} fill={COLORS.accent} />
              </g>
            );
          })
        : null}
      {/* micro-intrigue: what will today leave in memory? a card with "?" hovers over the ring, then stays blank */}
      {mystery > 0 ? (
        <g opacity={Math.min(1, mystery * 2)}>
          <g transform={planeMatrix(ROOM_S, 'wallX', [LOOP.c[0] - 0.6, LOOP.c[1], 3.2 + Math.sin(t * 2) * 0.1])}>
            <g transform={`translate(0.6 0) scale(${Math.abs(Math.cos(t * 1.6)) * 0.9 + 0.1} 1) translate(-0.6 0)`}>
            <rect x={0} y={0} width={1.2} height={0.85} rx={0.08} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.main} vectorEffect="non-scaling-stroke" />
            <text x={0.6} y={0.68} textAnchor="middle" fontSize={0.62} fontWeight={700} fill={COLORS.accent} opacity={mystery}>?</text>
            </g>
          </g>
        </g>
      ) : null}
      <Car s={ROOM_S} at={[car[0] - 0.5, car[1] - 0.27, 0.02]} accent={open > 0.5} />
      <IsoPerson s={ROOM_S} at={[2.9, 5.6, 0]} h={1.0} bob={Math.sin(t * 3) * 0.02} />
    </g>
  );
};
