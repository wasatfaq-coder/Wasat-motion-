import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {CoverA} from '../Cover';
import {CLOCK} from '../illustrations/Room';
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
export const FlyingPage: React.FC<{p: number; landingZ: number}> = ({p, landingZ}) => {
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
  // physics: A) peel-off anticipation, B) parabolic flight with spin and flutter, C) landing squash + damped bounce
  const A = 0.14;
  const C = 0.84;
  const peel = Math.min(1, p / A);
  const q = Math.max(0, Math.min(1, (p - A) / (C - A)));
  const land = Math.max(0, (p - C) / (1 - C));
  const e = EASE.inOut(q);
  const m = lerpM(wall, floor, e);
  const arc = 4 * Math.pow(q, 0.85) * (1 - q); // gravity-like: rises fast, falls a bit later
  m[5] -= arc * 120 + (p < A ? Math.sin(peel * Math.PI) * 10 : 0);
  m[4] += Math.sin(q * Math.PI) * 30; // slight drift sideways
  const bounce = land > 0 ? Math.abs(Math.sin(land * Math.PI * 2)) * (1 - land) * 10 : 0;
  m[5] -= bounce;
  const spin = q > 0 ? Math.sin(q * Math.PI) * 32 + Math.sin(q * 18) * 6 * (1 - q) : -peel * 8;
  const squash = land > 0 ? 1 - Math.sin(land * Math.PI) * 0.12 * (1 - land) : 1;
  // shadow on the tray grows and darkens as the page comes down
  const [shx, shy] = [fx + COS30 * s * (TRAY.w - 0.3) * 0.5 - COS30 * s * (TRAY.d - 0.3) * 0.5, fy + SIN30 * s * ((TRAY.w - 0.3) + (TRAY.d - 0.3)) * 0.5];
  const shadow = q > 0.2 ? Math.min(1, (q - 0.2) / 0.8) : 0;
  return (
    <g>
      {shadow > 0 && land < 1 ? (
        <ellipse cx={shx} cy={shy} rx={30 + 20 * shadow} ry={10 + 7 * shadow} fill={COLORS.ink} opacity={0.08 + 0.1 * shadow} />
      ) : null}
      <g transform={`matrix(${m.join(',')})`}>
        <g transform={`rotate(${spin} ${pw / 2} ${ph / 2}) translate(${pw / 2} ${ph / 2}) scale(1 ${squash}) skewX(${p < A ? peel * 10 : Math.sin(q * 14) * 4 * (1 - q)}) translate(${-pw / 2} ${-ph / 2})`}>
          <CalendarPage w={pw} h={ph} accent={1 - Math.max(0, (p - 0.6) / 0.4)} />
        </g>
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
  // camera: the room waits in the desk view under the cover; after the title the cover clock flies into the room's wall clock
  const titleOut = previewTitleOut(scene);
  const handover = interpolate(frame, [titleOut - 14, titleOut + 0.55 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const push = interpolate(frame, [why - 6, scene.durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const deskCam: Cam = {focus: roomPoint([6.0, 0.9, 3.5]), zoom: 2.0, screen: [484, 760]};
  const cam = lerpCam(deskCam, CAM_TRAY, push);
  const clockRoom = roomPoint([CLOCK.u, 0, CLOCK.z]);
  const clockScreen: [number, number] = [deskCam.screen![0] + (clockRoom[0] - deskCam.focus[0]) * deskCam.zoom, deskCam.screen![1] + (clockRoom[1] - deskCam.focus[1]) * deskCam.zoom];
  const coverScale = 1 + ((CLOCK.r * ROOM_S * deskCam.zoom) / 218 - 1) * handover;
  const coverX = (clockScreen[0] - 490) * handover;
  const coverY = (clockScreen[1] - 980) * handover;
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
      {/* opening preview = cover A; it hands over to the room by flying into the wall clock */}
      {handover < 1 ? (
        <AbsoluteFill style={{backgroundColor: COLORS.bg}}>{/* no crossfade: the cover clock flies onto the wall clock, then a hard match cut */}
          <div style={{position: 'absolute', inset: 0, transform: `translate(${coverX}px, ${coverY}px) scale(${coverScale})`, transformOrigin: '490px 980px'}}>
            <CoverA frame={frame} />
          </div>
        </AbsoluteFill>
      ) : null}
      {/* title only as the opening preview: visible on the cover frame and the first phrase, then removed */}
      <Thesis lines={['Почему годы', 'летят?']} startFrame={-60} endFrame={titleOut} size={112} accentLine={1} top={420} />
    </AbsoluteFill>
  );
};
