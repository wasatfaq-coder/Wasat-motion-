import {MotionPose, MotionSpec} from '../../lib/motion';
import {boxCorners, breathe, camFitHeight, safeRect, screenOf} from '../../lib/camera';
import {Assembly, dynBall, Point3} from '../../lib/assembly';
import * as AuditKit from '../../vendor/anatomy/audit.mjs';
import {act, pulse, track, xray} from '../../lib/process';
import {P, U} from './proj';
import {BODY, BODY_BOX, HEART, HEART_BOX, LUNG, MUSCLE, MUSCLE_BOX} from './organs.parts';
import {ADRENAL_BOX, AXIS, AXIS_BOX} from './axis.parts';

const RECT = safeRect({captions: true});

const roomOf = (box: [Point3, Point3]) =>
  boxCorners([box[0][0] / U, box[0][1] / U, box[0][2] / U], [box[1][0] / U, box[1][1] / U, box[1][2] / U]);
// Height-fit the subject into the safe rect. A small breath stays inside the margin (fill 0.9).
const fit = (box: [Point3, Point3], fill = 0.94) => camFitHeight(roomOf(box), {rect: RECT, fill});
const keepOf = (box: [Point3, Point3]) => boxCorners(box[0], box[1]).map((at, i) => ({name: `c${i}`, at}));
const lerpP = (a: Point3, b: Point3, k: number): Point3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const lerpBox = (a: [Point3, Point3], b: [Point3, Point3], k: number): [Point3, Point3] => [lerpP(a[0], b[0], k), lerpP(a[1], b[1], k)];

const boundsOf = (AuditKit as {boundsOf: (shape: unknown) => {min: Point3; max: Point3}}).boundsOf;

/** Screen box of every solid whose name is this subject, in the same space the cover check uses. */
const partBox = (cam: MotionPose['cam'], assembly: Assembly, name: string) => {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let n = 0;
  for (const s of assembly.R.solids as {name: string}[]) {
    if (!s.name.includes(`.${name}.`) && !s.name.endsWith(`.${name}`)) continue;
    const b = boundsOf(s);
    for (const x of [b.min[0], b.max[0]])
      for (const y of [b.min[1], b.max[1]])
        for (const z of [b.min[2], b.max[2]]) {
          const [sx, sy] = screenOf(cam, [x / U, y / U, z / U]);
          x0 = Math.min(x0, sx);
          x1 = Math.max(x1, sx);
          y0 = Math.min(y0, sy);
          y1 = Math.max(y1, sy);
          n++;
        }
  }
  return n ? {x0, x1, y0, y1} : null;
};

/** A thin label just above the part. It follows the camera and stays off the organ. */
const tag = (cam: MotionPose['cam'], assembly: Assembly, name: string, text: string, opacity: number) => {
  const box = partBox(cam, assembly, name);
  const w = Math.min(210, 32 + text.length * 16);
  const h = 44;
  const x = Math.max(RECT.x0 + 4, Math.min(RECT.x1 - w - 4, box ? (box.x0 + box.x1) / 2 - w / 2 : RECT.x0 + 8));
  const y = Math.max(RECT.y0 + 4, Math.min((box?.y0 ?? RECT.y0 + 80) - h - 16, RECT.y1 - h - 4));
  return {name, x, y, w, h, opacity, kind: 'label' as const, text};
};

const sensor = (value: number, label: string, source: string) => ({
  name: 'sensor',
  x: 72,
  y: 1296,
  w: 760,
  h: 96,
  opacity: 1,
  kind: 'sensor' as const,
  text: `${label} ${source}`,
  value,
});

const beatAt: Point3 = [HEART[0], 16, HEART[2]];
const beat = (frame: number, hz: number, amp: number) =>
  dynBall('beat', beatAt, 1.15 + amp * pulse(frame, 60, hz), P, {tone: 'hi', lit: true});

const base = (
  cam: MotionPose['cam'],
  box: [Point3, Point3],
  assembly: MotionPose['assembly'],
  extra: MotionPose['extra'],
  plates: MotionPose['plates'],
): MotionPose => ({cam, rect: RECT, unit: U, assembly, extra, arrows: [], keep: keepOf(box), plates});

export const scene1Pose = (frame: number): MotionPose => {
  const cam = breathe(fit(BODY_BOX), frame / 419, 0.01);
  const v = 0.28 + 0.12 * pulse(frame, 60, 0.7);
  return base(cam, BODY_BOX, BODY, [beat(frame, 0.7, 0.35)], [tag(cam, BODY, 'heart', 'сердце', 1), sensor(v, 'пульс', 'APA, 21.10.2024')]);
};

export const scene2Pose = (frame: number): MotionPose => {
  const k = act(frame, 80, 140);
  const box = lerpBox(AXIS_BOX, ADRENAL_BOX, k);
  const cam = fit(box, 0.84);
  const v = track(frame, 40, 200, 0.2, 0.86);
  return base(cam, box, AXIS, [], [tag(cam, AXIS, 'adrenal', 'надпочечник', 1), sensor(v, 'кортизол', 'Ulrich-Lai, Herman, 2009')]);
};

export const scene3Pose = (frame: number): MotionPose => {
  const k = act(frame, 30, 120);
  const box = lerpBox(BODY_BOX, HEART_BOX, k);
  const cam = fit(box);
  const flow = act(frame, 160, 140);
  const drop: Point3 = [10 - flow * 24, 22, 16];
  const breath: Point3 = [LUNG[0] - 6 - 2 * pulse(frame, 60, 0.45), LUNG[1] + 6, LUNG[2]];
  const flex: Point3 = [MUSCLE[0], MUSCLE[1] + 6, MUSCLE[2] + 2];
  const v = 0.55 + 0.35 * pulse(frame, 60, 1.5);
  return base(
    cam,
    box,
    BODY,
    [
      beat(frame, 1.5, 0.7),
      dynBall('breath', breath, 1.3, P, {tone: 'hi'}),
      dynBall('flex', flex, 1.1 + 0.6 * act(frame, 200, 80), P, {tone: 'mid'}),
      dynBall('flow', drop, 0.85, P, {tone: 'hi', lit: true}),
    ],
    [
      tag(cam, BODY, 'heart', 'сердце', act(frame, 10, 24)),
      sensor(v, 'пульс', 'APA, fight-or-flight'),
    ],
  );
};

export const scene3Shell = (frame: number) => xray(frame, 40, 80);

export const scene4Pose = (frame: number): MotionPose => {
  const cam = breathe(fit(MUSCLE_BOX), frame / 419, 0.01);
  const tangle: Point3 = [18, 20, 7];
  return base(
    cam,
    MUSCLE_BOX,
    BODY,
    [dynBall('tangle', tangle, 3.2, P, {tone: 'mid'}), dynBall('flex', [MUSCLE[0], MUSCLE[1] + 6, MUSCLE[2] + 2], 1.7, P, {tone: 'mid'})],
    [tag(cam, BODY, 'muscle', 'мышцы', 1), sensor(0.72, 'кортизол', 'APA, тело, 21.10.2024')],
  );
};

export const scene5Pose = (frame: number): MotionPose => {
  const cam = breathe(fit(BODY_BOX), frame / 539, 0.01);
  const v = track(frame, 60, 220, 0.7, 0.22);
  const fade = 1 - act(frame, 192, 160);
  return base(
    cam,
    BODY_BOX,
    BODY,
    [
      beat(frame, 0.55, 0.2 * (1 - act(frame, 60, 180))),
      dynBall('tangle', [18, 20, 7], 3.2 * (0.55 + 0.45 * fade), P, {tone: 'mid'}, fade),
    ],
    [tag(cam, BODY, 'heart', 'сердце', 1), sensor(v, 'пульс', 'APA, 21.10.2024')],
  );
};

export const MOTION: MotionSpec[] = [
  {id: 'scene-1', frames: 420, fps: 60, loop: false, pose: scene1Pose},
  {id: 'scene-2', frames: 480, fps: 60, loop: false, pose: scene2Pose},
  {id: 'scene-3', frames: 480, fps: 60, loop: false, pose: scene3Pose},
  {id: 'scene-4', frames: 420, fps: 60, loop: false, pose: scene4Pose},
  {id: 'scene-5', frames: 540, fps: 60, loop: false, pose: scene5Pose},
];
