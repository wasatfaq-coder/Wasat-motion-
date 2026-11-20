import {Assembly, Frame, G, Point3} from '../../lib/assembly';
import {anatomyProjection} from '../../lib/anatomy';
import {roundRect} from '../../lib/device';
import {PHONE} from './phone.parts';
import KEYS from './desk.parts.keys.json';

// Environment of «Как работает Claude» (parts-plan.md §1.4): DESK (scenes 1–4, 9: the table the phone and the token board
// stand on, with a wall behind) and ROOM (scenes 5–8: the floor, back wall and podium the scheme stand stands on).
// Both are role 'environment'; the hero files hold the heroes, so the share rule (≤ 40 % of the hero) is met by the plan
// (35 of 94, 18 of 140). Same kit units as the phone and the board (anatomyProjection(6): 1 unit = 5 mm).
// Scene axes (the board's, board.parts.ts): rx = right along the screen, fh = towards the viewer (horizontal), z = up,
// turned by AZ = 46° like the board (45° + YAW 1°: with a face exactly square to the view the kit's hull drops corners).
// The desk's top is z = 0; the phone's plate stands on it at the world origin. No logos, no brand, nothing that reads as
// data: a mug, a notebook with a pen, a wall outlet. The phone's charging cable ends in a plug on the desk (below).
export const DESK_U = 6;
export const DESK_P = anatomyProjection(DESK_U);
const P = DESK_P;

const AZ = (46 * Math.PI) / 180;
const RH: Point3 = [Math.cos(AZ), -Math.sin(AZ), 0];
const FH: Point3 = [Math.sin(AZ), Math.cos(AZ), 0];
/** Scene point (rx, fh, z) → kit world point. */
export const scene = (rx: number, fh: number, z: number): Point3 => [rx * RH[0] + fh * FH[0], rx * RH[1] + fh * FH[1], z];
/** Frame on the desk's top: u = rx, v = fh, a = up (u × v = a). */
const flat = (z = 0): Frame => ({o: [0, 0, z], a: [0, 0, 1], u: RH, v: FH});
/** Frame of a face turned to the viewer (a wall): u = rx, v = up, a = away from the viewer; s on a = depth behind fh = 0. */
const wallF: Frame = {o: [0, 0, 0], a: [-FH[0], -FH[1], 0], u: RH, v: [0, 0, 1]};
const DF = flat();
const rect = (x0: number, y0: number, x1: number, y1: number, r = 0.3) => roundRect(x0, y0, x1, y1, r);

// ═════════════════════════════════════ DESK ═════════════════════════════════════
export const DESK_PARTS = [
  {group: 'стол', parts: ['3 доски столешницы', '2 вставки швов', 'кромка', 'коврик и 2 полосы прострочки'], count: 9},
  {group: 'стена', parts: ['панель стены', 'плинтус', 'розетка: рамка, лицевая, винт, 2 гнезда', 'вилка в розетке', 'шнур'], count: 10},
  {group: 'зарядка', parts: ['корпус вилки кабеля', 'металл вилки', 'зарядный блок'], count: 3},
  {group: 'кружка', parts: ['корпус', 'ободок', 'ручка', 'подставка'], count: 4},
  {group: 'блокнот и ручка', parts: ['обложка', 'блок страниц', '4 кольца спирали', 'резинка', 'корпус ручки', 'колпачок', 'клип', 'наконечник'], count: 11},
] as const;
export const DESK_PARTS_TOTAL = DESK_PARTS.reduce((s, g) => s + g.count, 0); // 37

export const DESK = new Assembly('desk', P, {role: 'environment', detail: 'simple'});
const D = DESK;

// ── table: three boards (along rx) with inlaid seams, a front edge; the top is z = 0
export const TOP = {x0: -56, x1: 124, y0: -30, y1: 60, t: 4};
const boardD = (TOP.y1 - TOP.y0) / 3;
for (let k = 0; k < 3; k++)
  D.prism(`top.board${k}`, DF, rect(TOP.x0, TOP.y0 + k * boardD + 0.3, TOP.x1, TOP.y0 + (k + 1) * boardD - 0.3, 0.4), -TOP.t, 0, {tone: 'lo', bevel: 0.4, ground: true});
for (const k of [1, 2]) D.prism(`top.seam${k}`, DF, rect(TOP.x0 + 0.4, TOP.y0 + k * boardD - 0.3, TOP.x1 - 0.4, TOP.y0 + k * boardD + 0.3, 0), -TOP.t + 0.4, -0.5, {tone: 'faint', bevel: 0, meta: {touch: [`top.board${k - 1}`, `top.board${k}`]}});
D.prism('top.edge', DF, rect(TOP.x0, TOP.y1, TOP.x1, TOP.y1 + 1.4, 0.4), -TOP.t - 0.8, 0, {tone: 'mid', bevel: 0.4, meta: {touch: ['top.board2']}});

// ── the wall behind the desk: a panel (its face at fh = −30, the desk's back edge) and a skirting strip on the desk
const WALL = {x0: -62, x1: 130, z0: -10, z1: 74, s0: -TOP.y0, s1: -TOP.y0 + 6};
D.prism('wall.panel', wallF, rect(WALL.x0, WALL.z0, WALL.x1, WALL.z1, 0.4), WALL.s0, WALL.s1, {tone: 'lo', bevel: 0.4, ground: true});
D.prism('wall.skirt', DF, rect(TOP.x0, TOP.y0, TOP.x1, TOP.y0 + 3.4, 0.3), 0, 3.4, {tone: 'mid', bevel: 0.3, meta: {touch: ['wall.panel', 'top.board0']}});

// ── a felt mat under the mug and the notebook, with two stitched lines along its long sides
const MAT = {x0: -54, x1: -15, y0: -24, y1: 44, h: 0.5};
D.prism('mat', DF, rect(MAT.x0, MAT.y0, MAT.x1, MAT.y1, 2.5), 0, MAT.h, {tone: 'mid', bevel: 0.25, meta: {touch: ['top.board0', 'top.board1']}});
for (const [k, x] of [MAT.x0 + 2.4, MAT.x1 - 2.4].entries()) D.prism(`mat.stitch${k}`, DF, rect(x - 0.2, MAT.y0 + 2.4, x + 0.2, MAT.y1 - 2.4, 0), MAT.h, MAT.h + 0.15, {tone: 'lo', bevel: 0, meta: {owner: 'mat'}});

// ── the wall outlet and the charging chain that ends the phone's cable (phone.parts.ts leaves it free on the desk):
//    cable → plug housing → plug metal → charger block → cord along the desk → plug in the outlet
const cable = (PHONE.R.routes as {name: string; points: Point3[]}[]).find((r) => r.name === 'phone.cable');
if (!cable) throw new Error('desk.parts: phone.cable not found; the charger chain needs the cable end');
const endP = cable.points[cable.points.length - 1];
const dirP = G.unit3(G.sub3(endP, cable.points[cable.points.length - 2]));
const ux = Math.hypot(dirP[0], dirP[1]);
/** Frame at the cable's end on the desk: u along the cable, v across, a up. */
const CF: Frame = {o: [endP[0], endP[1], 0], a: [0, 0, 1], u: [dirP[0] / ux, dirP[1] / ux, 0], v: [-dirP[1] / ux, dirP[0] / ux, 0]};
const at = (x: number, y: number, z: number): Point3 => G.add3(G.add3(G.add3(CF.o, G.mul3(CF.u, x)), G.mul3(CF.v, y)), [0, 0, z]) as Point3;
const sceneOf = (p: Point3): [number, number, number] => [p[0] * RH[0] + p[1] * RH[1], p[0] * FH[0] + p[1] * FH[1], p[2]];

D.prism('plug.housing', CF, rect(0, -0.85, 2.6, 0.85, 0.25), 0, 0.85, {tone: 'lo', bevel: 0.2, meta: {touch: ['top.board1']}});
D.prism('plug.metal', CF, rect(2.6, -0.62, 4.6, 0.62, 0.1), 0.12, 0.72, {tone: 'faint', bevel: 0.1, meta: {owner: 'plug.housing'}});
const BLK = {x0: 4.6, x1: 11.6, y: 2.7, h: 2.6};
D.prism('charger', CF, rect(BLK.x0, -BLK.y, BLK.x1, BLK.y, 0.7), 0, BLK.h, {tone: 'mid', bevel: 0.5, meta: {touch: ['top.board1', 'plug.metal']}});

const OUT = {rx: 32, z: 12};
const [orx] = [OUT.rx];
// outlet on the wall: frame, raised face plate, a screw between the two sockets (the sockets are dark discs)
D.prism('outlet.frame', wallF, rect(orx - 5.6, OUT.z - 3.6, orx + 5.6, OUT.z + 3.6, 0.6), WALL.s0 - 0.6, WALL.s0, {tone: 'mid', bevel: 0.3, meta: {touch: ['wall.panel']}});
D.prism('outlet.face', wallF, rect(orx - 4.8, OUT.z - 2.8, orx + 4.8, OUT.z + 2.8, 0.5), WALL.s0 - 1.1, WALL.s0 - 0.6, {tone: 'faint', bevel: 0.2, meta: {touch: ['outlet.frame']}});
D.disc('outlet.screw', WALL.s0 - 1.3, WALL.s0 - 1.1, 0.5, {...wallF, o: scene(orx, -WALL.s0, OUT.z)}, {tone: 'lo', meta: {owner: 'outlet.face'}});
const SOCK = [orx - 2.6, orx + 2.6];
D.disc('outlet.socket', WALL.s0 - 1.3, WALL.s0 - 1.1, 1.05, {...wallF, o: scene(SOCK[0], -WALL.s0, OUT.z)}, {tone: 'lo', meta: {owner: 'outlet.face'}});
// the plug sits in the right socket, flush against the face plate (s runs along the wall's normal, away from the viewer)
const PLUG = {rx: SOCK[1], s0: WALL.s0 - 1.1 - 4.2, s1: WALL.s0 - 1.1};
D.prism('outlet.plug', wallF, rect(PLUG.rx - 1.9, OUT.z - 1.6, PLUG.rx + 1.9, OUT.z + 1.6, 0.8), PLUG.s0, PLUG.s1, {tone: 'mid', bevel: 0.35, meta: {touch: ['outlet.face']}});
// the cord: out of the charger's side (towards the wall), along the desk, up to the plug's rear face
const CORD_R = 0.34;
const exit = at((BLK.x0 + BLK.x1) / 2, -BLK.y, BLK.h / 2);
const [erx, efh] = sceneOf(exit);
const plugBack: Point3 = scene(PLUG.rx, -PLUG.s0, OUT.z);
D.pipe('cord', [exit, scene(erx + 0.5, efh - 3, CORD_R), scene(erx + 6, -12, CORD_R), scene(PLUG.rx - 6, -17, 5), scene(PLUG.rx - 1, -PLUG.s0 + 4, OUT.z - 0.6), plugBack], CORD_R, {bend: 1.2, limp: true, maxLength: 4, meta: {touch: ['charger', 'outlet.plug', 'top.board1', 'top.board0']}});

// ── a mug on a cork coaster on the mat (coffee, not data): body, rim, handle, coaster
const MUG = {rx: -35, fh: -10, r: 6.8, h: 16};
const mugAxis = (z: number) => G.frameAlong(scene(MUG.rx, MUG.fh, z), [0, 0, 1]);
D.disc('mug.coaster', MAT.h, MAT.h + 0.7, 8.4, {...mugAxis(0), o: scene(MUG.rx, MUG.fh, 0)}, {tone: 'lo', meta: {touch: ['mat']}});
const MZ = MAT.h + 0.7;
D.turned('mug.body', [[0, MUG.r - 1], [0.8, MUG.r, 1], [MUG.h, MUG.r]], mugAxis(MZ), {tone: 'mid', meta: {touch: ['mug.coaster']}});
D.ring('mug.rim', MUG.h - 0.2, MUG.h + 0.6, MUG.r - 1.5, MUG.r + 0.3, mugAxis(MZ), {tone: 'lo', meta: {touch: ['mug.body']}});
const hx = MUG.rx + MUG.r;
const hz = (z: number) => scene(hx, MUG.fh, MZ + z);
D.pipe('mug.handle', [hz(3.2), scene(hx + 4.6, MUG.fh, MZ + 3.2), scene(hx + 4.6, MUG.fh, MZ + 11.4), hz(11.4)], 0.85, {bend: 2.4, meta: {touch: ['mug.body']}, ends: [true, true]});

// ── a notebook on the mat: cover, page block, four spiral rings along its back edge, an elastic band; a pen on top
const NB = {x0: -50, x1: -21, y0: 8, y1: 40, c: 1.3, p: 1.5};
D.prism('notebook.cover', DF, rect(NB.x0, NB.y0, NB.x1, NB.y1, 1.2), MAT.h, MAT.h + NB.c, {tone: 'mid', bevel: 0.35, meta: {touch: ['mat']}});
D.prism('notebook.pages', DF, rect(NB.x0 + 0.8, NB.y0 + 0.8, NB.x1 - 0.8, NB.y1 - 0.8, 0.6), MAT.h + NB.c, MAT.h + NB.c + NB.p, {tone: 'faint', bevel: 0.25, meta: {touch: ['notebook.cover']}});
const NZ = MAT.h + NB.c + NB.p;
for (let k = 0; k < 4; k++) {
  const x = NB.x0 + 4.5 + k * ((NB.x1 - NB.x0 - 9) / 3);
  D.ring(`notebook.ring${k}`, -0.45, 0.45, 0.85, 1.55, G.frameAlong(scene(x, NB.y0 + 0.2, MAT.h + NB.c + NB.p / 2 + 0.3), RH), {tone: 'lo', meta: {touch: ['notebook.pages', 'notebook.cover']}});
}
D.prism('notebook.band', DF, rect(NB.x1 - 6.5, NB.y0 + 0.4, NB.x1 - 5.1, NB.y1 + 0.4, 0.1), MAT.h, NZ + 0.25, {tone: 'lo', bevel: 0.1, meta: {touch: ['notebook.pages']}});
// the pen lies across the page block, turned 20° off the rx axis: body, cap, clip, tip
const penDir = G.unit3(scene(Math.cos(0.35), Math.sin(0.35), 0));
const penAt = (s: number): Point3 => G.add3(scene(-44, 26, NZ + 0.55), G.mul3(penDir, s)) as Point3;
const penF = (s: number) => G.frameAlong(penAt(s), penDir);
D.turned('pen.body', [[0, 0.55], [14, 0.55], [15.4, 0.3, 1]], penF(0), {tone: 'mid', meta: {touch: ['notebook.pages']}});
D.turned('pen.cap', [[-9, 0.65], [0, 0.65]], penF(0), {tone: 'lo', meta: {touch: ['pen.body']}});
D.turned('pen.tip', [[15.4, 0.3], [16.4, 0.08]], penF(0), {tone: 'lo', meta: {owner: 'pen.body'}});
D.prism('pen.clip', {o: penAt(-8.6), a: [0, 0, 1], u: penDir, v: [-penDir[1], penDir[0], 0]}, rect(0, -0.12, 5.2, 0.12, 0), 0.45, 1.05, {tone: 'lo', bevel: 0, meta: {owner: 'pen.cap'}});

DESK.applyKeys((KEYS as Record<string, Record<string, number>>).DESK);

/** Box corners of the desk top for camFit (the top and the wall panel's face). */
export const DESK_CORNERS: Point3[] = [scene(TOP.x0, TOP.y0, 0), scene(TOP.x1, TOP.y0, 0), scene(TOP.x0, TOP.y1, 0), scene(TOP.x1, TOP.y1, 0), scene(TOP.x0, TOP.y0, WALL.z1), scene(TOP.x1, TOP.y0, WALL.z1)];

// ═════════════════════════════════════ ROOM ═════════════════════════════════════
// The room of scenes 5–8: a plank floor, a back wall with a skirting board, the podium the scheme stand stands on (four
// bolts), and a floor box that the stand's backlight cable runs to. Its own origin: the podium's centre is (0, 0).
export const ROOM_PARTS = [
  {group: 'пол и стена', parts: ['пол', '6 швов пола', 'задняя стена', 'плинтус'], count: 9},
  {group: 'подиум', parts: ['подиум', '4 болта'], count: 5},
  {group: 'подсветка', parts: ['кабель от цоколя', 'напольная коробка', '2 винта коробки'], count: 4},
] as const;
export const ROOM_PARTS_TOTAL = ROOM_PARTS.reduce((s, g) => s + g.count, 0); // 18

export const ROOM = new Assembly('room', P, {role: 'environment', detail: 'simple'});
const R = ROOM;
export const FLOOR = {x0: -96, x1: 96, y0: -44, y1: 64, t: 4};
export const PODIUM = {x0: -38, x1: 38, y0: -16, y1: 16, h: 4};
R.prism('floor', DF, rect(FLOOR.x0, FLOOR.y0, FLOOR.x1, FLOOR.y1, 0.5), -FLOOR.t, 0, {tone: 'lo', bevel: 0.5, ground: true});
const plankD = (FLOOR.y1 - FLOOR.y0) / 7;
for (let k = 1; k <= 6; k++) R.prism(`floor.seam${k}`, DF, rect(FLOOR.x0 + 0.5, FLOOR.y0 + k * plankD - 0.25, FLOOR.x1 - 0.5, FLOOR.y0 + k * plankD + 0.25, 0), -0.12, 0.1, {tone: 'faint', bevel: 0, meta: {owner: 'floor'}});
const RW = {z1: 100, s0: -FLOOR.y0, s1: -FLOOR.y0 + 6};
R.prism('wall', wallF, rect(FLOOR.x0, -FLOOR.t, FLOOR.x1, RW.z1, 0.5), RW.s0, RW.s1, {tone: 'lo', bevel: 0.5, meta: {touch: ['floor']}});
R.prism('skirt', DF, rect(FLOOR.x0, FLOOR.y0, FLOOR.x1, FLOOR.y0 + 2.4, 0.3), 0, 5.2, {tone: 'mid', bevel: 0.3, meta: {touch: ['floor', 'wall']}});
R.prism('podium', DF, rect(PODIUM.x0, PODIUM.y0, PODIUM.x1, PODIUM.y1, 1.2), 0, PODIUM.h, {tone: 'mid', bevel: 0.6, shadow: 'hero', meta: {touch: ['floor']}});
for (const [k, [x, y]] of ([
  [PODIUM.x0 + 4, PODIUM.y0 + 4],
  [PODIUM.x1 - 4, PODIUM.y0 + 4],
  [PODIUM.x0 + 4, PODIUM.y1 - 4],
  [PODIUM.x1 - 4, PODIUM.y1 - 4],
] as const).entries()) R.disc(`podium.bolt${k}`, PODIUM.h, PODIUM.h + 0.7, 1.1, {...DF, o: scene(x, y, 0)}, {tone: 'lo', meta: {owner: 'podium'}});
const BOX = {x0: 54, x1: 66, y0: -10, y1: -2, h: 3};
R.prism('box', DF, rect(BOX.x0, BOX.y0, BOX.x1, BOX.y1, 0.8), 0, BOX.h, {tone: 'mid', bevel: 0.4, meta: {touch: ['floor']}});
for (const [k, x] of [BOX.x0 + 2.2, BOX.x1 - 2.2].entries()) R.disc(`box.screw${k}`, BOX.h, BOX.h + 0.3, 0.6, {...DF, o: scene(x, (BOX.y0 + BOX.y1) / 2, 0)}, {tone: 'lo', meta: {owner: 'box'}});
const CR = 0.4;
R.pipe('light.cable', [scene(PODIUM.x1, -6, 2), scene(PODIUM.x1 + 4, -6, 2), scene(PODIUM.x1 + 4, -6, CR), scene(BOX.x0, -6, CR)], CR, {bend: 1.6, limp: true, meta: {touch: ['podium', 'floor', 'box']}});

ROOM.applyKeys((KEYS as Record<string, Record<string, number>>).ROOM);
