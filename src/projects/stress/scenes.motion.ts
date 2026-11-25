import {MotionPose, MotionSpec, snap} from '../../lib/motion';
import {boxCorners, breathe, camFit, safeRect} from '../../lib/camera';
import {dynBall, Point3} from '../../lib/assembly';
import {P, U, chestBead, HOME_PERSON, SHOP_PERSON, STAND_PERSON} from './proj';
import {ARROW_TAIL, HOME, HOME_BOX, SHOP, SHOP_BOX, SIGNAL_A, SIGNAL_B, STAND, STAND_BOX, WEIGHT_AT} from './world.parts';

const RECT = safeRect({captions: true});
const fit = (box: [Point3, Point3]) =>
  camFit(boxCorners([box[0][0] / U, box[0][1] / U, box[0][2] / U], [box[1][0] / U, box[1][1] / U, box[1][2] / U]), {rect: RECT, fill: 0.9});
const keepOf = (box: [Point3, Point3]) => boxCorners(box[0], box[1]).map((at, i) => ({name: `c${i}`, at}));
const ramp = (frame: number, from: number, to: number) => Math.max(0, Math.min(1, (frame - from) / (to - from)));
const mix = (a: Point3, b: Point3, t: number): Point3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const bob = (frame: number, at: Point3): Point3 => [at[0], at[1], at[2] + Math.sin((frame / 150) * Math.PI * 2) * 1.4];

const base = (camBox: [Point3, Point3], frame: number, frames: number, assembly: MotionPose['assembly'], extra: MotionPose['extra'], plates: MotionPose['plates'], arrows: MotionPose['arrows'] = []): MotionPose => ({
  cam: breathe(fit(camBox), frame / Math.max(1, frames - 1), 0.025),
  rect: RECT,
  unit: U,
  assembly,
  extra,
  arrows,
  keep: keepOf(camBox),
  plates,
});

const mote = (name: string, frame: number, at: Point3) => dynBall(name, bob(frame, at), 0.7, P, {tone: 'mid'});
const bead = (at: Point3, opacity: number) => dynBall('mark', chestBead(at), 2.8, P, {tone: 'hi', lit: true}, opacity);

/** Scene 1. Storm opacity is drawn by the scene; the bead is the response mark. */
export const scene1Pose = (frame: number): MotionPose => {
  const mark = ramp(frame, 0, 36);
  return base(HOME_BOX, frame, 420, HOME, [mote('mote', frame, [48, 28, 26]), ...(mark > 0 ? [bead(HOME_PERSON, mark)] : [])], [plate('src', 72, 600, 460, 40, ramp(frame, 24, 48), 'APA, 21.10.2024')], []);
};

const plate = (name: string, x: number, y: number, w: number, h: number, opacity: number, text: string) => ({name, x, y, w, h, opacity, kind: 'label' as const, text});

/** Chapter 2, global frame 0..959. Scene 2 is 0..479, scene 3 continues at 480. */
export const chapter2Pose = (frame: number): MotionPose => {
  const travel = snap(ramp(frame, 36, 360));
  const weight = snap(ramp(frame, 280, 400));
  const weightIn = ramp(frame, 250, 278);
  const platesIn = frame < 480 ? 0 : ramp(frame, 520, 552);
  const truthIn = frame < 480 ? ramp(frame, 200, 230) : 1 - ramp(frame, 480, 508);
  const extra = [
    mote('mote', frame, [24, 30, 27]),
    dynBall('signal', mix(SIGNAL_A, SIGNAL_B, travel), 0.65, P, {tone: 'hi'}),
    ...(weightIn > 0 ? [dynBall('weight', mix([WEIGHT_AT[0], WEIGHT_AT[1], WEIGHT_AT[2] + 7], WEIGHT_AT, weight), 1.05, P, {tone: 'lo'}, weightIn)] : []),
    ...(frame < 480 && ramp(frame, 0, 28) > 0 ? [bead(SHOP_PERSON, ramp(frame, 0, 28))] : []),
    ...(frame >= 480 ? [bead(SHOP_PERSON, 1)] : []),
  ];
  const plates = [
    plate('honest', 72, 590, 250, 46, frame < 480 ? ramp(frame, 12, 36) : 1, 'УПРОЩЁННО'),
    plate('truth', 72, 1040, 520, 160, frame < 480 ? truthIn : 1, 'Пик кортизола — десятки минут'),
    plate('effects', 72, 980, 560, 320, platesIn, 'Сердце, дыхание, мышцы, пищеварение'),
  ];
  return base(SHOP_BOX, frame, 960, SHOP, extra, plates, [{name: 'response', tail: ARROW_TAIL, owner: 'fast.neck', opacity: 1}]);
};

export const scene2Pose = (frame: number) => chapter2Pose(frame);
export const scene3Pose = (frame: number) => chapter2Pose(480 + frame);

export const scene4Pose = (frame: number): MotionPose =>
  base(
    STAND_BOX,
    frame,
    420,
    STAND,
    [mote('mote', frame, [36, 34, 24]), bead(STAND_PERSON, 1)],
    [plate('times', 72, 680, 560, 210, ramp(frame, 16, 40), 'Минуты стихают, дни держат мышцы')],
    [],
  );

export const scene5Pose = (frame: number): MotionPose => {
  const ulcer = frame < 230 ? ramp(frame, 16, 40) : 1 - ramp(frame, 230, 270);
  const unknown = ramp(frame, 270, 300);
  return base(
    HOME_BOX,
    frame,
    540,
    HOME,
    [mote('mote', frame, [48, 28, 26]), bead(HOME_PERSON, 1 - ramp(frame, 80, 140))],
    [
      plate('ulcer', 500, 760, 390, 160, ulcer, 'Язву вызывает бактерия'),
      plate('unknown', 500, 760, 390, 160, unknown, 'Величина ответа не известна'),
    ],
    [],
  );
};

export const MOTION: MotionSpec[] = [
  {id: 'scene-1', frames: 420, fps: 60, loop: false, pose: scene1Pose},
  {id: 'scene-2', frames: 480, fps: 60, loop: false, pose: scene2Pose},
  {id: 'scene-3', frames: 480, fps: 60, loop: false, pose: scene3Pose},
  {id: 'scene-4', frames: 420, fps: 60, loop: false, pose: scene4Pose},
  {id: 'scene-5', frames: 540, fps: 60, loop: false, pose: scene5Pose},
];
