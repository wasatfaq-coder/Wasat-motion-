import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as K from '../vendor/anatomy/iso-kit';
import {AnatomyStage, anatomyProjection, Kit, paint, Painted, toRoom} from '../lib/anatomy';
import {anticipate, spring} from '../lib/physics';
import {camOn, lerpCam, RoomSvg} from '../scenes/RoomScene';
import {EASE} from '../lib/anim';
import {P3} from '../lib/iso';

// Style sample for new topics (MASTER_PROMPT_FINAL §22): a chip on a board drawn with the Anatomy core in our palette.
// The geometry is illustrative (no dossier): it shows the look and the motion pipeline, not a real part.
const U = 14; // kit units per room unit
const P = anatomyProjection(U);
const slab = (plan: K.Plan, z: number, h: number, style: K.SolidStyle = {}, bevel = 0.6) => K.solidSvg(K.slabOf(plan, z, h, P, 8, bevel), style);
const at = (p: K.Point3) => K.iso(p, P);

/** Static board: base, holes, traces, silkscreen (built once). */
const BOARD = (() => {
  const out: string[] = [slab({x: 0, y: 0, w: 140, d: 140, r: 4}, 0, 5, {tone: 'hi', halo: true}, 0.8)];
  for (const [x, y] of [[8, 8], [132, 8], [8, 132], [132, 132]]) out.push(K.solidSvg(K.cylinder(x, y, 3.2, 5, 1.2, P, 28, 0.3), {tone: 'mid'}), K.dotsSvg([at([x, y, 6.2])], {size: 1.4, tone: 'hi'}));
  for (let i = 0; i < 10; i++) {
    const t = 42 + i * 5.6;
    out.push(K.lineSvg(K.pathOf([at([t, 34, 5]), at([t, 22 - (i % 3) * 3, 5]), at([t - 8, 14 - (i % 3) * 3, 5])]), {tone: 'mid'}));
    out.push(K.lineSvg(K.pathOf([at([106, t, 5]), at([118 + (i % 3) * 3, t, 5]), at([126 + (i % 3) * 3, t + 6, 5])]), {tone: 'mid'}));
    out.push(K.lineSvg(K.pathOf([at([t, 106, 5]), at([t, 118 + (i % 2) * 4, 5])]), {tone: 'mid'}));
    out.push(K.lineSvg(K.pathOf([at([34, t, 5]), at([22 - (i % 2) * 4, t, 5])]), {tone: 'mid'}));
  }
  out.push(K.lineSvg(K.planOutline({x: 30, y: 30, w: 80, d: 80, r: 2}, 5, P), {tone: 'lo'}));
  return out.join('');
})();

/** Parts that stand on the board, painted by depth: pins, package body, components. */
const PARTS: Painted[] = (() => {
  const items: Painted[] = [];
  for (let i = 0; i < 10; i++) {
    const t = 41 + i * 5.6;
    const pins: [K.Plan, K.Point3][] = [
      [{x: t - 1.1, y: 33, w: 2.2, d: 6, r: 0.3}, [t, 36, 5]],
      [{x: t - 1.1, y: 101, w: 2.2, d: 6, r: 0.3}, [t, 104, 5]],
      [{x: 33, y: t - 1.1, w: 6, d: 2.2, r: 0.3}, [36, t, 5]],
      [{x: 101, y: t - 1.1, w: 6, d: 2.2, r: 0.3}, [104, t, 5]],
    ];
    for (const [plan, c] of pins) items.push({at: c, svg: slab(plan, 5, 1.6, {tone: 'mid'}, 0)});
  }
  items.push({at: [70, 70, 6], svg: slab({x: 38, y: 38, w: 64, d: 64, r: 2}, 5.5, 4, {tone: 'hi'}, 0.8)});
  for (const [x, y] of [[20, 50], [20, 62], [50, 122], [62, 122], [122, 88]]) items.push({at: [x, y, 3], svg: K.solidSvg(K.cylinder(x, y, 3.6, 5, 7, P, 32, 0.4), {tone: 'hi'}) + K.lineSvg(K.ring(x, y, 2.6, 12, P), {tone: 'lo'})});
  for (const [x, y, w, d] of [[118, 30, 8, 4], [118, 40, 8, 4], [14, 86, 4, 8], [24, 86, 4, 8]]) items.push({at: [x + w / 2, y + d / 2, 6], svg: slab({x, y, w, d, r: 0.4}, 5, 2.4, {tone: 'mid'}, 0.3)});
  items.push({at: [90, 128, 6], svg: slab({x: 80, y: 124, w: 20, d: 8, r: 3.5}, 5, 4, {tone: 'hi'}, 0.6)});
  return items;
})();

/** The die in the package cavity: cavity rim, coral die (the one lit part), functional blocks, bond wires. */
const BLOCKS: [number, number, number, number][] = [[56, 56, 13, 13], [71, 56, 13, 13], [56, 71, 13, 7], [56, 79.5, 13, 4.5], [71, 71, 13, 13]];
const DIE = K.lineSvg(K.planOutline({x: 44, y: 44, w: 52, d: 52, r: 1.5}, 9.5, P), {tone: 'mid'}) + slab({x: 54, y: 54, w: 32, d: 32, r: 0.6}, 9.5, 1.4, {tone: 'hi', lit: true}, 0.3);
const block = (i: number) => slab({x: BLOCKS[i][0], y: BLOCKS[i][1], w: BLOCKS[i][2], d: BLOCKS[i][3], r: 0.3}, 10.9, 0.5, {tone: 'hi'}, 0.15);
const WIRES = Array.from({length: 8}, (_, i) => {
  const t = 56 + i * 4;
  return (
    K.wireSvg(at([t, 54.6, 10.9]), at([t + (t - 70) * 0.3, 45, 9.6]), {via: [at([t + (t - 70) * 0.15, 50, 15])], tone: 'hi', size: 0.9}) +
    K.wireSvg(at([85.4, t, 10.9]), at([95, t + (t - 70) * 0.3, 9.6]), {via: [at([90, t + (t - 70) * 0.15, 15])], tone: 'hi', size: 0.9})
  );
}).join('');
const LID = slab({x: 38, y: 38, w: 64, d: 64, r: 2}, 9.5, 2.5, {tone: 'hi'}, 1.2) + K.dotsSvg([at([44, 44, 12])], {size: 2, tone: 'hi'});
const LID_HALO = K.solidSvg(K.slabOf({x: 38, y: 38, w: 64, d: 64, r: 2}, 9.5, 2.5, P, 8, 1.2), {tone: 'hi', halo: true});

const corners = (x0: number, y0: number, x1: number, y1: number, z = 0): P3[] => [
  toRoom([x0, y0, z], U), toRoom([x1, y0, z], U), toRoom([x0, y1, z], U), toRoom([x1, y1, z], U), toRoom([(x0 + x1) / 2, (y0 + y1) / 2, z + 20], U),
];

/** 4 s: the board (0–1 s), the lid lifts with anticipation and a spring (1–2.2 s), push in on the die, blocks appear and
 *  data runs along the traces (2.2–4 s). */
export const AnatomyStyleSample: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const liftT = t - 1.0;
  const lift = 60 * (spring(liftT, {stiffness: 60, damping: 9}) + anticipate(liftT, 0.25, 0.04));
  const lidShift = K.translateAlong(P, [0, 0, lift]);
  const push = interpolate(t, [2.0, 2.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const cam = lerpCam(camOn(corners(0, 0, 140, 140), 0.92, [540, 700]), camOn(corners(46, 46, 94, 94, 10), 0.85, [540, 720]), push);
  const shown = BLOCKS.map((_, i) => interpolate(t, [2.4 + i * 0.18, 2.6 + i * 0.18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  // data pulses along the four trace fans (the traces are the routes; dots move at a constant speed)
  const pulses = Array.from({length: 10}, (_, i) => {
    const s = ((t * 0.9 + i * 0.137) % 1);
    const tt = 42 + i * 5.6;
    return at([tt, 34 - s * 20, 5]);
  });
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={BOARD} />
        <Kit svg={K.dotsSvg(pulses, {size: 1.6, tone: 'hi'})} opacity={push} />
        <Kit svg={paint(PARTS, P)} />
        <Kit svg={DIE} />
        {BLOCKS.map((_, i) => (shown[i] > 0 ? <Kit key={i} svg={block(i)} transform={K.translateAlong(P, [0, 0, (1 - shown[i]) * 6])} opacity={shown[i]} /> : null))}
        <Kit svg={WIRES} opacity={lift > 20 ? 1 : 0} />
        <Kit svg={lift > 4 ? LID_HALO : LID} transform={lidShift} />
      </RoomSvg>
    </AnatomyStage>
  );
};
