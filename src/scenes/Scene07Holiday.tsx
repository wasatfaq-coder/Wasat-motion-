import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, mix} from '../lib/anim';
import {lerpCam, ROOM_S, roomPoint} from './RoomScene';
import {CAL, Calendar, DESK, TRAY} from '../illustrations/Room';
import {shotCam} from './shots';
import {FlyingCard, Suitcase} from '../illustrations/Props';
import {HOOK_CARDS, plainCards, RoomStage} from './stage';
import {RoomSvg} from './RoomScene';
import {Ground, IsoPerson, Sea, Tree, Umbrella} from '../illustrations/CityKit';
import {Box, Line3} from '../illustrations/primitives';
import {Suitcase as Suitcase3D} from '../illustrations/Props';
import {iso, P3, planeMatrix} from '../lib/iso';

export const HOLIDAY_CARDS = 8;
const SUITCASE: P3 = [4.2, 2.9, 0];

/** Scene 7: holiday paradox. The calendar flips fast (days fly), but a thick pile of bright cards comes out of the suitcase into memory. */
export const Scene07Holiday: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const fast = beat(scene, 'fast');
  const long = beat(scene, 'long');
  const flutter = interpolate(frame, [fast - 10, fast, fast + 0.9 * fps, fast + 1.1 * fps], [0, 1, 1, 0], clamp) * Math.abs(Math.sin(frame * 1.3));
  const open = interpolate(frame, [long - 40, long - 10], [0, 1], {...clamp, easing: EASE.out});
  const starts = Array.from({length: HOLIDAY_CARDS}, (_, i) => long - 12 + i * 5);
  const flight = Math.round(0.45 * fps);
  const landed = starts.filter((st) => frame >= st + flight).length;
  const cards = [...plainCards(HOOK_CARDS), ...Array.from({length: landed}, () => ({novel: true}))];
  const camStart = {focus: roomPoint([5.0, 1.8, 2.6]), zoom: 1.9, screen: [484, 780] as [number, number]};
  const camEnd = {focus: roomPoint([6.2, 1.6, 3.0]), zoom: 2.2, screen: [484, 760] as [number, number]};
  void lerpCam;
  const calCam = {focus: roomPoint([CAL.u + 0.75, 0, CAL.z - 1.0]), zoom: 3.0, screen: [484, 760] as [number, number]};
  const suitCam = {focus: roomPoint([SUITCASE[0] + 0.9, SUITCASE[1] + 0.35, 1.0]), zoom: 2.6, screen: [484, 860] as [number, number]};
  void calCam;
  const cam = shotCam(frame, [
    [0, camStart],
    [long - 70, suitCam], // the suitcase opens
    [long + 10, camEnd], // bright cards pile up in memory
    [beat(scene, 'how') - 10, {...camEnd, zoom: 1.8}],
  ]);
  const src: P3 = [SUITCASE[0] + 0.3, SUITCASE[1] + 0.1, 1.4];
  const pileTop = (n: number) => DESK.h + 0.06 + n * 0.09;
  // part 1: the beach — the sun races across the sky three times (days fly)
  const home = long - 75;
  const beachCam = shotCam(frame, [
    [0, {focus: roomPoint([6.0, 4.6, 1.6]), zoom: 1.45, screen: [500, 740]}], // the beach: sea, boat, umbrellas, the sun racing
    [fast - 20, {focus: roomPoint([6.2, 4.0, 2.2]), zoom: 1.5, screen: [500, 760]}],
    [fast + 1.2 * fps, {focus: roomPoint([6.3, 7.5, 1.0]), zoom: 2.4, screen: [500, 740]}], // the suitcase, big
  ]);
  // the sun crosses the sky above the sea three times (days fly); drawn first, behind everything
  const sunP = interpolate(frame, [fast - 10, home], [0, 3], clamp);
  const sf = sunP % 1;
  const [sx, sy] = iso(ROOM_S)([1.0 + sf * 10, -1.6, 1.6 + Math.sin(Math.PI * sf) * 2.4]);
  const bob = Math.sin(t * 2.2) * 0.05;
  if (frame < home) {
    return (
      <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
        <RoomSvg cam={beachCam}>
          {sunP > 0 && sunP < 3 ? (
            <g>
              <circle cx={sx} cy={sy} r={0.6 * ROOM_S} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
              {Array.from({length: 8}, (_, k) => {
                const a = (k / 8) * Math.PI * 2 + frame * 0.05;
                return <line key={k} x1={sx + Math.cos(a) * 0.78 * ROOM_S} y1={sy + Math.sin(a) * 0.78 * ROOM_S} x2={sx + Math.cos(a) * 1.0 * ROOM_S} y2={sy + Math.sin(a) * 1.0 * ROOM_S} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinecap="round" />;
              })}
            </g>
          ) : null}
          <Sea s={ROOM_S} at={[0, 0, 0]} w={12} d={3.6} t={t} />
          {/* foam line at the shore */}
          <Line3 s={ROOM_S} width={STROKE.main} color={COLORS.fillLight} points={Array.from({length: 25}, (_, k) => [k * 0.5, 3.6 - 0.08 - Math.abs(Math.sin(t * 1.5 + k * 0.7)) * 0.12, 0.01] as P3)} />
          {/* sailing boat bobbing on the sea */}
          <Box s={ROOM_S} at={[7.0, 1.3, 0.02 + bob]} size={[1.5, 0.55, 0.28]} stroke={STROKE.secondary} />
          <Line3 s={ROOM_S} width={STROKE.main} points={[[7.75, 1.57, 0.3 + bob], [7.75, 1.57, 2.1 + bob]]} />
          <Line3 s={ROOM_S} close fill={COLORS.fillLight} width={STROKE.secondary} points={[[7.8, 1.57, 2.0 + bob], [8.6, 1.57, 0.45 + bob], [7.8, 1.57, 0.45 + bob]]} />
          <Ground s={ROOM_S} at={[0, 3.6, 0]} w={12} d={6.4} fill={COLORS.floor} />
          {/* sand ripples */}
          {Array.from({length: 5}, (_, i) => (
            <Line3 key={i} s={ROOM_S} width={STROKE.micro} color={COLORS.inkSoft} points={Array.from({length: 9}, (_, k) => [1 + k * 1.2, 4.6 + i * 1.1 + Math.sin(k + i) * 0.12, 0.005] as P3)} />
          ))}
          <Umbrella s={ROOM_S} at={[3.0, 4.9, 0]} />
          {/* towel with stripes */}
          <g transform={planeMatrix(ROOM_S, 'floor', [2.3, 5.4, 0.01])}>
            <rect x={0} y={0} width={0.9} height={1.8} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} vectorEffect="non-scaling-stroke" />
            {[0.4, 0.8, 1.2].map((k) => (
              <line key={k} x1={0} y1={k} x2={0.9} y2={k} stroke={COLORS.inkSoft} strokeWidth={STROKE.micro} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          <IsoPerson s={ROOM_S} at={[3.6, 5.3, 0]} h={1.1} walk={0} bob={Math.sin(t * 2) * 0.02} />
          <Umbrella s={ROOM_S} at={[9.0, 4.6, 0]} />
          {/* deck chair under the second umbrella */}
          <Line3 s={ROOM_S} close fill={COLORS.fillMid} width={STROKE.secondary} points={[[8.4, 5.3, 0.35], [9.6, 5.3, 0.35], [9.6, 5.9, 0.35], [8.4, 5.9, 0.35]]} />
          <Line3 s={ROOM_S} close fill={COLORS.fillLight} width={STROKE.secondary} points={[[8.4, 5.3, 0.35], [8.4, 5.9, 0.35], [8.1, 5.9, 1.1], [8.1, 5.3, 1.1]]} />
          <Tree s={ROOM_S} at={[0.8, 8.8, 0]} t={t} seed="palm1" h={2.4} />
          {/* the suitcase: big, in the front */}
          <Suitcase3D s={ROOM_S} at={[5.4, 7.2, 0]} />
          {[[3.0, 8.2], [8.6, 8.6], [9.6, 7.0]].map(([x, y], i) => {
            const [cx, cy] = iso(ROOM_S)([x, y, 0]);
            return <ellipse key={i} cx={cx} cy={cy} rx={9} ry={5} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.micro} />;
          })}
        </RoomSvg>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomStage
        cam={cam}
        t={t}
        cards={cards}
        hideChair
        behind={<Calendar s={ROOM_S} flutter={flutter} />}
        front={
          <>
            <Suitcase s={ROOM_S} at={SUITCASE} open={open} />
            {starts.map((st, i) => {
              const p = (frame - st) / flight;
              if (p <= 0 || p >= 1) return null;
              const e = EASE.inOut(p);
              const to: P3 = [TRAY.x + 0.2, TRAY.y + 0.2, pileTop(HOOK_CARDS + i)];
              const at: P3 = [mix(src[0], to[0], e), mix(src[1], to[1], e), mix(src[2], to[2], e) + Math.sin(Math.PI * p) * 1.4];
              return <FlyingCard key={i} s={ROOM_S} at={at} novel />;
            })}
          </>
        }
      />
    </AbsoluteFill>
  );
};
