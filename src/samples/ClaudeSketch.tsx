import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Assembly, G, Point3} from '../lib/assembly';
import {anatomyProjection, AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, Cam, camFit, camFitSvg, Rect, RoomSvg, screenOf} from '../lib/camera';
import {faceMatrix, phone, ScreenRect} from '../lib/device';
import {COLORS} from '../theme/tokens';
import {fontFamily} from '../theme/font';

// SKETCH, not a topic: four stills of «Как работает Claude» drawn with the current kit to try the style decisions of
// docs/proposals (captions on top with a dark pill on the key word, atlas callouts, «Табл. NN / NN», one dark scene,
// tonal depth, vignette, paper grain). Illustrative values, facts unchecked. Marked ЭСКИЗ in every frame.

const U = 10;
const P = anatomyProjection(U);
const DESK_Z = 40;
const GRAPHICS: Rect = {x0: 70, x1: 900, y0: 520, y1: 1420};

// ── shared environment: a desk with plank seams, legs, a mug and a notebook ─────────────────────────────────────────
const desk = (A: Assembly, w = 130, d = 74) => {
  A.slab('desk.top', {x: 0, y: 0, w, d, r: 1}, DESK_Z - 3, 3, {tone: 'mid', ground: false, bevel: 0.6, shadow: 'hero', bias: -1000});
  for (let i = 1; i < 5; i++) A.slab(`desk.seam${i}`, {x: (w / 5) * i - 0.15, y: 0.6, w: 0.3, d: d - 1.2, r: 0}, DESK_Z, 0.04, {tone: 'lo', bevel: 0, bias: -999});
  A.slab('desk.apron', {x: 3, y: 3, w: w - 6, d: d - 6, r: 0.5}, DESK_Z - 9, 6, {tone: 'lo', bevel: 0.3, bias: -1500});
  for (const [i, [lx, ly]] of [
    [4, 4],
    [w - 8, 4],
    [4, d - 8],
    [w - 8, d - 8],
  ].entries())
    A.slab(`desk.leg${i}`, {x: lx, y: ly, w: 4, d: 4, r: 0.6}, 0, DESK_Z - 3, {tone: 'mid', ground: true, bevel: 0.4, bias: -2000});
};

const mug = (A: Assembly, [x, y]: [number, number]) => {
  A.cyl('mug', x, y, 4.2, DESK_Z, 9, {tone: 'hi', bevel: 0.5, shadow: 'part'});
  A.cyl('mug.coffee', x, y, 3.6, DESK_Z + 8.2, 0.6, {tone: 'lo', bevel: 0});
  A.ring('mug.handle', -0.5, 0.5, 2, 3.2, G.frameAlong([x + 5.6, y, DESK_Z + 4.6], [0, 1, 0]), {tone: 'hi'});
};

const notebook = (A: Assembly, [x, y]: [number, number]) => {
  A.slab('note.cover', {x, y, w: 20, d: 27, r: 1}, DESK_Z, 0.8, {tone: 'lo', bevel: 0.2});
  A.slab('note.pages', {x: x + 0.6, y: y + 0.4, w: 19, d: 26.2, r: 0.8}, DESK_Z + 0.8, 1.2, {tone: 'hi', bevel: 0.1});
  for (let i = 0; i < 6; i++) A.slab(`note.line${i}`, {x: x + 3, y: y + 5 + i * 3.4, w: 13 - (i % 3) * 3, d: 0.3, r: 0}, DESK_Z + 2, 0.03, {tone: 'lo', bevel: 0});
  A.pipe('note.pen', [[x + 23, y + 2, DESK_Z + 0.6], [x + 25, y + 22, DESK_Z + 0.6]], 0.6, {tone: 'hi'});
};

// ── token blocks: a block per token, width by the token's length ───────────────────────────────────────────────────
const block = (A: Assembly, name: string, [x, y, z]: Point3, w: number, o: {lit?: boolean; tone?: 'hi' | 'mid' | 'lo'; h?: number} = {}) =>
  A.slab(name, {x, y, w, d: 5, r: 0.8}, z, o.h ?? 4, {tone: o.tone ?? 'hi', bevel: 0.5, lit: o.lit, shadow: 'part'});

/** a chat on the phone screen: two message bubbles and a reply being typed (blocks on the screen face) */
const chatUi = (s: ScreenRect, typed: number) => {
  const m = faceMatrix(P, s.o, s.u, s.v, 360, 760);
  const r = (x: number, y: number, w: number, h: number, fill = 'none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="currentColor" stroke-width="6"/>`;
  const reply = Array.from({length: typed}, (_, i) => `<rect x="${40 + (i % 4) * 66}" y="${330 + Math.floor(i / 4) * 44}" width="54" height="26" rx="8" fill="currentColor"/>`).join('');
  return `<g class="iso-line" style="color:var(--anatomy-mid)"><g transform="${m}">${r(30, 40, 300, 34)}${r(120, 110, 210, 90)}${r(30, 230, 290, 260)}${reply}${r(30, 650, 300, 60)}</g></g>`;
};

type Frame = {A: Assembly; svg: string; cam: Cam; dark?: boolean; overlay: (cam: Cam) => React.ReactNode};

const heroCam = (lo: Point3, hi: Point3, fill = 0.92, rect = GRAPHICS) => camFit(boxCorners(toRoom(lo, U), toRoom(G.sub3(hi, lo) as Point3, U)), {rect, fill});

const kitPx = (cam: Cam, p: Point3) => screenOf(cam, toRoom(p, U));

// ── overlays: caption on top, «Табл.», callouts, truth plate, sketch stamp ─────────────────────────────────────────
const CAP_Y = 300;
const Caption: React.FC<{words: string[]; key_: number; blurFrom?: number; dark?: boolean}> = ({words, key_, blurFrom = words.length, dark}) => {
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  return (
    <div style={{position: 'absolute', left: 64, right: 176, top: CAP_Y, display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontFamily, fontSize: 66, fontWeight: 600, lineHeight: 1.15, color: ink}}>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            filter: i >= blurFrom ? 'blur(7px)' : undefined,
            opacity: i >= blurFrom ? 0.45 : 1,
            ...(i === key_ ? {background: dark ? COLORS.fillLight : COLORS.ink, color: dark ? COLORS.ink : COLORS.fillLight, padding: '0 18px', borderRadius: 18} : {}),
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
};

const Table: React.FC<{n: number; of: number; title: string; dark?: boolean}> = ({n, of, title, dark}) => (
  <div style={{position: 'absolute', left: 64, top: 478, fontFamily, fontSize: 30, letterSpacing: 4, color: dark ? '#BDB6AC' : COLORS.inkSoft, display: 'flex', alignItems: 'center', gap: 16}}>
    <span style={{fontWeight: 700}}>ТАБЛ. {String(n).padStart(2, '0')} / {String(of).padStart(2, '0')}</span>
    <span style={{width: 60, height: 2, background: 'currentColor'}} />
    <span>{title}</span>
  </div>
);

type Call = {n: number; label: string; at: [number, number]; to: [number, number]};
const Callouts: React.FC<{items: Call[]; dark?: boolean}> = ({items, dark}) => {
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {items.map((c) => (
        <g key={c.n} fontFamily={fontFamily}>
          <path d={`M${c.at[0]} ${c.at[1]}L${c.to[0]} ${c.to[1]}`} stroke={ink} strokeWidth={2.5} fill="none" />
          <circle cx={c.at[0]} cy={c.at[1]} r={6} fill={ink} />
          <circle cx={c.to[0]} cy={c.to[1]} r={22} fill={dark ? '#2B2A30' : COLORS.bg} stroke={ink} strokeWidth={2.5} />
          <text x={c.to[0]} y={c.to[1] + 10} textAnchor="middle" fontSize={28} fontWeight={700} fill={ink}>
            {c.n}
          </text>
          <text x={c.to[0] + (c.to[0] > 540 ? -34 : 34)} y={c.to[1] + 10} textAnchor={c.to[0] > 540 ? 'end' : 'start'} fontSize={32} fill={ink}>
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

const Plate: React.FC<{x: number; y: number; lines: [string, string?][]; foot: string; dark?: boolean}> = ({x, y, lines, foot, dark}) => (
  <div style={{position: 'absolute', left: x, top: y, padding: '18px 24px', background: dark ? '#3A3940' : COLORS.fillLight, border: `2.5px solid ${dark ? '#8C867D' : COLORS.ink}`, borderRadius: 14, fontFamily, color: dark ? COLORS.fillLight : COLORS.ink}}>
    {lines.map(([a, b], i) => (
      <div key={i} style={{fontSize: 36, display: 'flex', justifyContent: 'space-between', gap: 28, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? COLORS.accent : undefined}}>
        <span>{a}</span>
        <span style={{fontVariantNumeric: 'tabular-nums'}}>{b}</span>
      </div>
    ))}
    <div style={{fontSize: 26, marginTop: 10, opacity: 0.75}}>{foot}</div>
  </div>
);

const Atmos: React.FC<{dark?: boolean}> = ({dark}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    <defs>
      <radialGradient id="vig" cx="0.5" cy="0.52" r="0.75">
        <stop offset="0.55" stopColor={dark ? '#000' : '#7A6A55'} stopOpacity={0} />
        <stop offset="1" stopColor={dark ? '#000' : '#7A6A55'} stopOpacity={dark ? 0.45 : 0.16} />
      </radialGradient>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
        <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 1 0" />
      </filter>
    </defs>
    <rect width={1080} height={1920} filter="url(#grain)" opacity={0.03} />
    <rect width={1080} height={1920} fill="url(#vig)" />
  </svg>
);

const Stamp: React.FC<{dark?: boolean}> = ({dark}) => (
  <div style={{position: 'absolute', left: 64, top: 1500, fontFamily, fontSize: 28, letterSpacing: 6, fontWeight: 700, color: dark ? '#D8D2C8' : COLORS.inkSoft, border: `2px dashed currentColor`, padding: '6px 16px', borderRadius: 8}}>
    ЭСКИЗ · факты не проверены
  </div>
);

// ── frame 1: hook. A phone on the desk is writing an answer; one word lifts off the screen as a coral block ─────────
const hook = (): Frame => {
  const A = new Assembly('claude.hook', P, {role: 'hero'});
  desk(A);
  mug(A, [104, 14]);
  notebook(A, [8, 40]);
  const s = phone(A, [48, 16, DESK_Z], {w: 22, d: 44, ui: (r) => chatUi(r, 9)});
  void s;
  // the next word, a coral block, rising out of the screen
  block(A, 'token.next', [61, 34, DESK_Z + 14], 9, {lit: true, h: 4});
  A.pipe('token.trail', [[65, 36.5, DESK_Z + 2.2], [65, 36.5, DESK_Z + 13.6]], 0.25, {tone: 'lo', free: 'a motion trail, not a part'});
  const svg = A.svg();
  const cam = heroCam([44, 12, DESK_Z], [74, 62, DESK_Z + 20]);
  return {
    A,
    svg,
    cam,
    overlay: () => <Caption words={['Как', 'Claude', 'выбирает', 'следующее', 'слово?']} key_={2} blurFrom={4} />,
  };
};

// ── frame 2: Табл. 01 — text is cut into tokens (a sentence strip, the blocks it splits into) ─────────────────────
const TOKENS = [7, 10, 4, 9, 6, 11, 5];
const tokens = (): Frame => {
  const A = new Assembly('claude.tokens', P, {role: 'hero'});
  desk(A, 110, 60);
  // the tray the tokens lie in
  A.slab('tray', {x: 8, y: 20, w: 92, d: 14, r: 1.2}, DESK_Z, 1.2, {tone: 'lo', bevel: 0.3, shadow: 'hero', bias: -900});
  A.slab('tray.rimL', {x: 8, y: 20, w: 92, d: 1, r: 0.3}, DESK_Z + 1.2, 1.4, {tone: 'mid', bevel: 0.2, bias: -800});
  A.slab('tray.rimR', {x: 8, y: 33, w: 92, d: 1, r: 0.3}, DESK_Z + 1.2, 1.4, {tone: 'mid', bevel: 0.2});
  let x = 11;
  for (const [i, w] of TOKENS.entries()) {
    block(A, `token${i}`, [x, 24.5, DESK_Z + 1.2], w, {tone: i % 2 ? 'mid' : 'hi'});
    // the token's number engraved on its top (a row of tick marks)
    for (let k = 0; k < 3; k++) A.slab(`token${i}.id${k}`, {x: x + 1.2 + k * 1.3, y: 26.2, w: 0.6, d: 1.6, r: 0.1}, DESK_Z + 5.2, 0.04, {tone: 'lo', bevel: 0});
    x += w + 1.4;
  }
  // the sentence strip, a paper card, before the cut, with a cutter blade resting on it
  A.slab('card', {x: 10, y: 44, w: 70, d: 9, r: 0.6}, DESK_Z, 0.5, {tone: 'hi', bevel: 0.1, shadow: 'part', bias: -900});
  for (let i = 0; i < 9; i++) A.slab(`card.word${i}`, {x: 13 + i * 7.3, y: 47.6, w: 5 + (i % 3), d: 1.6, r: 0.4}, DESK_Z + 0.5, 0.04, {tone: 'lo', bevel: 0});
  A.slab('cutter', {x: 82, y: 42, w: 4, d: 14, r: 0.6}, DESK_Z, 2, {tone: 'mid', bevel: 0.3});
  A.slab('cutter.blade', {x: 82.6, y: 40, w: 0.6, d: 2.4, r: 0}, DESK_Z + 0.4, 1, {tone: 'lo', bevel: 0});
  mug(A, [100, 50]);
  const svg = A.svg();
  const cam = heroCam([6, 18, DESK_Z], [90, 56, DESK_Z + 6], 0.98);
  return {
    A,
    svg,
    cam,
    overlay: (c) => (
      <>
        <Table n={1} of={4} title="текст → токены" />
        <Caption words={['Текст', 'режется', 'на', 'токены']} key_={3} />
        <Callouts
          items={[
            {n: 1, label: 'токен — кусок слова', at: kitPx(c, [14, 27, DESK_Z + 5.2]), to: [110, 1300]},
            {n: 2, label: 'у токена есть номер', at: kitPx(c, [50.5, 27, DESK_Z + 5.2]), to: [860, 1390]},
          ]}
        />
      </>
    ),
  };
};

// ── frame 3 (the one dark scene): Табл. 02 — the model weighs candidates for the next token ──────────────────────
const CANDIDATES = [0.62, 0.21, 0.09, 0.05];
const weigh = (): Frame => {
  const A = new Assembly('claude.weigh', P, {role: 'hero'});
  // the model as a stack of layers on a plinth: tokens go in at the back, candidates stand at the front
  A.slab('plinth', {x: 0, y: 0, w: 90, d: 70, r: 1.5}, 0, 4, {tone: 'mid', ground: true, bevel: 0.6, shadow: 'hero', bias: -1000});
  for (let i = 0; i < 6; i++) A.slab(`layer${i}`, {x: 14, y: 8, w: 34, d: 30, r: 1.2}, 4 + i * 4.2, 3.4, {tone: i % 2 ? 'mid' : 'hi', bevel: 0.4});
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) A.cyl(`layer${i}.port${k}`, 49, 13 + k * 6.5, 0.6, 5.6 + i * 4.2, 0.02, {tone: 'lo', bevel: 0});
  // input tokens queued on a rail behind
  A.slab('rail.in', {x: 0, y: 14, w: 14, d: 6, r: 0.4}, 4, 1, {tone: 'lo', bevel: 0.2, bias: -900});
  for (let i = 0; i < 2; i++) block(A, `in${i}`, [1 + i * 6.5, 14.5, 5], 5.5, {tone: 'hi', h: 3});
  // output tray with candidate blocks, height by probability
  A.slab('rail.out', {x: 56, y: 10, w: 30, d: 54, r: 0.8}, 4, 1, {tone: 'lo', bevel: 0.2, bias: -900});
  for (const [i, p] of CANDIDATES.entries()) block(A, `cand${i}`, [62, 14 + i * 12.5, 5], 8, {lit: i === 0, tone: 'hi', h: 2 + p * 40});
  const svg = A.svg();
  const cam = camFitSvg(svg, {rect: {...GRAPHICS, y0: 600, x1: 820}, fill: 0.9});
  return {
    A,
    svg,
    cam,
    dark: true,
    overlay: (c) => (
      <>
        <Table n={2} of={4} title="выбор следующего" dark />
        <Caption words={['Модель', 'взвешивает', 'варианты']} key_={2} dark />
        <Callouts
          dark
          items={[
            {n: 1, label: 'слои модели', at: kitPx(c, [14, 8, 20]), to: [120, 700]},
            {n: 2, label: 'варианты', at: kitPx(c, [66, 52, 7]), to: [170, 1300]},
          ]}
        />
        <Plate
          dark
          x={560}
          y={1180}
          lines={[
            ['«выбирает»', '62 %'],
            ['«ищет»', '21 %'],
            ['«знает»', '9 %'],
          ]}
          foot="упрощённо · числа условные"
        />
      </>
    ),
  };
};

// ── frame 4: final. The same phone; the reply is now a full line of blocks, the coral one slotted in ──────────────
const final = (): Frame => {
  const A = new Assembly('claude.final', P, {role: 'hero'});
  desk(A);
  mug(A, [104, 14]);
  notebook(A, [8, 40]);
  phone(A, [48, 16, DESK_Z], {w: 22, d: 44, ui: (r) => chatUi(r, 16)});
  // the reply as blocks standing on the desk beside the phone, the coral one in its place
  const ws = [6, 8, 5, 7, 9];
  let x = 76;
  for (const [i, w] of ws.entries()) {
    block(A, `reply${i}`, [x, 60, DESK_Z], w, {lit: i === 2, tone: 'hi', h: 3});
    x += w + 1;
  }
  const svg = A.svg();
  const cam = heroCam([44, 12, DESK_Z], [110, 68, DESK_Z + 8]);
  return {
    A,
    svg,
    cam,
    overlay: () => <Caption words={['Слово', 'за', 'словом', '—', 'весь', 'ответ']} key_={5} />,
  };
};

const FRAMES = [hook, tokens, weigh, final];
export const CLAUDE_SKETCH_FRAMES = FRAMES.length;

export const ClaudeSketch: React.FC = () => {
  const f = FRAMES[Math.min(FRAMES.length - 1, useCurrentFrame())]();
  return (
    <AnatomyStage>
      {f.dark ? <style>{'.claude-dark .iso-svg{background:#2B2A30 !important}'}</style> : null}
      <div className={f.dark ? 'claude-dark' : undefined} style={{position: 'absolute', inset: 0}}>
        <RoomSvg cam={f.cam} top={440} bottom={1480} fade={90} sides={90}>
          <Kit svg={f.svg} />
        </RoomSvg>
      </div>
      <Atmos dark={f.dark} />
      {f.overlay(f.cam)}
      <Stamp dark={f.dark} />
    </AnatomyStage>
  );
};
