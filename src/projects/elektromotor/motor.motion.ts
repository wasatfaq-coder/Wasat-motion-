import {Point3} from '../../lib/assembly';
import {toRoom} from '../../lib/anatomy';
import {boxCorners, Cam, camFit, Rect, safeRect} from '../../lib/camera';
import {MotionPose, MotionSpec} from '../../lib/motion';
import {FORMAT} from '../../theme/format';
import {CX, CY, DC, DC_U, HALF_MOVE, rotorItems} from './dcmotor.parts';

// Hero A (the motor 130) as STATES: the style frames of scenes 1, 6 and 7. Frame k is beat k:
//   0 scene 1 «battery»  the closed motor in its clamp on the workbench
//   1 scene 1 «inside»   the cutaway: the front half slides out along its own centre line
//   2 scene 6 «several»  close-up of the armature in the open motor (three coils, three segments)
//   3 scene 7 «spins»    back on the workbench, the same cutaway as scene 1
/** theta: the armature's angle; half: share of the front half's slide; bench: the workbench drawn behind */
export type MotorState = {theta: number; half: number; bench: boolean; hideHalf: boolean; cam: Cam};
/** the armature angle at which coil 0 (the conductor with current, coral) faces the opening of the cutaway: its pole
 *  (azimuth 90° at theta 0) turns to the viewer's side of the opening (azimuth ≈ 20°) */
export const COIL_TO_OPENING = ((20 - 90) * Math.PI) / 180;

export const MOTOR_RECT: Rect = safeRect({captions: true});
const room = (pts: Point3[]) => pts.map((p) => toRoom(p, DC_U));
/** the whole motor in its clamp (plate to pulley) and, when open, the moved half and cap */
const CLOSED = boxCorners([CX - 17, CY - 17, 0], [34, 34, 74]);
const OPEN = [...CLOSED, ...boxCorners([CX - 17 + HALF_MOVE[0], CY - 17 + HALF_MOVE[1], 8], [34, 34, 50])];
// scene 6: the core and the commutator (z 10…40), not the pulley
const ARMATURE = boxCorners([CX - 13, CY - 13, 10], [26, 26, 31]);

export const motorBeats = (rect: Rect): MotorState[] => {
  const closed = camFit(room(CLOSED), {rect, fill: 0.8});
  const open = camFit(room(OPEN), {rect, fill: 0.9});
  const close = camFit(room(ARMATURE), {rect, fill: 0.9});
  return [
    {theta: COIL_TO_OPENING, half: 0, bench: true, hideHalf: false, cam: closed},
    {theta: COIL_TO_OPENING, half: 1, bench: true, hideHalf: false, cam: open},
    {theta: COIL_TO_OPENING - 0.35, half: 1, bench: false, hideHalf: true, cam: close},
    {theta: COIL_TO_OPENING + 0.3, half: 1, bench: true, hideHalf: false, cam: open},
  ];
};
const STILLS = motorBeats(MOTOR_RECT);
export const motorStill = (frame: number) => STILLS[Math.min(3, Math.max(0, frame))];

const poseOf = (s: MotorState, rect: Rect, keep: Point3[]): MotionPose => ({
  cam: s.cam,
  rect,
  unit: DC_U,
  assembly: DC,
  extra: rotorItems(s.theta),
  arrows: [],
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
      return poseOf(s, MOTOR_RECT, f === 0 ? CLOSED : f === 2 ? ARMATURE : OPEN);
    },
  },
];
