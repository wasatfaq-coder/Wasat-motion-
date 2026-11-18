import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as K from '../../vendor/anatomy/iso-kit';
import {AnatomyStage, Kit, toRoom} from '../../lib/anatomy';
import {boxCorners, camOn, RoomSvg} from '../../lib/camera';
import {Point3} from '../../lib/assembly';
import {AX, AY, commutatorItems, LOOP_R, LOOP_Z0, LOOP_Z1, loopItems, PLATE_TOP, STAND, STAND_CORNERS, STAND_P, STAND_U, wireItems} from './stand.parts';
import KEYS from './stand.parts.keys.json';

// Style frames of the field stand (STOP 2, scenes 2–5): the wire, the loop at 30°, the dead position, the commutator.
// Arrows keep ONE look each through the film: current — thin dark; force — thick flat; field — dashed lines with heads.
STAND.applyKeys((KEYS as Record<string, Record<string, number>>).STAND);
const P = STAND_P;
const at = (p: Point3) => K.iso(p, P);
type Item = {at: Point3; svg: string};

const head = (tip: Point3, dir: Point3, size: number, side: Point3): string => {
  const base: Point3 = [tip[0] - dir[0] * size, tip[1] - dir[1] * size, tip[2] - dir[2] * size];
  const a: Point3 = [base[0] + side[0] * size * 0.45, base[1] + side[1] * size * 0.45, base[2] + side[2] * size * 0.45];
  const b: Point3 = [base[0] - side[0] * size * 0.45, base[1] - side[1] * size * 0.45, base[2] - side[2] * size * 0.45];
  return `<path d="${K.pathOf([at(tip), at(a), at(b)], true)}" style="fill:var(--anatomy-hi);stroke:var(--anatomy-hi);stroke-width:2px;stroke-linejoin:round"/>`;
};
/** current: a thin dark arrow along a vertical side of the loop (offset towards the viewer so it reads on the bar) */
const currentArrow = (from: Point3, to: Point3, side: Point3): Item => {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]] as Point3;
  const L = Math.hypot(...d);
  const u = d.map((v) => v / L) as Point3;
  const tail: Point3 = [to[0] - u[0] * 3, to[1] - u[1] * 3, to[2] - u[2] * 3];
  return {at: to, svg: `<g class="cover-sign">${K.lineSvg(K.pathOf([at(from), at(tail)]), {tone: 'hi'})}</g>` + head(to, u, 3, side).replace('stroke-width:2px', 'stroke-width:1.5px')};
};
/** force: a thick flat arrow (a wide stroke with a light outline) */
const forceArrow = (from: Point3, to: Point3, side: Point3): Item => {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]] as Point3;
  const L = Math.hypot(...d);
  const u = d.map((v) => v / L) as Point3;
  const tail: Point3 = [to[0] - u[0] * 5, to[1] - u[1] * 5, to[2] - u[2] * 5];
  const shaft = K.pathOf([at(from), at(tail)]);
  return {
    at: to,
    svg:
      `<path d="${shaft}" style="fill:none;stroke:var(--anatomy-hi);stroke-width:9px;stroke-linecap:butt"/>` +
      `<path d="${shaft}" style="fill:none;stroke:var(--anatomy-shade-3);stroke-width:4.5px;stroke-linecap:butt"/>` +
      head(to, u, 5, side).replace('stroke-width:2px', 'stroke-width:3px'),
  };
};
/** the field: five dashed lines from N to S with a head each */
const fieldLines = (): Item[] =>
  [
    [AY, PLATE_TOP + 24],
    [AY - 7, PLATE_TOP + 24],
    [AY + 7, PLATE_TOP + 24],
  ].map(([y, z]) => {
    const a: Point3 = [21, y, z];
    const b: Point3 = [69, y, z];
    return {
      at: [AX, y, z] as Point3,
      svg: `<g class="cover-sign">${K.lineSvg(K.pathOf([at(a), at(b)]), {tone: 'mid', dashed: true})}</g>` + head([AX + 17, y, z], [1, 0, 0], 3.4, [0, 0, 1]).replace('var(--anatomy-hi)', 'var(--anatomy-mid)'),
    };
  });

export const ElektromotorStand: React.FC = () => {
  const frame = useCurrentFrame();
  const room = (pts: Point3[]) => pts.map((p) => toRoom(p, STAND_U));
  let extra: Item[] = [...fieldLines()];
  let cam = camOn(room(STAND_CORNERS), 0.8, [540, 760]);
  if (frame === 0) {
    // scene 2: the wire (coral) in the field, current up, force sideways (+y)
    const z0 = PLATE_TOP + 10;
    const z1 = PLATE_TOP + 26;
    extra = [...extra, ...wireItems(), currentArrow([AX + 2.2, AY, z0], [AX + 2.2, AY, z1], [1, 0, 0]), forceArrow([AX, AY + 1.2, PLATE_TOP + 18], [AX, AY + 15, PLATE_TOP + 18], [0, 0, 1])];
    cam = camOn(room(boxCorners([14, 8, PLATE_TOP], [62, 44, 34]) as Point3[]), 0.95, [540, 760]);
  } else if (frame === 1 || frame === 2) {
    // scene 3 (loop 30° from the field direction) / scene 4 (the dead position: the plane across the field lines)
    const th = frame === 1 ? Math.PI / 6 : Math.PI / 2;
    const d: Point3 = [Math.cos(th), Math.sin(th), 0];
    const side = (s: number, z: number): Point3 => [AX + d[0] * s, AY + d[1] * s, z];
    const mz = (LOOP_Z0 + LOOP_Z1) / 2;
    extra = [...extra, ...loopItems(th), ...commutatorItems(th)];
    // currents: up on one vertical side, down on the other; forces on the sides: ±y (fixed by I·L×B with B along +x)
    extra.push(currentArrow(side(LOOP_R, LOOP_Z0 + 3), side(LOOP_R, LOOP_Z1 - 3), [-d[1], d[0], 0]), currentArrow(side(-LOOP_R, LOOP_Z1 - 3), side(-LOOP_R, LOOP_Z0 + 3), [-d[1], d[0], 0]));
    const f = 9;
    extra.push(forceArrow(side(LOOP_R, mz), [side(LOOP_R, mz)[0], side(LOOP_R, mz)[1] + f, mz], [0, 0, 1]), forceArrow(side(-LOOP_R, mz), [side(-LOOP_R, mz)[0], side(-LOOP_R, mz)[1] - f, mz], [0, 0, 1]));
    cam = camOn(room(boxCorners([14, 8, PLATE_TOP], [62, 44, 36]) as Point3[]), 0.95, [540, 760]);
  } else {
    // scene 5: the commutator close-up (the loop is above, the brushes press on the half-rings)
    extra = [...loopItems(0.35), ...commutatorItems(0.35)];
    cam = camOn(room(boxCorners([AX - 16, AY - 12, PLATE_TOP], [32, 24, 14]) as Point3[]), 0.95, [540, 760]);
  }
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <g className="ns">
          <Kit svg={STAND.svg({}, {extra})} />
        </g>
      </RoomSvg>
    </AnatomyStage>
  );
};
