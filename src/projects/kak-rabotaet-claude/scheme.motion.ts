import {toRoom} from '../../lib/anatomy';
import {Dyn, Point3} from '../../lib/assembly';
import {Cam, camFit, safeRect, screenOf} from '../../lib/camera';
import {insetProbe, insetRect, InsetBox} from '../../components/Inset';
import {textWidth, wordProbe} from '../../components/Frontal';
import {FORMAT} from '../../theme/format';
import {MotionPose, MotionSpec, PlateProbe} from '../../lib/motion';
import {TYPE_FLOOR} from '../../theme/tokens';
import {
  BLIND_BOTTOM,
  BLIND_TOP,
  blindDyn,
  clampDyn,
  conceptAnchor,
  ConceptId,
  CONCEPTS,
  conceptDyn,
  conceptPanel,
  CW,
  CONCEPT_H,
  CONCEPT_Y,
  cursorDyn,
  LINE1,
  LINE2,
  ROW1_Y,
  ROW2_Y,
  TILE_H,
  lineTileDyn,
  schemePoint,
  SCHEME,
  SCHEME_U,
  STAND_CORNERS,
  RELIEF_HI,
  RELIEF_LO,
  tabAnchor,
  tileAnchor,
} from './scheme.parts';

// Per-frame state of the scheme stand's style frames (scenes 5–8 and the inset of scene 9): a pure function of the
// frame, read by SchemeFrames.tsx and by scripts/motion-check.mjs. Frames: 0 = scene 5 (the stand, panels 2 and 3 under
// their blinds, the concept «rabbit» just risen, dim), 1 = end of scene 6 (line 2 written to «rabbit», coral; the concept
// lit), 2 = scene 7 mid (the blind of panel 2 half rolled up, the clamp on its way to «rabbit»), 3 = end of scene 7
// («rabbit» dimmed in its clamp, line 2 ends «habit», coral), 4 = end of scene 8 («green» inserted, line 2 ends «green»,
// coral, «без рифмы»), 5 = the inset of scene 9 («Claude 3.5 Haiku»: a light patch and blurred dashed outlines).
// Coral = ONLY the last tile of a line that has just been written (never a concept, a clamp or a blind).
export const SCHEME_RECT = safeRect({captions: true});
const room = (p: Point3) => toRoom(p, SCHEME_U);

export type Cfg = {
  typed: [number, number, number]; // tiles of line 2 written, per panel (0 or 8)
  coral: number | null; // the panel whose last written tile is coral
  concepts: Partial<Record<ConceptId, {relief: number; tone: 'hi' | 'lo'}>>;
  clamp: [number | null, number | null]; // arrival share of clamp2, clamp3 (null: not there; 1: seated, static part)
  open: [number, number]; // how far the blinds of panels 2 and 3 are rolled up (0 closed, 1 open)
  cursor: number | null; // panel whose cursor stands at the start of line 2
};
const CLOSED: [number, number] = [0, 0];
export const CFGS: Cfg[] = [
  {typed: [0, 0, 0], coral: null, concepts: {rabbit1: {relief: RELIEF_LO, tone: 'lo'}}, clamp: [null, null], open: CLOSED, cursor: 0},
  {typed: [8, 0, 0], coral: 0, concepts: {rabbit1: {relief: RELIEF_HI, tone: 'hi'}}, clamp: [null, null], open: CLOSED, cursor: null},
  {typed: [8, 0, 0], coral: null, concepts: {rabbit1: {relief: RELIEF_HI, tone: 'hi'}, rabbit2: {relief: RELIEF_HI, tone: 'hi'}}, clamp: [0.5, null], open: [0.5, 0], cursor: null},
  {typed: [8, 8, 0], coral: 1, concepts: {rabbit1: {relief: RELIEF_HI, tone: 'hi'}, rabbit2: {relief: RELIEF_LO, tone: 'lo'}, habit2: {relief: RELIEF_HI, tone: 'hi'}}, clamp: [1, null], open: [1, 0], cursor: null},
  {
    typed: [8, 8, 8],
    coral: 2,
    concepts: {rabbit1: {relief: RELIEF_HI, tone: 'hi'}, rabbit2: {relief: RELIEF_LO, tone: 'lo'}, habit2: {relief: RELIEF_HI, tone: 'hi'}, green3: {relief: RELIEF_HI, tone: 'hi'}},
    clamp: [1, 1],
    open: [1, 1],
    cursor: null,
  },
  {typed: [0, 0, 0], coral: null, concepts: {}, clamp: [null, null], open: CLOSED, cursor: null}, // frame 5 is the inset: the stand is not drawn
];
export const INSET_FRAME = 5;
/** The scene-9 inset in the still: 800 × 640 px with room above for «Claude 3.5 Haiku» and below for «видна лишь часть вычислений» (inside the safe rect, its shadow too). */
export const INSET_BOX: InsetBox = {...insetRect(SCHEME_RECT, {w: 800, h: 640}, 'tl'), y: SCHEME_RECT.y0 + 85};

export type WordAt = {name: string; text: string; at: [number, number]; size: number; tone: 'ink' | 'paper'};
export type PlateAt = {name: string; text: string; at: [number, number]; to?: [number, number]; size: number};
export type SchemeState = {cfg: Cfg; cam: Cam; extra: Dyn[]; hide: Set<string>; size: number; angle: number; readable: boolean; words: WordAt[]; plates: PlateAt[]; inset: InsetBox | null; keep: Point3[]};

/** The source note «упрощённая схема по описанию исследования Anthropic» is longer than the 840 px band at the 26 px floor in one line: two plates, one above the other. */
const SRC_LINES = ['упрощённая схема по описанию', 'исследования Anthropic'];
export const PLATE_SIZE = 40;
export const SRC_SIZE = 30;
const SRC_H = SRC_SIZE * 1.55;
export const INSET_TEXT = {title: 'Claude 3.5 Haiku', limit: 'видна лишь часть вычислений'};

/** One camera for scenes 5–8: the stand is as wide as the safe band, so a closer camera would crop it (panelCorners(k) stays
 *  exported for a pan to one panel). */
const STAND_CAM: Cam = camFit(STAND_CORNERS.map(room), {rect: SCHEME_RECT, fill: 1});

export const schemeState = (frame: number): SchemeState => {
  const f = Math.min(CFGS.length - 1, Math.max(0, frame));
  const cfg = CFGS[f];
  const cam = STAND_CAM;
  const keep = STAND_CORNERS;
  const at = (p: Point3) => screenOf(cam, room(p));
  const extra: Dyn[] = [];
  const hide = new Set<string>();

  // line 2 tiles: those not written are hidden; the coral one is drawn as THE lit moving part
  for (const k of [0, 1, 2]) {
    LINE2[k].forEach((_, i) => {
      const name = `scheme.p${k}.t2.${i}`;
      if (i >= cfg.typed[k]) hide.add(name);
      else if (cfg.coral === k && i === LINE2[k].length - 1) {
        hide.add(name);
        extra.push(lineTileDyn(k, 2, i, {lit: true}));
      }
    });
  }
  // concepts: every one shown is a moving part (its relief and tone change); the plate and its tab stand only with it
  for (const id of CONCEPTS) {
    const k = conceptPanel(id);
    hide.add(`scheme.p${k}.concept.${id}`);
    const c = cfg.concepts[id];
    if (c) extra.push(conceptDyn(id, c));
    else hide.add(`scheme.p${k}.concept.${id}.tab`);
  }
  // clamps: not there / on its way (moving parts) / seated (the static parts)
  for (const [n, k] of [[0, 1], [1, 2]] as const) {
    const share = cfg.clamp[n];
    const names = ['bl', 'br', 'tl', 'tr', 'tab'].map((s) => `scheme.p${k}.clamp.${s}`);
    if (share === 1) continue;
    for (const nm of names) hide.add(nm);
    if (share !== null) extra.push(...clampDyn(k, share));
  }
  // blinds: closed = the static part; opening = a moving part that shrinks into the roller; open = nothing
  for (const [n, k] of [[0, 1], [1, 2]] as const) {
    const open = cfg.open[n];
    if (open > 0) {
      hide.add(`scheme.p${k}.blind`);
      extra.push(...blindDyn(k, open));
    }
  }
  if (cfg.cursor !== null) extra.push(cursorDyn(cfg.cursor, 1.5 + 0.1));
  if (f === INSET_FRAME) return {cfg, cam, extra: [], hide, size: 0, angle: 0, readable: false, words: [], plates: [], inset: INSET_BOX, keep: []};

  // the type follows the screen scale (a letter of the bold type is ≈ 0.66 em; CW kit units a letter)
  const [a, b] = [at(schemePoint(0, 0, 0, 0)), at(schemePoint(0, 10, 0, 0))];
  const size = (CW * Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.1) / 0.66;
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const readable = size >= TYPE_FLOOR.auxiliary;
  const words: WordAt[] = [];
  const word = (name: string, text: string, p: Point3, tone: 'ink' | 'paper' = 'ink') => words.push({name, text, at: at(p), size, tone});
  /** a word on panel k whose top is at panel-local height yTop shows once the blind has rolled up past it (panel 1 has no blind) */
  const clear = (k: number, yTop: number) => k === 0 || yTop < BLIND_TOP - (BLIND_TOP - BLIND_BOTTOM) * (1 - cfg.open[k - 1]) - 0.2;
  const inside = (p: Point3) => {
    const [x, y] = at(p);
    return x > SCHEME_RECT.x0 && x < SCHEME_RECT.x1 && y > SCHEME_RECT.y0 && y < SCHEME_RECT.y1;
  };
  if (readable) {
    for (const k of [0, 1, 2]) {
      LINE1.forEach((t, i) => t.word && clear(k, ROW1_Y + TILE_H) && inside(tileAnchor(k, 1, i)) && word(`p${k}.1.${i}`, t.text, tileAnchor(k, 1, i)));
      LINE2[k].forEach((t, i) => t.word && i < cfg.typed[k] && clear(k, ROW2_Y + TILE_H) && inside(tileAnchor(k, 2, i)) && word(`p${k}.2.${i}`, t.text, tileAnchor(k, 2, i)));
    }
    for (const id of CONCEPTS) {
      const c = cfg.concepts[id];
      if (c && clear(conceptPanel(id), CONCEPT_Y + CONCEPT_H)) word(`concept.${id}`, id.slice(0, -1), conceptAnchor(id, c.relief));
    }
  }
  // plates: pinned to the tabs and tiles they name (screen offsets chosen by hand on the stand's fixed camera)
  const plates: PlateAt[] = [];
  const plate = (name: string, text: string, p: Point3, to: [number, number] | null, size = PLATE_SIZE) => {
    const target = at(p);
    plates.push({name, text, at: to ?? target, to: to ? target : undefined, size});
  };
  const top = SCHEME_RECT.y0 + PLATE_SIZE * 0.775 + 2;
  // the source note sits on the plinth and the closed blind of panel 3: it leaves before panel 3 opens (scene 8)
  if (f <= 2) SRC_LINES.forEach((text, i) => plates.push({name: `source${i}`, text, at: [(SCHEME_RECT.x0 + SCHEME_RECT.x1) / 2, SCHEME_RECT.y1 - SRC_H / 2 - 8 - (SRC_LINES.length - 1 - i) * (SRC_H + 12)], size: SRC_SIZE}));
  if (f === 0) plate('title0', 'без вмешательства', tabAnchor('title0'), [330, top]);
  if (f === 1) {
    plate('legend', 'горит = задействовано в вычислениях', tabAnchor('legend'), [480, top], 36);
    plate('concept', 'понятие', tabAnchor('rabbit1'), [320, at(tabAnchor('rabbit1'))[1] - 30]);
  }
  if (f === 2 || f === 3) {
    const tab = at(tabAnchor('clamp2'));
    plates.push({name: 'clamp2', text: 'вмешательство исследователей', at: [480, tab[1] + 95], to: tab, size: PLATE_SIZE});
  }
  if (f === 4) {
    const tab = at(tabAnchor('clamp3'));
    plates.push({name: 'inserted', text: 'вставлено', at: [330, tab[1] - 10], to: tab, size: PLATE_SIZE});
    const end = at(tileAnchor(2, 2, 7));
    plates.push({name: 'norhyme', text: 'без рифмы', at: [end[0] - 150, SCHEME_RECT.y1 - 38], to: [end[0], end[1] + 20], size: PLATE_SIZE});
  }
  if (f >= 2 && f <= 4) plates.push({name: 'experiment', text: 'эксперимент исследователей', at: [480, top], size: PLATE_SIZE});
  return {cfg, cam, extra, hide, size, angle, readable, words, plates, inset: null, keep};
};

const probesOf = (s: SchemeState): PlateProbe[] => [
  ...s.words.map((w) => wordProbe(w.name, w.at, w.text, w.size)),
  ...s.plates.map((p) => {
    const w = textWidth(p.text, p.size) + p.size * 1.1;
    return {name: `plate.${p.name}`, x: p.at[0] - w / 2, y: p.at[1] - p.size * 0.775, w, h: p.size * 1.55, opacity: 1, kind: 'label' as const, text: p.text};
  }),
  ...(s.inset ? [insetProbe('inset', s.inset, 1)] : []),
];

const poseOf = (frame: number): MotionPose => {
  const s = schemeState(frame);
  return {
    cam: s.cam,
    rect: SCHEME_RECT,
    unit: SCHEME_U,
    assembly: SCHEME,
    extra: s.extra,
    arrows: [],
    keep: s.keep.map((p, i) => ({name: `hero${i}`, at: p})),
    plates: probesOf(s),
    touch: [['concept.', 'scheme.p'], ['clamp', 'scheme.p'], ['blind', 'scheme.p'], ['cursor', 'scheme.p'], ['t2.', 'scheme.p']],
  };
};

export const MOTION: MotionSpec[] = [{id: 'KakRabotaetClaudeScheme', frames: CFGS.length, fps: FORMAT.fps, loop: false, stills: true, cuts: CFGS.map((_, i) => i).slice(1), pose: poseOf}];
