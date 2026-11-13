import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {ROOM_S} from './RoomScene';
import {Building, Car, Ground, House, IsoPerson, LampPost, Paving, Tree, FlowerBed} from '../illustrations/CityKit';
import {Box} from '../illustrations/primitives';
import {planeMatrix, P3} from '../lib/iso';

export const LOOP: {c: P3; rx: number; ry: number} = {c: [6.0, 5.0, 0.01], rx: 3.4, ry: 2.2};
/** New roads out of the opened ring (scene 12), in ring-centre floor coordinates. */
const NEW_ROADS: [[number, number], [number, number]][] = [
  [[LOOP.rx, 0], [LOOP.rx + 1.8, 1.2]],
  [[LOOP.rx + 1.8, 1.2], [LOOP.rx + 4.2, 0.6]],
  [[LOOP.rx + 1.8, 1.2], [LOOP.rx + 2.7, 3.0]],
];
export const loopPt = (a: number): P3 => [LOOP.c[0] + Math.cos(a) * LOOP.rx, LOOP.c[1] + Math.sin(a) * LOOP.ry, 0.02];

/** City block: home (left) and office (right) on a ring road. `open` 0..1 opens the ring into new roads (scene 12). */
export const CityLoop: React.FC<{t: number; frame: number; carSpeed: number; open?: number; grey?: number; cards?: number; mystery?: number}> = ({t, frame, carSpeed, open = 0, grey = 0, cards = 0, mystery = 0}) => {
  const a = frame * carSpeed;
  const car = loopPt(a);
  const gap = open * 18;
  const road = (k: number) => Math.max(0, Math.min(1, (open - 0.25 - k * 0.15) / 0.35));
  return (
    <g>
      {/* far plane: a distant skyline behind the block */}
      {[[-0.6, 2.6], [0.6, 3.8], [1.9, 2.2], [3.0, 4.4], [4.4, 3.0], [5.6, 2.4], [6.8, 3.6], [8.2, 2.8], [9.4, 4.0], [10.8, 2.6], [12.0, 3.4], [13.4, 2.2], [14.6, 3.0]].map(([bx, bh], i) => (
        <Box key={`sky${i}`} s={ROOM_S} at={[bx, -2.6, 0]} size={[1.1, 0.9, bh * 0.6]} stroke={STROKE.secondary} top={COLORS.fillMid} left={COLORS.fillMid} right={COLORS.fillDark} detail="none" />
      ))}
      <Ground s={ROOM_S} at={[-1, -1, 0]} w={17} d={12} fill={COLORS.floor} />
      <Paving s={ROOM_S} at={[-1, -1, 0.004]} w={17} d={12} step={1} />
      {/* driveways: home and office connect to the ring (buildings stand outside it) */}
      <g transform={planeMatrix(ROOM_S, 'floor', [1.3, 4.0, 0.008])}>
        <rect x={0} y={0} width={1.4} height={0.8} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
      </g>
      <g transform={planeMatrix(ROOM_S, 'floor', [9.3, 3.5, 0.008])}>
        <rect x={0} y={0} width={1.4} height={0.8} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
      </g>
      {/* ring road */}
      <g transform={planeMatrix(ROOM_S, 'floor', LOOP.c)}>
        <ellipse cx={0} cy={0} rx={LOOP.rx} ry={LOOP.ry} fill="none" stroke={COLORS.fillDark} strokeWidth={0.8} pathLength={100} strokeDasharray={`${100 - gap} ${gap}`} strokeDashoffset={-gap / 2} />
        {[-0.4, 0.4].map((k) => (
          <ellipse key={k} cx={0} cy={0} rx={LOOP.rx + k} ry={LOOP.ry + k} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} pathLength={100} strokeDasharray={`${100 - gap} ${gap}`} strokeDashoffset={-gap / 2} vectorEffect="non-scaling-stroke" />
        ))}
        <ellipse cx={0} cy={0} rx={LOOP.rx} ry={LOOP.ry} fill="none" stroke={COLORS.fillLight} strokeWidth={STROKE.main} strokeDasharray="10 12" vectorEffect="non-scaling-stroke" opacity={1 - open} />
        {/* new roads branching out of the opened ring */}
        {NEW_ROADS.map(([a, b], k) => {
          const r = road(k);
          if (r <= 0) return null;
          const e: [number, number] = [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
          const d = `M${a[0]},${a[1]} L${e[0]},${e[1]}`;
          return (
            <g key={k}>
              <path d={d} fill="none" stroke={COLORS.fillDark} strokeWidth={0.8} strokeLinecap="round" />
              {/* the new route is the meaning here: coral dashed centre line */}
              <path d={d} fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main} strokeDasharray="10 8" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </g>
      {/* inside the ring: a small park */}
      <FlowerBed s={ROOM_S} at={[4.8, 5.4, 0]} w={1.4} t={t} />
      <Tree s={ROOM_S} at={[6.9, 4.1, 0]} t={t} seed="c1" />
      {/* home and office */}
      <House s={ROOM_S} at={[-0.5, 3.6, 0]} size={[1.8, 1.6, 1.4]} smoke={t} />
      <Building s={ROOM_S} at={[10.7, 2.3, 0]} size={[2.4, 2.0, 4.2]} floors={5} lit={0.4} t={t} />
      <LampPost s={ROOM_S} at={[2.0, 1.4, 0]} />
      <LampPost s={ROOM_S} at={[10.2, 8.6, 0]} />
      {/* new places revealed by the open roads */}
      {open > 0.45 ? (
        <g opacity={Math.min(1, (open - 0.45) * 3)}>
          <Building s={ROOM_S} at={[13.9, 5.0, 0]} size={[1.6, 1.4, 2.0]} floors={2} accent />
          <Tree s={ROOM_S} at={[11.6, 9.4, 0]} t={t} seed="n1" />
          <Tree s={ROOM_S} at={[12.6, 9.8, 0]} t={t} seed="n2" />
          <House s={ROOM_S} at={[12.9, 8.2, 0]} size={[1.4, 1.2, 1.1]} accent />
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
            const p: P3 = [14.4 - q * 13.2, 5.6 - q * 1.2, 0.5 + Math.sin(Math.PI * q) * 3];
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
            <text x={0.6} y={0.68} textAnchor="middle" fontSize={0.62} fontWeight={700} fill={COLORS.ink} opacity={mystery}>?</text>
            </g>
          </g>
        </g>
      ) : null}
      <Car s={ROOM_S} at={[car[0] - 0.5, car[1] - 0.27, 0.02]} accent={open > 0.5} t={t} />
      <IsoPerson s={ROOM_S} at={[1.7, 5.7, 0]} h={1.0} bob={Math.sin(t * 3) * 0.02} />
      <IsoPerson s={ROOM_S} at={[4.0 + ((t * 0.4) % 4), 8.6, 0]} h={1.0} walk={t * 7} />
      <IsoPerson s={ROOM_S} at={[10.4 - ((t * 0.3) % 3), 8.0, 0]} h={0.95} walk={t * 7 + 1} />
      {/* near plane: hedge and trees along the front edge */}
      {[0.2, 2.6, 5.0, 7.4].map((hx, i) => (
        <Box key={`hedge${i}`} s={ROOM_S} at={[hx, 10.2, 0]} size={[2.0, 0.6, 0.5]} stroke={STROKE.secondary} top={COLORS.fillMid} left={COLORS.fillMid} right={COLORS.fillDark} />
      ))}
      <Tree s={ROOM_S} at={[0.2, 10.0, 0]} h={1.8} t={t} seed="f1" />
      <Tree s={ROOM_S} at={[9.8, 10.4, 0]} h={1.6} t={t} seed="f2" />
    </g>
  );
};
