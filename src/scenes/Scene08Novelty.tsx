import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {RoomSvg, ROOM_S, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {ArchiveShell, Dust, PendantLamp} from '../illustrations/Archive';
import {CardCatalog, CATALOG, CATALOG_TOP, DRAWER, drawerCell, drawerSlide, ImpressionCard} from '../illustrations/CardCatalog';
import {Suitcase} from '../illustrations/Props';
import {Box, Line3} from '../illustrations/primitives';
import {COS30, iso, P3, pts, SIN30} from '../lib/iso';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const s = ROOM_S;
const CAT_AT: P3 = [3.4, 5.8, 0];
const SUIT: P3 = [4.4, 8.3, 0];
const TAPE: P3 = [CAT_AT[0] + CATALOG.W + 0.25, CAT_AT[1] - 1.0, 0]; // against the side panel: it measures the cabinet
const N = DRAWER.cols * DRAWER.rows;
/** Fill order: bottom row first, so the column of filled drawers grows upwards next to the tape. */
const slot = (k: number) => {
  const r = DRAWER.rows - 1 - Math.floor(k / DRAWER.cols);
  return r * DRAWER.cols + (k % DRAWER.cols);
};

type M = [number, number, number, number, number, number];
const floorM = (p: P3): M => {
  const [x, y] = iso(s)(p);
  return [COS30 * s, SIN30 * s, -COS30 * s, SIN30 * s, x, y];
};
const wallM = (p: P3): M => {
  const [x, y] = iso(s)(p);
  return [COS30 * s, SIN30 * s, 0, s, x, y];
};

/** Card flight with physics: A) pops out of the suitcase (anticipation dip), B) arc with spin and a tilt towards the
 *  vertical, C) lands flat on the open drawer with a squash. The floor shadow shrinks as the card rises. */
const FlightCard: React.FC<{p: number; from: P3; to: P3}> = ({p, from, to}) => {
  const A = 0.15;
  const C = 0.88;
  const q = Math.max(0, Math.min(1, (p - A) / (C - A)));
  const land = Math.max(0, (p - C) / (1 - C));
  const e = EASE.inOut(q);
  const dip = p < A ? -Math.sin((p / A) * Math.PI) * 0.12 : 0;
  const pop = p < A ? (p / A) * 0.5 : 0.5 * (1 - e);
  const h = 4 * q * (1 - q) * 1.8;
  const pos: P3 = [mix(from[0], to[0], e), mix(from[1], to[1], e), mix(from[2] + pop, to[2], e) + h + dip + (land > 0 ? Math.abs(Math.sin(land * Math.PI * 2)) * (1 - land) * 0.08 : 0)];
  const tilt = Math.sin(q * Math.PI) * 0.55;
  const a = floorM(pos);
  const b = wallM(pos);
  const m = a.map((v, i) => v + (b[i] - v) * tilt) as M;
  const spin = (1 - e) * 220 + Math.sin(q * 12) * 6 * (1 - q);
  const squash = land > 0 ? 1 - Math.sin(land * Math.PI) * 0.18 : 1;
  const size = mix(1.8, 1, e); // big in the air (readable), card size when it lands
  const [sx, sy] = iso(s)([pos[0], pos[1], 0]);
  const shadow = Math.max(0.25, 1 - pos[2] / 6);
  return (
    <g>
      <ellipse cx={sx} cy={sy} rx={0.42 * s * shadow} ry={0.2 * s * shadow} fill={COLORS.ink} opacity={0.12 * shadow} />
      <g transform={`matrix(${m.join(',')})`}>
        <g transform={`rotate(${spin}) scale(${size} ${size * squash})`}>
          <ImpressionCard />
        </g>
      </g>
    </g>
  );
};

/** Scene 8 (memory archive): new impressions fly out of the suitcase as cards and land in the drawers of a
 *  card catalogue (drawers slide out, take the card, close and light up); a tape measure beside the catalogue grows
 *  with the filled column and overshoots on «длинным»: the period seems longer. */
export const Scene08Novelty: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const novelty = beat(scene, 'novelty');
  const streets = beat(scene, 'streets');
  const brain = beat(scene, 'brain');
  const memories = beat(scene, 'memories');
  const long = beat(scene, 'long');
  const lid = interpolate(frame, [novelty - 10, novelty + 14], [0, 1], {...cl, easing: EASE.overshoot});
  const first = novelty + 8;
  const start = (k: number) => first + k * ((memories + 20 - first) / N);
  const flight = Math.round(0.75 * fps);
  const open: number[] = Array(N).fill(0);
  const lit: number[] = Array(N).fill(0);
  const holding: number[] = Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    const d = frame - start(k) - flight;
    const j = slot(k);
    // opens with a small overshoot (bounce), closes smoothly
    open[j] = d < -3 ? interpolate(d, [-16, -3], [0, 1], {...cl, easing: EASE.overshoot}) : interpolate(d, [2, 16], [1, 0], {...cl, easing: EASE.inOut});
    lit[j] = d > 8 ? 1 : 0;
    holding[j] = d >= 0 ? 1 : 0;
  }
  // continuous fill (no steps): each landed card adds its share over 20 frames
  const filled = Array.from({length: N}, (_, k) => interpolate(frame - start(k) - flight, [0, 20], [0, 1], cl)).reduce((a, b) => a + b, 0);
  // tape: appears on «мозг меряет», follows the filled column, overshoots above the catalogue on «длинным»
  const show = interpolate(frame, [brain - 12, brain + 6], [0, 1], cl);
  const blade =
    show * (0.5 + (filled / N) * (CATALOG_TOP - 0.8) * interpolate(frame, [brain - 12, brain + 20], [0, 1], cl)) +
    interpolate(frame, [long - 0.9 * fps, long + 0.25 * fps], [0, 4.2], {...cl, easing: EASE.overshoot});
  const src: P3 = [SUIT[0] + 0.9, SUIT[1] + 0.35, 1.3];
  const cam = shotCam(frame, [
    [0, {focus: roomPoint([5.0, 5.4, 2.6]), zoom: 1.25, screen: [520, 740]}], // the archive: racks, ladder, catalogue
    [novelty - 20, {focus: roomPoint([4.8, 7.6, 2.0]), zoom: 1.75, screen: [520, 700]}], // suitcase opens, first card
    [streets - 10, {focus: roomPoint([4.8, 6.8, 2.6]), zoom: 1.6, screen: [520, 740]}], // cards arc into the catalogue
    [streets + 50, {focus: roomPoint([4.9, 6.2, 3.0]), zoom: 2.2, screen: [520, 720]}], // «по одной из версий»: push in on the flying cards
    [brain - 20, {focus: roomPoint([5.4, 5.6, 3.2]), zoom: 1.9, screen: [520, 720]}], // the tape appears
    [memories - 30, {focus: roomPoint([4.9, 5.8, 2.9]), zoom: 2.4, screen: [520, 720]}], // drawers take the cards
    [long - 1.2 * fps, {focus: roomPoint([TAPE[0], TAPE[1], CATALOG_TOP + 1.0]), zoom: 2.6, screen: [520, 760]}], // «длинным»: the tape overshoots above the catalogue
  ]);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <ArchiveShell s={s} t={t} />
        <PendantLamp s={s} at={[3.6, 3.2, 7.5]} t={t} />
        <PendantLamp s={s} at={[8.0, 3.6, 7.5]} t={t} phase={1.7} />
        <Dust s={s} at={[3.8, 3.6, 1.6]} t={t} />
        <CardCatalog s={s} at={CAT_AT} open={open} lit={lit} holding={holding} />
        {/* tape measure beside the catalogue: coral case, blade with ticks (no numbers) */}
        <Box s={s} at={TAPE} size={[0.5, 0.5, 0.42]} left={show > 0.5 ? COLORS.accent : COLORS.fillMid} right={show > 0.5 ? COLORS.accent : COLORS.fillDark} />
        {blade > 0.05 ? (
          <g>
            {/* soft halo behind the blade mutes the busy racks */}
            <polygon points={pts(s, [[TAPE[0] - 0.3, TAPE[1] + 0.2, 0.42], [TAPE[0] + 0.9, TAPE[1] + 0.2, 0.42], [TAPE[0] + 0.9, TAPE[1] + 0.2, 0.42 + blade + 0.4], [TAPE[0] - 0.3, TAPE[1] + 0.2, 0.42 + blade + 0.4]])} fill={COLORS.bg} opacity={0.75} />
            <Box s={s} at={[TAPE[0] + 0.02, TAPE[1] + 0.2, 0.42]} size={[0.5, 0.08, blade]} stroke={STROKE.main} left={COLORS.fillLight} right={COLORS.fillMid} detail="none" />
            {Array.from({length: Math.floor(blade / 0.25)}, (_, i) => (
              <Line3 key={i} s={s} width={i % 4 === 3 ? STROKE.main : STROKE.secondary} points={[[TAPE[0] + 0.08, TAPE[1] + 0.28, 0.42 + (i + 1) * 0.25], [TAPE[0] + (i % 4 === 3 ? 0.36 : i % 2 ? 0.2 : 0.28), TAPE[1] + 0.28, 0.42 + (i + 1) * 0.25]]} />
            ))}
            {/* end hook: the meaningful accent at the top of the measured length */}
            <Box s={s} at={[TAPE[0] + 0.04, TAPE[1] + 0.14, 0.42 + blade]} size={[0.46, 0.16, 0.12]} stroke={STROKE.secondary} left={COLORS.accent} right={COLORS.accent} top={COLORS.accent} detail="none" />
          </g>
        ) : null}
        <Suitcase s={s} at={SUIT} open={lid} />
        {Array.from({length: N}, (_, k) => {
          const p = (frame - start(k)) / flight;
          if (p <= 0 || p >= 1) return null;
          const {u, zTop} = drawerCell(slot(k));
          const to: P3 = [CAT_AT[0] + u + DRAWER.w / 2, CAT_AT[1] + drawerSlide(1) / 2, CAT_AT[2] + zTop + 0.01];
          return <FlightCard key={k} p={p} from={src} to={to} />;
        })}
      </RoomSvg>
    </AbsoluteFill>
  );
};
