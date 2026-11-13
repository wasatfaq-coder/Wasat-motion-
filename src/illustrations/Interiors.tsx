import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {iso, P3, planeMatrix, pts} from '../lib/iso';
import {Box, Line3} from './primitives';

// Interiors for scenes 10 (birthday room) and 11 (lab). Same projection, palette and line weights as the room kit.
const ns = {vectorEffect: 'non-scaling-stroke' as const};
const RX = 1.2247; // screen half-width of a floor circle of radius 1 (per unit and px scale)
const RY = 0.7071;

/** Walls and floor of a 10 × 10 × 7 interior; `floor` picks the floor pattern. */
export const Shell: React.FC<{s: number; floor: 'parquet' | 'tiles'}> = ({s, floor}) => {
  const W = 10;
  const D = 10;
  const H = 7;
  return (
    <g>
      <polygon points={pts(s, [[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])} fill={COLORS.wallRight} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]])} fill={COLORS.wallLeft} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill={COLORS.floor} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <Line3 s={s} points={[[0, D, 0.25], [0, 0, 0.25], [W, 0, 0.25]]} width={STROKE.micro} color={COLORS.inkSoft} />
      {floor === 'parquet'
        ? Array.from({length: 12}, (_, i) => <Line3 key={i} s={s} points={[[0, 0.8 * (i + 1), 0.003], [W, 0.8 * (i + 1), 0.003]]} width={STROKE.micro} color={COLORS.inkSoft} />)
        : Array.from({length: 9}, (_, i) => (
            <g key={i}>
              <Line3 s={s} points={[[0, (i + 1) * 1.1, 0.003], [W, (i + 1) * 1.1, 0.003]]} width={STROKE.micro} color={COLORS.inkSoft} />
              <Line3 s={s} points={[[(i + 1) * 1.1, 0, 0.003], [(i + 1) * 1.1, D, 0.003]]} width={STROKE.micro} color={COLORS.inkSoft} />
            </g>
          ))}
    </g>
  );
};

/** Window with a frame and sill on the left wall (plane x = 0). */
export const SideWindow: React.FC<{s: number; y: number; z: number; w?: number; h?: number}> = ({s, y, z, w = 3, h = 3.2}) => (
  <g transform={planeMatrix(s, 'wallY', [0, y, z])}>
    <rect x={0} y={0} width={w} height={h} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
    <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
    <line x1={0} y1={h * 0.4} x2={w} y2={h * 0.4} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
    <rect x={-0.15} y={h} width={w + 0.3} height={0.18} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
  </g>
);

/** Bunting on the back wall: a sagging string with triangular flags that flutter slightly. */
export const Bunting: React.FC<{s: number; x0: number; x1: number; z: number; t: number}> = ({s, x0, x1, z, t}) => {
  const n = 11;
  const at = (k: number): P3 => [x0 + ((x1 - x0) * k) / n, 0.02, z - Math.sin((Math.PI * k) / n) * 0.6];
  return (
    <g>
      <Line3 s={s} width={STROKE.secondary} points={Array.from({length: n + 1}, (_, k) => at(k))} />
      {Array.from({length: n}, (_, k) => {
        const a = at(k + 0.15);
        const b = at(k + 0.85);
        const f = 0.05 * Math.sin(t * 3 + k);
        const tip: P3 = [(a[0] + b[0]) / 2 + f, 0.02, (a[2] + b[2]) / 2 - 0.6];
        return <polygon key={k} points={pts(s, [a, b, tip])} fill={k % 2 ? COLORS.fillMid : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round" />;
      })}
    </g>
  );
};

/** Balloon on a string (sways). */
export const Balloon: React.FC<{s: number; at: P3; len: number; t: number; seed: string; fill?: string}> = ({s, at, len, t, seed, fill = COLORS.fillLight}) => {
  const sway = Math.sin(t * 1.3 + random(seed) * 6) * 0.2;
  const top: P3 = [at[0] + sway, at[1], at[2] + len];
  const [bx, by] = iso(s)(top);
  return (
    <g>
      <Line3 s={s} width={STROKE.micro} points={[at, [at[0] + sway * 0.4, at[1], at[2] + len * 0.5], top]} />
      <ellipse cx={bx} cy={by - 0.45 * s} rx={0.36 * s} ry={0.46 * s} fill={fill} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
      <path d={`M${bx - 0.12 * s},${by - 0.7 * s} q0.06,-0.12 0.16,-0.1`} transform={`translate(0 0)`} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} />
      <polygon points={`${bx - 5},${by + 2} ${bx + 5},${by + 2} ${bx},${by - 6}`} fill={COLORS.ink} />
    </g>
  );
};

/** Table with a top, apron and four legs. */
export const Table: React.FC<{s: number; at: P3; size: P3; cloth?: boolean}> = ({s, at, size, cloth}) => {
  const [x, y] = at;
  const [w, d, h] = size;
  return (
    <g>
      {[[x + 0.15, y + 0.15], [x + w - 0.35, y + 0.15], [x + 0.15, y + d - 0.35], [x + w - 0.35, y + d - 0.35]].map(([lx, ly], i) => (
        <Box key={i} s={s} at={[lx, ly, 0]} size={[0.2, 0.2, h - 0.2]} stroke={STROKE.secondary} />
      ))}
      <Box s={s} at={[x + 0.1, y + 0.1, h - 0.4]} size={[w - 0.2, d - 0.2, 0.22]} stroke={STROKE.secondary} detail="none" />
      <Box s={s} at={[x, y, h - 0.18]} size={[w, d, 0.18]} top={cloth ? COLORS.fillLight : COLORS.fillLight} />
      {cloth ? <Box s={s} at={[x - 0.05, y - 0.05, h - 0.5]} size={[w + 0.1, d + 0.1, 0.32]} stroke={STROKE.secondary} left={COLORS.fillLight} right={COLORS.fillMid} detail="none" /> : null}
    </g>
  );
};

/** Simple chair facing +y (back at the low-y side). */
export const Chair: React.FC<{s: number; at: P3}> = ({s, at}) => {
  const [x, y] = at;
  return (
    <g>
      {[[x, y], [x + 0.75, y], [x, y + 0.75], [x + 0.75, y + 0.75]].map(([lx, ly], i) => (
        <Box key={i} s={s} at={[lx, ly, 0]} size={[0.12, 0.12, 1.1]} stroke={STROKE.micro} detail="none" />
      ))}
      <Box s={s} at={[x - 0.03, y - 0.03, 1.1]} size={[0.93, 0.93, 0.12]} stroke={STROKE.secondary} />
      <Box s={s} at={[x - 0.03, y - 0.03, 1.22]} size={[0.93, 0.12, 1.1]} stroke={STROKE.secondary} />
    </g>
  );
};

/** Plate with a rim lying on a surface at height z. */
export const Plate: React.FC<{s: number; at: P3; r?: number}> = ({s, at, r = 0.42}) => (
  <g transform={planeMatrix(s, 'floor', at)}>
    <circle r={r} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
    <circle r={r * 0.68} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
  </g>
);

/** Vertical cylinder (screen-space construction): side band + top ellipse. */
export const Cylinder: React.FC<{s: number; at: P3; r: number; h: number; top?: string; side?: string; stroke?: number}> = ({s, at, r, h, top = COLORS.fillLight, side = COLORS.fillMid, stroke = STROKE.main}) => {
  const [cx, cyB] = iso(s)(at);
  const cyT = cyB - h * s;
  const rx = RX * r * s;
  const ry = RY * r * s;
  return (
    <g>
      <path d={`M${cx - rx},${cyT} L${cx - rx},${cyB} A${rx},${ry} 0 0 0 ${cx + rx},${cyB} L${cx + rx},${cyT} Z`} fill={side} stroke={COLORS.ink} strokeWidth={stroke} strokeLinejoin="round" />
      <ellipse cx={cx} cy={cyT} rx={rx} ry={ry} fill={top} stroke={COLORS.ink} strokeWidth={stroke} />
    </g>
  );
};

const hull = (p: [number, number][]) => {
  const a = [...p].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cross = (o: number[], b: number[], c: number[]) => (b[0] - o[0]) * (c[1] - o[1]) - (b[1] - o[1]) * (c[0] - o[0]);
  const lo: [number, number][] = [];
  for (const q of a) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: [number, number][] = [];
  for (const q of a.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
};

/** Birthday cake on a stand: slices marked on the top, candles with flickering flames, one slice pulled towards the viewer. */
export const IsoCake: React.FC<{s: number; at: P3; r: number; h: number; slices: number; candles: number; pull: number; frame: number}> = ({s, at, r, h, slices, candles, pull, frame}) => {
  const [x, y, z] = at;
  const zTop = z + 0.18 + h;
  const a = (2 * Math.PI) / slices;
  const mid = -0.35; // to the right, slightly towards the viewer: the slice shows its long side
  const wedge = (dx: number, dy: number, zz: number): [number, number][] => {
    const out: [number, number][] = [iso(s)([x + dx, y + dy, zz])];
    for (let k = 0; k <= 8; k++) {
      const t = mid - a / 2 + (a * k) / 8;
      out.push(iso(s)([x + dx + Math.cos(t) * r, y + dy + Math.sin(t) * r, zz]));
    }
    return out;
  };
  const px = Math.cos(mid) * pull;
  const py = Math.sin(mid) * pull;
  const topW = wedge(px, py, zTop);
  const botW = wedge(px, py, zTop - h);
  const hole = wedge(0, 0, zTop);
  return (
    <g>
      {/* stand */}
      <Cylinder s={s} at={[x, y, z]} r={0.25} h={0.12} stroke={STROKE.secondary} />
      <Cylinder s={s} at={[x, y, z + 0.12]} r={r + 0.3} h={0.06} stroke={STROKE.secondary} />
      {/* cake body */}
      <Cylinder s={s} at={[x, y, z + 0.18]} r={r} h={h} top={COLORS.fillLight} side={COLORS.fillMid} />
      {/* cream band on the side */}
      {(() => {
        const [cx, cy] = iso(s)([x, y, z + 0.18 + h * 0.55]);
        return <path d={`M${cx - RX * r * s},${cy} A${RX * r * s},${RY * r * s} 0 0 0 ${cx + RX * r * s},${cy}`} fill="none" stroke={COLORS.fillLight} strokeWidth={STROKE.main * 1.6} />;
      })()}
      {/* slice cuts on the top */}
      <g transform={planeMatrix(s, 'floor', [x, y, zTop])}>
        {Array.from({length: slices}, (_, i) => {
          const t = mid + a / 2 + i * a;
          return <line key={i} x1={0} y1={0} x2={Math.cos(t) * r} y2={Math.sin(t) * r} stroke={COLORS.inkSoft} strokeWidth={slices > 24 ? 1 : STROKE.micro} {...ns} />;
        })}
      </g>
      {/* the gap left by the pulled slice */}
      {pull > 0.02 ? <polygon points={hole.map((p) => p.join(',')).join(' ')} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round" /> : null}
      {/* candles */}
      {Array.from({length: candles}, (_, i) => {
        const t = (i / candles) * Math.PI * 2 + 0.3;
        const rr = r * (candles > 20 ? 0.55 + (i % 2) * 0.22 : 0.62);
        const cx = x + Math.cos(t) * rr;
        const cy = y + Math.sin(t) * rr;
        const inGap = Math.abs(((t - mid + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < a / 2 && pull > 0.02;
        if (inGap) return null;
        const [bx, by] = iso(s)([cx, cy, zTop]);
        const ch = 0.42 * s;
        const fl = 1 + 0.18 * Math.sin(frame * 0.5 + random(`fl${i}`) * 6);
        return (
          <g key={i}>
            <rect x={bx - 3} y={by - ch} width={6} height={ch} fill={i % 3 === 0 ? COLORS.fillMid : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={1.4} />
            <path d={`M${bx},${by - ch - 2} q-5,-7 0,-${14 * fl} q5,${7 * fl} 0,${14 * fl}`} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={1.4} />
          </g>
        );
      })}
      {/* the pulled slice = one year (the only accent) */}
      {pull > 0.02 ? (
        <g>
          <polygon points={hull([...topW, ...botW]).map((p) => p.join(',')).join(' ')} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
          {/* cream layer across the slice */}
          <polyline points={wedge(px, py, zTop - h * 0.5).slice(1).map((p) => p.join(',')).join(' ')} fill="none" stroke={COLORS.fillLight} strokeWidth={STROKE.main * 1.6} />
          <polygon points={topW.map((p) => p.join(',')).join(' ')} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
};

/** Sofa along x (seat facing +y). */
export const Sofa: React.FC<{s: number; at: P3; w: number}> = ({s, at, w}) => {
  const [x, y] = at;
  return (
    <g>
      <Box s={s} at={[x, y, 0]} size={[w, 0.35, 2.0]} />
      <Box s={s} at={[x, y + 0.35, 0.2]} size={[w, 1.3, 0.75]} />
      {[0, 1].map((k) => (
        <Box key={k} s={s} at={[x + 0.15 + k * ((w - 0.3) / 2), y + 0.4, 0.95]} size={[(w - 0.3) / 2 - 0.05, 1.15, 0.25]} stroke={STROKE.secondary} />
      ))}
      <Box s={s} at={[x - 0.35, y, 0]} size={[0.35, 1.65, 1.25]} />
      <Box s={s} at={[x + w, y, 0]} size={[0.35, 1.65, 1.25]} />
    </g>
  );
};

/** Wall shelf with jars and books on the left wall (plane x = 0). */
export const WallShelf: React.FC<{s: number; y: number; z: number; len: number; seed: string}> = ({s, y, z, len, seed}) => (
  <g>
    <Box s={s} at={[0, y, z]} size={[0.7, len, 0.1]} stroke={STROKE.secondary} />
    {Array.from({length: Math.floor(len / 0.45)}, (_, i) => {
      const r = random(`${seed}${i}`);
      const yy = y + 0.1 + i * 0.45;
      return r < 0.5 ? (
        <Box key={i} s={s} at={[0.1, yy, z + 0.1]} size={[0.45, 0.3, 0.55 + r * 0.4]} stroke={STROKE.micro} left={i % 3 ? COLORS.fillLight : COLORS.fillMid} />
      ) : (
        <Cylinder key={i} s={s} at={[0.35, yy + 0.18, z + 0.1]} r={0.16} h={0.35 + r * 0.3} stroke={STROKE.micro} />
      );
    })}
  </g>
);
