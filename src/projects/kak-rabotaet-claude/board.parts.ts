import * as K from '../../vendor/anatomy/iso-kit';
import {A, asTopFace, Assembly, Dyn, dynSolid, Frame, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import KEYS from './board.parts.keys.json';

// Token board of «Как работает Claude» (scenes 2–4; parts-plan.md §1.2): a panel on two posts that stands on the desk and
// FACES THE CAMERA (isometric, no parallax, no camera move downwards). Tiles of different length sit on two rails with
// gaps between them (row 1 = the question, row 2 = the start of the answer); to the right a tray holds four candidate
// tiles, each with a bar on one shared scale. Bars carry NO numbers. Coral = the one tile that ends the output.
// Role: secondary (parts-plan §0 item 6: Hero would need 80+ parts, user decision 19.11.2026: «доска и схема — Hero, не Epic»
// is read as the scene's main object, the file records secondary ≥ 40 as the task says).
//
// Units: kit units, anatomyProjection(6) like every file of the topic (the phone screen and these tiles share one scale).
// The board's own frame (BR right, BU up the panel, BN out of the panel) is the camera's screen frame LEANED by LEAN
// from the vertical: the face is turned to the camera to within a few degrees, so the tiles read as a flat row, and the
// top faces of the plates are seen a little (a sliver of depth, not a parallax). A tile's top is its `+BU` face.
export const BOARD_U = 6;
export const BOARD_P = anatomyProjection(BOARD_U);
const P = BOARD_P;

// ── PARTS: the list with counts comes BEFORE the geometry (MASTER_PROMPT_FINAL §22.2). 89 parts, secondary ≥ 40.
export const PARTS = [
  {group: 'Основание', part: 'брус основания (скос под стойки)', count: 1, primitive: 'prism', rests: 'стол (ground)'},
  {group: 'Основание', part: 'лапы', count: 2, primitive: 'prism', rests: 'подпятники, торец бруса'},
  {group: 'Основание', part: 'подпятники', count: 4, primitive: 'cyl', rests: 'стол (ground)'},
  {group: 'Конструкция', part: 'стойки (по бокам панели)', count: 2, primitive: 'prism', rests: 'брус'},
  {group: 'Конструкция', part: 'колпачки стоек', count: 2, primitive: 'turned', rests: 'стойки'},
  {group: 'Конструкция', part: 'кронштейны панели', count: 2, primitive: 'prism', rests: 'стойки, торец панели'},
  {group: 'Конструкция', part: 'винты кронштейнов', count: 4, primitive: 'turned', rests: 'кронштейны'},
  {group: 'Конструкция', part: 'панель', count: 1, primitive: 'prism', rests: 'кронштейны'},
  {group: 'Конструкция', part: 'рейки рамы', count: 4, primitive: 'prism', rests: 'панель'},
  {group: 'Конструкция', part: 'угловые накладки', count: 4, primitive: 'prism', rests: 'рейки'},
  {group: 'Конструкция', part: 'винты рамы', count: 8, primitive: 'disc', rests: 'накладки'},
  {group: 'Механизм', part: 'рельсы строк 1 и 2', count: 2, primitive: 'prism', rests: 'панель'},
  {group: 'Механизм', part: 'концевые упоры рельсов', count: 4, primitive: 'prism', rests: 'рельсы, панель'},
  {group: 'Механизм', part: 'винты рельсов', count: 6, primitive: 'disc', rests: 'рельсы'},
  {group: 'Механизм', part: 'лоток кандидатов', count: 1, primitive: 'prism', rests: 'панель'},
  {group: 'Механизм', part: 'перегородки лотка', count: 5, primitive: 'prism', rests: 'лоток'},
  {group: 'Механизм', part: 'дорожки полосок (одна шкала)', count: 4, primitive: 'prism', rests: 'лоток'},
  {group: 'Объект показа', part: 'плитки строки 1 (вопрос)', count: 11, primitive: 'prism', rests: 'рельс 1'},
  {group: 'Объект показа', part: 'плитки начала строки 2 (из сцены 1)', count: 5, primitive: 'prism', rests: 'рельс 2'},
  {group: 'Объект показа', part: 'плитки-кандидаты', count: 4, primitive: 'prism', rests: 'лоток'},
  {group: 'Объект показа', part: 'полоски без чисел', count: 4, primitive: 'prism', rests: 'дорожки'},
  {group: 'Объект показа', part: 'торцевые колпачки полосок', count: 4, primitive: 'prism', rests: 'полоски'},
  {group: 'Объект показа', part: 'планка подсветки «написано»', count: 1, primitive: 'prism', rests: 'рельс 2'},
  {group: 'Объект показа', part: 'язычки под плашки «слово», «часть слова», «символ»', count: 3, primitive: 'prism', rests: 'рельс 1'},
  {group: 'Объект показа', part: 'язычок под плашку «пример, не реальное разбиение»', count: 1, primitive: 'prism', rests: 'рама'},
] as const;
export const PARTS_TOTAL = PARTS.reduce((s, p) => s + p.count, 0); // 89

// ── the text on the tiles (neutral Russian, decisions.md 19.11.2026; the same pieces are the answer chips of the phone)
export type TokenKind = 'word' | 'part' | 'symbol';
export type Token = {text: string; kind: TokenKind};
const tok = (text: string, kind: TokenKind = 'word'): Token => ({text, kind});
/** Row 1 = the question line «Объясни просто, почему небо голубое в ясный день?» cut into 11 tokens. */
export const ROW1: Token[] = [tok('Объясни'), tok('про', 'part'), tok('сто', 'part'), tok(',', 'symbol'), tok('почему'), tok('небо'), tok('голубое'), tok('в'), tok('ясный'), tok('день'), tok('?', 'symbol')];
/** Row 2 = the answer «Воздух рассеивает синий свет сильнее, чем…» in 8 pieces. Pieces 0–4 are typed on the phone in scene 1
 *  (the phone's answer chips must use exactly these pieces, in this order), pieces 5–7 are picked from the tray in scenes 3–4. */
export const ROW2: Token[] = [tok('Воздух'), tok('рассеи', 'part'), tok('вает', 'part'), tok('синий'), tok('свет'), tok('сильнее'), tok(',', 'symbol'), tok('чем')];
export const ROW2_TYPED = 5;
/** Candidates of the first round (the 6th piece). Bar lengths are the example 1.0 / 0.62 / 0.35 / 0.18 of the track (parts-plan §4). */
export const CANDIDATES: Token[] = [tok('сильнее'), tok('лучше'), tok('ярче'), tok('чуть')];
export const BAR_SHARES = [1, 0.62, 0.35, 0.18] as const;
/** Tiles that carry a plate label (scene 2): index in ROW1 → the plate text. Only three tiles, «символ» on one. */
export const LABELLED: {row1: number; label: string}[] = [
  {row1: 5, label: 'слово'},
  {row1: 1, label: 'часть слова'},
  {row1: 3, label: 'символ'},
];

// ── sizes, panel-local units (bx right, by up, bn out of the face)
export const CW = 0.68; // tile width per character
export const PAD = 0.7; // tile width added to the characters
export const GAP = 0.3; // gap between neighbouring tiles of a row (the «cut»; 0 before scene 2's cut)
export const TILE_H = 2.9;
export const TILE_N0 = 1.2; // tiles sit on the panel face
export const TILE_N1 = 3.2;
export const tileWidth = (text: string) => [...text].length * CW + PAD;
export const PANEL_W = 64;
export const PANEL_H = 24;
const ROW_X0 = 2;
const RAIL1_Y = 13.8;
const RAIL2_Y = 7.2;
const RAIL_H = 0.7;
export const ROW1_Y = RAIL1_Y + RAIL_H; // tile bottoms
export const ROW2_Y = RAIL2_Y + RAIL_H;
export const TRAY_X0 = 44.2;
const TRAY_X1 = 62.6;
const CELL0 = 3.4; // y of the first divider
const CELL_H = 4.2;
export const TRACK_X0 = 51.6;
export const TRACK_LEN = 6.8;
const TRACK_H = 1;
const BAR_N0 = 2.2;
const BAR_N1 = 3;

/** x of every tile's left edge in a row (cumulative widths + gap). */
export const rowXs = (tokens: Token[], gap = GAP, x0 = ROW_X0) => {
  const out: number[] = [];
  let x = x0;
  for (const t of tokens) {
    out.push(x);
    x += tileWidth(t.text) + gap;
  }
  return out;
};
/** y of the middle of candidate cell k; cell 0 (the longest bar) is the top one, the column reads downwards. */
export const cellMid = (k: number) => CELL0 + CELL_H * (3 - k + 0.5) + 0.15;

// ── the board's frame and its place on the desk. Scene axes: rx = right along the desk diagonal, fh = towards the viewer
// (horizontal), z = up. world = AT + rx·RH + fh·FH + z·Z; RH and FH are the camera's right and towards-the-viewer turned by YAW.
/** The board is turned this far (degrees) about the vertical from facing the camera exactly. Root cause it closes: with the
 *  face exactly square to the view, the vertices of a plate line up on one screen vertical to within float noise and the
 *  kit's convex hull (lathe.mjs hullTagged, sorted by x) drops corners: tiles come out skewed, long diagonals appear. */
export const YAW = 1;
const AZ = ((45 + YAW) * Math.PI) / 180;
const RH: Point3 = [Math.cos(AZ), -Math.sin(AZ), 0];
const FH: Point3 = [Math.sin(AZ), Math.cos(AZ), 0];
const ZZ: Point3 = [0, 0, 1];
/** How far the panel leans back from the vertical (degrees). The camera's elevation is 35.3°: a smaller lean turns the
 *  face almost square to the view and shows the tops of the plates. */
export const LEAN = 24;
const T = (LEAN * Math.PI) / 180;
const lin = (...terms: [number, Point3][]): Point3 => [0, 1, 2].map((k) => terms.reduce((s, [c, v]) => s + c * v[k], 0)) as Point3;
const BR = RH;
const BU = lin([-Math.sin(T), FH], [Math.cos(T), ZZ]);
const BN = lin([Math.cos(T), FH], [Math.sin(T), ZZ]);
export const AT: Point3 = [48, 14, 0];

// post foot on the sloped top of the beam, panel bottom 4 units up the post axis, posts beside the panel
const POST_X: [number, number] = [-3.2, PANEL_W + 3.2]; // post centres (bx)
const Y0 = 4; // post foot → panel bottom along BU
const BEAM_Z0 = 2.6; // top of the beam at fh = 0
// panel-local origin in scene axes so that the post foot (bx = POST_X[0], by = −Y0, bn = 0) is at (rx 0, fh 0, z BEAM_Z0)
const O: Point3 = lin([1, [0, 0, BEAM_Z0]], [-1 * POST_X[0], BR], [Y0, BU]);
/** Panel-local point → kit world point. */
export const boardPoint = (bx: number, by: number, bn: number): Point3 => lin([1, AT], [1, O], [bx, BR], [by, BU], [bn, BN]);
const scenePoint = (rx: number, fh: number, z: number): Point3 => lin([1, AT], [rx, RH], [fh, FH], [z, ZZ]);

// face plane, extruded along BN. The kit wants u × v = a: u = BU, v = BR, so polygons are written (y, x) = (up, right) here
const faceFrame = (bx: number, by: number, bn: number): Frame => G.frameOf(boardPoint(bx, by, bn), BN, BU, BR) as Frame;
const flip = (poly: number[][]): number[][] => poly.map(([x, y]) => [y, x]);
const upFrame = (rx: number, fh: number, z: number): Frame => G.frameOf(scenePoint(rx, fh, z), ZZ, RH, FH) as Frame; // plan plane: u = RH, v = FH, extruded up

const chamfer = (w: number, h: number, c = 0.25): number[][] => [[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]];
const box = (w: number, h: number): number[][] => [[0, 0], [w, 0], [w, h], [0, h]];

/** Everything on the face of the panel: a plate (bx, by, w × h, bn n0…n1). */
const plate = (S: Assembly, name: string, x: number, y: number, w: number, h: number, n0: number, n1: number, c: Parameters<Assembly['prism']>[5] = {}, poly = box(w, h)) =>
  S.prism(name, faceFrame(x, y, n0), flip(poly), 0, n1 - n0, c);

// ── the object. `bars` is the bar length as a share of the track (state sweep rebuilds it).
export const buildBoard = (bars: readonly number[] = BAR_SHARES) => {
  const S = new Assembly('board', P, {role: 'secondary', detail: 'schematic'});

  // base: beam with a sloped top (plane square to BU), two legs on four heel pads
  const beamRx0 = O[0] + POST_X[0] - 3.2;
  const beamRx1 = O[0] + POST_X[1] + 3.2;
  const slope = Math.tan(T);
  const beamFrame = G.frameOf(scenePoint(beamRx0, 0, 0), RH, FH, ZZ) as Frame; // u = fh, v = z, extruded along rx
  S.prism('beam', beamFrame, [[-3, 0], [3, 0], [3, BEAM_Z0 + slope * 3], [-3, BEAM_Z0 - slope * 3]], 0, beamRx1 - beamRx0, {tone: 'lo', ground: true, shadow: 'hero'});
  for (const [i, rx] of [beamRx0 - 2.2, beamRx1].entries()) {
    S.prism(`leg${i}`, upFrame(rx, 0, 0.5), [[0, -8], [2.2, -8], [2.2, 8], [0, 8]], 0, 1.5, {tone: 'lo', shadow: 'part'});
    for (const fh of [-6.2, 6.2]) {
      const w = scenePoint(rx + 1.1, fh, 0);
      S.cyl(`foot${i}${fh > 0 ? 'f' : 'b'}`, w[0], w[1], 0.9, 0, 0.5, {tone: 'mid', ground: true, bevel: 0.1});
    }
  }

  // posts beside the panel (axis BU), caps, brackets that carry the panel by its side faces
  for (const [i, bxc] of POST_X.entries()) {
    const post = G.frameOf(boardPoint(bxc, -Y0, 0), BU, BR, BN) as Frame;
    S.prism(`post${i}`, post, [[-1.2, -1.2], [1.2, -1.2], [1.2, 2.4], [-1.2, 2.4]], 0, Y0 + PANEL_H - 2, {tone: 'mid'});
    S.turned(`cap${i}`, [[0, 1.05], [0.4, 1.05, 1], [0.75, 0.55]], G.frameAlong(boardPoint(bxc, PANEL_H - 2, 0.6), BU), {tone: 'hi', meta: {owner: `post${i}`}});
    const bx0 = i === 0 ? -2 : PANEL_W;
    plate(S, `bracket${i}`, bx0, 5, 2, 6, -0.6, 1.8, {tone: 'mid'});
    for (const y of [6.5, 9.5]) {
      S.turned(`bracket${i}.screw${y}`, [[0, 0.45], [0.2, 0.45, 1], [0.3, 0]], G.frameAlong(boardPoint(bx0 + 1, y, 1.8), BN), {tone: 'hi', meta: {owner: `bracket${i}`}});
    }
  }

  // panel + frame
  plate(S, 'panel', 0, 0, PANEL_W, PANEL_H, 0, 1.2, {tone: 'mid', shadow: 'hero'});
  plate(S, 'frame.bottom', 0, 0, PANEL_W, 0.9, 1.2, 2, {tone: 'lo'});
  plate(S, 'frame.top', 0, PANEL_H - 0.9, PANEL_W, 0.9, 1.2, 2, {tone: 'lo'});
  plate(S, 'frame.left', 0, 0.9, 0.9, PANEL_H - 1.8, 1.2, 2, {tone: 'lo'});
  plate(S, 'frame.right', PANEL_W - 0.9, 0.9, 0.9, PANEL_H - 1.8, 1.2, 2, {tone: 'lo'});
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [PANEL_W - 2.4, 0, -1, 1], [0, PANEL_H - 2.4, 1, -1], [PANEL_W - 2.4, PANEL_H - 2.4, -1, -1]] as const) {
    const id = `${cx ? 'r' : 'l'}${cy ? 't' : 'b'}`;
    plate(S, `corner.${id}`, cx, cy, 2.4, 2.4, 2, 2.5, {tone: 'mid'}, chamfer(2.4, 2.4, 0.4));
    for (const k of [0, 1]) {
      const px = cx + (sx > 0 ? 0.6 + 1.2 * k : 2.4 - 0.6 - 1.2 * k);
      const py = cy + (sy > 0 ? 0.6 + 1.2 * k : 2.4 - 0.6 - 1.2 * k);
      S.disc(`corner.${id}.screw${k}`, 0, 0.15, 0.3, G.frameAlong(boardPoint(px, py, 2.5), BN), {tone: 'hi', meta: {owner: `corner.${id}`}});
    }
  }

  // rails of the two rows, end stops, rail screws
  const railLen = 40.8;
  for (const [i, y] of [RAIL1_Y, RAIL2_Y].entries()) {
    plate(S, `rail${i + 1}`, 1.4, y, railLen, RAIL_H, 1.2, 2.4, {tone: 'mid'});
    plate(S, `stop${i + 1}.l`, 1.4, y, 0.6, 2.2, 1.2, 2.4, {tone: 'lo'});
    plate(S, `stop${i + 1}.r`, 1.4 + railLen - 0.6, y, 0.6, 2.2, 1.2, 2.4, {tone: 'lo'});
    for (const x of [9, 22, 36]) S.disc(`rail${i + 1}.screw${x}`, 0, 0.15, 0.25, G.frameAlong(boardPoint(x, y + RAIL_H / 2, 2.4), BN), {tone: 'hi', meta: {owner: `rail${i + 1}`}});
  }
  // highlight plank (scene 3, «написано»): rests on the second rail from below
  plate(S, 'plank', 1.4, RAIL2_Y - 2, railLen, 2, 1.2, 2, {tone: 'lo'});

  // tray with five dividers and four bar tracks
  plate(S, 'tray', TRAY_X0, 2, TRAY_X1 - TRAY_X0, 20, 1.2, 1.8, {tone: 'lo'});
  for (let k = 0; k <= 4; k++) plate(S, `divider${k}`, TRAY_X0 + 0.6, CELL0 + CELL_H * k, TRAY_X1 - TRAY_X0 - 1.2, 0.3, 1.8, 3, {tone: 'mid'});
  for (let k = 0; k < 4; k++) plate(S, `track${k}`, TRACK_X0, cellMid(k) - TRACK_H / 2, TRACK_LEN, TRACK_H, 1.8, 2.2, {tone: 'lo'});

  // the tiles: row 1 (question), the first five of row 2 (answer); coral = the tile that ends the output (the 5th of row 2)
  const x1 = rowXs(ROW1);
  ROW1.forEach((t, i) => plate(S, `tile1.${i}`, x1[i], ROW1_Y, tileWidth(t.text), TILE_H, TILE_N0, TILE_N1, {tone: 'hi'}, chamfer(tileWidth(t.text), TILE_H, 0.3)));
  const x2 = rowXs(ROW2);
  for (let i = 0; i < ROW2_TYPED; i++) {
    const w = tileWidth(ROW2[i].text);
    plate(S, `tile2.${i}`, x2[i], ROW2_Y, w, TILE_H, TILE_N0, TILE_N1, {tone: 'hi', lit: i === ROW2_TYPED - 1, topFace: i === ROW2_TYPED - 1}, chamfer(w, TILE_H, 0.3)); // the coral face looks at the viewer: drawn in the top band (R1)
  }
  // candidates in the tray, bars on the tracks, end caps
  CANDIDATES.forEach((t, k) => {
    const w = tileWidth(t.text);
    plate(S, `cand${k}`, TRAY_X0 + 1.2, cellMid(k) - TILE_H / 2, w, TILE_H, 1.8, 3.6, {tone: 'hi'}, chamfer(w, TILE_H, 0.3));
    const len = Math.max(0.5, bars[k] * TRACK_LEN - 0.5);
    plate(S, `bar${k}`, TRACK_X0, cellMid(k) - TRACK_H / 2 + 0.1, len, TRACK_H - 0.2, 2.2, BAR_N1, {tone: 'mid'});
    plate(S, `barcap${k}`, TRACK_X0 + len, cellMid(k) - TRACK_H / 2 + 0.1, 0.5, TRACK_H - 0.2, 2.2, BAR_N1, {tone: 'hi'});
  });
  // tabs under the plates «слово», «часть слова», «символ» (on rail 1) and «пример, не реальное разбиение» (on the frame)
  for (const {row1} of LABELLED) {
    const w = 2.2;
    plate(S, `tab.${row1}`, x1[row1] + tileWidth(ROW1[row1].text) / 2 - w / 2, RAIL1_Y - 2.4, w, 2.4, 1.2, 2.4, {tone: 'mid'});
  }
  plate(S, 'tab.example', 21, PANEL_H - 0.9 - 4, 2.2, 4, 1.2, 2.4, {tone: 'mid'});

  S.applyKeys((KEYS as Record<string, Record<string, number>>).BOARD);
  return S;
};

export const BOARD = buildBoard();
if (BOARD.parts !== PARTS_TOTAL) throw new Error(`board.parts.ts: ${BOARD.parts} parts built, PARTS promises ${PARTS_TOTAL}`);

/** Bars change length: object-audit rebuilds the board at 8 states of the bar length. */
export const stateSweep = {bars: (s: number) => buildBoard([1, 0.62, 0.35, 0.18].map((b) => b * s))};

// ── moving tiles and bars (rebuilt every frame, drawn as `extra` of BOARD.svg / svgFaded; Dyn with their shapes)
/** A tile of `text` whose bottom-left corner is at panel-local (x, y) and whose back is at bn. Coral with `lit`. */
export const tileDyn = (name: string, x: number, y: number, text: string, o: {n0?: number; lit?: boolean; tone?: K.Tone; opacity?: number} = {}): Dyn => {
  const n0 = o.n0 ?? TILE_N0;
  const w = tileWidth(text);
  const F = faceFrame(x, y, n0);
  const poly = flip(chamfer(w, TILE_H, 0.3));
  const d = TILE_N1 - TILE_N0;
  const at = boardPoint(x + w / 2, y + TILE_H / 2, n0 + d / 2);
  const paths = G.prismOf(F, poly, 0, d, P);
  if (o.lit) asTopFace(paths); // the coral face looks at the viewer: drawn in the top band so it reads as coral (R1)
  return dynSolid(name, at, K.solidSvg(paths, {tone: o.tone ?? 'hi', lit: o.lit}), A.prism(F, poly, 0, d, {name}), o.opacity);
};
/** Bar k at `share` of the track (one shared scale for all four; never a number). */
export const barDyn = (k: number, share: number, o: {opacity?: number} = {}): Dyn[] => {
  const len = Math.max(0.5, share * TRACK_LEN - 0.5);
  const y = cellMid(k) - TRACK_H / 2 + 0.1;
  const h = TRACK_H - 0.2;
  const part = (name: string, x: number, w: number, tone: K.Tone): Dyn => {
    const F = faceFrame(x, y, BAR_N0);
    const poly = flip(box(w, h));
    const d = BAR_N1 - BAR_N0;
    return dynSolid(name, boardPoint(x + w / 2, y + h / 2, BAR_N0 + d / 2), K.solidSvg(G.prismOf(F, poly, 0, d, P), {tone}), A.prism(F, poly, 0, d, {name}), o.opacity);
  };
  return [part(`bar${k}`, TRACK_X0, len, 'mid'), part(`barcap${k}`, TRACK_X0 + len, 0.5, 'hi')];
};

/** World point of the middle of a tile's front face (for plates and words pinned to a tile). */
export const tileAnchor = (x: number, y: number, text: string): Point3 => boardPoint(x + tileWidth(text) / 2, y + TILE_H / 2, TILE_N1);

/** Corners for camFit boxes: the rows with the label tabs, the panel with the tray, and the whole board with its stand. */
export const ROWS_CORNERS: Point3[] = [[1.4, 5, TILE_N0], [42.2, 5, TILE_N1], [1.4, PANEL_H, TILE_N1], [42.2, PANEL_H, TILE_N0]].map(([x, y, n]) => boardPoint(x, y, n));
export const PANEL_CORNERS: Point3[] = [[0, 0], [PANEL_W, 0], [0, PANEL_H], [PANEL_W, PANEL_H]].flatMap(([x, y]) => [boardPoint(x, y, 0), boardPoint(x, y, 3.6)]);
export const BOARD_CORNERS: Point3[] = [...PANEL_CORNERS, boardPoint(POST_X[0] - 2, -Y0, 0), boardPoint(POST_X[1] + 2, -Y0, 0)];
