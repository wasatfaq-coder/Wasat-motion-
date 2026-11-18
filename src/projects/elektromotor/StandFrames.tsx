import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as K from '../../vendor/anatomy/iso-kit';
import {AnatomyStage, Kit, toRoom} from '../../lib/anatomy';
import {boxCorners, Cam, camOn, lerpCam, RoomSvg, screenOf} from '../../lib/camera';
import {SPRING_MECHANICAL, spring} from '../../lib/physics';
import {Point3} from '../../lib/assembly';
import {forceOnWire, screenDir} from '../../lib/handed';
import {COLORS, STROKE} from '../../theme/tokens';
import {FrontalLayer, Plate} from '../../components/Frontal';
import {AX, AY, commutatorItems, LOOP_R, LOOP_Z0, LOOP_Z1, loopItems, PLATE_TOP, STAND, STAND_P, STAND_U, wireItems} from './stand.parts';

// Style frames of the field stand (STOP 2, scenes 2–5). Three arrow looks, the same in every scene (decisions.md):
//   current — thin dark with a small head · force — THICK flat (dark outline, light body) · field — dashed with heads.
// Arrows are drawn with inline styles (no CSS classes), as markup over the audited object.
const P = STAND_P;
const at = (p: Point3) => K.iso(p, P);
const FIELD: Point3 = [1, 0, 0]; // N → S, along +x
/** the force on a conductor segment with the given current direction: I·L × B by the right-hand rule (src/lib/handed.ts) */
const forceDir = (current: Point3): Point3 => forceOnWire(current, FIELD);
type Item = {at: Point3; svg: string; bias?: number};
const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Point3) => Math.hypot(a[0], a[1], a[2]);
const forceSpan = (p: Point3, d: Point3, k: number): [Point3, Point3] => [along(p, d, 2, [0, 0, 0], 0), along(p, d, k, [0, 0, 0], 0)];
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
  const neck = back(to, u, 3);
  return {at: to, svg: line(from, neck, 10, 'var(--anatomy-hi)') + line(from, neck, 5.2, 'var(--anatomy-shade-3)') + tri(to, u, 3.3, wide, 'var(--anatomy-shade-3)', 'var(--anatomy-hi)')};
};
/** field: dashed lines from the N pole face to the S pole face, with two heads each */
const fieldLines = (ys: number[], z: number): Item[] =>
  ys.map((y) => {
    const a: Point3 = [21, y, z];
    const b: Point3 = [69, y, z];
    const heads = [31, 59].map((x) => tri([x, y, z], [1, 0, 0], 3.4, [0, 0, 1], 'var(--anatomy-mid)'));
    return {at: [AX, y, z] as Point3, svg: line(a, b, 2.4, 'var(--anatomy-mid)', '7 6') + heads.join('')};
  });

const norm2 = (v: [number, number]): [number, number] => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
const Inset: React.FC<{x: number; y: number}> = ({x, y}) => {
  // a plan view looking down the wire, turned like the stand on screen: the current comes out of the page (dot); the
  // field and the force use the SAME screen directions as the 3D arrows (derived from the same vectors)
  const c = {x: x + 120, y: y + 100};
  const hi = COLORS.ink;
  const X = norm2(screenDir(FIELD, P));
  const Y = norm2(screenDir(forceDir([0, 0, 1]), P));
  const pt = (v: number[], k: number) => `${c.x + v[0] * k} ${c.y + v[1] * k}`;
  const head = (v: number[], k: number, w: number, fill: string, stroke: string) => {
    const base = [c.x + v[0] * (k - 24), c.y + v[1] * (k - 24)];
    const n = [-v[1], v[0]];
    return <path d={`M${pt(v, k)} L${base[0] + n[0] * w} ${base[1] + n[1] * w} L${base[0] - n[0] * w} ${base[1] - n[1] * w} Z`} fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
  };
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={240} height={240} rx={22} fill={COLORS.fillDark} />
      <rect x={x} y={y} width={240} height={240} rx={22} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
      <path d={`M${pt(X, -70)} L${pt(X, 76)}`} stroke={COLORS.inkSoft} strokeWidth={4} strokeDasharray="14 10" fill="none" />
      {head(X, 100, 10, COLORS.inkSoft, COLORS.inkSoft)}
      <path d={`M${pt(Y, 14)} L${pt(Y, 62)}`} stroke={hi} strokeWidth={14} strokeLinecap="butt" fill="none" />
      <path d={`M${pt(Y, 14)} L${pt(Y, 62)}`} stroke={COLORS.fillLight} strokeWidth={8} strokeLinecap="butt" fill="none" />
      {head(Y, 92, 17, COLORS.fillLight, hi)}
      <circle cx={c.x} cy={c.y} r={16} fill={COLORS.accent} stroke={hi} strokeWidth={STROKE.secondary} />
      <circle cx={c.x} cy={c.y} r={4.5} fill={hi} />
    </g>
  );
};

type Beat = {extra: Item[]; arrows: Item[]; cam: Cam; showInset: boolean};

const beatOf = (frame: number): Beat => {
  const room = (pts: Point3[]) => pts.map((p) => toRoom(p, STAND_U));
  let extra: Item[] = [];
  let arrows: Item[] = []; // drawn over everything (annotations, §20.4): never hidden behind a bench or a bearing
  let cam = camOn(room(boxCorners([AX - 11, AY - 12, PLATE_TOP + 6], [22, 24, 24]) as Point3[]), 0.9, [540, 720]);
  let showInset = false;
  const mz = (LOOP_Z0 + LOOP_Z1) / 2;
  if (frame === 0) {
    // scene 2: the wire (coral) in the field; current up, force along +y (I·L×B with B along +x)
    const z0 = PLATE_TOP + 9;
    const z1 = PLATE_TOP + 27;
    extra = [...fieldLines([AY - 8, AY + 8], PLATE_TOP + 24), ...wireItems()];
    arrows = [currentArrow([AX + 3, AY, z0], [AX + 3, AY, z1], [0, 1, 0]), forceArrow(...forceSpan([AX, AY, PLATE_TOP + 18], forceDir([0, 0, 1]), 16), [0, 0, 1])];
    showInset = true;
  } else if (frame === 1 || frame === 2) {
    // scene 3 (loop 30° from the field) and scene 4 (the dead position: the plane across the field lines)
    const th = frame === 1 ? Math.PI / 6 : Math.PI / 2;
    const d: Point3 = [Math.cos(th), Math.sin(th), 0];
    const wide: Point3 = [-d[1], d[0], 0];
    const sd = (s: number, z: number): Point3 => [AX + d[0] * s, AY + d[1] * s, z];
    extra = [...fieldLines([AY - 9, AY + 9], PLATE_TOP + 24), ...loopItems(th), ...commutatorItems(th)];
    arrows.push(currentArrow(sd(LOOP_R, LOOP_Z0 + 3), sd(LOOP_R, LOOP_Z1 - 3), wide), currentArrow(sd(-LOOP_R, LOOP_Z1 - 3), sd(-LOOP_R, LOOP_Z0 + 3), wide));
    // the force on each vertical side follows from ITS current (up on the +s side, down on the −s side): I·L × B
    const fUp = forceDir([0, 0, 1]);
    const fDown = forceDir([0, 0, -1]);
    const reach = 11;
    arrows.push(forceArrow(sd(LOOP_R, mz), along(sd(LOOP_R, mz), fUp, reach, [0, 0, 0], 0), [0, 0, 1]), forceArrow(sd(-LOOP_R, mz), along(sd(-LOOP_R, mz), fDown, reach, [0, 0, 0], 0), [0, 0, 1]));
    cam = camOn(room(boxCorners([AX - 10, AY - 10, PLATE_TOP + 12], [20, 20, 28]) as Point3[]), 0.97, [540, 720]);
  } else {
    // scene 5: the commutator — two half-rings, the leads from the loop, the brushes pressing on them
    const th = 0.35;
    extra = [...loopItems(th), ...commutatorItems(th)];
    // the current in the two vertical sides runs in opposite directions: the swap of scene 5 flips both
    const sd5 = (sg: number, z: number): Point3 => [AX + Math.cos(th) * sg, AY + Math.sin(th) * sg, z];
    const fU = forceDir([0, 0, 1]);
    const fD = forceDir([0, 0, -1]);
    const mz5 = (LOOP_Z0 + LOOP_Z1) / 2;
    arrows = [forceArrow(sd5(LOOP_R, mz5), along(sd5(LOOP_R, mz5), fU, 10, [0, 0, 0], 0), [0, 0, 1]), forceArrow(sd5(-LOOP_R, mz5), along(sd5(-LOOP_R, mz5), fD, 10, [0, 0, 0], 0), [0, 0, 1]), currentArrow(sd5(LOOP_R, LOOP_Z0 + 4), sd5(LOOP_R, LOOP_Z1 - 4), [-Math.sin(th), Math.cos(th), 0]), currentArrow(sd5(-LOOP_R, LOOP_Z1 - 4), sd5(-LOOP_R, LOOP_Z0 + 4), [-Math.sin(th), Math.cos(th), 0])];
    cam = camOn(room(boxCorners([AX - 9, AY - 8, PLATE_TOP + 2], [18, 16, 26]) as Point3[]), 0.95, [540, 720]);
  }
  return {extra, arrows, cam, showInset};
};

const picture = (beat: Beat) => STAND.svg({}, {extra: beat.extra}) + beat.arrows.map((a) => a.svg).join('');
const movingParts = (beat: Beat) => beat.extra.map((e) => e.svg).join('') + beat.arrows.map((a) => a.svg).join('');

const StandView: React.FC<{beat: Beat; cam: Cam; next?: {beat: Beat; t: number}; labels: boolean}> = ({beat, cam, next, labels}) => {
  const nPos = screenOf(cam, toRoom([12, AY, PLATE_TOP + 22], STAND_U));
  const sPos = screenOf(cam, toRoom([78, AY, PLATE_TOP + 22], STAND_U));
  const t = next?.t ?? 0;
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <g className="ns">
          {next ? (
            <>
              <Kit svg={STAND.svg({})} />
              <Kit svg={movingParts(beat)} opacity={1 - t} />
              <Kit svg={movingParts(next.beat)} opacity={t} />
            </>
          ) : (
            <Kit svg={picture(beat)} />
          )}
        </g>
      </RoomSvg>
      <FrontalLayer>
        {labels ? <Plate at={[nPos[0], nPos[1] - 70]} to={nPos} text="С" size={66} /> : null}
        {labels ? <Plate at={[sPos[0], sPos[1] - 70]} to={sPos} text="Ю" size={66} /> : null}
        {beat.showInset && t < 0.5 ? <Inset x={40} y={930} /> : null}
      </FrontalLayer>
    </AnatomyStage>
  );
};

/** Style frames: frame 0 scene 2, 1 scene 3, 2 scene 4, 3 scene 5. still-check reads these four frames. */
export const ElektromotorStand: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = beatOf(Math.min(3, Math.max(0, frame)));
  return <StandView beat={beat} cam={beat.cam} labels={frame !== 3} />;
};

const HOLD = 90; // 1.5 s at 60 fps: long enough to read the beat (§19.3)
const MOVE = 30; // 0.5 s, inside the transition band; the critical spring has settled by then
/** Silent test reel: four stand beats, then the camera eases back to the first.
 *  The rig uses the critical spring (no overshoot). The last frame is the opening again, so the file can loop. */
export const REEL_FRAMES = 4 * (HOLD + MOVE);

export const ElektromotorReel: React.FC = () => {
  const frame = useCurrentFrame();
  const slot = HOLD + MOVE;
  const i = Math.floor(frame / slot) % 4;
  const local = frame % slot;
  const beat = beatOf(i);
  const moving = local >= HOLD;
  const t = moving ? Math.min(1, spring((local - HOLD) / 30, SPRING_MECHANICAL)) : 0;
  const next = moving ? beatOf((i + 1) % 4) : null;
  const cam = next ? lerpCam(beat.cam, next.cam, t) : beat.cam;
  return <StandView beat={beat} cam={cam} next={next ? {beat: next, t} : undefined} labels={i !== 3 || moving} />;
};
