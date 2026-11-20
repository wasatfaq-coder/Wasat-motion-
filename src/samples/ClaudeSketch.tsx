import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Assembly, G, Point3} from '../lib/assembly';
import {anatomyProjection, AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, Cam, camFit, Rect, RoomSvg, screenOf} from '../lib/camera';
import {figure} from '../lib/crowd';
import {COLORS} from '../theme/tokens';
import {fontFamily} from '../theme/font';

// SKETCH, not a topic: four stills of «Как работает Claude» drawn with the current kit to try the style decisions of
// docs/proposals (captions on top with a dark pill on the key word, atlas callouts, «Табл. NN / NN», one dark scene,
// tonal depth, vignette, paper grain). Illustrative values, facts unchecked. No stamp in the frame (user's call).

const U = 10;
const P = anatomyProjection(U);
const GRAPHICS: Rect = {x0: 70, x1: 900, y0: 600, y1: 1420};

// ── token blocks: a block per token, width by the token's length ───────────────────────────────────────────────────
const block = (A: Assembly, name: string, [x, y, z]: Point3, w: number, o: {lit?: boolean; tone?: 'hi' | 'mid' | 'lo'; h?: number} = {}) =>
  A.slab(name, {x, y, w, d: 5, r: 0.8}, z, o.h ?? 4, {tone: o.tone ?? 'hi', bevel: 0.5, lit: o.lit, shadow: 'part'});

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
          <rect x={c.to[0] > 540 ? c.to[0] - 40 - c.label.length * 17 : c.to[0] + 26} y={c.to[1] - 24} width={c.label.length * 17 + 16} height={46} rx={10} fill={dark ? '#2B2A30' : COLORS.bg} opacity={0.92} />
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

// ── locations, each built anew from bricks: floor, walls, furniture (bias paints the shell first) ─────────────────
const shell = (A: Assembly, w: number, d: number, h: number, o: {tiles?: boolean; window?: boolean; brick?: boolean; walls?: boolean} = {}) => {
  A.slab('floor', {x: 0, y: 0, w, d, r: 0}, -1, 1, {tone: 'mid', ground: true, bevel: 0, bias: -3000});
  const step = o.tiles ? 12 : 8;
  for (let i = 1; i < (o.tiles ? d : w) / step; i++)
    o.tiles
      ? A.slab(`floor.tile${i}`, {x: 0.5, y: i * step - 0.15, w: w - 1, d: 0.3, r: 0}, 0, 0.03, {tone: 'lo', bevel: 0, bias: -2999})
      : A.slab(`floor.board${i}`, {x: i * step - 0.12, y: 0.5, w: 0.24, d: d - 1, r: 0}, 0, 0.03, {tone: 'lo', bevel: 0, bias: -2999});
  if (o.tiles) for (let i = 1; i < w / step; i++) A.slab(`floor.tileX${i}`, {x: i * step - 0.15, y: 0.5, w: 0.3, d: d - 1, r: 0}, 0, 0.03, {tone: 'lo', bevel: 0, bias: -2999});
  if (o.walls === false) return;
  A.slab('wall.back', {x: 0, y: -2, w, d: 2, r: 0}, 0, h, {tone: 'hi', bevel: 0.2, bias: -4000});
  A.slab('wall.left', {x: -2, y: -2, w: 2, d: d + 2, r: 0}, 0, h, {tone: 'hi', bevel: 0.2, bias: -4000});
  A.slab('wall.skirt', {x: 0, y: 0, w, d: 0.6, r: 0}, 0, 2.4, {tone: 'mid', bevel: 0.1, bias: -3500});
  A.slab('wall.skirtL', {x: 0, y: 0, w: 0.6, d, r: 0}, 0, 2.4, {tone: 'mid', bevel: 0.1, bias: -3500});
  if (o.brick)
    for (let r = 1; r < h / 4; r++) A.slab(`wall.brick${r}`, {x: 0.5, y: -0.05, w: w - 1, d: 0.05, r: 0}, r * 4, 0.25, {tone: 'lo', bevel: 0, bias: -3900});
  if (o.window) {
    const wx = w * 0.45;
    A.slab('window.glass', {x: wx, y: -0.4, w: 30, d: 0.4, r: 0}, 26, 26, {tone: 'lo', bevel: 0, bias: -3800});
    for (const [n, x0, z0, ww, hh] of [
      ['window.frameT', wx - 1, 51, 32, 1.5],
      ['window.frameB', wx - 1, 24.5, 32, 1.5],
      ['window.frameL', wx - 1, 24.5, 1.5, 28],
      ['window.frameR', wx + 29.5, 24.5, 1.5, 28],
      ['window.bar', wx + 14.3, 26, 1.2, 25],
    ] as [string, number, number, number, number][])
      A.slab(n, {x: x0, y: -0.6, w: ww, d: 1.2, r: 0}, z0, hh, {tone: 'mid', bevel: 0.2, bias: -3700});
    A.slab('window.sill', {x: wx - 3, y: -0.6, w: 36, d: 4, r: 0.3}, 23, 1.6, {tone: 'mid', bevel: 0.3, bias: -3600});
  }
};

const armchair = (A: Assembly, x: number, y: number) => {
  A.slab('chair.base', {x, y, w: 22, d: 20, r: 2}, 0, 9, {tone: 'mid', ground: true, bevel: 0.8, shadow: 'hero'});
  A.slab('chair.seat', {x: x + 3, y: y + 3, w: 16, d: 16, r: 2}, 9, 3, {tone: 'hi', bevel: 1});
  A.slab('chair.back', {x, y, w: 22, d: 4, r: 1.6}, 9, 16, {tone: 'mid', bevel: 0.8});
  A.slab('chair.armL', {x, y, w: 3.5, d: 20, r: 1.4}, 9, 7, {tone: 'mid', bevel: 0.6});
  A.slab('chair.armR', {x: x + 18.5, y, w: 3.5, d: 20, r: 1.4}, 9, 7, {tone: 'mid', bevel: 0.6});
};

const lamp = (A: Assembly, x: number, y: number) => {
  A.cyl('lamp.foot', x, y, 3.4, 0, 0.8, {tone: 'lo', ground: true, bevel: 0.3});
  A.pipe('lamp.pole', [[x, y, 0.8], [x, y, 34]], 0.4, {tone: 'mid'});
  A.turned('lamp.shade', [[0, 4.6], [6, 2.8]], G.frameAlong([x, y, 33], [0, 0, 1]), {tone: 'hi'});
};

const shelf = (A: Assembly, y: number) => {
  A.slab('shelf', {x: 0, y, w: 7, d: 26, r: 0.3}, 0, 40, {tone: 'mid', ground: true, bevel: 0.4, bias: -1200});
  for (let k = 0; k < 4; k++) {
    A.slab(`shelf.board${k}`, {x: 0, y: y + 0.4, w: 7.4, d: 25.2, r: 0}, 2 + k * 10, 0.8, {tone: 'hi', bevel: 0.1, bias: -1100});
    for (let b = 0; b < 6; b++) A.slab(`shelf.book${k}.${b}`, {x: 1.2, y: y + 1.4 + b * 3.6 + (k % 2), w: 5, d: 2.6, r: 0.2}, 2.8 + k * 10, 6 + ((b + k) % 3), {tone: b % 2 ? 'lo' : 'mid', bevel: 0.15, bias: -1000});
  }
};

/** the person, a faceless mannequin, holding a phone up in front of the chest (a crowd figure at room scale) */
const person = (A: Assembly, at: Point3, phoneLit = false) => {
  const k = 2.2;
  figure(A, 'person', {at, yaw: Math.PI / 4, scale: k});
  const [x, y] = at;
  // the phone in the hands: a thin slab at chest height, turned to the person
  A.slab('hand.phone', {x: x + 3.2, y: y + 3.2, w: 3.4, d: 2.2, r: 0.4}, 21, 0.5, {tone: 'lo', bevel: 0.1, lit: phoneLit});
};

// ── frame 1: hook. An evening room; the person reads the phone, one word lifts off it as a coral block ──────────────
const hook = (): Frame => {
  const A = new Assembly('claude.hook', P, {role: 'hero'});
  shell(A, 90, 70, 60, {window: true});
  shelf(A, 8);
  armchair(A, 14, 40);
  lamp(A, 10, 66);
  A.slab('rug', {x: 30, y: 22, w: 40, d: 32, r: 1}, 0, 0.3, {tone: 'lo', bevel: 0.1, bias: -2500});
  person(A, [52, 40, 0.3]);
  block(A, 'token.next', [55, 43, 27], 6, {lit: true, h: 3});
  const svg = A.svg();
  const cam = heroCam([30, 26, 0], [70, 56, 34], 0.98);
  return {A, svg, cam, overlay: () => <Caption words={['Как', 'Claude', 'выбирает', 'следующее', 'слово?']} key_={2} blurFrom={4} />};
};

// ── frame 2: Табл. 01, a print shop. Text is set from a type case: each cell holds one token, the stick holds a line ─
const TOKENS = [5, 7, 3, 6, 4, 8, 4];
const tokens = (): Frame => {
  const A = new Assembly('claude.tokens', P, {role: 'hero'});
  shell(A, 100, 70, 60, {brick: true});
  // the press in the back corner: a body, two rollers and a hand wheel
  A.slab('press.body', {x: 6, y: 6, w: 24, d: 16, r: 1}, 0, 28, {tone: 'mid', ground: true, bevel: 0.6, bias: -1500});
  for (const [i, z] of [30, 24].entries()) A.turned(`press.roller${i}`, [[-9, 2.4], [9, 2.4]], G.frameAlong([18, 14, z], [1, 0, 0]), {tone: 'hi'});
  // the type case on its stand: a grid of cells, a few sorts in each
  const cx = 40;
  const cy = 26;
  A.slab('case.stand', {x: cx, y: cy, w: 40, d: 22, r: 0.6}, 0, 26, {tone: 'mid', ground: true, bevel: 0.6, shadow: 'hero', bias: -500});
  A.slab('case.tray', {x: cx - 1, y: cy - 1, w: 42, d: 24, r: 0.6}, 26, 2, {tone: 'lo', bevel: 0.3, bias: -400});
  for (let i = 1; i < 8; i++) A.slab(`case.colwall${i}`, {x: cx - 1 + i * 5.25, y: cy - 1, w: 0.4, d: 24, r: 0}, 28, 1.4, {tone: 'hi', bevel: 0, bias: -300});
  for (let j = 1; j < 4; j++) A.slab(`case.rowwall${j}`, {x: cx - 1, y: cy - 1 + j * 6, w: 42, d: 0.4, r: 0}, 28, 1.4, {tone: 'hi', bevel: 0, bias: -300});
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 4; j++)
      if ((i + j) % 3 !== 1) A.slab(`case.sort${i}.${j}`, {x: cx + 0.6 + i * 5.25, y: cy + 1 + j * 6, w: 1.6 + ((i * j) % 2), d: 2, r: 0.2}, 28, 1.1, {tone: 'mid', bevel: 0.1, bias: -200});
  // the composing stick in front, on a stool-side bench, holding the line of tokens
  A.slab('bench', {x: 40, y: 54, w: 44, d: 10, r: 0.6}, 0, 16, {tone: 'mid', ground: true, bevel: 0.5, bias: -100});
  A.slab('stick', {x: 42, y: 56, w: 40, d: 6, r: 0.4}, 16, 1, {tone: 'lo', bevel: 0.2});
  A.slab('stick.knee', {x: 42, y: 56, w: 1.2, d: 6, r: 0.2}, 17, 4, {tone: 'mid', bevel: 0.1});
  let x = 43.6;
  for (const [i, w] of TOKENS.entries()) {
    block(A, `token${i}`, [x, 56.5, 17], w, {tone: i % 2 ? 'mid' : 'hi', h: 3});
    x += w + 0.4;
  }
  A.slab('paper', {x: 82, y: 30, w: 14, d: 18, r: 0.3}, 0, 6, {tone: 'hi', ground: true, bevel: 0.2});
  const svg = A.svg();
  const cam = heroCam([38, 24, 0], [86, 64, 30], 0.98);
  return {
    A,
    svg,
    cam,
    overlay: (c) => (
      <>
        <Table n={1} of={4} title="текст → токены" />
        <Caption words={['Текст', 'набирается', 'из', 'токенов']} key_={3} />
        <Callouts
          items={[
            {n: 1, label: 'ячейка — один токен', at: kitPx(c, [cx + 3, cy + 3, 29.2]), to: [110, 640]},
            {n: 2, label: 'строка из токенов', at: kitPx(c, [60, 59, 20]), to: [110, 1380]},
          ]}
        />
      </>
    ),
  };
};

// ── frame 3 (the one dark scene): Табл. 02, a data centre. One rack is open: inside, the weighing mechanism ────────
const CANDIDATES = [0.62, 0.21, 0.09, 0.05];
const weigh = (): Frame => {
  const A = new Assembly('claude.weigh', P, {role: 'hero'});
  shell(A, 110, 80, 50, {tiles: true, walls: false});
  // a row of closed racks along the back, vents and status lights on their fronts
  for (let r = 0; r < 4; r++) {
    const rx = 6 + r * 13;
    A.slab(`rack${r}`, {x: rx, y: 4, w: 12, d: 14, r: 0.4}, 0, 40, {tone: 'mid', ground: true, bevel: 0.4, bias: -1500});
    for (let k = 0; k < 12; k++) A.slab(`rack${r}.vent${k}`, {x: rx + 1, y: 18, w: 10, d: 0.1, r: 0}, 3 + k * 3, 0.6, {tone: 'lo', bevel: 0, bias: -1400});
    for (let k = 0; k < 3; k++) A.cyl(`rack${r}.led${k}`, rx + 10, 18.1, 0.35, 36 - k * 1.2, 0.05, {tone: 'hi', bevel: 0, bias: -1400});
  }
    // the open rack in front: its door swung, the mechanism on its pull-out shelf
  const ox = 58;
  const oy = 34;
  A.slab('open.frame', {x: ox, y: oy, w: 36, d: 30, r: 0.5}, 0, 4, {tone: 'mid', ground: true, bevel: 0.4, shadow: 'hero', bias: -900});
  A.slab('open.door', {x: ox - 1, y: oy + 30, w: 1, d: 14, r: 0.2}, 0, 40, {tone: 'mid', bevel: 0.3, bias: -50});
  for (let i = 0; i < 6; i++) A.slab(`layer${i}`, {x: ox + 3, y: oy + 3, w: 16, d: 14, r: 0.8}, 4 + i * 3.2, 2.6, {tone: i % 2 ? 'mid' : 'hi', bevel: 0.3});
  for (let i = 0; i < 2; i++) block(A, `in${i}`, [ox + 4 + i * 6, oy + 20, 4], 5, {tone: 'hi', h: 2.4});
  for (const [i, p] of CANDIDATES.entries()) block(A, `cand${i}`, [ox + 24, oy + 2 + i * 7, 4], 6, {lit: i === 0, tone: 'hi', h: 1.5 + p * 30});
  const svg = A.svg();
  const cam = heroCam([54, 30, 0], [96, 68, 40], 0.96, {...GRAPHICS, y0: 600, x1: 840});
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
            {n: 1, label: 'слои модели', at: kitPx(c, [ox + 3, oy + 3, 20]), to: [110, 640]},
            {n: 2, label: 'варианты слова', at: kitPx(c, [ox + 27, oy + 26, 6]), to: [110, 1390]},
          ]}
        />
        <Plate
          dark
          x={560}
          y={1200}
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

// ── frame 4: final. Back in the room, wider: the reply is written, the coral word in its place on the side table ───
const final = (): Frame => {
  const A = new Assembly('claude.final', P, {role: 'hero'});
  shell(A, 90, 70, 60, {window: true});
  shelf(A, 8);
  armchair(A, 14, 40);
  lamp(A, 10, 66);
  A.slab('rug', {x: 30, y: 22, w: 40, d: 32, r: 1}, 0, 0.3, {tone: 'lo', bevel: 0.1, bias: -2500});
  person(A, [52, 40, 0.3]);
  A.slab('sidetable', {x: 66, y: 50, w: 16, d: 12, r: 0.6}, 0, 14, {tone: 'mid', ground: true, bevel: 0.4});
  const ws = [3, 4, 3, 4];
  let x = 67.5;
  for (const [i, w] of ws.entries()) {
    block(A, `reply${i}`, [x, 53, 14], w - 0.4, {lit: i === 2, tone: 'hi', h: 2});
    x += w;
  }
  const svg = A.svg();
  const cam = heroCam([10, 10, 0], [86, 66, 46], 0.96);
  return {A, svg, cam, overlay: () => <Caption words={['Слово', 'за', 'словом', '—', 'весь', 'ответ']} key_={5} />};
};

const FRAMES = [hook, tokens, weigh, final];
export const CLAUDE_SKETCH_FRAMES = FRAMES.length;

export const ClaudeSketch: React.FC = () => {
  const f = FRAMES[Math.min(FRAMES.length - 1, useCurrentFrame())]();
  return (
    <AnatomyStage>
      {f.dark ? <style>{'.claude-dark .iso-svg{background:#2B2A30 !important}'}</style> : null}
      <div className={f.dark ? 'claude-dark' : undefined} style={{position: 'absolute', inset: 0}}>
        <RoomSvg cam={f.cam} top={500} bottom={1480} fade={90} sides={90}>
          <Kit svg={f.svg} />
        </RoomSvg>
      </div>
      <Atmos dark={f.dark} />
      {f.overlay(f.cam)}
    </AnatomyStage>
  );
};
