import {Cam, camFit, safeRect, screenOf} from '../../lib/camera';
import {toRoom} from '../../lib/anatomy';
import {Dyn} from '../../lib/assembly';
import {FORMAT} from '../../theme/format';
import {MotionPose, MotionSpec, PlateProbe} from '../../lib/motion';
import {textWidth} from '../../components/Frontal';
import {barDyn, BAR_SHARES, BOARD, BOARD_U, boardPoint, CANDIDATES, cellMid, GAP, LABELLED, PANEL_H, ROW1, ROW1_Y, ROW2, ROW2_TYPED, ROW2_Y, ROWS_CORNERS, rowXs, TILE_H, tileAnchor, tileDyn, TRAY_X0} from './board.parts';

// Per-frame state of the token board's style frames (scenes 2–4): frame 0 = rows cut with three labels, 1 = the candidate
// column, 2 = a non-longest candidate in flight to the end of row 2 (the coral stays on the old last tile until the new one
// lands: «коралл переходит в кадре посадки»). Pure functions of the frame, read by BoardFrames.tsx and by motion-check.
export const LABEL_SIZE = 44;
/** x of the label plates' centres on screen, left to right in LABELLED order (слово, часть слова, символ): they do not cross each other's leaders */
const LABEL_X = [775, 250, 535];
const RECT = safeRect({captions: true});
/** the three labels sit at the top of the safe rect (long leaders down to their tiles), the example plate at the bottom: the picture fills the rect's height */
const LABEL_Y = RECT.y0 + 45;
export const EXAMPLE = {text: 'пример, не реальное разбиение', at: [480, RECT.y1 - 45] as [number, number], size: 40};
export const PROB = {text: 'пример, не реальные вероятности', at: [480, RECT.y1 - 45] as [number, number], size: 40};
const X_ACTION = [0, 30, 23.6]; // frames 1–2 start here: frame 1 the tray, frame 2 the landing place at the end of row 2 and the tray

export type BoardState = {extra: Dyn[]; hide: string[]; labels: number; prob: number; cam: Cam};

const flight = (k: number, t: number): Dyn => {
  const x2 = rowXs(ROW2, GAP);
  const from = {x: TRAY_X0 + 1.2, y: cellMid(k) - TILE_H / 2};
  const to = {x: x2[ROW2_TYPED], y: ROW2_Y};
  const mix = (a: number, b: number) => a + (b - a) * t;
  return tileDyn('fly', mix(from.x, to.x), mix(from.y, to.y) + 3.2 * Math.sin(Math.PI * t), CANDIDATES[k].text, {n0: 3});
};

export const boardState = (frame: number): BoardState => {
  const f = Math.min(2, Math.max(0, frame));
  const rect = RECT;
  // frame 0 holds the rows, frames 1–2 the end of row 2 and the tray (the part of the board where the action is)
  const region = f === 0 ? ROWS_CORNERS : [X_ACTION[f], 63].flatMap((x) => [0, PANEL_H].flatMap((y) => [boardPoint(x, y, 0), boardPoint(x, y, 3.6)]));
  const cam = camFit(region.map((p) => toRoom(p, BOARD_U)), {rect, fill: 1});
  if (f < 2) return {extra: [], hide: [], labels: f === 0 ? 1 : 0, prob: f === 1 ? 1 : 0, cam};
  const k = 1; // «лучше»: not the longest bar (scene 4)
  return {extra: [flight(k, 0.55), ...BAR_SHARES.flatMap((s, i) => barDyn(i, i === k ? s : s * 0.8))], hide: [`board.cand${k}`, ...BAR_SHARES.flatMap((_, i) => [`board.bar${i}`, `board.barcap${i}`])], labels: 0, prob: 1, cam};
};

/** Screen centre of label i (above row 1) and its leader end on the tile. */
export const labelAt = (s: BoardState, i: number) => {
  const x1 = rowXs(ROW1, GAP);
  const to = screenOf(s.cam, toRoom(tileAnchor(x1[LABELLED[i].row1], ROW1_Y, ROW1[LABELLED[i].row1].text), BOARD_U));
  return {at: [LABEL_X[i], LABEL_Y] as [number, number], to};
};

const probe = (name: string, text: string, at: [number, number], size: number, opacity: number): PlateProbe => {
  const w = textWidth(text, size) + size * 1.1;
  return {name, x: at[0] - w / 2, y: at[1] - size * 0.775, w, h: size * 1.55, opacity, kind: 'label', text};
};
const platesOf = (s: BoardState): PlateProbe[] => [
  ...LABELLED.map((l, i) => probe(`label.${l.label}`, l.label, labelAt(s, i).at, LABEL_SIZE, s.labels)),
  probe('label.example', EXAMPLE.text, EXAMPLE.at, EXAMPLE.size, s.labels),
  probe('label.prob', PROB.text, PROB.at, PROB.size, s.prob),
];

const poseOf = (frame: number): MotionPose => {
  const s = boardState(frame);
  const f = Math.min(2, Math.max(0, frame));
  return {
    cam: s.cam,
    rect: RECT,
    unit: BOARD_U,
    assembly: BOARD,
    extra: s.extra,
    arrows: [],
    keep: (f === 0 ? ROWS_CORNERS : [boardPoint(X_ACTION[f], 0, 0), boardPoint(63, PANEL_H, 3.6)]).map((p, i) => ({name: `hero${i}`, at: p})),
    plates: platesOf(s),
  };
};

export const MOTION: MotionSpec[] = [{id: 'KakRabotaetClaudeBoard', frames: 3, fps: FORMAT.fps, loop: false, stills: true, cuts: [1, 2], pose: poseOf}];
