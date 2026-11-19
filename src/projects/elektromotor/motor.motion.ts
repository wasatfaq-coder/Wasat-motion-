import {Dyn, Point3} from '../../lib/assembly';
import {toRoom} from '../../lib/anatomy';
import {Arrow, arrowKit} from '../../lib/arrows';
import {forceOnWire} from '../../lib/handed';
import {HAND_POSES, reach, solve, Skel, stand, V3} from '../../lib/rig';
import {CELL, WIRE_L, WIRE_R} from './battery.parts';
import {boxCorners, Cam, camFit, Rect, safeRect} from '../../lib/camera';
import {MotionPose, MotionSpec} from '../../lib/motion';
import {FORMAT} from '../../theme/format';
import {COIL, CX, CY, DC, DC_P, DC_U, POLE_ANGLES, rotorItems, SPLIT, STACK} from './dcmotor.parts';

// Hero A (the motor 130) as STATES: the style frames of scenes 1, 6 and 7. Frame k is beat k:
//   0 scene 1 «battery»  the closed motor in its clamp on the workbench
//   1 scene 1 «inside»   the cutaway: the front half slides out along its own centre line
//   2 scene 6 «several»  close-up of the armature in the open motor (three coils, three segments)
//   3 scene 7 «spins»    back on the workbench, the same cutaway as scene 1
/** theta: the armature's angle; half: share of the front half's slide; bench: the workbench drawn behind; circuit: the
 *  holder with its two wires to the terminals; hands: the hands press the wire ends to the terminals (scene 1, before
 *  the cutaway; decisions.md: only the hands, at the teaching motor's scale); arrows: current and force on the lit coil */
export type MotorState = {theta: number; half: number; bench: boolean; hideHalf: boolean; circuit: boolean; hands: boolean; arrows: boolean; cam: Cam};
/** the armature angle at which coil 0 (the conductor with current, coral) shows to the viewer: the pole shoes cover the
 *  coils, so the coil is seen only in the gap between two shoes. Pole 0 (azimuth 90° at theta 0) turns to −15°: the gap
 *  after it (centre pole + 60°) faces the viewer (azimuth 45°) and shows coil 0's leading side. */
export const COIL_TO_OPENING = ((-15 - 90) * Math.PI) / 180;

export const MOTOR_RECT: Rect = safeRect({captions: true});
const room = (pts: Point3[]) => pts.map((p) => toRoom(p, DC_U));
/** the whole motor in its clamp (plate to pulley) */
const CLOSED = boxCorners([CX - 17, CY - 17, 0], [34, 34, 74]);
/** scene 1 wide: the motor, the holder and both wires (the path of the current) */
const CIRCUIT = boxCorners([-70, -10, 0], [160, 82, 74]);
/** the cutaway: the housing round the armature (z 4…62); the slid-out half is decoration and may leave the frame */
const CUT = boxCorners([CX - 16, CY - 16, 6], [32, 32, 56]);
// scene 6: the core and the commutator (z 10…40), not the pulley
const ARMATURE = boxCorners([CX - 13, CY - 13, 10], [26, 26, 31]);
/** the close-up of scene 6 is framed on coil 0 (the conductor with current): the coil's centre at its angle, a box
 *  round it. Framing the whole armature left the coral at 8 % of the frame width (still-check, root-causes.md). */
const COIL_BOX = (theta: number) => {
  const a = POLE_ANGLES[0] + theta;
  return boxCorners([CX + 5.5 * Math.cos(a) - 6, CY + 5.5 * Math.sin(a) - 6, 14], [12, 12, 22]);
};

// ── hands (rig units, drawn at HAND_K × the rig's scale; character.ts drawArms): the person stands on the viewer's
// side facing the motor with the hands at shoulder height, so the upper arms run toward the viewer, down the screen,
// into the caption band's fade below the picture; the left hand (screen right) pinches wire R, the right hand wire L
export const HAND_K = 3.6;
const YAW = (-3 * Math.PI) / 4;
const grip = (w: Point3[], back: number): Point3 => {
  const [a, b] = [w[w.length - 1], w[w.length - 2]];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return [a[0] + ((b[0] - a[0]) * back) / d, a[1] + ((b[1] - a[1]) * back) / d, a[2] + ((b[2] - a[2]) * back) / d];
};
const GRIP_L = grip(WIRE_R, 3.5); // the left hand: wire R
const GRIP_R = grip(WIRE_L, 3.5);
const MID: Point3 = [(GRIP_L[0] + GRIP_R[0]) / 2, (GRIP_L[1] + GRIP_R[1]) / 2, (GRIP_L[2] + GRIP_R[2]) / 2];
/** the rig point that lands on MID: in front of the chest, below the shoulders */
const M_RIG: V3 = [-0.707 * 18, -0.707 * 18, 55];
export const HAND_AT: Point3 = [MID[0] - HAND_K * M_RIG[0], MID[1] - HAND_K * M_RIG[1], MID[2] - HAND_K * M_RIG[2]];
const toRig = (p: Point3): V3 => [(p[0] - HAND_AT[0]) / HAND_K, (p[1] - HAND_AT[1]) / HAND_K, (p[2] - HAND_AT[2]) / HAND_K];
export const handSkel = (): Skel => solve(reach(reach(stand([0, 0, 0], YAW), 'L', toRig(GRIP_L), 1, HAND_POSES.pinch), 'R', toRig(GRIP_R), 1, HAND_POSES.pinch));

// ── the arrows on the lit coil (the same three looks as on the stand, src/lib/arrows.ts): the field runs from the N
// magnet (azimuth SPLIT + 90°) to the S magnet; the coil's axial conductors are on its two side faces
const FIELD: Point3 = [Math.cos(SPLIT - Math.PI / 2), Math.sin(SPLIT - Math.PI / 2), 0];
const ARR = arrowKit(DC_P);
const R_SIDE = 6.4;
/** current and force on coil 0's side that faces the viewer through the gap (its leading side, lat > 0): one
 *  conductor, as the straight wire on the stand (scene 2). The far side is hidden behind the core. */
export const coilArrows = (theta: number, coil = 0): Arrow[] => {
  const a = POLE_ANGLES[coil] + theta;
  const latOut = COIL.h0 + ((R_SIDE - COIL.r0) / (COIL.r1 - COIL.r0)) * (COIL.h1 - COIL.h0) + 0.4;
  const side = (lat: number, z: number): Point3 => [CX + R_SIDE * Math.cos(a) - lat * Math.sin(a), CY + R_SIDE * Math.sin(a) + lat * Math.cos(a), z];
  const radial: Point3 = [Math.cos(a), Math.sin(a), 0];
  const z0 = STACK.core[0] + 2;
  const z1 = STACK.core[1] - 2;
  const f = forceOnWire([0, 0, 1], FIELD);
  // the coil is wound on the core: the armature is one rigid body, so the force head may lie over its own shoes
  // (motion-check `arrows` skips the owner and `along`); the light head keeps its dark outline (R7)
  const owner = `rotor.coil${coil}`;
  return [
    ARR.currentArrow(`coil${coil}.current`, owner, side(latOut, z0), side(latOut, z1 - 5), radial, 1),
    {...ARR.forceArrow(`coil${coil}.force`, owner, side(latOut + 0.3, z1 - 1.5), f, 7, [0, 0, 1], 1), along: ['rotor.']},
  ];
};
export const arrowSvg = ARR.svgOf;

export const motorBeats = (rect: Rect): MotorState[] => {
  const wide = camFit(room(CIRCUIT), {rect, fill: 0.95});
  const open = camFit(room(CUT), {rect, fill: 0.95});
  const base = {half: 1, bench: true, hideHalf: false, circuit: true, hands: false, arrows: false};
  return [
    {...base, theta: COIL_TO_OPENING, half: 0, hands: true, cam: wide},
    {...base, theta: COIL_TO_OPENING, cam: open},
    {...base, theta: COIL_TO_OPENING - 0.35, bench: false, hideHalf: true, circuit: false, arrows: true, cam: camFit(room(COIL_BOX(COIL_TO_OPENING - 0.35)), {rect, fill: 0.9})},
    {...base, theta: COIL_TO_OPENING + 0.3, arrows: true, cam: open},
  ];
};
const STILLS = motorBeats(MOTOR_RECT);
export const motorStill = (frame: number) => STILLS[Math.min(3, Math.max(0, frame))];
/** moving and added parts of a state: the armature at its angle and the circuit */
export const extraOf = (s: MotorState): Dyn[] => [...rotorItems(s.theta), ...(s.circuit ? CELL.dyn() : [])];
export {CLOSED};

const poseOf = (s: MotorState, rect: Rect, keep: Point3[]): MotionPose => ({
  cam: s.cam,
  rect,
  unit: DC_U,
  assembly: DC,
  extra: extraOf(s),
  arrows: s.arrows ? coilArrows(s.theta) : [],
  keep: keep.map((at, i) => ({name: `hero${i}`, at})),
  plates: [],
  // the brush pads press on the commutator segments; the shaft sits on the shields' bosses
  touch: [
    ['commutator', 'brush'],
    ['shaft', 'shield'],
  ],
});

/** Motion specs walked by scripts/motion-check.mjs (no rendering). */
export const MOTION: MotionSpec[] = [
  {
    id: 'ElektromotorMotor',
    frames: 4,
    fps: FORMAT.fps,
    loop: false,
    cuts: [1, 2, 3],
    pose: (f) => {
      const s = motorStill(f);
      return poseOf(s, MOTOR_RECT, f === 0 ? CIRCUIT : f === 2 ? COIL_BOX(s.theta) : CUT);
    },
  },
];
