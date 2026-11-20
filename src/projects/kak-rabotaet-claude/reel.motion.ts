import {toRoom} from '../../lib/anatomy';
import {Dyn, Point3} from '../../lib/assembly';
import {Cam, camFit, safeRect, screenOf} from '../../lib/camera';
import {MotionPose, MotionSpec, PlateProbe, settle} from '../../lib/motion';
import {wordProbe} from '../../components/Frontal';
import {FORMAT} from '../../theme/format';
import * as K from '../../vendor/anatomy/iso-kit';
import {BOARD, BOARD_U, boardPoint, cellMid, CW as BOARD_CW, PANEL_H as BOARD_H, ROW1, ROW1_Y as BOARD_ROW1_Y, ROW2, ROW2_Y as BOARD_ROW2_Y, rowXs as boardRowXs, TILE_H as BOARD_TILE_H, tileAnchor as boardTileAnchor, tileDyn as boardTileDyn, tileWidth as boardTileWidth, TRAY_X0} from './board.parts';
import {TYPE_FLOOR} from '../../theme/tokens';
import {
  conceptAnchor,
  CONCEPT_H,
  CONCEPT_Y,
  conceptWidth,
  conceptX,
  conceptDyn,
  CONCEPTS,
  conceptPanel,
  cursorDyn,
  LINE1,
  LINE2,
  RELIEF_HI,
  RELIEF_LO,
  ROW1_Y,
  ROW2_Y,
  rowXs,
  SCHEME,
  SCHEME_U,
  schemePoint,
  panelsCorners,
  STAND_CORNERS,
  tabAnchor,
  TILE_H,
  TILE_N1,
  tileDyn,
  tileWidth,
} from './scheme.parts';
import {PLATE_SIZE, PlateAt, probesOf, SchemeState, SRC_H, SRC_LIFT, SRC_LINES, SRC_SIZE, typeOf, WordAt} from './scheme.motion';

// Silent test reel of STOP 2 (§8): scenes 5–6 of the storyboard, «визуальное превью без диктора». A pure state per frame,
// read by ReelFrames.tsx and by scripts/motion-check.mjs.
//
// Timing. There is no voice yet: the anchor words are placed by script.json estSec (scene 5: 4.3 s for 9 words, scene 6:
// 10 s for 21 words, words spread evenly) and the excerpt is kept to 10 s, so scene 6 runs at ≈ 0.55 of its estimated
// length (the order of the beats and both silences keep their full length). Under the voice (STOP 3) the same beats move
// to the transcribed word times.
//   0.0–1.4  «Похоже на автодополнение»  the token board, close on the end of the rows: the last pick («чем») flies in from
//            the candidate column and lands at the end of row 2; the coral goes to it on landing
//   1.4–2.0  SILENCE 0.6 s (§25.3, before the turn)  everything holds
//   2.0      «Но» — the one hard cut of the film (§19.3): the scheme stand, blinds of panels 2–3 down, the source note
//   2.9      «внутрь»  the concept «rabbit» rises from the face of panel 1 (low relief, not lit)
//   3.6      «строка … grab it»  line 1 is read: its tiles hop one after another, left to right
//   5.35–6.15  SILENCE 0.8 s (before the answer)  everything holds, only the cursor blinks at the start of line 2
//   6.15     «до»  «rabbit» lights (rises to full relief, tone lo → mid → hi); plates «понятие», «горит = …»
//   6.7–8.2  «… rabbit»  line 2 is written tile by tile; the coral goes with the last tile and ends on ⟨rabbit⟩
//   8.2–10   hold on the planned word (the plates are read)
// Coral (parts-plan §5): the end of the output. Board: the last tile of row 2; stand: the «,» that ends line 1 until line 2
// starts, then the last written tile of line 2. Concepts are never coral.
export const REEL_RECT = safeRect({captions: false}); // a silent preview has no captions: the picture takes their band too (KRC-04)
const FPS = FORMAT.fps;
export const REEL_FRAMES = Math.round(10 * FPS);
const T = {
  pick: [0, 0.45],
  candOut: [0.55, 1.4],
  pickBounce: 0.15,
  silence1: [1.4, 2.0],
  cut: 2.0,
  rise: [2.9, 3.4],
  wave: 3.6,
  waveStep: 0.07,
  hop: 0.4,
  srcOut: [5.15, 5.35],
  silence2: [5.35, 6.15],
  light: [6.15, 6.75],
  labelsIn: [6.2, 6.4],
  type0: 6.7,
  typeStep: 0.18,
  flight: 0.2,
  bounce: 0.15,
} as const;
export const CUT_FRAME = Math.round(T.cut * FPS);
/** sound accents (seconds of the event; ReelFrames.tsx subtracts each file's lead): public/audio/sfx, CC0 (content/assets.json).
 *  Nothing sounds inside the two silences. */
export const REEL_SFX: {at: number; file: string; volume: number; why: string}[] = [
  {at: T.pick[1], file: 'audio/sfx/mouse-click.wav', volume: 0.45, why: 'the last pick lands at the end of row 2'},
  {at: T.cut, file: 'audio/sfx/switch.wav', volume: 0.9, why: '«Но»: the dull knock on the hard cut, the first sound after the 0.6 s silence'},
  {at: T.light[0], file: 'audio/sfx/switch.wav', volume: 0.6, why: '«до»: «rabbit» lights, the first sound after the 0.8 s silence'},
  ...LINE2[0].map((_, i) => ({at: T.type0 + i * T.typeStep + T.flight, file: 'audio/sfx/mouse-click.wav', volume: 0.45, why: `line 2: tile ${i + 1} lands`})),
  {at: T.type0 + 7 * T.typeStep + T.flight, file: 'audio/sfx/shutter-modern.wav', volume: 0.55, why: '«rabbit»: the planned word lands (coral)'},
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const ramp = (t: number, [a, b]: readonly [number, number] | readonly number[]) => clamp01((t - a) / (b - a));

// ── the board (end of scene 4 → «автодополнение»): close on the end of the two rows. At this scale the type on the tiles
// is above the 26 px floor (a letter is CW = 0.68 units; the whole board in the band would put it at ≈ 21 px). The camera
// holds still: a word that crosses the frame edge during a move could not be read for its full time (§25.4).
const BOARD_REGION: Point3[] = [27, 49].flatMap((x) => [0, BOARD_H].flatMap((y) => [boardPoint(x, y, 0), boardPoint(x, y, 3.6)]));
const BOARD_CAM: Cam = camFit(BOARD_REGION.map((p) => toRoom(p, BOARD_U)), {rect: REEL_RECT, fill: 1});
export type BoardShot = {cam: Cam; extra: Dyn[]; hide: Set<string>; keep: Point3[]; words: WordAt[]; size: number; angle: number};
const X1 = boardRowXs(ROW1);
const X2 = boardRowXs(ROW2);
/** the candidates of the last round (an example, like every candidate of the board); cell 0 is the one picked */
const LAST_ROUND = ['чем', 'и', 'а', 'как'];
/** seconds the board's words were already on screen before the reel starts (scenes 2–4 of the film, §25.4) */
const BOARD_SEEN = 1.5;
const boardShot = (t: number): BoardShot => {
  const cam = BOARD_CAM;
  const at = (p: Point3) => screenOf(cam, toRoom(p, BOARD_U));
  const [a, b] = [at(boardPoint(0, 0, 0)), at(boardPoint(10, 0, 0))];
  const size = (BOARD_CW * Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.1) / 0.66;
  const hide = new Set<string>(['board.tile2.4', ...LAST_ROUND.flatMap((_, k) => [`board.cand${k}`, `board.bar${k}`, `board.barcap${k}`])]);
  const last = ROW2.length - 1;
  // the pick leaves its cell in front of the panel (clear of row 1), falls onto the end of row 2, bounces once
  const p = clamp01((t - T.pick[0]) / (T.pick[1] - T.pick[0]));
  const q = clamp01((t - T.pick[1]) / T.pickBounce);
  const from = {x: TRAY_X0 + 1.2, y: cellMid(0) - BOARD_TILE_H / 2};
  const x = from.x + (X2[last] - from.x) * smooth(p);
  const y = p < 1 ? from.y + (BOARD_ROW2_Y - from.y) * smooth(p) : BOARD_ROW2_Y + 0.2 * Math.sin(Math.PI * q) * (1 - q);
  const n0 = 1.8 + (1.2 - 1.8) * p + 3 * Math.sin(Math.PI * p);
  const landed = p >= 1;
  const extra: Dyn[] = [];
  // tiles 4–6 of row 2 (4 is the static tile without its coral; 5, 6 were picked in scenes 3–4); the coral is the tile
  // that ends the output: «,» until «чем» lands
  for (let i = 4; i < last; i++) extra.push(boardTileDyn(`tile2.${i}`, X2[i], BOARD_ROW2_Y, ROW2[i].text, {lit: i === last - 1 && !landed}));
  extra.push(boardTileDyn(`tile2.${last}`, x, y, ROW2[last].text, {lit: landed, n0}));
  // the rest of the column leaves: the candidates slide out of their cells to the right and fade (the column empties)
  const out = smooth(ramp(t, T.candOut));
  const candX = (k: number) => TRAY_X0 + 1.2 + 14 * out * (1 + 0.15 * k);
  for (let k = 1; k < LAST_ROUND.length; k++) if (out < 0.999) extra.push(boardTileDyn(`cand${k}`, candX(k), cellMid(k) - BOARD_TILE_H / 2, LAST_ROUND[k], {n0: 1.8, opacity: 1 - out}));
  // words on every tile whose word lies inside the rect (the frame's side fade hides what is past it)
  const words: WordAt[] = [];
  const word = (name: string, text: string, p0: Point3, show = 1) => {
    const w = at(p0);
    const half = (text.length * 0.62 * Math.max(size, TYPE_FLOOR.auxiliary)) / 2;
    const edge = clamp01(Math.min(w[0] - half - REEL_RECT.x0, REEL_RECT.x1 - w[0] - half) / 40); // a word leaving the rect fades first
    if (edge > 0) words.push({name, text, at: w, size, tone: 'ink', show: show * edge});
  };
  ROW1.forEach((tk, i) => word(`b1.${i}`, tk.text, boardTileAnchor(X1[i], BOARD_ROW1_Y, tk.text)));
  ROW2.forEach((tk, i) => (i < last ? word(`b2.${i}`, tk.text, boardTileAnchor(X2[i], BOARD_ROW2_Y, tk.text)) : null));
  word(`b2.${last}`, ROW2[last].text, boardPoint(x + boardTileWidth(ROW2[last].text) / 2, y + BOARD_TILE_H / 2, n0 + 2));
  for (let k = 1; k < LAST_ROUND.length; k++) if (out < 0.999) word(`cand${k}`, LAST_ROUND[k], boardPoint(candX(k) + boardTileWidth(LAST_ROUND[k]) / 2, cellMid(k), 3.8), 1 - out);
  return {cam, extra, hide, keep: BOARD_REGION, words, size, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI};
};

// ── the scheme stand (after the cut)
/** the three panels fill the band's width (the posts beside them run into the side fade): the type on the tiles grows by ≈ 10 % */
export const REEL_STAND = panelsCorners(0, 2);
const REEL_STAND_CAM: Cam = camFit(REEL_STAND.map((p) => toRoom(p, SCHEME_U)), {rect: REEL_RECT, fill: 1}); // keep adds the caps and the plinth (they stay in the rect)
const XS1 = rowXs(LINE1);
const XS2 = rowXs(LINE2[0]);
const W2 = LINE2[0].map((t) => tileWidth([...t.text].length));
const room = (p: Point3) => toRoom(p, SCHEME_U);
/** line 2 of panel 1 at time t: per tile its landing share (0 not started … 1 landed) */
const typing = (t: number) => LINE2[0].map((_, i) => clamp01((t - (T.type0 + i * T.typeStep)) / T.flight));
/** a tile lands from a little above and in front of its place (gravity: it hits, then bounces once, damped) */
const landing = (t: number, i: number) => {
  const p = clamp01((t - (T.type0 + i * T.typeStep)) / T.flight);
  const q = clamp01((t - (T.type0 + i * T.typeStep + T.flight)) / T.bounce);
  const dy = p < 1 ? 0.25 * (1 - p * p) : 0.18 * Math.sin(Math.PI * q) * (1 - q);
  const dn = 2 * (1 - p) * (1 - p);
  return {p, dy, dn};
};
/** line 1 is read: a hop that runs left to right (the tile rises 0.6 along the panel and settles) */
const hopOf = (t: number, i: number) => {
  const x = (t - (T.wave + i * T.waveStep)) / T.hop;
  return x <= 0 || x >= 1 ? 0 : 0.6 * Math.sin(Math.PI * x) ** 2;
};
/** the cursor blinks (soft edges: no pop) while it waits; it is solid while line 2 is written */
const cursorO = (t: number) => {
  const blink = clamp01(0.5 + 0.6 * Math.cos((2 * Math.PI * (t - T.cut)) / 1.06));
  const end = T.type0 + 7 * T.typeStep + T.flight;
  const solid = smooth(ramp(t, [T.type0 - 0.25, T.type0])) * (1 - smooth(ramp(t, [end + 0.2, end + 0.45])));
  return blink + (1 - blink) * solid;
};

export const schemeShot = (t: number): SchemeState => {
  const cam = REEL_STAND_CAM;
  const at = (p: Point3) => screenOf(cam, room(p));
  const {size, angle, readable} = typeOf(cam);
  const hide = new Set<string>();
  const extra: Dyn[] = [];
  const typed = typing(t);
  const landed = typed.filter((p) => p >= 1).length;
  // panels 2 and 3 are under their blinds; their line-2 tiles, concepts and clamps are not there yet
  for (const k of [1, 2]) LINE2[k].forEach((_, i) => hide.add(`scheme.p${k}.t2.${i}`));
  for (const n of ['bl', 'br', 'tl', 'tr', 'tab']) for (const k of [1, 2]) hide.add(`scheme.p${k}.clamp.${n}`);
  for (const id of CONCEPTS) {
    hide.add(`scheme.p${conceptPanel(id)}.concept.${id}`);
    if (id !== 'rabbit1') hide.add(`scheme.p${conceptPanel(id)}.concept.${id}.tab`); // the tab of «rabbit» is its empty seat before it rises
  }
  // line 1: the hop runs along it; the «,» that ends it is coral until line 2 starts
  const comma = LINE1.length - 1;
  const hops = LINE1.map((_, i) => hopOf(t, i));
  // (every tile of the line is a moving part from the cut on: a static tile handed over to a moving copy mid-shot pops)
  // The coral is a lit copy laid over its tile (`.coral`, drawn after it): it fades in as a tile lands and out as the next
  // one lands, 0.1 s each, so no still tile changes colour in one frame (motion-check pixel `pop`).
  const landAt = (i: number) => T.type0 + i * T.typeStep + T.flight;
  const coralO = (i: number) => (i < 0 ? 1 : clamp01((t - (landAt(i) - 0.1)) / 0.1)) * (i + 1 < LINE2[0].length ? 1 - clamp01((t - landAt(i + 1)) / 0.1) : 1);
  const coral = (lit: Dyn, o: number) => o > 0.001 && extra.push({...lit, name: `${lit.name}.coral`, opacity: o, bias: 0.05});
  LINE1.forEach((tile, i) => {
    hide.add(`scheme.p0.t1.${i}`);
    extra.push(tileDyn(0, `t1.${i}.p0`, XS1[i], ROW1_Y + hops[i], [...tile.text].length));
    if (i === comma) coral(tileDyn(0, `t1.${i}.p0`, XS1[i], ROW1_Y + hops[i], [...tile.text].length, {lit: true}), coralO(-1));
  });
  // line 2: tiles in flight and the last landed one are moving parts; the one that landed last is coral
  LINE2[0].forEach((tile, i) => {
    const {p, dy, dn} = landing(t, i);
    hide.add(`scheme.p0.t2.${i}`);
    if (p <= 0) return;
    const o = {n0: 1.2 + dn, opacity: clamp01(p / 0.35)};
    extra.push(tileDyn(0, `t2.${i}.p0`, XS2[i], ROW2_Y + dy, [...tile.text].length, o));
    coral(tileDyn(0, `t2.${i}.p0`, XS2[i], ROW2_Y + dy, [...tile.text].length, {...o, lit: true}), coralO(i) * o.opacity);
  });
  // the concept «rabbit»: rises on «внутрь» (low relief, dimmed), lights on «до» (full relief, tone lo → mid → hi)
  const rise = smooth(ramp(t, T.rise));
  const light = settle(ramp(t, T.light), 0.6);
  const relief = rise <= 0 ? 0 : light > 0 ? RELIEF_LO + (RELIEF_HI - RELIEF_LO) * light : 0.05 + (RELIEF_LO - 0.05) * rise;
  const tone: K.Tone = light < 0.34 ? 'lo' : light < 0.67 ? 'mid' : 'hi';
  const conceptO = clamp01(rise / 0.3);
  if (rise > 0) extra.push(conceptDyn('rabbit1', {relief, tone, opacity: conceptO}));
  // the cursor at the end of what is written (before line 2: in its socket)
  const end = (n: number) => (n === 0 ? 1.6 : XS2[n - 1] + W2[n - 1] + 0.05);
  const moving = typed.findIndex((p) => p > 0 && p < 1);
  const cx = moving >= 0 ? end(moving) + (end(moving + 1) - end(moving)) * smooth(typed[moving]) : end(landed);
  extra.push(cursorDyn(0, cx, {opacity: cursorO(t)}));

  // words on the tiles of panel 1 (the type follows the stand's scale) and on the concept
  const words: WordAt[] = [];
  if (readable) {
    LINE1.forEach((tile, i) => tile.word && words.push({name: `p0.1.${i}`, text: tile.text, at: at(schemePoint(0, XS1[i] + tileWidth([...tile.text].length) / 2, ROW1_Y + hops[i] + TILE_H / 2, TILE_N1)), size, tone: 'ink'}));
    LINE2[0].forEach((tile, i) => {
      const {p, dy, dn} = landing(t, i);
      if (tile.word && p > 0) words.push({name: `p0.2.${i}`, text: tile.text, at: at(schemePoint(0, XS2[i] + W2[i] / 2, ROW2_Y + dy + TILE_H / 2, TILE_N1 + dn)), size, tone: 'ink', show: smooth(ramp(p, [0.4, 1]))});
    });
    if (rise > 0) words.push({name: 'concept.rabbit1', text: 'rabbit', at: at(conceptAnchor('rabbit1', relief)), size, tone: 'ink', show: conceptO});
  }
  // plates: the source note and the panel's title from the cut to the end of line 1; then the two notes of «rabbit»
  const plates: PlateAt[] = [];
  const top = REEL_RECT.y0 + PLATE_SIZE * 0.775 + 2;
  const srcO = 1 - smooth(ramp(t, T.srcOut));
  if (srcO > 0) {
    SRC_LINES.forEach((text, i) => plates.push({name: `source${i}`, text, at: [(REEL_RECT.x0 + REEL_RECT.x1) / 2, REEL_RECT.y1 - SRC_H / 2 - SRC_LIFT - (SRC_LINES.length - 1 - i) * (SRC_H + 12)], size: SRC_SIZE, show: srcO}));
    plates.push({name: 'title0', text: 'без вмешательства', at: [330, top], to: at(tabAnchor('title0')), size: PLATE_SIZE, show: srcO});
  }
  const notes = smooth(ramp(t, T.labelsIn));
  // the legend points at the lit concept itself (its top edge), not at a tab of the panel (KRC-06)
  const conceptCorner = schemePoint(0, conceptX('rabbit1') + conceptWidth('rabbit1') * 0.75, CONCEPT_Y + CONCEPT_H, 1.2 + relief);
  if (notes > 0) {
    plates.push({name: 'legend', text: 'горит = задействовано в вычислениях', at: [480, top], to: at(conceptCorner), size: 36, show: notes});
    const tab = at(tabAnchor('rabbit1'));
    plates.push({name: 'concept', text: 'понятие', at: [320, tab[1] - 30], to: tab, size: PLATE_SIZE, show: notes});
  }
  return {cfg: {typed: [landed, 0, 0], coral: null, concepts: {}, clamp: [null, null], open: [0, 0], cursor: 0}, cam, extra, hide, size, angle, readable, words, plates, inset: null, keep: [...REEL_STAND, ...STAND_CORNERS.slice(-4)]};
};

export type ReelState = {loc: 'board'; board: BoardShot} | {loc: 'scheme'; scheme: SchemeState};
export const reelState = (frame: number): ReelState => {
  const t = Math.min(REEL_FRAMES - 1, Math.max(0, frame)) / FPS;
  return frame < CUT_FRAME ? {loc: 'board', board: boardShot(t)} : {loc: 'scheme', scheme: schemeShot(t)};
};

const poseOf = (frame: number): MotionPose => {
  const s = reelState(frame);
  if (s.loc === 'board') {
    const b = s.board;
    const plates: PlateProbe[] = b.words.map((w) => ({...wordProbe(w.name, w.at, w.text, w.size, w.show ?? 1), seen: BOARD_SEEN}));
    return {cam: b.cam, rect: REEL_RECT, unit: BOARD_U, assembly: BOARD, extra: b.extra, arrows: [], keep: b.keep.map((p, i) => ({name: `board${i}`, at: p})), plates, hide: (n) => b.hide.has(n)};
  }
  const c = s.scheme;
  return {
    cam: c.cam,
    rect: REEL_RECT,
    unit: SCHEME_U,
    assembly: SCHEME,
    extra: c.extra,
    arrows: [],
    keep: c.keep.map((p, i) => ({name: `hero${i}`, at: p})),
    plates: probesOf(c),
    touch: [['concept.', 'scheme.p'], ['cursor', 'scheme.p']],
    hide: (n) => c.hide.has(n),
  };
};

export const MOTION: MotionSpec[] = [{id: 'KakRabotaetClaudeReel', frames: REEL_FRAMES, fps: FPS, loop: false, cuts: [CUT_FRAME], holds: [[...T.silence1], [...T.silence2]], pose: poseOf}];
