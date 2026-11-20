import {toRoom} from '../../lib/anatomy';
import {Dyn, Point3} from '../../lib/assembly';
import {Cam, camFit, safeRect, screenOf} from '../../lib/camera';
import {facePoint} from '../../lib/device';
import {MotionPose, MotionSpec, PlateProbe} from '../../lib/motion';
import {wordProbe} from '../../components/Frontal';
import {FORMAT} from '../../theme/format';
import {TYPE_FLOOR} from '../../theme/tokens';
import {CHAR_W, chipAnchor, chipItem, CHIP_H, CHIPS, PHONE, PHONE_CORNERS, PHONE_U, PIECES, QUESTION, QUESTION_H, SCREEN} from './phone.parts';

// Per-frame state of the hero phone's style frames (scene 1): frame 0 = the phone on its stand, the answer typed up to the
// fifth piece; frame 1 = the push-in to the screen where the pieces are read. Pure functions of the frame, read by
// PhoneFrames.tsx and by scripts/motion-check.mjs. Coral = the piece the answer currently ends with (the last typed chip,
// drawn as its moving part); text is a frontal Word on each chip (§20.4), never on the slanted face.
export const PHONE_RECT = safeRect({captions: true});
const room = (p: Point3) => toRoom(p, PHONE_U);

/** The screen's rows from the top of the screen to the bottom of the last chip row (where scene 1 happens). */
const ACTION_BOTTOM = Math.max(...CHIPS.map((c) => c.y + CHIP_H / 2)) + 1;
const actionCorners = (): Point3[] => {
  const W = Math.hypot(...SCREEN.u);
  return [facePoint(SCREEN, 0, 0), facePoint(SCREEN, W, 0), facePoint(SCREEN, 0, ACTION_BOTTOM), facePoint(SCREEN, W, ACTION_BOTTOM)];
};

export type PhoneState = {typed: number; cam: Cam; extra: Dyn[]; hide: Set<string>; size: number; angle: number; readable: boolean};

export const phoneState = (frame: number): PhoneState => {
  const f = Math.min(1, Math.max(0, frame));
  const typed = 5;
  const cam = f === 1 ? camFit(actionCorners().map(room), {rect: PHONE_RECT, fill: 0.94}) : camFit(PHONE_CORNERS.map(room), {rect: PHONE_RECT, fill: 0.94});
  const last = typed - 1;
  // chips not typed yet are hidden; the last typed chip is drawn as the one coral moving part
  const hide = new Set(CHIPS.map((c, i) => (i >= typed || i === last ? `phone.${c.name}` : '')).filter(Boolean));
  // the type follows the screen's scale so a piece fits its chip (CHAR_W kit units a letter; bold Cyrillic ≈ 0.66 em)
  const [a, b] = [screenOf(cam, room(facePoint(SCREEN, 0, 0))), screenOf(cam, room(facePoint(SCREEN, 1, 0)))];
  const size = (CHAR_W * Math.hypot(b[0] - a[0], b[1] - a[1])) / 0.66;
  // the rows of the face run at this angle on screen (it is turned 10° off the line of sight): the words follow them
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  // text below the 26 px floor (§5) is not drawn: on the wide shot the chips read as the interface, the words come with
  // the push-in to the screen (scene 1, «кусочками»)
  return {typed, cam, extra: last >= 0 ? [chipItem(last, {lit: true})] : [], hide, size, angle, readable: size * QUESTION_SCALE >= TYPE_FLOOR.auxiliary};
};

/** The question's type is this share of the pieces' (four lines in the bubble). */
export const QUESTION_SCALE = 0.8;

export type WordAt = {name: string; text: string; at: [number, number]; size: number};
/** Every frontal word of a state: the question lines in the bubble and the typed pieces on their chips. */
export const wordsOf = (s: PhoneState): WordAt[] => {
  if (!s.readable) return [];
  const at = (p: Point3) => screenOf(s.cam, room(p));
  // the question bubble spans x 0.16·W … W − 0.8, y 5.2 … 5.2 + QUESTION_H of the screen (device.ts chatUi)
  const W = Math.hypot(...SCREEN.u);
  const qx = (0.16 * W + W - 0.8) / 2;
  return [
    ...QUESTION.map((text, k) => ({name: `question${k}`, text, at: at(facePoint(SCREEN, qx, 5.2 + (QUESTION_H / QUESTION.length) * (k + 0.5), 0.1)), size: s.size * QUESTION_SCALE})),
    ...PIECES.slice(0, s.typed).map((text, i) => ({name: `piece${i}`, text, at: at(chipAnchor(i)), size: s.size})),
  ];
};

const platesOf = (s: PhoneState): PlateProbe[] => wordsOf(s).map((w) => wordProbe(w.name, w.at, w.text, w.size));

const poseOf = (frame: number): MotionPose => {
  const s = phoneState(frame);
  const keep = Math.min(1, Math.max(0, frame)) === 1 ? actionCorners() : PHONE_CORNERS;
  return {cam: s.cam, rect: PHONE_RECT, unit: PHONE_U, assembly: PHONE, extra: s.extra, arrows: [], keep: keep.map((p, i) => ({name: `hero${i}`, at: p})), plates: platesOf(s), touch: [['phone.chat.chip', 'phone.phone.screen']]};
};

export const MOTION: MotionSpec[] = [{id: 'KakRabotaetClaudePhone', frames: 2, fps: FORMAT.fps, loop: false, stills: true, cuts: [1], pose: poseOf}];
