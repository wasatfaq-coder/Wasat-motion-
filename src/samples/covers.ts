import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import {CoverSpec} from '../lib/coverLayout';
import {anatomyProjection, toRoom} from '../lib/anatomy';
import {Point3} from '../lib/assembly';
import {P3} from '../lib/iso';
import {add, bodyFrame, HAND_POSES, mul, Pose, reach, solve, stand} from '../lib/rig';
import {drawCharacter, Outfit, OUTFITS} from '../lib/character';
import {MOTOR, MOTOR_AXIS, MOTOR_CORNERS, MOTOR_OPEN, MOTOR_P, MOTOR_U} from './motor.parts';

// Sample covers for the template v2 (the kit's motor and the mannequin; illustrative, not a topic). Each picture
// carries its own hook; one coral spot each (the pulley or the terminals); three techniques (§19.5).
/* eslint-disable @typescript-eslint/no-explicit-any */
const G: any = LatheKit;
const CU = 14; // the character's kit units per room unit
const CP = anatomyProjection(CU);
const room = (pts: Point3[], u = MOTOR_U): P3[] => pts.map((p) => toRoom(p, u));
/** Points round the motor axis at station s and radius r (for frames and hook boxes). */
const ring = (s: number, r: number): Point3[] =>
  [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2;
    const o = MOTOR_AXIS;
    return [0, 1, 2].map((i) => o.o[i] + o.a[i] * s + (o.u[i] * Math.cos(a) + o.v[i] * Math.sin(a)) * r) as Point3;
  });
/** A person standing at a room point facing a room point, posed by `pose`; returns markup and room extents. */
const person = (at: P3, face: P3, pose: (p: Pose) => Pose, outfit: Outfit = OUTFITS.plain) => {
  const yaw = Math.atan2(face[1] - at[1], face[0] - at[0]);
  const p = pose(stand([at[0] * CU, at[1] * CU, 0], yaw));
  const svg = drawCharacter(solve(p), CP, outfit).svg;
  // all eight corners of the person's volume (two diagonal corners miss the leftmost point on screen)
  const box: P3[] = [-1.4, 1.4].flatMap((dx) => [-1.4, 1.4].flatMap((dy) => [0, 6].map((z) => [at[0] + dx, at[1] + dy, z] as P3)));
  return {svg, box};
};
// order by depth in room units (the viewer is towards +x +y +z)
const depth = (p: P3) => p[0] + p[1] + p[2] * 0.8;
const MOTOR_CENTRE: P3 = [4.1, 2.5, 2];

// a) gap — the motor shakes: vibration rings round the coral pulley; a person recoils, a hand over the ear
const A_AT: P3 = [6.0, 7.0, 0]; // front-left of the motor: near the viewer but clear of the pulley (the hook)
const recoil = person(A_AT, MOTOR_CENTRE, (p) => {
  const s = solve(p);
  const {f} = bodyFrame(p.yaw);
  const ear = add(add(s.head, mul(s.l, 6.5)), [0, 0, -1]);
  const push = add(add(s.shoulder.R, mul(f, 17)), [0, 0, 3]);
  const q = reach(reach(p, 'L', ear, 1, HAND_POSES.relaxed), 'R', push, 1, HAND_POSES.open, f);
  return {...q, root: p.root, lean: -0.22, twist: 0.1, headPitch: -0.12, headYaw: 0.25};
});
const rings = [10.5, 14, 17.5].map((r) => K.lineSvg(G.arcOf(MOTOR_AXIS, 68, r, MOTOR_P, {least: -1}), {tone: 'mid'})).join('');
const A_ART = depth(A_AT) < depth(MOTOR_CENTRE) ? recoil.svg + MOTOR.svg() + rings : MOTOR.svg() + rings + recoil.svg;

// b) specific — the pulley spun to a blur: spoke traces round it and a rotation arrow
const blur = Array.from({length: 7}, (_, k) => K.lineSvg(G.spokesOf(MOTOR_AXIS, 67, 2.4, 6.8, 5, MOTOR_P, {phase: k * 0.18}), {tone: k === 0 ? 'hi' : 'faint'})).join('');
const ARROW_R = 11;
const arrowArc = K.lineSvg(G.arcOf(MOTOR_AXIS, 67.5, ARROW_R, MOTOR_P, {least: -1, from: 0.3, to: 4.6}), {tone: 'hi'});
const tipAt = G.pointOf(MOTOR_AXIS, 67.5, ARROW_R, 4.6);
const tipDir = G.tangentOf(MOTOR_AXIS, 4.6);
const arrowHead = K.solidSvg(G.solidOf([[0, 1.8], [3.2, 0]], G.frameAlong(tipAt, tipDir), MOTOR_P), {tone: 'hi'});
const B_ART = MOTOR.svg() + blur + arrowArc + arrowHead;

// c) incomplete — the box lid hangs open above the box, the coral terminals inside; a person leans in to look
const C_AT: P3 = [1.2, 6.2, 0];
const peek = person(C_AT, [3.7, 2.5, 0], (p) => {
  const {f} = bodyFrame(p.yaw);
  const s = solve(p);
  const up = add(add(s.shoulder.R, mul(f, 8)), [0, 0, 6]);
  const q = reach(p, 'R', up, 1, HAND_POSES.open);
  return {...q, root: add(p.root, mul(f, -1.5)), lean: 0.32, headPitch: 0.3, twist: 0};
}, {hat: 'hardhat', accent: 'none'});
const C_ART = depth(C_AT) < depth(MOTOR_CENTRE) ? peek.svg + MOTOR_OPEN.svg({lid: 1}) : MOTOR_OPEN.svg({lid: 1}) + peek.svg;

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {
    technique: 'gap',
    hook: 'мотор трясётся: дуги вибрации вокруг кораллового шкива, человек отпрянул и закрыл ухо',
    lines: ['Почему он', 'гудит?'],
    layout: 'top',
    art: A_ART,
    frame: [...room(MOTOR_CORNERS), ...room(ring(68, 17.5)), ...recoil.box],
    hero: room([...ring(60, 17.5), ...ring(70, 17.5)]),
  },
  b: {
    technique: 'specific',
    hook: 'шкив раскручен до размытия: следы спиц по кругу и стрелка вращения',
    lines: ['3000', 'об/мин'],
    layout: 'top',
    art: B_ART,
    frame: room([...ring(40, 19), ...ring(72, 13)]), // a close-up of the front of the motor
    hero: room([...ring(62, 12), ...ring(70, 12)]),
  },
  c: {
    technique: 'incomplete',
    hook: 'крышка коробки висит в воздухе, внутри светятся коралловые клеммы, человек заглядывает',
    lines: ['Что в', 'коробке?'],
    layout: 'top',
    art: C_ART,
    frame: [...room([...MOTOR_CORNERS, [37, 25, 72]]), ...peek.box],
    hero: room([[29.5, 17.5, 44], [44.5, 32.5, 44], [29.5, 17.5, 72], [44.5, 32.5, 72]]),
  },
};
