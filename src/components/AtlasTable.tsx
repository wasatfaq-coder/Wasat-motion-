import React from 'react';
import {COLORS, STROKE, TYPE, TYPE_FLOOR} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {SAFE, ZONES} from '../theme/layout';
import {Cam, Rect, RoomSvg} from '../lib/camera';
import {Kit} from '../lib/anatomy';
import {AtmosField} from './Atmos';
import {Callout, Callouts} from './Atlas';
import {FrontalLayer, SourceLine} from './Frontal';
import {LoupeInset} from './Explain';

// Scene template «Атлас-таблица» (docs/references/seven-videos.md, decision 25.11.2026): one plate for the whole scene,
// everything driven by ONE clock `t` (0..1): the main view of the object (kit SVG in the iso world), a loupe on the
// detail, a graph with the past drawn solid and a running dot, and a live formula line whose numbers are computed from
// the same `t`. The topic gives only data (svg, curve, formula parts); the template owns the layout. Pure per frame.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const RIGHT = 1080 - SAFE.right;

/** The frame grid of the template inside the graphics band 510–1470 (regulation section 10). */
export const ATLAS_LAYOUT = {
  /** where the main view's hero is framed: pass it to camFit as `rect` */
  main: {x0: 80, x1: RIGHT, y0: 590, y1: 1000} as Rect,
  mainBottom: 1040,
  honesty: [SAFE.left, 524] as [number, number],
  loupe: {x: 205, y: 1190, r: 132},
  graph: {x: 372, y: 1052, w: RIGHT - 372, h: 284},
  formula: {x: SAFE.left, y: 1350, w: RIGHT - SAFE.left, h: 112},
} as const;

export type AtlasGraph = {
  /** the value at clock position x (in xMax units) */
  f: (x: number) => number;
  xMax: number;
  yMax: number;
  xUnit: string;
  yUnit: string;
  xTicks: number[];
  yTicks: number[];
  /** a limit line in the «норма» colour (data only, regulation section 7) */
  threshold?: {y: number; label: string};
  /** the big readout over the graph, from the same clock */
  readout: (x: number, y: number) => string;
};

/** ink = plain, accent = the result (coral meaning), norm = the second state in data, soft = units and operators */
export type FormulaPart = {text: string; tone?: 'ink' | 'accent' | 'norm' | 'soft'};

const toneOf = (tone: FormulaPart['tone'], dark?: boolean) =>
  tone === 'accent' ? COLORS.accent : tone === 'norm' ? (dark ? COLORS.normDark : COLORS.norm) : tone === 'soft' ? (dark ? COLORS.fillMid : COLORS.inkSoft) : dark ? COLORS.fillLight : COLORS.ink;

const panel = (x: number, y: number, w: number, h: number, dark?: boolean) => (
  <>
    <rect x={x + 6} y={y + 6} width={w} height={h} rx={22} fill={dark ? COLORS.ink : COLORS.fillDark} opacity={dark ? 0.6 : 1} />
    <rect x={x} y={y} width={w} height={h} rx={22} fill={dark ? COLORS.plateDark : COLORS.fillLight} stroke={dark ? COLORS.inkSoft : COLORS.ink} strokeWidth={STROKE.main} />
  </>
);

/** The graph panel: past solid, future faint and dashed, a coral dot at the clock, an optional limit line. */
export const AtlasGraphPanel: React.FC<{t: number; g: AtlasGraph; dark?: boolean; x?: number; y?: number; w?: number; h?: number}> = ({t, g, dark, ...box}) => {
  const {x, y, w, h} = {...ATLAS_LAYOUT.graph, ...box};
  const k = clamp01(t);
  const ink = dark ? COLORS.fillLight : COLORS.ink;
  const soft = dark ? COLORS.fillMid : COLORS.inkSoft;
  const norm = dark ? COLORS.normDark : COLORS.norm;
  const px0 = x + 62;
  const px1 = x + w - 26;
  const py0 = y + h - 52;
  const py1 = y + 92;
  const vx = (u: number) => px0 + (px1 - px0) * (u / g.xMax);
  const vy = (v: number) => py0 - (py0 - py1) * (v / g.yMax);
  const N = 80;
  const pts = Array.from({length: N + 1}, (_, i) => (i / N) * g.xMax);
  const line = (us: number[]) => us.map((u, i) => `${i ? 'L' : 'M'}${vx(u).toFixed(1)} ${vy(g.f(u)).toFixed(1)}`).join('');
  const now = k * g.xMax;
  const past = [...pts.filter((u) => u < now), now];
  const future = [now, ...pts.filter((u) => u > now)];
  const val = g.f(now);
  const font = {fontFamily, fontWeight: TYPE.weightMedium, fontSize: TYPE_FLOOR.auxiliary} as const;
  return (
    <g>
      {panel(x, y, w, h, dark)}
      <text x={x + 26} y={y + 62} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={46} fill={ink} style={{fontVariantNumeric: 'tabular-nums'}}>
        {g.readout(now, val)}
      </text>
      <text x={px0 + 12} y={py1 + 8} fill={soft} {...font}>
        {g.yUnit}
      </text>
      {g.yTicks.map((v) => (
        <text key={`y${v}`} x={px0 - 12} y={vy(v) + 9} textAnchor="end" fill={soft} {...font}>
          {v}
        </text>
      ))}
      {g.xTicks.map((u) => (
        <text key={`x${u}`} x={vx(u)} y={py0 + 34} textAnchor="middle" fill={soft} {...font}>
          {u}
        </text>
      ))}
      <text x={px1} y={py0 + 34} textAnchor="end" fill={soft} {...font}>
        {g.xUnit}
      </text>
      <line x1={px0} y1={py0} x2={px1} y2={py0} stroke={ink} strokeWidth={STROKE.secondary} strokeLinecap="round" />
      <line x1={px0} y1={py0} x2={px0} y2={py1} stroke={ink} strokeWidth={STROKE.secondary} strokeLinecap="round" />
      {g.threshold ? (
        <g>
          <line x1={px0} y1={vy(g.threshold.y)} x2={px1} y2={vy(g.threshold.y)} stroke={norm} strokeWidth={STROKE.secondary} strokeDasharray="10 8" />
          <text x={px1} y={vy(g.threshold.y) - 10} textAnchor="end" fill={norm} {...font} fontWeight={TYPE.weightBold}>
            {g.threshold.label}
          </text>
        </g>
      ) : null}
      <path d={line(future)} fill="none" stroke={soft} strokeWidth={STROKE.secondary} strokeDasharray="4 8" strokeLinecap="round" opacity={0.7} />
      <path d={line(past)} fill="none" stroke={ink} strokeWidth={STROKE.main + 1} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={vx(now)} y1={py0} x2={vx(now)} y2={vy(val)} stroke={COLORS.accent} strokeWidth={STROKE.secondary} strokeDasharray="6 6" />
      <circle cx={vx(now)} cy={vy(val)} r={11} fill={COLORS.accent} stroke={ink} strokeWidth={STROKE.secondary} />
    </g>
  );
};

/** The live formula line: parts whose numbers the scene computes from the same clock; one line, ≥ 32 px, a source under it. */
export const FormulaLine: React.FC<{parts: FormulaPart[]; source?: string; dark?: boolean; x?: number; y?: number; w?: number; h?: number}> = ({parts, source, dark, ...box}) => {
  const {x, y, w, h} = {...ATLAS_LAYOUT.formula, ...box};
  return (
    <g>
      {panel(x, y, w, h, dark)}
      <text x={x + w / 2} y={y + (source ? 56 : 70)} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={38} style={{fontVariantNumeric: 'tabular-nums'}}>
        {parts.map((p, i) => (
          <tspan key={i} fill={toneOf(p.tone, dark)} fontWeight={p.tone === 'soft' ? TYPE.weightMedium : TYPE.weightBold}>
            {p.text}
          </tspan>
        ))}
      </text>
      {source ? (
        <SourceLine x={x + 28} y={y + h - 18} text={source} dark={dark} />
      ) : null}
    </g>
  );
};

export type AtlasTableProps = {
  /** the one clock of the scene, 0..1 */
  t: number;
  dark?: boolean;
  /** the main view: kit SVG of the object at the state of `t`, and its camera (camFit with rect ATLAS_LAYOUT.main) */
  main: {svg: string; cam: Cam; hero?: [number, number]};
  /** the loupe: kit SVG of the detail at the state of `t`, the screen point of the detail on the main view, a tag */
  loupe?: {id: string; svg: string; at: [number, number]; tag?: React.ReactNode};
  graph: AtlasGraph;
  formula: {parts: FormulaPart[]; source?: string};
  callouts?: Callout[];
  /** an honesty tag (HonestyTag) shown at the top left of the main view */
  honesty?: React.ReactNode;
};

/** The template: main view, loupe, graph and formula from one clock. Put it inside AnatomyStage; captions and the
 *  chapter mark go over it as usual (they live above ZONES.graphicsTop). */
export const AtlasTable: React.FC<AtlasTableProps> = ({t, dark, main, loupe, graph, formula, callouts, honesty}) => {
  const L = ATLAS_LAYOUT;
  return (
    <>
      <RoomSvg cam={main.cam} dark={dark} bottom={L.mainBottom} fade={60} sides={60} under={<AtmosField hero={main.hero ?? [490, 800]} dark={dark} />}>
        <Kit svg={main.svg} />
      </RoomSvg>
      <FrontalLayer>
        {callouts ? <Callouts items={callouts} dark={dark} /> : null}
        {honesty ? <g transform={`translate(${L.honesty[0]} ${L.honesty[1]})`}>{honesty}</g> : null}
        {loupe ? <LoupeInset id={loupe.id} x={L.loupe.x} y={L.loupe.y} r={L.loupe.r} at={loupe.at} svg={loupe.svg} dark={dark} /> : null}
        <AtlasGraphPanel t={t} g={graph} dark={dark} />
        {/* the loupe's tag sits on the ring's top, inside the loupe column (≤ 290 px wide: a tag without a note) */}
        {loupe?.tag ? <g transform={`translate(${SAFE.left} ${L.loupe.y - L.loupe.r - 24})`}>{loupe.tag}</g> : null}
        <FormulaLine parts={formula.parts} source={formula.source} dark={dark} />
      </FrontalLayer>
    </>
  );
};

/** Guard for the template's grid: every box stays inside the graphics band and the safe columns. */
export const atlasLayoutProblems = (): string[] => {
  const L = ATLAS_LAYOUT;
  const out: string[] = [];
  const inBand = (name: string, x0: number, y0: number, x1: number, y1: number) => {
    if (y0 < ZONES.graphicsTop || y1 > ZONES.graphicsBottom) out.push(`${name}: y ${y0}–${y1} leaves the graphics band ${ZONES.graphicsTop}–${ZONES.graphicsBottom}`);
    if (x0 < SAFE.left || x1 > RIGHT) out.push(`${name}: x ${x0}–${x1} leaves the safe columns ${SAFE.left}–${RIGHT}`);
  };
  inBand('main', L.main.x0, L.main.y0, L.main.x1, L.main.y1);
  inBand('loupe', L.loupe.x - L.loupe.r, L.loupe.y - L.loupe.r, L.loupe.x + L.loupe.r, L.loupe.y + L.loupe.r);
  inBand('graph', L.graph.x, L.graph.y, L.graph.x + L.graph.w + 6, L.graph.y + L.graph.h + 6);
  inBand('formula', L.formula.x, L.formula.y, L.formula.x + L.formula.w + 6, L.formula.y + L.formula.h + 6);
  if (L.loupe.x + L.loupe.r > L.graph.x - 12) out.push('loupe overlaps the graph');
  if (L.loupe.y + L.loupe.r > L.formula.y - 8 || L.graph.y + L.graph.h > L.formula.y - 8) out.push('loupe or graph overlaps the formula');
  return out;
};
