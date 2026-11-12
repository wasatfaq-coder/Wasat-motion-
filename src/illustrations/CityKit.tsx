import React from 'react';
import {random} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {iso, P3, planeMatrix, pts} from '../lib/iso';
import {Box, Line3} from './primitives';

const ns = {vectorEffect: 'non-scaling-stroke' as const};

/** Flat ground tile (floor plane). */
export const Ground: React.FC<{s: number; at: P3; w: number; d: number; fill?: string; dashed?: boolean}> = ({s, at, w, d, fill = COLORS.floor, dashed}) => (
  <g transform={planeMatrix(s, 'floor', at)}>
    <rect x={0} y={0} width={w} height={d} rx={0.2} fill={fill} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeDasharray={dashed ? '8 8' : undefined} {...ns} />
  </g>
);

/** Road along x or y with a dashed centre line. */
export const Road: React.FC<{s: number; at: P3; len: number; dir: 'x' | 'y'; width?: number}> = ({s, at, len, dir, width = 1.4}) => {
  const w = dir === 'x' ? len : width;
  const d = dir === 'x' ? width : len;
  return (
    <g transform={planeMatrix(s, 'floor', at)}>
      <rect x={0} y={0} width={w} height={d} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
      {dir === 'x' ? (
        <line x1={0.2} y1={d / 2} x2={w - 0.2} y2={d / 2} stroke={COLORS.fillLight} strokeWidth={STROKE.main} strokeDasharray="10 12" {...ns} />
      ) : (
        <line x1={w / 2} y1={0.2} x2={w / 2} y2={d - 0.2} stroke={COLORS.fillLight} strokeWidth={STROKE.main} strokeDasharray="10 12" {...ns} />
      )}
    </g>
  );
};

/** Building with windows on both visible faces, a door, a roof parapet and optional sign colour. */
export const Building: React.FC<{s: number; at: P3; size: P3; floors?: number; accent?: boolean; lit?: number; door?: boolean}> = ({s, at, size, floors = 3, accent = false, lit = 0, door = true}) => {
  const [x, y, z] = at;
  const [w, d, h] = size;
  const cols = Math.max(2, Math.round(w / 0.7));
  const colsR = Math.max(2, Math.round(d / 0.7));
  const fh = h / floors;
  return (
    <g>
      <Box s={s} at={at} size={size} top={COLORS.fillMid} left={COLORS.fillLight} right={COLORS.fillMid} />
      {/* windows on the front-left face (plane y = y + d) */}
      <g transform={planeMatrix(s, 'wallX', [x, y + d, z + h])}>
        {Array.from({length: floors}, (_, f) =>
          Array.from({length: cols}, (_, c) => {
            const on = lit > 0 && random(`w${x}${y}${f}${c}`) < lit;
            if (door && f === floors - 1 && c === Math.floor(cols / 2)) {
              return <rect key={`${f}${c}`} x={(c + 0.25) * (w / cols)} y={f * fh + fh * 0.3} width={(w / cols) * 0.5} height={fh * 0.7} fill={accent ? COLORS.accent : COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />;
            }
            return <rect key={`${f}${c}`} x={(c + 0.2) * (w / cols)} y={f * fh + fh * 0.22} width={(w / cols) * 0.6} height={fh * 0.5} fill={on ? COLORS.fillLight : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />;
          }),
        )}
      </g>
      {/* windows on the front-right face (plane x = x + w) */}
      <g transform={planeMatrix(s, 'wallY', [x + w, y, z + h])}>
        {Array.from({length: floors}, (_, f) =>
          Array.from({length: colsR}, (_, c) => (
            <rect key={`${f}${c}`} x={(c + 0.2) * (d / colsR)} y={f * fh + fh * 0.22} width={(d / colsR) * 0.6} height={fh * 0.5} fill={lit > 0 && random(`r${x}${y}${f}${c}`) < lit ? COLORS.fillLight : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
          )),
        )}
      </g>
      <Box s={s} at={[x - 0.05, y - 0.05, z + h]} size={[w + 0.1, d + 0.1, 0.15]} stroke={STROKE.secondary} top={accent ? COLORS.accentSoft : COLORS.fillLight} />
    </g>
  );
};

/** Small house with a pitched roof. */
export const House: React.FC<{s: number; at: P3; size?: P3; accent?: boolean}> = ({s, at, size = [1.6, 1.4, 1.2], accent}) => {
  const [x, y, z] = at;
  const [w, d, h] = size;
  return (
    <g>
      <Box s={s} at={at} size={size} left={COLORS.fillLight} right={COLORS.fillMid} />
      <Line3 s={s} close fill={accent ? COLORS.accent : COLORS.fillDark} width={STROKE.main} points={[[x - 0.1, y + d + 0.1, z + h], [x + w + 0.1, y + d + 0.1, z + h], [x + w + 0.1, y + d / 2, z + h + 0.8], [x - 0.1, y + d / 2, z + h + 0.8]]} />
      <Line3 s={s} close fill={COLORS.fillMid} width={STROKE.main} points={[[x + w + 0.1, y - 0.1, z + h], [x + w + 0.1, y + d + 0.1, z + h], [x + w + 0.1, y + d / 2, z + h + 0.8]]} />
      <g transform={planeMatrix(s, 'wallX', [x, y + d, z + h])}>
        <rect x={w * 0.4} y={h * 0.4} width={w * 0.22} height={h * 0.6} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
        <rect x={w * 0.1} y={h * 0.25} width={w * 0.2} height={h * 0.25} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
        <rect x={w * 0.72} y={h * 0.25} width={w * 0.2} height={h * 0.25} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} {...ns} />
      </g>
    </g>
  );
};

/** Tree: trunk + round crown with a few leaf strokes; sways slightly. */
export const Tree: React.FC<{s: number; at: P3; h?: number; t: number; seed?: string}> = ({s, at, h = 1.4, t, seed = 'tr'}) => {
  const [bx, by] = iso(s)([at[0], at[1], at[2] + h]);
  const sway = Math.sin(t * 1.2 + random(seed) * 6) * 2;
  const r = 0.55 * s;
  return (
    <g>
      <Line3 s={s} points={[at, [at[0], at[1], at[2] + h]]} width={STROKE.main} />
      <g transform={`rotate(${sway} ${bx} ${by})`}>
        {[[-0.45, -0.35, 0.7], [0.45, -0.4, 0.7], [0, -0.95, 0.8], [0, -0.45, 0.85]].map(([dx, dy, k], i) => (
          <circle key={i} cx={bx + dx * r} cy={by + dy * r} r={r * k} fill={i === 3 ? COLORS.fillLight : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
        ))}
      </g>
    </g>
  );
};

/** Faceless isometric person: body box + round head. `h` = height in units (kids lower, adults taller). */
export const IsoPerson: React.FC<{s: number; at: P3; h?: number; accent?: boolean; bob?: number; p?: number}> = ({s, at, h = 1.0, accent, bob = 0, p = 1}) => {
  if (p <= 0) return null;
  const [x, y, z] = at;
  const body = h * 0.62;
  const [hx, hy] = iso(s)([x + 0.15, y + 0.12, z + body + h * 0.2 + bob]);
  return (
    <g opacity={Math.min(1, p * 2)} transform={`translate(0 ${(1 - p) * 30})`}>
      <Box s={s} at={[x, y, z + bob]} size={[0.3, 0.24, body]} stroke={STROKE.secondary} top={accent ? COLORS.accentSoft : COLORS.fillMid} left={accent ? COLORS.accent : COLORS.fillLight} right={accent ? COLORS.accentSoft : COLORS.fillMid} />
      <circle cx={hx} cy={hy} r={h * 0.15 * s} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
    </g>
  );
};

/** Small car driving along a direction (x or y). */
export const Car: React.FC<{s: number; at: P3; accent?: boolean}> = ({s, at, accent}) => {
  const [x, y, z] = at;
  return (
    <g>
      <Box s={s} at={[x, y, z + 0.15]} size={[1.0, 0.55, 0.32]} stroke={STROKE.secondary} left={accent ? COLORS.accent : COLORS.fillLight} right={accent ? COLORS.accentSoft : COLORS.fillMid} top={COLORS.fillLight} />
      <Box s={s} at={[x + 0.25, y + 0.05, z + 0.47]} size={[0.5, 0.45, 0.25]} stroke={STROKE.secondary} left={COLORS.fillLight} right={COLORS.fillDark} />
      {[0.2, 0.8].map((u) => {
        const [cx, cy] = iso(s)([x + u, y + 0.55, z + 0.12]);
        return <circle key={u} cx={cx} cy={cy} r={0.12 * s} fill={COLORS.ink} />;
      })}
    </g>
  );
};

/** Bus stop shelter with a clock on a pole. */
export const BusStop: React.FC<{s: number; at: P3; t: number}> = ({s, at, t}) => {
  const [x, y, z] = at;
  const sec = (t / 6) * 360;
  return (
    <g>
      <Box s={s} at={[x, y, z]} size={[2.4, 0.1, 1.9]} stroke={STROKE.secondary} left={COLORS.fillLight} />
      <Box s={s} at={[x - 0.1, y - 0.1, z + 1.9]} size={[2.6, 1.1, 0.12]} stroke={STROKE.secondary} />
      <Box s={s} at={[x + 0.3, y + 0.3, z + 0.45]} size={[1.8, 0.35, 0.1]} stroke={STROKE.secondary} />
      <Line3 s={s} points={[[x + 2.8, y + 0.6, z], [x + 2.8, y + 0.6, z + 2.6]]} width={STROKE.main} />
      <g transform={planeMatrix(s, 'wallX', [x + 2.8, y + 0.6, z + 3.0])}>
        <circle cx={0} cy={0} r={0.42} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
        <line x1={0} y1={0} x2={0} y2={-0.28} stroke={COLORS.ink} strokeWidth={STROKE.main} {...ns} />
        <line x1={0} y1={0} x2={Math.sin((sec * Math.PI) / 180) * 0.34} y2={-Math.cos((sec * Math.PI) / 180) * 0.34} stroke={COLORS.accent} strokeWidth={STROKE.secondary} {...ns} />
      </g>
    </g>
  );
};

/** Beach umbrella. */
export const Umbrella: React.FC<{s: number; at: P3}> = ({s, at}) => {
  const [x, y, z] = at;
  const top: P3 = [x, y, z + 2.0];
  const [tx, ty] = iso(s)(top);
  const r = 1.1 * s;
  return (
    <g>
      <Line3 s={s} points={[at, top]} width={STROKE.main} />
      <path d={`M${tx - r},${ty + r * 0.35} Q${tx},${ty - r * 0.55} ${tx + r},${ty + r * 0.35} Z`} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />
      {[-0.5, 0, 0.5].map((k) => (
        <line key={k} x1={tx} y1={ty - r * 0.12} x2={tx + k * r * 1.6} y2={ty + r * 0.3} stroke={COLORS.ink} strokeWidth={STROKE.micro} />
      ))}
    </g>
  );
};

/** Sea: floor-plane band with moving wave lines. */
export const Sea: React.FC<{s: number; at: P3; w: number; d: number; t: number}> = ({s, at, w, d, t}) => (
  <g transform={planeMatrix(s, 'floor', at)}>
    <rect x={0} y={0} width={w} height={d} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} {...ns} />
    {Array.from({length: 6}, (_, i) => {
      const y0 = (i + 0.5) * (d / 6);
      const ph = t * 1.4 + i;
      const pts2 = Array.from({length: 24}, (_, k) => `${(k / 23) * w},${y0 + Math.sin(ph + k * 0.8) * 0.08}`).join(' ');
      return <polyline key={i} points={pts2} fill="none" stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} {...ns} />;
    })}
  </g>
);

export const isoPoly = (s: number, p: P3[]) => pts(s, p);

/** Street lamp post. */
export const LampPost: React.FC<{s: number; at: P3}> = ({s, at}) => {
  const [x, y, z] = at;
  const [hx, hy] = iso(s)([x, y, z + 2.6]);
  return (
    <g>
      <Line3 s={s} points={[at, [x, y, z + 2.6], [x + 0.4, y, z + 2.7]]} width={STROKE.main} />
      <circle cx={hx + 0.35 * s} cy={hy - 0.05 * s} r={0.16 * s} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
    </g>
  );
};

/** Flower bed: low box with flowers. */
export const FlowerBed: React.FC<{s: number; at: P3; w?: number; t?: number}> = ({s, at, w = 1.6, t = 0}) => {
  const [x, y, z] = at;
  return (
    <g>
      <Box s={s} at={at} size={[w, 0.6, 0.3]} stroke={STROKE.secondary} top={COLORS.fillDark} />
      {Array.from({length: 6}, (_, i) => {
        const [fx, fy] = iso(s)([x + 0.2 + (i * (w - 0.4)) / 5, y + 0.3, z + 0.45 + 0.03 * Math.sin(t * 2 + i)]);
        return <circle key={i} cx={fx} cy={fy} r={0.11 * s} fill={i % 2 ? COLORS.accent : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} />;
      })}
    </g>
  );
};

/** Paving grid on the ground (floor plane). */
export const Paving: React.FC<{s: number; at: P3; w: number; d: number; step?: number}> = ({s, at, w, d, step = 1}) => (
  <g transform={planeMatrix(s, 'floor', at)}>
    {Array.from({length: Math.floor(w / step) + 1}, (_, i) => (
      <line key={`x${i}`} x1={i * step} y1={0} x2={i * step} y2={d} stroke={COLORS.inkSoft} strokeWidth={1} opacity={0.5} {...ns} />
    ))}
    {Array.from({length: Math.floor(d / step) + 1}, (_, i) => (
      <line key={`y${i}`} x1={0} y1={i * step} x2={w} y2={i * step} stroke={COLORS.inkSoft} strokeWidth={1} opacity={0.5} {...ns} />
    ))}
  </g>
);
