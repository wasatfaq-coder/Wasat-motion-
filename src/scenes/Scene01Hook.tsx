import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {COS30, SIN30} from '../lib/iso';
import {Thesis} from '../components/Thesis';
import {Armchair, CAL, Calendar, CalendarPage, CardTray, Desk, Plant, RoomShell, TRAY, WallClock, DESK} from '../illustrations/Room';
import {Cam, GRAPHICS_TOP, lerpCam, RoomSvg, ROOM_S, roomPoint} from './RoomScene';

export const TRAY_FOCUS = roomPoint([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, DESK.h + 0.3]);
export const CAM_WIDE: Cam = {focus: [540, 840], zoom: 1, screen: [540, 840]};
export const CAM_TRAY: Cam = {focus: TRAY_FOCUS, zoom: 2.9, screen: [484, 860]};

// preview title: largest size where «летят быстрее?» stays inside the 840 px safe width (checked on the rendered cover)
export const PREVIEW_TITLE_SIZE = 98;

export const PAGE_COUNT = 10;

/** Frame where the opening preview title has left (captions start here). */
export const previewTitleOut = (scene: SceneData) => beat(scene, 'decade') - 8;

/** Start frames of the torn pages: intervals shrink, so the years fly faster and faster. */
export const pageStarts = (start: number, fps: number, firstGapSec = 0.42) => {
  const out: number[] = [];
  let t = start;
  let gap = firstGapSec * fps;
  for (let i = 0; i < PAGE_COUNT; i++) {
    out.push(Math.round(t));
    t += gap;
    gap = Math.max(0.1 * fps, gap * 0.8);
  }
  return out;
};

/** Cover pose (frame 0): close on the wall calendar, clock and tray with the first page already in the air. */
export const CAM_COVER: Cam = {focus: roomPoint([5.7, 0.2, 4.4]), zoom: 2.3, screen: [484, 1030]};

type M = [number, number, number, number, number, number];
const lerpM = (a: M, b: M, t: number): M => a.map((v, i) => v + (b[i] - v) * t) as M;

/** A calendar page flying from the wall into the tray, turning from a wall plane into a floor-plane card. */
const FlyingPage: React.FC<{p: number; landingZ: number}> = ({p, landingZ}) => {
  const s = ROOM_S;
  const pw = CAL.w - 0.1;
  const ph = CAL.h - 0.5;
  // wall plane y=0 at the page's top-left corner
  const wx = COS30 * CAL.u * s;
  const wy = SIN30 * CAL.u * s - (CAL.z - 0.45) * s;
  const wall: M = [COS30 * s, SIN30 * s, 0, s, wx + COS30 * 0.05 * s, wy + SIN30 * 0.05 * s];
  // floor plane at card position, scaled from page size to card size
  const cx = TRAY.x + 0.15;
  const cy = TRAY.y + 0.15;
  const sx = (TRAY.w - 0.3) / pw;
  const sy = (TRAY.d - 0.3) / ph;
  const fx = COS30 * (cx - cy) * s;
  const fy = SIN30 * (cx + cy) * s - landingZ * s;
  const floor: M = [COS30 * s * sx, SIN30 * s * sx, -COS30 * s * sy, SIN30 * s * sy, fx, fy];
  const e = EASE.inOut(p);
  const m = lerpM(wall, floor, e);
  const lift = Math.sin(Math.PI * p) * 70; // arc
  m[5] -= lift;
  const spin = Math.sin(Math.PI * p) * 18;
  return (
    <g transform={`matrix(${m.join(',')})`}>
      <g transform={`rotate(${spin} ${pw / 2} ${ph / 2})`}>
        <CalendarPage w={pw} h={ph} accent={1 - Math.max(0, (p - 0.6) / 0.4)} />
      </g>
    </g>
  );
};

export const Scene01Hook: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const decade = beat(scene, 'decade');
  const why = beat(scene, 'why');
  // cover pose: three pages already drift slowly in the air on frame 0 (calm, like the steady hour);
  // on "десять лет" the remaining pages tear off faster and faster
  const slow = [-40, -25, -10].map((st) => ({st, flight: Math.round(1.4 * fps)}));
  const fast = pageStarts(decade - 4, fps, 0.4).slice(0, PAGE_COUNT - 3).map((st) => ({st, flight: Math.round(0.6 * fps)}));
  const pages = [...slow, ...fast];
  const starts = pages.map((p) => p.st);
  const landed = pages.filter((p) => frame >= p.st + p.flight).length;
  const flutter = starts.reduce((acc, st) => acc + Math.max(0, 1 - Math.abs(frame - st) / 6), 0);
  // camera: cover close-up → wider desk view when the title leaves → push into the tray on "Почему"
  const titleOut = previewTitleOut(scene);
  const toDesk = interpolate(frame, [titleOut - 10, titleOut + 0.8 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const push = interpolate(frame, [why - 6, scene.durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const deskCam: Cam = {focus: roomPoint([6.0, 0.9, 3.5]), zoom: 2.0, screen: [484, 760]};
  const cam = lerpCam(lerpCam(CAM_COVER, deskCam, toDesk), CAM_TRAY, push);
  const thick = 0.09;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam} top={interpolate(frame, [titleOut - 10, titleOut + 0.6 * fps], [GRAPHICS_TOP + 420, GRAPHICS_TOP], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut})}>
        <RoomShell s={ROOM_S} t={t} />
        <WallClock s={ROOM_S} t={t} />
        <Calendar s={ROOM_S} flutter={Math.min(1, flutter)} />
        <Desk s={ROOM_S} t={t} />
        <CardTray s={ROOM_S} cards={Array.from({length: landed}, () => ({novel: false}))} thickness={thick} />
        {pages.map(({st, flight}, i) => {
          const p = (frame - st) / flight;
          if (p <= 0 || p >= 1) return null;
          return <FlyingPage key={i} p={p} landingZ={DESK.h + 0.06 + i * thick} />;
        })}
        <Armchair s={ROOM_S} />
        <Plant s={ROOM_S} t={t} />
      </RoomSvg>
      {/* title only as the opening preview: visible on the cover frame and the first phrase, then removed */}
      <Thesis lines={['Почему годы', 'летят быстрее?']} startFrame={-30} endFrame={titleOut} size={PREVIEW_TITLE_SIZE} accentLine={1} top={420} />
    </AbsoluteFill>
  );
};
