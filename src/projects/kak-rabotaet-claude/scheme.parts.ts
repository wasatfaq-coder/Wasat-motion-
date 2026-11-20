import * as K from '../../vendor/anatomy/iso-kit';
import {A, asTopFace, Assembly, Dyn, dynSolid, Frame, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import {LEAN, YAW} from './board.parts';
import KEYS from './scheme.parts.keys.json';

// Scheme stand of «Как работает Claude» (scenes 5–8 and the inset of scene 9; parts-plan.md §1.3): ONE flat stand that
// faces the camera (iso body like the token board: no depth tunnel, no parallax, no camera move down) with THREE panels
// one above another, in the order of S1's figure caption: (top) no intervention, the concept «rabbit» is planned before
// line 2 starts; (middle) «rabbit» is suppressed, line 2 ends «habit»; (bottom) the concept «green» is inserted, line 2
// ends «green» (no rhyme). It is a SIMPLIFIED scheme from the DESCRIPTION of S1 (the figure itself was not seen): only
// the concepts S1 names (rabbit, habit, green, the end of line 1 «grab it») stand on it; there are no layers, no nodes
// besides these, no arrows, no causal links and no copy of Anthropic's graph. A concept is a bright NEUTRAL plate (never
// coral). Coral = only the last tile of the line that has just been written (a `lit` tile, drawn by tileDyn).
// Panels 2 and 3 are closed by roll-up blinds until their scenes (a blind hangs from a roller and is rebuilt per frame
// by blindDyn: a closed one is the static part, an opening one shrinks upward into the roller).
// English words are shown as they are; their Russian captions are frontal plates (scheme.motion.ts).
// Role: hero (parts-plan §0 item 6: the stand is the main object of scenes 5–8), 140 parts.
//
// Units: kit units, anatomyProjection(6), the scale of the whole topic. The stack's frame (BR right, BU up the panels,
// BN out of the face) is the screen frame LEANED by LEAN and turned by YAW, exactly as the token board's (board.parts.ts).
export const SCHEME_U = 6;
export const SCHEME_P = anatomyProjection(SCHEME_U);
const P = SCHEME_P;

// ── the text on the tiles (S1: «He saw a carrot and had to grab it, / His hunger was like a starving rabbit»).
// Line 1 is the same on all three panels. Line 2 of panel 1 is S1's second line. Of lines 2 of panels 2 and 3 S1 gives
// the END WORD only (habit, green); the words before it are not in what was verified, so those tiles are BLANK (a tile
// of the same width, no letters): we do not invent text. Fill LINE2[k] when S1's lines are verified.
export type Tile = {text: string; word?: boolean}; // word: the text is drawn on the tile (false: a blank tile of `text.length` letters)
const tile = (text: string, word = true): Tile => ({text, word});
export const LINE1: Tile[] = ['He', 'saw', 'a', 'car', 'rot', 'and', 'had', 'to', 'grab', 'it', ','].map((t) => tile(t));
const LINE2_P1 = ['His', 'hun', 'ger', 'was', 'like', 'a', 'starving', 'rabbit'];
export const LINE2: Tile[][] = [LINE2_P1.map((t) => tile(t)), [...LINE2_P1.slice(0, 7).map((t) => tile(t, false)), tile('habit')], [...LINE2_P1.slice(0, 7).map((t) => tile(t, false)), tile('green')]];
export const PANEL_NAMES = ['без вмешательства', 'rabbit подавлен', 'вставлен green'] as const;

// ── sizes, panel-local units (bx right, by up the panel, bn out of the face)
export const CW = 1.5; // tile width per letter (a letter of the bold type is ≈ 0.66 em: the font follows the screen scale)
export const PAD = 0.9;
export const GAP = 0.35;
export const TILE_H = 2.8; // < BEVEL_ACROSS (3): a tile is a thin block, the hero bevel lint starts at 3
export const TILE_N0 = 1.2;
export const TILE_N1 = 3.2;
export const tileWidth = (chars: number) => chars * CW + PAD;
export const PANEL_W = 62;
export const PANEL_H = 19;
export const PANEL_GAP = 3.5;
const ROW_X0 = 2.6;
const RAIL1_Y = 12;
const RAIL2_Y = 1.3;
const RAIL_H = 0.7;
export const ROW1_Y = RAIL1_Y + RAIL_H;
export const ROW2_Y = RAIL2_Y + RAIL_H;
const TAB_Y = 16.2; // y of the tabs in the top band of panel 1 (panels 2 and 3 have the blind's roller there)
const FR = 0.9; // frame rail width
const FRAME_N1 = 4.6; // frame depth: it holds the blind

/** x of every tile's left edge in a row. */
export const rowXs = (tiles: Tile[], x0 = ROW_X0, gap = GAP) => {
  const out: number[] = [];
  let x = x0;
  for (const t of tiles) {
    out.push(x);
    x += tileWidth([...t.text].length) + gap;
  }
  return out;
};
/** Right end of a row (for the fit check). */
const rowEnd = (tiles: Tile[]) => {
  const xs = rowXs(tiles);
  return xs[xs.length - 1] + tileWidth([...tiles[tiles.length - 1].text].length);
};
for (const [k, l] of LINE2.entries()) if (rowEnd(l) > PANEL_W - FR - 0.4) throw new Error(`scheme.parts: line 2 of panel ${k} (${rowEnd(l).toFixed(1)}) does not fit the panel`);
if (rowEnd(LINE1) > PANEL_W - FR - 0.4) throw new Error('scheme.parts: line 1 does not fit the panel');

// ── concepts: one bright neutral plate each, between the two lines, over the end of line 2
export const CONCEPT_H = 3.6;
export const CONCEPT_Y = 6.4;
export const RELIEF_LO = 0.6; // not lit: a low relief
export const RELIEF_HI = 1.8; // lit («горит»): a raised plate
const CONCEPT_PAD = 1.8;
const TABD = 1.3; // a concept's tab hangs this far below its plate (between the plate and line 2)
export type ConceptId = 'rabbit1' | 'rabbit2' | 'habit2' | 'green3';
const CONCEPT_TEXT: Record<ConceptId, string> = {rabbit1: 'rabbit', rabbit2: 'rabbit', habit2: 'habit', green3: 'green'};
export const conceptWidth = (id: ConceptId) => CONCEPT_TEXT[id].length * CW + CONCEPT_PAD;
const endTile = (k: number) => {
  const l = LINE2[k];
  const xs = rowXs(l);
  const w = tileWidth([...l[l.length - 1].text].length);
  return {x: xs[xs.length - 1], w};
};
/** x of a concept plate's left edge: the lit one is centred over the end tile of line 2, the dimmed «rabbit» of panel 2 stands left of «habit». */
export const conceptX = (id: ConceptId): number => {
  const k = Number(id.slice(-1)) - 1;
  const e = endTile(k);
  const w = conceptWidth(id);
  const over = Math.min(PANEL_W - FR - 0.6 - w, e.x + e.w / 2 - w / 2);
  if (id === 'rabbit2') return conceptX('habit2') - w - 7;
  return over;
};
export const CONCEPTS: ConceptId[] = ['rabbit1', 'rabbit2', 'habit2', 'green3'];
export const conceptPanel = (id: ConceptId) => Number(id.slice(-1)) - 1;

// ── the stack's frame (the board's frame; scene axes: rx right, fh towards the viewer, z up)
const AZ = ((45 + YAW) * Math.PI) / 180;
const RH: Point3 = [Math.cos(AZ), -Math.sin(AZ), 0];
const FH: Point3 = [Math.sin(AZ), Math.cos(AZ), 0];
const ZZ: Point3 = [0, 0, 1];
const T = (LEAN * Math.PI) / 180;
const lin = (...terms: [number, Point3][]): Point3 => [0, 1, 2].map((k) => terms.reduce((s, [c, v]) => s + c * v[k], 0)) as Point3;
const BR = RH;
const BU = lin([-Math.sin(T), FH], [Math.cos(T), ZZ]);
const BN = lin([Math.cos(T), FH], [Math.sin(T), ZZ]);
const POST_X: [number, number] = [-2.2, PANEL_W + 2.2]; // post centres: the posts stand close beside the panels (the safe band is only 840 px wide)
const Y0 = 2.5; // post foot → bottom panel along BU
const BEAM_Z0 = 2.6;
const FOOT_H = 0.5;
const O: Point3 = lin([1, [0, 0, BEAM_Z0]], [-POST_X[0], BR], [Y0, BU]);
/** The stand stands on the podium of ROOM (desk.parts.ts: PODIUM centred on the scene origin, top at z = 4, the same 46°
 *  turn): the middle of the panels sits over the podium's centre, the beam and feet on its top. */
const PODIUM_TOP = 4;
const MID = lin([1, O], [PANEL_W / 2, BR]);
const AT: Point3 = [-MID[0], -MID[1], PODIUM_TOP];
/** y (along BU, from the bottom panel's bottom edge) of the bottom edge of panel k (0 = top). */
export const panelY = (k: number) => (2 - k) * (PANEL_H + PANEL_GAP);
export const STACK_H = panelY(0) + PANEL_H;
/** Panel-local point (panel k, bx right, by up the panel, bn out of the face) → kit world point. */
export const schemePoint = (k: number, bx: number, by: number, bn: number): Point3 => lin([1, AT], [1, O], [bx, BR], [by + panelY(k), BU], [bn, BN]);
const scenePoint = (rx: number, fh: number, z: number): Point3 => lin([1, AT], [rx, RH], [fh, FH], [z, ZZ]);
const faceFrame = (k: number, bx: number, by: number, bn: number): Frame => G.frameOf(schemePoint(k, bx, by, bn), BN, BU, BR) as Frame; // u = BU, v = BR, extruded along BN
const flip = (poly: number[][]): number[][] => poly.map(([x, y]) => [y, x]);
const box = (w: number, h: number): number[][] => [[0, 0], [w, 0], [w, h], [0, h]];
const chamfer = (w: number, h: number, c = 0.3): number[][] => [[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]];
/** a right triangle with the right angle at (0, 0): legs along +x and +y */
const corner = (l: number): number[][] => [[0, 0], [l, 0], [0, l]];

// the clamp (скоба) of panels 2 and 3 is built seated round its concept; it ARRIVES as clampDyn (from the left, lifted out of the face, then lowered)
export const CLAMP_PARK = 9;
const CLAMP_M = 0.9; // gap between the concept and the corner pieces
const CLAMP_L = 1.4; // leg of a corner piece

// ── PARTS: the list with counts comes BEFORE the geometry (MASTER_PROMPT_FINAL §22.2). 140 parts, hero 80–150.
export const PARTS = [
  {group: 'Основание', part: 'цоколь (брус со скосом под стойки)', count: 1, primitive: 'prism', rests: 'ножки'},
  {group: 'Основание', part: 'ножки цоколя', count: 4, primitive: 'cyl', rests: 'подиум (ground)'},
  {group: 'Конструкция', part: 'стойки (по бокам стопки панелей)', count: 2, primitive: 'prism', rests: 'цоколь'},
  {group: 'Конструкция', part: 'колпачки стоек', count: 2, primitive: 'turned', rests: 'стойки'},
  {group: 'Конструкция', part: 'поперечины между панелями', count: 2, primitive: 'prism', rests: 'стойки'},
  {group: 'Конструкция', part: 'кронштейны панелей (по 2 на панель)', count: 6, primitive: 'prism', rests: 'стойки, торец панели'},
  {group: 'Конструкция', part: 'винты кронштейнов', count: 6, primitive: 'turned', rests: 'кронштейны'},
  {group: 'Панель 1 «без вмешательства»', part: 'плита панели', count: 1, primitive: 'prism', rests: 'кронштейны'},
  {group: 'Панель 1', part: 'рейки рамы (глубокая рама)', count: 4, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 1', part: 'угловые накладки', count: 4, primitive: 'prism', rests: 'рейки'},
  {group: 'Панель 1', part: 'рельсы строк 1 и 2', count: 2, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 1', part: 'плитки строки 1 («He saw a car|rot and had to grab it ,»)', count: 11, primitive: 'prism', rests: 'рельс 1'},
  {group: 'Панель 1', part: 'плитки строки 2 (S1: «His hunger was like a starving rabbit»)', count: 8, primitive: 'prism', rests: 'рельс 2'},
  {group: 'Панель 1', part: 'гнездо курсора', count: 1, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 1', part: 'плашка-понятие «rabbit» (горит)', count: 1, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 1', part: 'язычок понятия («понятие»)', count: 1, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 1', part: 'язычок заголовка «без вмешательства»', count: 1, primitive: 'prism', rests: 'рама'},
  {group: 'Панель 1', part: 'язычок легенды «горит = задействовано в вычислениях»', count: 1, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 2 «rabbit подавлен»', part: 'плита, 4 рейки, 4 накладки, 2 рельса', count: 11, primitive: 'prism', rests: 'кронштейны / плита'},
  {group: 'Панель 2', part: 'плитки строки 1', count: 11, primitive: 'prism', rests: 'рельс 1'},
  {group: 'Панель 2', part: 'плитки строки 2 + концевая «habit»', count: 8, primitive: 'prism', rests: 'рельс 2'},
  {group: 'Панель 2', part: 'гнездо курсора', count: 1, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 2', part: 'понятия «rabbit» (погашено) и «habit» (горит) + 2 язычка', count: 4, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 2', part: 'валик шторки и шторка (рулонная)', count: 2, primitive: 'turned / prism', rests: 'рама'},
  {group: 'Панель 2', part: 'скоба «вмешательство исследователей» (4 уголка + язычок)', count: 5, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 3 «вставлен green»', part: 'плита, 4 рейки, 4 накладки, 2 рельса', count: 11, primitive: 'prism', rests: 'кронштейны / плита'},
  {group: 'Панель 3', part: 'плитки строки 1', count: 11, primitive: 'prism', rests: 'рельс 1'},
  {group: 'Панель 3', part: 'плитки строки 2 + концевая «green»', count: 8, primitive: 'prism', rests: 'рельс 2'},
  {group: 'Панель 3', part: 'гнездо курсора', count: 1, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 3', part: 'понятие «green» (вставлено) + язычок', count: 2, primitive: 'prism', rests: 'плита'},
  {group: 'Панель 3', part: 'валик шторки и шторка (рулонная)', count: 2, primitive: 'turned / prism', rests: 'рама'},
  {group: 'Панель 3', part: 'скоба вокруг «green» (4 уголка + язычок)', count: 5, primitive: 'prism', rests: 'плита'},
] as const;
export const PARTS_TOTAL = PARTS.reduce((s, p) => s + p.count, 0); // 140

// the blind's slat lines (thin lines across its front face, from the roller down), so a closed blind reads as a blind
const BLIND_N = 4.0; // front face of the blind
const SLAT = 1.7;
const slatLines = (k: number, top: number, bottom: number): string => {
  const segs: string[] = [];
  for (let y = top - SLAT; y > bottom + 0.2; y -= SLAT) segs.push(K.lineSvg(K.pathOf([K.iso(schemePoint(k, FR, y, BLIND_N), P), K.iso(schemePoint(k, PANEL_W - FR, y, BLIND_N), P)]), {tone: 'lo'}));
  return segs.join('');
};
export const BLIND_TOP = PANEL_H - FR - 2.2; // the blind hangs from the roller's lower edge
export const BLIND_BOTTOM = FR + 0.3;

// ── the object
export type SchemeOpts = {relief?: number};
/** `relief` is the height of the concept plates above the panel (the state sweep rebuilds it; default = lit). */
export const buildScheme = (o: SchemeOpts = {}) => {
  const relief = o.relief ?? RELIEF_HI;
  const S = new Assembly('scheme', P, {role: 'hero', detail: 'schematic'});
  type C = Parameters<Assembly['prism']>[5];
  /** a plate on panel k's face (bx, by, w × h, bn n0…n1) */
  const plate = (k: number, name: string, x: number, y: number, w: number, h: number, n0: number, n1: number, c: C = {}, poly = box(w, h)) => S.prism(name, faceFrame(k, x, y, n0), flip(poly), 0, n1 - n0, c);

  // base: a beam with a sloped top (square to BU) on four feet
  const beamRx0 = O[0] + POST_X[0] - 3.2;
  const beamRx1 = O[0] + POST_X[1] + 3.2;
  const slope = Math.tan(T);
  const beamFrame = G.frameOf(scenePoint(beamRx0, 0, 0), RH, FH, ZZ) as Frame; // u = fh, v = z, extruded along rx
  S.prism('plinth', beamFrame, [[-4, FOOT_H], [4, FOOT_H], [4, BEAM_Z0 + slope * 4], [-4, BEAM_Z0 - slope * 4]], 0, beamRx1 - beamRx0, {tone: 'lo', shadow: 'hero', bevel: 0.6, meta: {touch: ['foot']}});
  for (const [i, rx] of [beamRx0 + 2.4, beamRx1 - 2.4].entries())
    for (const fh of [-2.6, 2.6]) {
      const w = scenePoint(rx, fh, 0);
      S.cyl(`foot${i}${fh > 0 ? 'f' : 'b'}`, w[0], w[1], 1.1, w[2], FOOT_H, {tone: 'mid', ground: true, bevel: 0.1, meta: {owner: 'foot'}});
    }

  // posts beside the stack, caps, crossbars in the two gaps
  for (const [i, bxc] of POST_X.entries()) {
    const post = G.frameOf(schemePoint(2, bxc, -Y0, 0), BU, BR, BN) as Frame;
    S.prism(`post${i}`, post, [[-1, -1.2], [1, -1.2], [1, 2.4], [-1, 2.4]], 0, Y0 + STACK_H + 1.5, {tone: 'mid'});
    S.turned(`cap${i}`, [[0, 1.05], [0.4, 1.05, 1], [0.75, 0.55]], G.frameAlong(schemePoint(0, bxc, PANEL_H + 1.5, 0.6), BU), {tone: 'hi', meta: {owner: `post${i}`}});
  }
  for (const k of [1, 2]) plate(k, `bar${k}`, POST_X[0] + 1, PANEL_H + (PANEL_GAP - 2) / 2, POST_X[1] - POST_X[0] - 2, 2, -0.6, 1.2, {tone: 'lo'}); // in the gap above panel k (panel k's top edge is at PANEL_H)

  for (const k of [0, 1, 2]) {
    // brackets that carry the panel by its side faces, one screw each
    for (const [i, bx0] of [-1.2, PANEL_W].entries()) {
      plate(k, `p${k}.bracket${i}`, bx0, 4, 1.2, 6, -0.6, 1.8, {tone: 'mid'});
      S.turned(`p${k}.bracket${i}.screw`, [[0, 0.4], [0.2, 0.4, 1], [0.3, 0]], G.frameAlong(schemePoint(k, bx0 + 0.6, 7, 1.8), BN), {tone: 'hi', meta: {owner: `p${k}.bracket${i}`}});
    }
    // panel + deep frame (it holds the blind), corner plates
    plate(k, `p${k}.plate`, 0, 0, PANEL_W, PANEL_H, 0, 1.2, {tone: 'mid', shadow: 'hero', bevel: 0.5});
    plate(k, `p${k}.frame.bottom`, 0, 0, PANEL_W, FR, 1.2, FRAME_N1, {tone: 'lo'});
    plate(k, `p${k}.frame.top`, 0, PANEL_H - FR, PANEL_W, FR, 1.2, FRAME_N1, {tone: 'lo'});
    plate(k, `p${k}.frame.left`, 0, FR, FR, PANEL_H - 2 * FR, 1.2, FRAME_N1, {tone: 'lo'});
    plate(k, `p${k}.frame.right`, PANEL_W - FR, FR, FR, PANEL_H - 2 * FR, 1.2, FRAME_N1, {tone: 'lo'});
    for (const [cx, cy] of [[0, 0], [PANEL_W - 2.4, 0], [0, PANEL_H - 2.4], [PANEL_W - 2.4, PANEL_H - 2.4]] as const) {
      const id = `${cx ? 'r' : 'l'}${cy ? 't' : 'b'}`;
      plate(k, `p${k}.corner.${id}`, cx, cy, 2.4, 2.4, FRAME_N1, FRAME_N1 + 0.5, {tone: 'mid'}, chamfer(2.4, 2.4, 0.4));
    }
    // the rails of the two lines
    const railLen = PANEL_W - 2 * FR - 0.8;
    plate(k, `p${k}.rail1`, FR + 0.4, RAIL1_Y, railLen, RAIL_H, 1.2, 2.4, {tone: 'mid'});
    plate(k, `p${k}.rail2`, FR + 0.4, RAIL2_Y, railLen, RAIL_H, 1.2, 2.4, {tone: 'mid'});

    // the tiles of the two lines and the cursor socket at the start of line 2
    const x1 = rowXs(LINE1);
    LINE1.forEach((t, i) => {
      const w = tileWidth([...t.text].length);
      plate(k, `p${k}.t1.${i}`, x1[i], ROW1_Y, w, TILE_H, TILE_N0, TILE_N1, {tone: 'hi'}, chamfer(w, TILE_H));
    });
    const x2 = rowXs(LINE2[k]);
    LINE2[k].forEach((t, i) => {
      const w = tileWidth([...t.text].length);
      plate(k, `p${k}.t2.${i}`, x2[i], ROW2_Y, w, TILE_H, TILE_N0, TILE_N1, {tone: 'hi'}, chamfer(w, TILE_H));
    });
    plate(k, `p${k}.socket`, FR + 0.5, ROW2_Y, 0.9, TILE_H, 1.2, 1.8, {tone: 'lo'});

    // roll-up blind (panels 2 and 3): a roller across the top of the frame and the blind that hangs from it
    if (k > 0) {
      const ry = PANEL_H - FR - 1.1;
      S.turned(`p${k}.roller`, [[0, 1.1], [PANEL_W - 2 * FR, 1.1]], G.frameAlong(schemePoint(k, FR, ry, 3.7), BR), {tone: 'mid', meta: {touch: [`p${k}.frame.left`, `p${k}.frame.right`]}});
      plate(k, `p${k}.blind`, FR, FR + 0.3, PANEL_W - 2 * FR, ry - 1.1 - FR - 0.3, 3.4, BLIND_N, {tone: 'hi', bevel: 0.2, over: slatLines(k, BLIND_TOP, BLIND_BOTTOM), meta: {touch: [`p${k}.roller`, `p${k}.frame.left`, `p${k}.frame.right`]}});
    }
  }

  // legend tab (panel 1, right) and the heading tab of panel 1 «без вмешательства» (top band; panels 2 and 3 are named by their clamp tabs)
  plate(0, 'p0.tab.legend', 50, TAB_Y, 7, 1.4, 1.2, 1.8, {tone: 'mid'});
  plate(0, 'p0.tab.title', 2.6, TAB_Y, 7, 1.4, 1.2, 1.8, {tone: 'mid'});

  // concepts: a plate between the lines over the end of line 2 + its tab (label tabs hang just under the plate)
  const conceptPlate = (id: ConceptId, extra: C = {}) => {
    const k = conceptPanel(id);
    const w = conceptWidth(id);
    plate(k, `p${k}.concept.${id}`, conceptX(id), CONCEPT_Y, w, CONCEPT_H, 1.2, 1.2 + relief, {tone: id === 'rabbit2' ? 'lo' : 'hi', bevel: 0.3, ...extra}, chamfer(w, CONCEPT_H, 0.9));
    plate(k, `p${k}.concept.${id}.tab`, conceptX(id) + w / 2 - 1.8, CONCEPT_Y - TABD, 3.6, 1, 1.2, 1.8, {tone: 'mid'});
  };
  for (const id of CONCEPTS) conceptPlate(id);

  // clamps (clamp2 / clamp3): four corner pieces round the concept and a tab with the label
  for (const [k, id] of [[1, 'rabbit2'], [2, 'green3']] as const) {
    const w = conceptWidth(id);
    const x0 = conceptX(id);
    const piece = {tone: 'mid' as const};
    const [xa, xb, ya, yb] = [x0 - CLAMP_M, x0 + w + CLAMP_M, CONCEPT_Y - CLAMP_M, CONCEPT_Y + CONCEPT_H + CLAMP_M];
    // each corner piece sits just outside a corner of the concept plate, its hypotenuse facing it
    for (const [n, cx, cy, sx, sy] of [['bl', xa, ya, 1, 1], ['br', xb, ya, -1, 1], ['tl', xa, yb, 1, -1], ['tr', xb, yb, -1, -1]] as const)
      plate(k, `p${k}.clamp.${n}`, Math.min(cx, cx + sx * CLAMP_L), Math.min(cy, cy + sy * CLAMP_L), CLAMP_L, CLAMP_L, 1.2, 2.4, piece, corner(CLAMP_L).map(([x, y]) => [sx > 0 ? x : CLAMP_L - x, sy > 0 ? y : CLAMP_L - y]));
    plate(k, `p${k}.clamp.tab`, x0 + w / 2 - 1.8, CONCEPT_Y - TABD, 3.6, 1, 1.2, 1.8, piece);
  }

  S.applyKeys((KEYS as Record<string, Record<string, number>>).SCHEME);
  return S;
};

export const SCHEME = buildScheme();
if (SCHEME.parts !== PARTS_TOTAL) throw new Error(`scheme.parts.ts: ${SCHEME.parts} parts built, PARTS promises ${PARTS_TOTAL}`);

/** The concepts rise: object-audit rebuilds the stand at 8 heights of the concept plates. */
export const stateSweep = {relief: (s: number) => buildScheme({relief: RELIEF_LO + (RELIEF_HI - RELIEF_LO) * s})};

// ── moving parts (rebuilt every frame, drawn as `extra`; each is a Dyn with its shape for the depth order)
const prismDyn = (name: string, F: Frame, poly: number[][], d: number, at: Point3, o: {tone?: K.Tone; lit?: boolean; opacity?: number} = {}): Dyn => {
  const paths = G.prismOf(F, poly, 0, d, P);
  if (o.lit) asTopFace(paths); // the face looks at the viewer: draw it in the top band so the coral reads as coral
  return dynSolid(name, at, K.solidSvg(paths, {tone: o.tone ?? 'hi', lit: o.lit}), A.prism(F, poly, 0, d, {name}), o.opacity);
};
/** A tile whose bottom-left corner is at panel-local (x, y) of panel k and whose back is at n0; `lit` makes it THE coral part.
 *  It stands ON its rail (no lift): src/lib/depth.ts orders a thin turned part against what it touches (R5). */
export const tileDyn = (k: number, name: string, x: number, y: number, chars: number, o: {n0?: number; lit?: boolean; tone?: K.Tone; opacity?: number} = {}): Dyn => {
  const n0 = o.n0 ?? TILE_N0;
  const w = tileWidth(chars);
  const d = TILE_N1 - TILE_N0;
  return prismDyn(name, faceFrame(k, x, y, n0), flip(chamfer(w, TILE_H)), d, schemePoint(k, x + w / 2, y + TILE_H / 2, n0 + d / 2), o);
};
/** Tile i of line `line` (1 or 2) of panel k at its place on the rail. */
export const lineTileDyn = (k: number, line: 1 | 2, i: number, o: {lit?: boolean; opacity?: number; lift?: number} = {}): Dyn => {
  const tiles = line === 1 ? LINE1 : LINE2[k];
  const xs = rowXs(tiles);
  return tileDyn(k, `t${line}.${i}.p${k}`, xs[i], line === 1 ? ROW1_Y : ROW2_Y, [...tiles[i].text].length, {lit: o.lit, opacity: o.opacity, n0: TILE_N0 + (o.lift ?? 0)});
};
/** A concept plate at `relief` (height above the panel) with the tone of «lit» (hi) or «dimmed» (lo). */
export const conceptDyn = (id: ConceptId, o: {relief?: number; tone?: K.Tone; opacity?: number} = {}): Dyn => {
  const k = conceptPanel(id);
  const w = conceptWidth(id);
  const r = Math.max(0.05, o.relief ?? RELIEF_HI);
  return prismDyn(`concept.${id}.dyn`, faceFrame(k, conceptX(id), CONCEPT_Y, 1.2), flip(chamfer(w, CONCEPT_H, 0.9)), r, schemePoint(k, conceptX(id) + w / 2, CONCEPT_Y + CONCEPT_H / 2, 1.2 + r / 2), {tone: o.tone ?? 'hi', opacity: o.opacity});
};
/** The cursor of line 2 of panel k: a thin bar at panel-local x (the end of what is written, or the socket at the start). */
export const cursorDyn = (k: number, x: number, o: {opacity?: number} = {}): Dyn => {
  const F = faceFrame(k, x, ROW2_Y, TILE_N0 + 0.1);
  return prismDyn(`cursor.p${k}`, F, flip(box(0.5, TILE_H)), 1.2, schemePoint(k, x + 0.25, ROW2_Y + TILE_H / 2, TILE_N0 + 0.7), {tone: 'mid', opacity: o.opacity});
};
/** The roll-up blind of panel k (1 or 2) at `open` 0 (closed, as the static part) … 1 (rolled up into the roller). */
export const blindDyn = (k: number, open: number, o: {opacity?: number} = {}): Dyn[] => {
  const full = BLIND_TOP - BLIND_BOTTOM;
  const h = Math.max(0, full * (1 - open));
  if (h < 0.05) return [];
  const w = PANEL_W - 2 * FR;
  const d = prismDyn(`blind${k}.dyn`, faceFrame(k, FR, BLIND_TOP - h, 3.4), flip(box(w, h)), BLIND_N - 3.4, schemePoint(k, FR + w / 2, BLIND_TOP - h / 2, 3.7), {tone: 'hi', opacity: o.opacity});
  return [{...d, svg: d.svg + slatLines(k, BLIND_TOP, BLIND_TOP - h)}];
};

/** The clamp of panel k (1 or 2) arriving round its concept: share 0 = out to the left and `CLAMP_LIFT` off the face, 1 = seated.
 *  The corner pieces and the tab travel together (five Dyn); a clamp cannot slide in the plane of the concept it encloses. */
export const CLAMP_LIFT = 2.6;
export const clampDyn = (k: number, share: number, o: {opacity?: number} = {}): Dyn[] => {
  const id: ConceptId = k === 1 ? 'rabbit2' : 'green3';
  const w = conceptWidth(id);
  const x0 = conceptX(id);
  const dx = -CLAMP_PARK * (1 - share);
  const lift = CLAMP_LIFT * (1 - share);
  const [xa, xb, ya, yb] = [x0 - CLAMP_M, x0 + w + CLAMP_M, CONCEPT_Y - CLAMP_M, CONCEPT_Y + CONCEPT_H + CLAMP_M];
  const part = (name: string, x: number, y: number, bw: number, bh: number, poly: number[][]) => prismDyn(`clamp${k + 1}.${name}`, faceFrame(k, x + dx, y, 1.2 + lift), flip(poly), 1.2, schemePoint(k, x + dx + bw / 2, y + bh / 2, 1.8 + lift), {tone: 'mid', opacity: o.opacity});
  return [
    ...([['bl', xa, ya, 1, 1], ['br', xb, ya, -1, 1], ['tl', xa, yb, 1, -1], ['tr', xb, yb, -1, -1]] as const).map(([n, cx, cy, sx, sy]) =>
      part(n, Math.min(cx, cx + sx * CLAMP_L), Math.min(cy, cy + sy * CLAMP_L), CLAMP_L, CLAMP_L, corner(CLAMP_L).map(([x, y]) => [sx > 0 ? x : CLAMP_L - x, sy > 0 ? y : CLAMP_L - y])),
    ),
    part('tab', x0 + w / 2 - 1.8, CONCEPT_Y - TABD, 3.6, 1, box(3.6, 1)),
  ];
};

// ── anchors and corners for plates and camFit
/** World point at the middle of the front face of tile i of line `line` of panel k. */
export const tileAnchor = (k: number, line: 1 | 2, i: number): Point3 => {
  const tiles = line === 1 ? LINE1 : LINE2[k];
  const xs = rowXs(tiles);
  return schemePoint(k, xs[i] + tileWidth([...tiles[i].text].length) / 2, (line === 1 ? ROW1_Y : ROW2_Y) + TILE_H / 2, TILE_N1);
};
/** World point at the middle of the front face of a concept plate (at relief `r`). */
export const conceptAnchor = (id: ConceptId, r = RELIEF_HI): Point3 => schemePoint(conceptPanel(id), conceptX(id) + conceptWidth(id) / 2, CONCEPT_Y + CONCEPT_H / 2, 1.2 + r);
/** World point of the middle of a tab's front face. */
export const tabAnchor = (name: 'title0' | 'title1' | 'title2' | 'legend' | ConceptId | 'clamp2' | 'clamp3'): Point3 => {
  if (name === 'legend') return schemePoint(0, 53.5, TAB_Y + 0.7, 1.8);
  if (name.startsWith('title')) return schemePoint(Number(name.slice(5)), 6.1, TAB_Y + 0.7, 1.8);
  if (name === 'clamp2' || name === 'clamp3') {
    const id = name === 'clamp2' ? 'rabbit2' : 'green3';
    return schemePoint(Number(name.slice(5)) - 1, conceptX(id) + conceptWidth(id) / 2, CONCEPT_Y - TABD + 0.5, 1.8);
  }
  const id = name as ConceptId;
  return schemePoint(conceptPanel(id), conceptX(id) + conceptWidth(id) / 2, CONCEPT_Y - TABD + 0.5, 1.8);
};
const cornersOf = (k0: number, k1: number, x0: number, x1: number): Point3[] =>
  [x0, x1].flatMap((x) => [schemePoint(k0, x, 0, 0), schemePoint(k0, x, 0, FRAME_N1), schemePoint(k1, x, PANEL_H, 0), schemePoint(k1, x, PANEL_H, FRAME_N1)]);
/** Corners of panel k with its tab row. */
export const panelCorners = (k: number): Point3[] => cornersOf(k, k, -2, PANEL_W + 2);
/** Corners of panels k0..k1. */
export const panelsCorners = (k0: number, k1: number): Point3[] => cornersOf(k1, k0, -2, PANEL_W + 2);
/** The whole stand: the three panels, both posts and the plinth. */
export const STAND_CORNERS: Point3[] = [...cornersOf(2, 0, POST_X[0] - 1, POST_X[1] + 1), schemePoint(0, POST_X[0], PANEL_H + 1.5, 0.6), schemePoint(0, POST_X[1], PANEL_H + 1.5, 0.6), schemePoint(2, POST_X[0] - 3, -Y0, -3), schemePoint(2, POST_X[1] + 3, -Y0, -3)];
