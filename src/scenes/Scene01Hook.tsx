import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {COS30, SIN30} from '../lib/iso';
import {Thesis} from '../components/Thesis';
import {Armchair, CAL, Calendar, CalendarPage, CardTray, Desk, Plant, RoomShell, TRAY, WallClock, DESK} from '../illustrations/Room';
import {Cam, lerpCam, RoomSvg, ROOM_S, roomPoint} from './RoomScene';

export const TRAY_FOCUS = roomPoint([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, DESK.h + 0.3]);
export const CAM_WIDE: Cam = {focus: [540, 840], zoom: 1, screen: [540, 840]};
export const CAM_TRAY: Cam = {focus: TRAY_FOCUS, zoom: 1.75, screen: [540, 900]};

export const PAGE_COUNT = 10;

/** Start frames of the torn pages: intervals shrink, so the years fly faster and faster. */
export const pageStarts = (start: number, fps: number) => {
  const out: number[] = [];
  let t = start;
  let gap = 0.42 * fps;
  for (let i = 0; i < PAGE_COUNT; i++) {
    out.push(Math.round(t));
    t += gap;
    gap = Math.max(0.1 * fps, gap * 0.78);
  }
  return out;
};

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
  const starts = pageStarts(decade - 4, fps);
  const flight = Math.round(0.6 * fps);
  const landed = starts.filter((st) => frame >= st + flight).length;
  const flutter = starts.reduce((acc, st) => acc + Math.max(0, 1 - Math.abs(frame - st) / 6), 0);
  // camera: slow drift in, then a motivated push toward the tray on "Почему"
  // wide room on the cover frame, then a move toward the desk while pages tear, then into the tray on "Почему"
  const toDesk = interpolate(frame, [decade - 12, decade + 0.9 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const push = interpolate(frame, [why - 6, scene.durationInFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const deskCam: Cam = {focus: roomPoint([5.6, 0.6, 3.6]), zoom: 1.4, screen: [540, 900]};
  const cam = lerpCam(lerpCam(CAM_WIDE, deskCam, toDesk), CAM_TRAY, push);
  const thick = 0.09;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <RoomShell s={ROOM_S} t={t} />
        <WallClock s={ROOM_S} t={t} />
        <Calendar s={ROOM_S} flutter={Math.min(1, flutter)} />
        <Desk s={ROOM_S} t={t} />
        <CardTray s={ROOM_S} cards={Array.from({length: landed}, () => ({novel: false}))} thickness={thick} />
        {starts.map((st, i) => {
          const p = (frame - st) / flight;
          if (p <= 0 || p >= 1) return null;
          return <FlyingPage key={i} p={p} landingZ={DESK.h + 0.06 + i * thick} />;
        })}
        <Armchair s={ROOM_S} />
        <Plant s={ROOM_S} t={t} />
      </RoomSvg>
      {/* title only as the opening preview: visible on the cover frame and the first phrase, gone before the pages start to tear */}
      <Thesis lines={['Почему годы', 'летят быстрее?']} startFrame={-30} endFrame={decade - 8} size={88} accentLine={1} />
    </AbsoluteFill>
  );
};
