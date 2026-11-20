import {Assembly, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import {ChatChip, chatUi, faceDyn, facePoint, leanFrame, phoneStand, roundRect, screenCorners, standingPhone} from '../../lib/device';
import KEYS from './phone.parts.keys.json';

// Hero of «Как работает Claude» (scenes 1 and 9, the cover): a phone leaning on a desk stand, its screen turned to the
// viewer, a messenger on it (parts-plan.md §1.1, 94 parts). Shared builders from src/lib/device.ts: phoneStand (26),
// standingPhone (35), chatUi (21 + 8 chips); this file adds the charging cable (4). No logos, no brand interface.
// Kit units, 6 per room unit (anatomyProjection(6), one scale for the whole topic). The table top is z = 0; the phone's
// foot is at (0, 0, 8); its face turns to azimuth 55° (10° off the line of sight, so its right side shows) and leans
// 54.74° from the table, square to the line of sight: frontal text pinned to the screen reads without skew (§0 p. 3).
// Coral (one per frame) = the piece the answer currently ends with: a chip drawn by `chipItem(i, {lit: true})`.

/** PARTS (§22.2, before geometry): what the object is made of, as planned in parts-plan.md §1.1. */
export const PARTS = [
  {group: 'основание подставки', parts: ['плита', 'резиновый коврик', '4 ножки', '2 заглушки винтов'], count: 8},
  {group: 'конструкция подставки', parts: ['2 колодки шарнира (канал для кабеля между ними)', 'цилиндр шарнира', '2 торцевые крышки', '2 головки оси', 'наклонная спинка', '2 ребра', '2 накладки спинки', '2 половины упора', '2 накладки упора', '2 боковых ограничителя'], count: 18},
  {group: 'кабель', parts: ['кабель зарядки', 'корпус вилки', 'разгрузочная втулка', 'клипса на плите'], count: 4},
  {group: 'корпус телефона', parts: ['задняя крышка', 'обод', 'бампер-ступенька', 'стекло', 'экран', 'прорезь динамика', 'камера, датчики приближения и света', 'кнопка питания', '2 кнопки громкости', 'переключатель', 'лоток SIM и отверстие', '4 разрыва антенны', 'порт', '6 отверстий динамика', '6 отверстий микрофона', '2 винта', 'полоска «домой»'], count: 35},
  {group: 'интерфейс', parts: ['строка состояния (7)', 'шапка (7)', 'разделитель', 'пузырь вопроса и хвостик', '8 чипов-кусочков ответа', 'поле ввода, подсказка, кнопка, стрелка'], count: 29},
] as const;
export const PARTS_TOTAL = PARTS.reduce((s, g) => s + g.count, 0); // 94: parts-plan §1.1 (its rows gave 93; the hinge block is split for the cable channel)

export const PHONE_U = 6;
export const PHONE_P = anatomyProjection(PHONE_U);
const P = PHONE_P;

/** The answer split into eight pieces, one per chip: neutral Russian (decisions.md 19.11.2026), an EXAMPLE split, not a
 *  real tokenizer's, until the script fixes the text. A chip is as wide as its piece: 0.86 kit units per character
 *  (bold Rubik at 1.45 × the screen's px per unit, PhoneFrames.tsx) plus 0.7 of padding. */
export const PIECES = ['Сол', 'неч', 'ный', 'свет', 'рас', 'сеи', 'ва', 'ется'];
export const QUESTION = ['Почему небо', 'голубое?'];
export const CHAR_W = 0.86;
export const CHIP_W = PIECES.map((p) => p.length * CHAR_W + 0.7);

export const PHONE = new Assembly('phone', P, {role: 'hero', detail: 'complex'});
const A = PHONE;
const F = leanFrame([0, 0, 8]);
const stand = phoneStand(A, F);
const ph = standingPhone(A, F, {lit: undefined});
export const SCREEN = ph.screen;
export const CHIPS: ChatChip[] = chatUi(A, SCREEN, CHIP_W);

// ── the charging cable: plug in the port, strain relief, down past the hinge onto the mat, through a clip, off the
// plate's side to the table (it runs on to the wall charger of the desk environment)
const plugAxis = G.frameAlong(ph.port, G.mul3(F.v, -1));
A.turned('cable.plug', [[0, 0.5], [2.0, 0.55], [2.2, 0.45, 1]], plugAxis, {tone: 'lo', meta: {touch: ['phone.port']}});
A.turned('cable.relief', [[2.2, 0.38], [3.4, 0.34]], plugAxis, {tone: 'lo', meta: {owner: 'cable.plug'}});
const pp = (x: number, y: number, z: number): Point3 => G.add3(G.add3(G.mul3(stand.plan.u, x), G.mul3(stand.plan.v, y)), [stand.plan.o[0], stand.plan.o[1], z]) as Point3;
const CABLE_R = 0.34;
const CY = 4.4; // the cable's line across the mat
const cz = stand.matTop + CABLE_R;
const CLIP = {x0: 7.4, x1: 8.4};
A.prism('cable.clip', stand.plan, roundRect(CLIP.x0, CY - 0.8, CLIP.x1, CY + 0.8, 0.3), stand.matTop, stand.matTop + 1, {tone: 'mid', bevel: 0.2, meta: {owner: 'stand.mat'}});
const start = G.add3(ph.port, G.mul3(F.v, -3.4)) as Point3;
const route: Point3[] = [start, G.add3(ph.port, G.mul3(F.v, -6.0)) as Point3, pp(0, CY, cz), pp(10.6, CY, cz), pp(11.2, CY, CABLE_R), pp(17, CY, CABLE_R)];
// the gap hides the cable inside the clip: arc length of the clip's span along the filleted route
const BEND = 1;
const filleted = G.fillet(route, BEND, 7, {P, tube: CABLE_R}) as Point3[];
const along = (x: number) => {
  let s = 0;
  for (let i = 1; i < filleted.length; i++) {
    const [a, b] = [filleted[i - 1], filleted[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const xa = G.dot3(G.sub3(a, stand.plan.o), stand.plan.u) as number;
    const xb = G.dot3(G.sub3(b, stand.plan.o), stand.plan.u) as number;
    if ((xa - x) * (xb - x) <= 0 && Math.abs(a[2] - cz) < 0.01 && Math.abs(b[2] - cz) < 0.01) return s + (l * (x - xa)) / (xb - xa || 1);
    s += l;
  }
  return s;
};
A.pipe('cable', route, CABLE_R, {bend: BEND, limp: true, maxLength: 4, gaps: [[along(CLIP.x0), along(CLIP.x1)]], meta: {touch: ['stand.mat', 'stand.plate', 'cable.clip', 'cable.relief']}, ends: [true, false], free: 'runs on along the table to the wall charger of the desk environment (desk.parts.ts)'});

PHONE.applyKeys((KEYS as Record<string, Record<string, number>>).PHONE);

/** One chip of the answer as a moving part: `lift` out of the glass (settling), lit = the one coral piece. */
export const chipItem = (i: number, o: {lift?: number; lit?: boolean; opacity?: number} = {}) => faceDyn(P, SCREEN, `${CHIPS[i].name}.dyn`, CHIPS[i].poly, {h: 0.06, ...o});

/** Where a frontal word sits on chip i (its centre, just in front of the glass). */
export const chipAnchor = (i: number): Point3 => facePoint(SCREEN, CHIPS[i].x, CHIPS[i].y, 0.1);
export const SCREEN_CORNERS = screenCorners(SCREEN);

/** Box corners of the whole hero (stand, phone, cable up to the plate's edge) for camFit. */
export const PHONE_CORNERS: Point3[] = [pp(-10, -10, 0), pp(11.2, -10, 0), pp(-10, 6, 0), pp(11.2, 6, 0), G.add3(F.o, G.mul3(F.v, 29.7)) as Point3, G.add3(G.add3(F.o, G.mul3(F.v, 29.7)), G.mul3(F.a, 1.65)) as Point3];
