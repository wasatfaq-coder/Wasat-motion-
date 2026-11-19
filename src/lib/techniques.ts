import {iso, lineSvg, pathOf, Projection, solidSvg, Tone} from '../vendor/anatomy/iso-kit';
import type {Point3} from './assembly';

// Three anatomy-plate techniques for any topic (MASTER_PROMPT_FINAL §25), found in a reference review
// (docs/references/lemo-opuscar.md): colour that arrives as a front, a section whose hatching belongs to the world,
// and layers that come apart so one can be pulled out. Pure functions: no React, no randomness, a state per frame.
// Colours are the house palette only: the hatching and the cut outline use the kit's own tones (never coral), so the
// one-coral-part-per-frame rule (§22.1) is not touched.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const dist = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ── 1. Dye: colour arrives as a front from the point where the energy enters ─────────────────────────────────────────

/** How dyed a part is at distance `radius` of the front from `origin`: 1 inside the front, 0 outside, a soft band of
 *  `edge` kit units between. A scene dyes by SYSTEM: pass the part's `at` (its centre) and paint the part in its
 *  system tone by this share (an overlay with this opacity, or the dyed tone once share > 0.5). Never a global fade:
 *  the viewer reads where the energy goes from the order in which parts take colour. */
export const dyeShare = (at: Point3, origin: Point3, radius: number, edge = 4) => clamp01((radius - dist(at, origin)) / Math.max(1e-6, edge));

/** Radius of the front for an eased progress 0…1 (use `settle` from motion.ts), reaching `reach` + one band at the end
 *  so the farthest part is fully dyed when progress is 1. */
export const dyeRadius = (progress: number, reach: number, edge = 4) => clamp01(progress) * (reach + edge);

// ── 2. Section: a cut with hatching fixed in the world ───────────────────────────────────────────────────────────────

export type Cut = {axis: 'x' | 'y' | 'z'; at: number};
export type CutBody = {kind: 'box'; x: number; y: number; w: number; d: number; z0: number; z1: number} | {kind: 'cylinder'; cx: number; cy: number; r: number; z0: number; z1: number};

/** The cut face of a body: a convex ring of 3D points, or null when the plane misses the body. A cylinder stands on
 *  its z axis. Cutting a cylinder across the axis gives a circle; cutting along it gives a rectangle of the chord. */
export const cutFace = (body: CutBody, cut: Cut, steps = 40): Point3[] | null => {
  const at = cut.at;
  if (body.kind === 'box') {
    const {x, y, w, d, z0, z1} = body;
    if (cut.axis === 'z') return at > z0 && at < z1 ? [[x, y, at], [x + w, y, at], [x + w, y + d, at], [x, y + d, at]] : null;
    if (cut.axis === 'x') return at > x && at < x + w ? [[at, y, z0], [at, y + d, z0], [at, y + d, z1], [at, y, z1]] : null;
    return at > y && at < y + d ? [[x, at, z0], [x + w, at, z0], [x + w, at, z1], [x, at, z1]] : null;
  }
  const {cx, cy, r, z0, z1} = body;
  if (cut.axis === 'z') return at > z0 && at < z1 ? Array.from({length: steps}, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / steps), cy + r * Math.sin((2 * Math.PI * i) / steps), at] as Point3) : null;
  const centre = cut.axis === 'x' ? cx : cy;
  const off = Math.abs(at - centre);
  if (off >= r) return null;
  const h = Math.sqrt(r * r - off * off);
  return cut.axis === 'x' ? [[at, cy - h, z0], [at, cy + h, z0], [at, cy + h, z1], [at, cy - h, z1]] : [[cx - h, at, z0], [cx + h, at, z0], [cx + h, at, z1], [cx - h, at, z1]];
};

/** Plane coordinates of a point on the cut: z-plane (x, y), x-plane (y, z), y-plane (x, z). */
const uv = (axis: Cut['axis'], p: Point3): [number, number] => (axis === 'z' ? [p[0], p[1]] : axis === 'x' ? [p[1], p[2]] : [p[0], p[2]]);
const fromUv = (axis: Cut['axis'], at: number, [u, v]: [number, number]): Point3 => (axis === 'z' ? [u, v, at] : axis === 'x' ? [at, u, v] : [u, at, v]);

/** Hatching of a cut face: parallel 45° lines every `spacing` kit units, computed in the plane's own coordinates, so
 *  the lines belong to the world and never swim when the camera moves (a screen-space hatch does). Returns 3D
 *  segments clipped to the face. */
export const hatchSegments = (face: Point3[], cut: Cut, spacing = 2): [Point3, Point3][] => {
  const poly = face.map((p) => uv(cut.axis, p));
  const us = poly.map((p) => p[0]);
  const vs = poly.map((p) => p[1]);
  // lines u − v = c; the offsets are multiples of `spacing` in plane space, not measured from the face, so two faces
  // cut from one plane carry one continuous hatch
  const lo = Math.min(...us) - Math.max(...vs);
  const hi = Math.max(...us) - Math.min(...vs);
  const out: [Point3, Point3][] = [];
  for (let c = Math.ceil(lo / spacing) * spacing; c <= hi; c += spacing) {
    // the line is p(s) = (c + s, s); clip against the convex polygon: s ∈ [s0, s1]
    let s0 = -Infinity;
    let s1 = Infinity;
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      sign ||= Math.sign((b[0] - a[0]) * (poly[(i + 2) % poly.length][1] - b[1]) - (b[1] - a[1]) * (poly[(i + 2) % poly.length][0] - b[0]));
    }
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      // inside when sign · cross(edge, p − a) ≥ 0 ; cross is linear in s: k0 + k1·s
      const k0 = sign * (ex * (0 - a[1]) - ey * (c - a[0]));
      const k1 = sign * (ex * 1 - ey * 1);
      if (Math.abs(k1) < 1e-9) {
        if (k0 < 0) {
          s0 = Infinity;
          break;
        }
      } else if (k1 > 0) s0 = Math.max(s0, -k0 / k1);
      else s1 = Math.min(s1, -k0 / k1);
    }
    if (s1 - s0 > 1e-6 && Number.isFinite(s0) && Number.isFinite(s1)) out.push([fromUv(cut.axis, cut.at, [c + s0, s0]), fromUv(cut.axis, cut.at, [c + s1, s1])]);
  }
  return out;
};

/** The cut face as kit markup: a flat filled face in `tone` with an outline and the hatching over it. */
export const sectionSvg = (body: CutBody, cut: Cut, P: Projection, {spacing = 2, tone = 'mid'}: {spacing?: number; tone?: Tone} = {}): string => {
  const face = cutFace(body, cut);
  if (!face) return '';
  const ring = face.map((p) => iso(p, P));
  const hatch = hatchSegments(face, cut, spacing)
    .map(([a, b]) => pathOf([iso(a, P), iso(b, P)]))
    .join('');
  const outline = pathOf(ring, true);
  return solidSvg({fill: outline, outline, crease: '', top: '', shades: []}, {tone, flat: true, crease: 'none'}) + lineSvg(hatch, {tone: 'lo'});
};

// ── 3. Explode by system and pull one layer out ──────────────────────────────────────────────────────────────────────

/** Offset of layer `index` (0 stays) when a stack of `count` layers is exploded along `dir` by an eased progress
 *  0…1. Layers keep their order, so the exploded stack still reads as the assembled one. */
export const explodeOffset = (index: number, count: number, progress: number, gap: number, dir: Point3 = [0, 0, 1]): Point3 => {
  const k = clamp01(progress) * gap * Math.min(index, Math.max(0, count - 1));
  return [dir[0] * k, dir[1] * k, dir[2] * k];
};

/** Extra offset of the one layer being pulled out (sideways, out of the stack) by an eased progress 0…1; the layers
 *  above it close the gap in the same progress, so the viewer sees what the stack does WITHOUT that layer. */
export const pullOut = (progress: number, distance: number, dir: Point3 = [1, 0, 0]): Point3 => {
  const k = clamp01(progress) * distance;
  return [dir[0] * k, dir[1] * k, dir[2] * k];
};
