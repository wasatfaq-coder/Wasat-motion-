import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {iso, P3, planeMatrix, pts} from '../lib/iso';
import {Box, Line3} from './primitives';
import {IsoPerson} from './CityKit';

// Location "memory archive" (scene 8): a tall hall with racks of archive boxes, a rolling ladder, a round window,
// pendant lamps and dust in the light. Same projection and palette as the other kits.
export const ARCHIVE = {W: 10, D: 10, H: 7.5} as const;
const ns = {vectorEffect: 'non-scaling-stroke' as const};

/** Rack of archive boxes. axis 'x': along the back wall (fronts face +y); axis 'y': along the left wall (fronts face +x). */
export const ArchiveRack: React.FC<{s: number; at: P3; len: number; axis: 'x' | 'y'; depth?: number; levels?: number; levelH?: number; seed: string}> = ({
  s,
  at,
  len,
  axis,
  depth = 1.1,
  levels = 4,
  levelH = 1.45,
  seed,
}) => {
  const [x0, y0, z0] = at;
  const along = (u: number, v: number, z: number): P3 => (axis === 'x' ? [x0 + u, y0 + v, z0 + z] : [x0 + v, y0 + u, z0 + z]);
  const size = (du: number, dv: number, dz: number): P3 => (axis === 'x' ? [du, dv, dz] : [dv, du, dz]);
  const height = levels * levelH + 0.12;
  const items: React.ReactNode[] = [];
  for (let l = 0; l < levels; l++) {
    const z = l * levelH + 0.1;
    let u = 0.12;
    let k = 0;
    while (u < len - 0.6) {
      const r = random(`${seed}-${l}-${k}`);
      const bw = 0.5 + r * 0.12;
      if (r > 0.9) {
        u += bw + 0.05; // a gap: one box is missing
        k++;
        continue;
      }
      const bh = levelH * (0.62 + random(`${seed}h${l}-${k}`) * 0.14);
      const pulled = r < 0.07 ? 0.25 : 0; // a box pulled out a little
      const bd = depth - 0.2;
      const p = along(u, 0.08 + pulled, z + 0.08);
      // front face of the box (facing the viewer)
      const front: P3 = axis === 'x' ? [p[0], p[1] + bd, p[2] + bh] : [p[0] + bd, p[1], p[2] + bh];
      items.push(
        <g key={`${l}-${k}`}>
          <Box s={s} at={p} size={size(bw, bd, bh)} stroke={STROKE.micro} top={COLORS.fillLight} left={axis === 'x' ? (k % 3 === 1 ? COLORS.fillDark : COLORS.fillLight) : COLORS.fillMid} right={axis === 'y' ? (k % 3 === 1 ? COLORS.fillDark : COLORS.fillLight) : COLORS.fillMid} detail="none" />
          <g transform={planeMatrix(s, axis === 'x' ? 'wallX' : 'wallY', front)}>
            {/* label plate and finger hole: no text */}
            <rect x={axis === 'x' ? bw * 0.18 : -bw * 0.82} y={bh * 0.18} width={bw * 0.64} height={bh * 0.22} fill={COLORS.fillLight} stroke={COLORS.inkSoft} strokeWidth={1} {...ns} />
            <circle cx={axis === 'x' ? bw / 2 : -bw / 2} cy={bh * 0.68} r={0.06} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={1} {...ns} />
          </g>
        </g>,
      );
      u += bw + 0.05;
      k++;
    }
  }
  const posts = Array.from({length: Math.floor(len / 2.4) + 1}, (_, i) => Math.min(len - 0.1, i * 2.4));
  return (
    <g>
      {/* back panel */}
      <Box s={s} at={along(0, 0, 0)} size={size(len, 0.06, height)} stroke={STROKE.secondary} top={COLORS.fillMid} left={COLORS.wallRight} right={COLORS.wallLeft} detail="none" />
      {Array.from({length: levels + 1}, (_, l) => (
        <Box key={`sh${l}`} s={s} at={along(0, 0, l * levelH)} size={size(len, depth, 0.1)} stroke={STROKE.secondary} detail="none" />
      ))}
      {items}
      {posts.map((u, i) => (
        <Box key={`p${i}`} s={s} at={along(u, depth - 0.1, 0)} size={size(0.1, 0.1, height)} stroke={STROKE.secondary} left={COLORS.fillDark} right={COLORS.fillDark} detail="none" />
      ))}
    </g>
  );
};

/** Pendant lamp hanging from the ceiling; sways slowly (living detail). */
export const PendantLamp: React.FC<{s: number; at: P3; t: number; phase?: number}> = ({s, at, t, phase = 0}) => {
  const sway = Math.sin(t * 1.1 + phase) * 0.12;
  const [x, y, zTop] = at;
  const z = zTop - 1.6;
  const [cx, cy] = iso(s)([x + sway, y, z]);
  const [tx, ty] = iso(s)([x + sway, y, z + 0.6]);
  const [hx, hy] = iso(s)([x, y, zTop]);
  const rx = 1.2247 * 0.55 * s;
  const ry = 0.7071 * 0.55 * s;
  return (
    <g>
      {/* soft neutral light cone */}
      <polygon points={`${cx - rx * 0.9},${cy} ${cx + rx * 0.9},${cy} ${cx + rx * 2.6},${cy + 3.4 * s} ${cx - rx * 2.6},${cy + 3.4 * s}`} fill={COLORS.fillLight} opacity={0.3} />
      <line x1={hx} y1={hy} x2={tx} y2={ty} stroke={COLORS.ink} strokeWidth={STROKE.micro} />
      <path d={`M${tx - 0.12 * s},${ty} L${tx + 0.12 * s},${ty} L${cx + rx},${cy} A${rx},${ry} 0 0 1 ${cx - rx},${cy} Z`} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
      <circle cx={cx} cy={cy + ry * 0.4} r={0.15 * s} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} />
    </g>
  );
};

/** Dust motes drifting slowly in the lamp light (living detail). */
export const Dust: React.FC<{s: number; at: P3; t: number; n?: number; seed?: string}> = ({s, at, t, n = 14, seed = 'd'}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const rx = random(`${seed}x${i}`);
      const ry = random(`${seed}y${i}`);
      const rz = random(`${seed}z${i}`);
      const z = at[2] + ((rz * 3 + t * (0.08 + rx * 0.06)) % 3);
      const [px, py] = iso(s)([at[0] + rx * 2.4 - 1.2 + Math.sin(t * 0.7 + i) * 0.15, at[1] + ry * 2.4 - 1.2, z]);
      return <circle key={i} cx={px} cy={py} r={1.6 + rz * 1.4} fill={COLORS.inkSoft} opacity={0.35} />;
    })}
  </g>
);

/** Rolling library ladder hooked on a rail of the back rack. */
export const Ladder: React.FC<{s: number; x: number; yFoot: number; yTop: number; zTop: number}> = ({s, x, yFoot, yTop, zTop}) => {
  const rung = Array.from({length: Math.floor(zTop / 0.6)}, (_, i) => (i + 1) * 0.6);
  const at = (side: number, z: number): P3 => [x + side, yFoot + (yTop - yFoot) * (z / zTop), z];
  return (
    <g>
      {rung.map((z) => (
        <Line3 key={z} s={s} points={[at(0, z), at(0.7, z)]} width={STROKE.secondary} />
      ))}
      <Line3 s={s} points={[at(0, 0), at(0, zTop)]} width={STROKE.main} />
      <Line3 s={s} points={[at(0.7, 0), at(0.7, zTop)]} width={STROKE.main} />
      {/* wheels */}
      {[0, 0.7].map((d) => {
        const [wx, wy] = iso(s)([x + d, yFoot, 0.08]);
        return <circle key={d} cx={wx} cy={wy} r={0.09 * s} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.micro} />;
      })}
    </g>
  );
};

/** The hall itself: walls, tiled floor, round window, racks along both walls, ladder, archivist. */
export const ArchiveShell: React.FC<{s: number; t: number}> = ({s, t}) => {
  const {W, D, H} = ARCHIVE;
  const walker = (t * 0.35) % 6; // the archivist walks along the back rack with a box, then repeats out of view
  return (
    <g>
      <polygon points={pts(s, [[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])} fill={COLORS.wallRight} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]])} fill={COLORS.wallLeft} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <polygon points={pts(s, [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill={COLORS.floor} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      {/* floor tiles */}
      {Array.from({length: 7}, (_, i) => (
        <g key={i}>
          <Line3 s={s} points={[[0, 1.4 * (i + 1), 0], [W, 1.4 * (i + 1), 0]]} width={STROKE.micro} color={COLORS.inkSoft} />
          <Line3 s={s} points={[[1.4 * (i + 1), 0, 0], [1.4 * (i + 1), D, 0]]} width={STROKE.micro} color={COLORS.inkSoft} />
        </g>
      ))}
      {/* round window high on the left wall, with mullions */}
      <g transform={planeMatrix(s, 'wallY', [0, 7.6, 6.4])}>
        <circle cx={0} cy={1.2} r={1.2} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
        <circle cx={0} cy={1.2} r={1.0} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />
        <line x1={-1.2} y1={1.2} x2={1.2} y2={1.2} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
        <line x1={0} y1={0} x2={0} y2={2.4} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
      </g>
      {/* racks: back wall (long) and left wall (short, in front of the window zone) */}
      <ArchiveRack s={s} at={[0.2, 0, 0]} len={W - 0.4} axis="x" seed="rb" />
      <ArchiveRack s={s} at={[0, 1.4, 0]} len={4.6} axis="y" levels={3} seed="rl" />
      {/* rail on the back rack and the ladder */}
      <Line3 s={s} points={[[0.2, 1.25, 5.6], [W - 0.2, 1.25, 5.6]]} width={STROKE.main} />
      <Ladder s={s} x={6.6} yFoot={2.6} yTop={1.25} zTop={5.6} />
      {/* archivist with a box walks along the back rack */}
      {walker < 4.2 ? (
        <g>
          <IsoPerson s={s} at={[1.6 + walker, 2.2, 0]} h={1.15} walk={t * 6} />
          <Box s={s} at={[1.5 + walker, 2.45, 0.62]} size={[0.42, 0.3, 0.26]} stroke={STROKE.micro} />
        </g>
      ) : null}
    </g>
  );
};
