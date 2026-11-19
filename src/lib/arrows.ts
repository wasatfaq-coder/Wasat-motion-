import * as K from '../vendor/anatomy/iso-kit';
import {Point3} from './assembly';
import {ArrowProbe} from './motion';

// The three arrow looks of a physics topic, the same in every scene and on every hero (current — thin dark with a small
// head · force — THICK flat, dark outline and light body · field — dashed with heads). Arrows are annotations drawn over
// the object (§20.4); their tails sit on the conductor they belong to (motion-check verifies it through ArrowProbe).
// Shared so a second hero of a topic draws the SAME arrows as the first (a copy drifts: root-causes.md, «arrows»).
export type Arrow = ArrowProbe & {svg: string};

const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Point3): Point3 => a.map((v) => v / (len(a) || 1)) as Point3;
export const back = (p: Point3, u: Point3, d: number): Point3 => [p[0] - u[0] * d, p[1] - u[1] * d, p[2] - u[2] * d];
export const along = (p: Point3, u: Point3, s: number): Point3 => [p[0] + u[0] * s, p[1] + u[1] * s, p[2] + u[2] * s];

/** Arrow drawing in projection P (kit units). */
export const arrowKit = (P: K.Projection) => {
  const at = (p: Point3) => K.iso(p, P);
  const tri = (tip: Point3, u: Point3, size: number, wide: Point3, fill: string, stroke = fill, outline = 1.5) => {
    const base = along(tip, u, -size);
    const w = (k: number): Point3 => along(base, wide, size * 0.5 * k);
    return `<path d="${K.pathOf([at(tip), at(w(1)), at(w(-1))], true)}" style="fill:${fill};stroke:${stroke};stroke-width:${outline}px;stroke-linejoin:round"/>`;
  };
  const line = (a: Point3, b: Point3, width: number, color: string, dash = '') =>
    `<path d="${K.pathOf([at(a), at(b)])}" style="fill:none;stroke:${color};stroke-width:${width}px;stroke-linecap:round;${dash ? `stroke-dasharray:${dash};` : ''}"/>`;
  /** current: thin dark shaft with a small head */
  const currentArrow = (name: string, owner: string, from: Point3, to: Point3, wide: Point3, opacity: number): Arrow => {
    const u = unit(sub(to, from));
    return {name, owner, tail: from, tip: to, along: [owner.split('.')[0]], opacity, svg: line(from, back(to, u, 2.5), 3.2, 'var(--anatomy-hi)') + tri(to, u, 3.6, wide, 'var(--anatomy-hi)')};
  };
  /** force: a thick flat arrow, dark outline and a light body; the tail starts on the conductor */
  const forceArrow = (name: string, owner: string, from: Point3, dir: Point3, reach: number, wide: Point3, opacity: number): Arrow => {
    const to = along(from, dir, reach);
    const neck = back(to, dir, 3);
    return {name, owner, tail: from, tip: to, opacity, svg: line(from, neck, 10, 'var(--anatomy-hi)') + line(from, neck, 5.2, 'var(--anatomy-shade-3)') + tri(to, dir, 3.3, wide, 'var(--anatomy-shade-3)', 'var(--anatomy-hi)', 3)};
  };
  /** the markup of a list of arrows, each at its opacity */
  const svgOf = (arrows: Arrow[]) => arrows.map((a) => (a.opacity < 0.999 ? `<g opacity="${a.opacity.toFixed(3)}">${a.svg}</g>` : a.svg)).join('');
  return {at, tri, line, currentArrow, forceArrow, svgOf};
};
