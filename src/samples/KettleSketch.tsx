import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Assembly, Point3} from '../lib/assembly';
import {anatomyProjection, AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, breathe, Cam, camFit, Rect, RoomSvg, screenOf} from '../lib/camera';
import {particles} from '../lib/nature';
import {Atmos, AtmosField} from '../components/Atmos';
import {Callouts, ChapterMark} from '../components/Atlas';
import {CaptionLine} from '../components/Captions';
import {FrontalLayer, ListPlate} from '../components/Frontal';
import {DeriveChain, HonestyTag, LoupeInset, TriSync} from '../components/Explain';

// SKETCH «Как работает чайник» (not a topic): the seven devices of explanation of the three references, in OUR words:
// a real location per chapter, an object cut open (the section), a number derived on screen, one quantity in three
// views, a loupe in the same isometric world, honesty tags, a light field and a dark field by meaning. Kit bodies only.
// Illustrative values; the physics is textbook (water 4.18 J/(g·K), 2 kW, no losses).

export const U = 10;
export const P = anatomyProjection(U);
const GRAPHICS: Rect = {x0: 70, x1: 900, y0: 600, y1: 1420};
export const Z0 = 36; // the counter top

const room = (p: Point3) => toRoom(p, U);
const px = (cam: Cam, p: Point3) => screenOf(cam, room(p));
const VIEW = Math.atan2(new Assembly('v', P).V[1], new Assembly('v', P).V[0]); // plan angle of the near side

// ── the kitchen: a floor, two walls with tile lines and a counter with doors (every chapter has its own place) ───────
export const kitchen = (A: Assembly) => {
  A.slab('floor', {x: 0, y: 0, w: 90, d: 60, r: 0}, -1, 1, {tone: 'mid', ground: true, bevel: 0, bias: -3000, texture: 'grain'});
  for (let i = 1; i < 6; i++) A.slab(`floor.board${i}`, {x: i * 15 - 0.12, y: 0.5, w: 0.24, d: 59, r: 0}, 0, 0.03, {tone: 'lo', bevel: 0, bias: -2999});
  A.slab('wall.back', {x: 0, y: -2, w: 90, d: 2, r: 0}, 0, 70, {tone: 'hi', bevel: 0.2, bias: -4000, texture: 'dots'});
  A.slab('wall.left', {x: -2, y: -2, w: 2, d: 62, r: 0}, 0, 70, {tone: 'hi', bevel: 0.2, bias: -4000, texture: 'dots'});
  for (let r = 0; r < 8; r++) A.slab(`tile${r}`, {x: 0.5, y: -0.05, w: 89, d: 0.05, r: 0}, Z0 + 2 + r * 4, 0.2, {tone: 'lo', bevel: 0, bias: -3900});
  A.slab('counter', {x: 2, y: 2, w: 82, d: 34, r: 0.6}, 0, Z0, {tone: 'mid', ground: true, bevel: 0.5, bias: -2000});
  A.slab('counter.top', {x: 1, y: 1, w: 84, d: 36, r: 0.6}, Z0, 2.4, {tone: 'hi', bevel: 0.5, bias: -1900, texture: 'grain'});
  for (let i = 0; i < 4; i++) A.slab(`door${i}`, {x: 4 + i * 20, y: 36, w: 18, d: 0.3, r: 0.3}, 4, Z0 - 8, {tone: 'lo', bevel: 0.15, bias: -1800, texture: 'weave'});
  for (let i = 0; i < 4; i++) A.cyl(`knob${i}`, 20 + i * 20, 36.4, 0.7, Z0 - 8, 0.4, {tone: 'mid', bevel: 0.1, bias: -1700});
};

const mug = (A: Assembly, x: number, y: number) => {
  A.cyl('mug', x, y, 4, Z0 + 2.4, 8, {tone: 'hi', bevel: 0.5, shadow: 'part', texture: 'dots'});
  A.cyl('mug.tea', x, y, 3.4, Z0 + 10, 0.5, {tone: 'lo', bevel: 0});
  A.pipe('mug.handle', [[x + 4, y, Z0 + 8], [x + 7, y, Z0 + 8], [x + 7, y, Z0 + 5], [x + 4, y, Z0 + 4]], 0.7, {bend: 1.5, tone: 'hi'});
};

// ── the kettle: a base, 12 wall sectors, water in two halves, a coil, a lid, a handle, a spout and the switch ───────
export const R = 13;
const WALL = 0.9;
const half = (c: [number, number], r: number, from: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= 18; i++) out.push([c[0] + r * Math.cos(from + (i / 18) * Math.PI), c[1] + r * Math.sin(from + (i / 18) * Math.PI)]);
  return out;
};
const nearness = (mid: number) => Math.abs(Math.atan2(Math.sin(mid - VIEW), Math.cos(mid - VIEW)));

/** the kettle at `c`; `section` cuts the near wall, the near half of the water and the lid away (the cut-open view). */
export const kettle = (A: Assembly, [cx, cy]: [number, number], z0: number, o: {heat?: boolean} = {}) => {
  const AH = VIEW + Math.PI * 0.72; // the handle side (away from the viewer, to the left)
  const at = (r: number, z: number, a = AH): Point3 => [cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + z];
  A.cyl('base', cx, cy, 15.5, z0, 2, {tone: 'mid', ground: true, bevel: 0.5, shadow: 'hero', texture: 'ridges'});
  A.cyl('base.ring', cx, cy, 14.4, z0 + 2, 1.2, {tone: 'lo', bevel: 0.3});
  A.cyl('floor', cx, cy, R - WALL, z0 + 3.2, 0.8, {tone: 'lo', bevel: 0.1});
  // the coil: two closed rings of a lit tube on the floor, fixed with four feet
  const ring = (r: number, n = 20): Point3[] => Array.from({length: n}, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2), z0 + 5.2]);
  A.pipe('coil.a', ring(8.5), 0.8, {closed: true, bend: 2.5, lit: o.heat ?? true, tone: 'hi'});
  A.pipe('coil.b', ring(5), 0.8, {closed: true, bend: 2, lit: o.heat ?? true, tone: 'hi'});
  for (let i = 0; i < 4; i++) A.cyl(`coil.foot${i}`, cx + 6.7 * Math.cos((i * Math.PI) / 2 + 0.4), cy + 6.7 * Math.sin((i * Math.PI) / 2 + 0.4), 0.9, z0 + 4, 1.1, {tone: 'lo', bevel: 0.1});
  // water: two halves (back, front) so the near one can leave in the section
  A.extruded('water.back', [...half([cx, cy], R - WALL - 0.1, VIEW + Math.PI / 2)], z0 + 4, 15, {tone: 'lo', texture: 'waves'});
  A.extruded('water.front', [...half([cx, cy], R - WALL - 0.1, VIEW - Math.PI / 2)], z0 + 4, 15, {tone: 'lo', texture: 'waves'});
  // wall: three tiers of 12 sectors (a body, a shoulder, a neck) so the silhouette reads as a kettle
  for (let i = 0; i < 12; i++) {
    const [a0, a1] = [(i * Math.PI) / 6, ((i + 1) * Math.PI) / 6];
    A.arc(`wall${i}`, [cx, cy], R - WALL, R, a0, a1, z0 + 3, 17, {tone: 'hi', texture: 'ridges'});
    A.arc(`shoulder${i}`, [cx, cy], R - 1 - WALL, R - 1, a0, a1, z0 + 20, 6, {tone: 'hi', texture: 'ridges'});
    A.arc(`neck${i}`, [cx, cy], R - 2.5 - WALL, R - 2.5, a0, a1, z0 + 26, 4, {tone: 'hi', texture: 'ridges'});
  }
  A.cyl('wall.band', cx, cy, R + 0.4, z0 + 3, 3, {tone: 'mid', bevel: 0.3, texture: 'dots'});
  A.cyl('lid', cx, cy, R - 2, z0 + 30, 1.6, {tone: 'hi', bevel: 0.6, texture: 'ridges'});
  A.cyl('lid.knob', cx, cy, 2.4, z0 + 31.6, 1.8, {tone: 'mid', bevel: 0.5});
  A.slab('spout', {x: cx - (R + 1.5) * Math.cos(AH) - 2.5, y: cy - (R + 1.5) * Math.sin(AH) - 3, w: 7, d: 8, r: 1.6}, z0 + 21, 8, {tone: 'hi', bevel: 0.5});
  A.pipe('handle', [at(R - 1, 6), at(R + 5, 7), at(R + 8, 16), at(R + 5, 26), at(R - 1, 27)], 1.3, {bend: 4, tone: 'mid'});
  A.slab('switch', {x: at(R + 4, 27)[0] - 1.6, y: at(R + 4, 27)[1] - 1.6, w: 3.2, d: 3.2, r: 0.8}, z0 + 27.6, 1.4, {tone: 'lo', bevel: 0.3});
  A.cyl('led', at(R + 7, 6)[0], at(R + 7, 6)[1], 0.7, z0 + 6.6, 0.4, {tone: 'hi', bevel: 0.1});
  return {at, AH};
};

export const hideNear = (full: string) => {
  const n = full.replace(/^k\.[a-z]+\./, ''); // part names carry the object's name: k.sec.wall3
  const m = /^(?:wall|shoulder|neck)(\d+)/.exec(n);
  if (m) return nearness(((Number(m[1]) + 0.5) * Math.PI) / 6) < 1.45;
  return n === 'water.front' || n.startsWith('lid');
};

// ── the thermostat in the loupe: a bimetal strip that bends, a contact it opens, a lever (the same world) ─────────────
export const thermostat = (bend: number) => {
  const T = new Assembly('therm', P, {role: 'mechanism'});
  const z = 0;
  T.slab('plate', {x: 0, y: 0, w: 30, d: 14, r: 1}, z, 2, {tone: 'mid', ground: true, bevel: 0.5, shadow: 'hero', texture: 'cells'});
  T.slab('post.a', {x: 2, y: 4, w: 3, d: 6, r: 0.5}, z + 2, 9, {tone: 'lo', bevel: 0.3, texture: 'ridges'});
  T.slab('post.b', {x: 22, y: 4, w: 3, d: 6, r: 0.5}, z + 2, 15, {tone: 'lo', bevel: 0.3});
  T.cyl('contact.a', 17.5, 7, 1.3, z + 2, 6.4, {tone: 'hi', bevel: 0.3});
  T.cyl('contact.b', 17.5, 7, 1.0, z + 12.4 + bend * 3, 1.2, {tone: 'hi', bevel: 0.2});
  // the strip: two layers (steel, brass) from the fixed post, bending up as it heats
  const strip = (dz: number): Point3[] => Array.from({length: 7}, (_, i) => [5 + (i / 6) * 13, 7, z + 8.4 + dz + bend * 6 * Math.pow(i / 6, 2)] as Point3);
  T.pipe('strip.steel', strip(0), 0.7, {bend: 3, tone: 'mid', limp: true, ends: [false, false], free: 'sketch'});
  T.pipe('strip.brass', strip(1.5), 0.7, {bend: 3, tone: 'hi', lit: bend > 0.4, limp: true, ends: [false, false], free: 'sketch'});
  T.slab('lever', {x: 22, y: 5, w: 6, d: 4, r: 0.6}, z + 17 + bend * 4, 1.4, {tone: 'hi', bevel: 0.3});
  for (let i = 0; i < 3; i++) T.cyl(`screw${i}`, 4 + i * 11, 12, 0.6, z + 2, 0.5, {tone: 'lo', bevel: 0});
  return T;
};

type Frame = {svg: string; cam: Cam; dark?: boolean; field?: [number, number]; caption: {words: string[]; key: number; spoken: number}; chapter?: [number, number, string]; draw: (cam: Cam) => React.ReactNode};

export const steam = (A: Assembly, c: [number, number], n: number) => particles(P, 'steam', {at: [c[0] - 6, c[1] + 2, Z0 + 36], spread: 1.6, rate: n}, 1.4);

export const KC: [number, number] = [34, 20];

// frame 0: the hook, the whole kettle in the kitchen, steam
const hook = (): Frame => {
  const A = new Assembly('k.hook', P, {role: 'hero'});
  kitchen(A);
  kettle(A, KC, Z0 + 2.4);
  mug(A, 62, 20);
  const svg = A.svg({}, {extra: steam(A, KC, 26)});
  return {svg, cam: breathe(camFit(boxCorners(room([10, 4, Z0]), room([60, 30, 42])), {rect: GRAPHICS, fill: 0.9}), 0.4), caption: {words: ['Почему', 'чайник', 'сам', 'отключается?'], key: 2, spoken: 3}, draw: () => null};
};

// frame 1: Табл. 01, the section: coil, water, the cut wall
const section = (): Frame => {
  const A = new Assembly('k.sec', P, {role: 'hero'});
  kitchen(A);
  const k = kettle(A, KC, Z0 + 2.4);
  const svg = A.svg({}, {hide: hideNear});
  const cam = breathe(camFit(boxCorners(room([14, 4, Z0]), room([44, 32, 36])), {rect: GRAPHICS, fill: 0.92, margin: {bottom: 60}}), 0.4);
  return {
    svg,
    cam,
    chapter: [1, 4, 'что внутри'],
    caption: {words: ['Спираль', 'греет', 'воду', 'снизу'], key: 1, spoken: 4},
    draw: (c) => (
      <Callouts
        items={[
          {n: 1, label: 'спираль', at: px(c, [KC[0] + 6, KC[1] - 6, Z0 + 8]), to: [130, 1300]},
          {n: 2, label: 'вода', at: px(c, [KC[0] - 2, KC[1] - 8, Z0 + 14]), to: [800, 700 + 70]},
          {n: 3, label: 'ручка и выключатель', at: px(c, k.at(R + 4, 29)), to: [700, 1330]},
        ]}
      />
    ),
  };
};

// frame 2: Табл. 02, one quantity in three views (the object, the counter and the graph from one clock)
const heating = (): Frame => {
  const A = new Assembly('k.heat', P, {role: 'hero'});
  kitchen(A);
  kettle(A, KC, Z0 + 2.4);
  const svg = A.svg({}, {hide: hideNear, extra: steam(A, KC, 16)});
  return {
    svg,
    cam: breathe(camFit(boxCorners(room([14, 4, Z0]), room([44, 32, 38])), {rect: GRAPHICS, fill: 0.92, margin: {bottom: 400}}), 0.6),
    chapter: [2, 4, 'как нагревается'],
    caption: {words: ['Литр', 'нагревается', 'за', 'три', 'минуты'], key: 3, spoken: 5},
    draw: () => (
      <FrontalLayer>
        <TriSync x={70} y={1060} w={560} t={0.62} total={167} curve={[[0, 20], [0.2, 36], [0.4, 52], [0.6, 68], [0.8, 84]]} unit="секунд" yUnit="°C" yMax={100} source="Расчёт: 1 л, 2 кВт, без потерь" />
      </FrontalLayer>
    ),
  };
};

// frame 3: Табл. 03, the number derived on screen (light, data)
const derive = (): Frame => {
  const A = new Assembly('k.der', P, {role: 'hero'});
  kitchen(A);
  kettle(A, KC, Z0 + 2.4);
  const svg = A.svg({}, {extra: steam(A, KC, 12)});
  return {
    svg,
    cam: breathe(camFit(boxCorners(room([14, 4, Z0]), room([44, 32, 38])), {rect: GRAPHICS, fill: 0.92, margin: {bottom: 470}}), 0.8),
    chapter: [3, 4, 'откуда число'],
    caption: {words: ['Время', 'считается', 'из', 'трёх', 'чисел'], key: 1, spoken: 5},
    draw: () => (
      <FrontalLayer>
        <DeriveChain
          x={70}
          y={1030}
          w={720}
          progress={1}
          steps={[
            {text: 'масса воды', value: '1 000 г'},
            {op: '×', text: 'тепла на градус', value: '4,18 Дж/г'},
            {op: '×', text: 'нагреть на', value: '80 К'},
            {op: '÷', text: 'мощность', value: '2 000 Вт'},
            {text: 'время', value: '≈ 167 с'},
          ]}
          source="Расчёт без потерь тепла"
        />
        <HonestyTag x={70} y={1436} kind="simplified" note="без потерь" />
      </FrontalLayer>
    ),
  };
};

// frame 4: Табл. 04, the dark field: the answer, the thermostat in a loupe
const answer = (): Frame => {
  const A = new Assembly('k.ans', P, {role: 'hero'});
  kitchen(A);
  const k = kettle(A, KC, Z0 + 2.4);
  const svg = A.svg({}, {extra: steam(A, KC, 30)});
  const cam = breathe(camFit(boxCorners(room([12, 4, Z0]), room([48, 32, 42])), {rect: {...GRAPHICS, y0: 560, y1: 1050}, fill: 0.92}), 0.9);
  const loupeSvg = thermostat(1).svg();
  return {
    svg,
    cam,
    dark: true,
    chapter: [4, 4, 'главный ответ'],
    caption: {words: ['Пар', 'сам', 'выключает', 'чайник'], key: 0, spoken: 4},
    draw: (c) => (
      <FrontalLayer>
        <LoupeInset id="loupe-th" x={270} y={1190} r={180} at={px(c, k.at(R + 2, 6))} svg={loupeSvg} dark tag={<HonestyTag x={0} y={0} kind="scale" note="×6" dark />} />
        <ListPlate x={480} y={1090} w={420} title="Упрощённо. На деле:" rows={[["биметалл гнётся"], ["от пара, 100 °C"]]} foot="Принцип · без деталей" dark />
      </FrontalLayer>
    ),
  };
};

// frame 5: the finale, the same kettle, closed, calm
const finale = (): Frame => {
  const A = new Assembly('k.fin', P, {role: 'hero'});
  kitchen(A);
  kettle(A, KC, Z0 + 2.4);
  mug(A, 62, 20);
  const svg = A.svg({}, {extra: steam(A, KC, 6)});
  return {svg, cam: breathe(camFit(boxCorners(room([10, 4, Z0]), room([60, 30, 42])), {rect: GRAPHICS, fill: 0.9}), 0.9), caption: {words: ['Пар', 'выключил', 'чайник', 'сам'], key: 3, spoken: 4}, draw: () => null};
};

const FRAMES = [hook, section, heating, derive, answer, finale];
export const KETTLE_FRAMES = FRAMES.length;

export const KettleSketch: React.FC = () => {
  const f = FRAMES[Math.min(FRAMES.length - 1, useCurrentFrame())]();
  return (
    <AnatomyStage>
      <RoomSvg cam={f.cam} dark={f.dark} fade={70} sides={60} under={<AtmosField hero={[480, 960]} dark={f.dark} />}>
        <Kit svg={f.svg} />
      </RoomSvg>
      <Atmos dark={f.dark} />
      {f.draw(f.cam)}
      {f.chapter ? <ChapterMark n={f.chapter[0]} of={f.chapter[1]} title={f.chapter[2]} dark={f.dark} sound={false} from={-10} /> : null}
      <div style={{position: 'absolute', left: 64, right: 176, top: 262}}>
        <CaptionLine words={f.caption.words.map((text, i) => ({text, reveal: i < f.caption.spoken ? 1 : 0.2}))} keyIndex={f.caption.key} dark={f.dark} />
      </div>
    </AnatomyStage>
  );
};

