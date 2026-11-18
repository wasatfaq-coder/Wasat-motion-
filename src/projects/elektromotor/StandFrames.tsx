import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as K from '../../vendor/anatomy/iso-kit';
import {AnatomyStage, Kit, toRoom} from '../../lib/anatomy';
import {boxCorners, camOn, RoomSvg, screenOf} from '../../lib/camera';
import {Point3} from '../../lib/assembly';
import {COLORS, STROKE} from '../../theme/tokens';
import {FrontalLayer, Plate} from '../../components/Frontal';
import {AX, AY, commutatorItems, LOOP_R, LOOP_Z0, LOOP_Z1, loopItems, PLATE_TOP, STAND, STAND_P, STAND_U, wireItems} from './stand.parts';
import KEYS from './stand.parts.keys.json';

// Style frames of the field stand (STOP 2, scenes 2–5). Three arrow looks, the same in every scene (decisions.md):
//   current — thin dark with a small head · force — THICK flat (dark outline, light body) · field — dashed with heads.
// Arrows are drawn with inline styles (no CSS classes), as markup over the audited object.
STAND.applyKeys((KEYS as Record<string, Record<string, number>>).STAND);
const P = STAND_P;
const at = (p: Point3) => K.iso(p, P);
type Item = {at: Point3; svg: string; bias?: number};
const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Point3): Point3 => a.map((v) => v / (len(a) || 1)) as Point3;
const back = (p: Point3, u: Point3, d: number): Point3 => [p[0] - u[0] * d, p[1] - u[1] * d, p[2] - u[2] * d];
const along = (p: Point3, u: Point3, s: number, q: Point3, t: number): Point3 => [p[0] + u[0] * s + q[0] * t, p[1] + u[1] * s + q[1] * t, p[2] + u[2] * s + q[2] * t];
const tri = (tip: Point3, u: Point3, size: number, wide: Point3, fill: string, stroke = fill) =>
  `<path d="${K.pathOf([at(tip), at(along(tip, u, -size, wide, size * 0.5)), at(along(tip, u, -size, wide, -size * 0.5))], true)}" style="fill:${fill};stroke:${stroke};stroke-width:1.5px;stroke-linejoin:round"/>`;
const line = (a: Point3, b: Point3, width: number, color: string, dash = '') =>
  `<path d="${K.pathOf([at(a), at(b)])}" style="fill:none;stroke:${color};stroke-width:${width}px;stroke-linecap:round;${dash ? `stroke-dasharray:${dash};` : ''}"/>`;

/** current: thin dark shaft with a small head */
const currentArrow = (from: Point3, to: Point3, wide: Point3): Item => {
  const u = unit(sub(to, from));
  return {at: to, svg: line(from, back(to, u, 2.5), 3.2, 'var(--anatomy-hi)') + tri(to, u, 3.6, wide, 'var(--anatomy-hi)')};
};
/** force: a thick flat arrow, dark outline and a light body */
const forceArrow = (from: Point3, to: Point3, wide: Point3): Item => {
  const u = unit(sub(to, from));
  const neck = back(to, u, 4.2);
  return {at: to, svg: line(from, neck, 12, 'var(--anatomy-hi)') + line(from, neck, 6.5, 'var(--anatomy-shade-3)') + tri(to, u, 6.4, wide, 'var(--anatomy-shade-3)', 'var(--anatomy-hi)')};
};
/** field: dashed lines from the N pole face to the S pole face, with two heads each */
const fieldLines = (ys: number[], z: number): Item[] =>
  ys.map((y) => {
    const a: Point3 = [21, y, z];
    const b: Point3 = [69, y, z];
    const heads = [31, 59].map((x) => tri([x, y, z], [1, 0, 0], 3.4, [0, 0, 1], 'var(--anatomy-mid)'));
    return {at: [AX, y, z] as Point3, svg: line(a, b, 2.4, 'var(--anatomy-mid)', '7 6') + heads.join('')};
  });

const Inset: React.FC<{x: number; y: number}> = ({x, y}) => {
  // a section looking down the wire: the current comes out of the page (dot), the field runs right, the force up
  const c = {x: x + 110, y: y + 150};
  const hi = COLORS.ink;
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={240} height={240} rx={22} fill={COLORS.fillDark} />
      <rect x={x} y={y} width={240} height={240} rx={22} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
      <path d={`M${c.x - 80} ${c.y} H${c.x + 90}`} stroke={COLORS.inkSoft} strokeWidth={4} strokeDasharray="14 10" fill="none" />
      <path d={`M${c.x + 100} ${c.y} l-20 -10 v20 z`} fill={COLORS.inkSoft} />
      <path d={`M${c.x} ${c.y - 12} V${c.y - 70}`} stroke={hi} strokeWidth={13} fill="none" />
      <path d={`M${c.x} ${c.y - 12} V${c.y - 70}`} stroke={COLORS.fillLight} strokeWidth={7} fill="none" />
      <path d={`M${c.x} ${c.y - 96} l-18 26 h36 z`} fill={COLORS.fillLight} stroke={hi} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={c.x} cy={c.y} r={15} fill={COLORS.accent} stroke={hi} strokeWidth={STROKE.secondary} />
      <circle cx={c.x} cy={c.y} r={4.5} fill={hi} />
      <path d={`M${c.x + 18} ${c.y - 18} h18 v18`} stroke={hi} strokeWidth={3} fill="none" />
    </g>
  );
};

export const ElektromotorStand: React.FC = () => {
  const frame = useCurrentFrame();
  const room = (pts: Point3[]) => pts.map((p) => toRoom(p, STAND_U));
  let extra: Item[] = [];
  let cam = camOn(room(boxCorners([22, 16, PLATE_TOP], [46, 28, 30]) as Point3[]), 0.92, [540, 700]);
  let showInset = false;
  const mz = (LOOP_Z0 + LOOP_Z1) / 2;
  if (frame === 0) {
    // scene 2: the wire (coral) in the field; current up, force along +y (I·L×B with B along +x)
    const z0 = PLATE_TOP + 9;
    const z1 = PLATE_TOP + 27;
    extra = [...fieldLines([AY - 8, AY + 8], PLATE_TOP + 24), ...wireItems(), currentArrow([AX + 3, AY, z0], [AX + 3, AY, z1], [0, 1, 0]), forceArrow([AX, AY + 2, PLATE_TOP + 18], [AX, AY + 15, PLATE_TOP + 18], [0, 0, 1])];
    showInset = true;
  } else if (frame === 1 || frame === 2) {
    // scene 3 (loop 30° from the field) and scene 4 (the dead position: the plane across the field lines)
    const th = frame === 1 ? Math.PI / 6 : Math.PI / 2;
    const d: Point3 = [Math.cos(th), Math.sin(th), 0];
    const wide: Point3 = [-d[1], d[0], 0];
    const sd = (s: number, z: number): Point3 => [AX + d[0] * s, AY + d[1] * s, z];
    extra = [...fieldLines([AY - 9, AY + 9], PLATE_TOP + 24), ...loopItems(th), ...commutatorItems(th)];
    extra.push(currentArrow(sd(LOOP_R, LOOP_Z0 + 3), sd(LOOP_R, LOOP_Z1 - 3), wide), currentArrow(sd(-LOOP_R, LOOP_Z1 - 3), sd(-LOOP_R, LOOP_Z0 + 3), wide));
    extra.push(forceArrow(sd(LOOP_R, mz), along(sd(LOOP_R, mz), [0, 1, 0], 11, [0, 0, 0], 0), [0, 0, 1]), forceArrow(sd(-LOOP_R, mz), along(sd(-LOOP_R, mz), [0, 1, 0], -11, [0, 0, 0], 0), [0, 0, 1]));
    cam = camOn(room(boxCorners([20, 14, PLATE_TOP], [50, 32, 30]) as Point3[]), 0.95, [540, 700]);
  } else {
    // scene 5: the commutator — two half-rings, the leads from the loop, the brushes pressing on them
    const th = 0.35;
    extra = [...loopItems(th), ...commutatorItems(th), currentArrow([AX + 3.5, AY + 1, PLATE_TOP + 12], [AX + 2.4, AY + 0.5, PLATE_TOP + 19], [0, 1, 0])];
    cam = camOn(room(boxCorners([AX - 15, AY - 11, PLATE_TOP], [30, 22, 24]) as Point3[]), 0.95, [540, 700]);
  }
  // N and S: frontal plates over the magnets (labels live in screen space, §20.4)
  const nPos = screenOf(cam, toRoom([12, AY, PLATE_TOP + 22], STAND_U));
  const sPos = screenOf(cam, toRoom([78, AY, PLATE_TOP + 22], STAND_U));
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <g className="ns">
          <Kit svg={STAND.svg({}, {extra})} />
        </g>
      </RoomSvg>
      <FrontalLayer>
        {frame !== 3 ? <Plate at={[nPos[0], nPos[1] - 70]} to={nPos} text="С" size={44} /> : null}
        {frame !== 3 ? <Plate at={[sPos[0], sPos[1] - 70]} to={sPos} text="Ю" size={44} /> : null}
        {showInset ? <Inset x={790} y={880} /> : null}
      </FrontalLayer>
    </AnatomyStage>
  );
};
