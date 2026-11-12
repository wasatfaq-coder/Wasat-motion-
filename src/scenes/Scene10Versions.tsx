import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, LW, LW2, LW3, RoomWallBackdrop, TableTop} from '../illustrations/Board';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

/** Top view of a birthday cake on a plate: cream rim, candles with flickering flames, one slice (= one year) pulled out. */
const Cake: React.FC<{cx: number; cy: number; r: number; slices: number; candles: number; pull: number; frame: number}> = ({cx, cy, r, slices, candles, pull, frame}) => {
  const a = (2 * Math.PI) / slices;
  const a0 = -Math.PI / 2;
  const slice = (rr: number) =>
    `M0,0 L${rr * Math.cos(a0)},${rr * Math.sin(a0)} A${rr},${rr} 0 0 1 ${rr * Math.cos(a0 + a)},${rr * Math.sin(a0 + a)} Z`;
  const mid = a0 + a / 2;
  return (
    <g>
      {/* plate */}
      <circle cx={cx + 10} cy={cy + 14} r={r + 60} fill={COLORS.fillDark} />
      <circle cx={cx} cy={cy} r={r + 60} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
      <circle cx={cx} cy={cy} r={r + 40} fill="none" stroke={COLORS.inkSoft} strokeWidth={LW3} />
      {/* cake body */}
      <circle cx={cx} cy={cy} r={r} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} />
      {/* cream dots on the rim */}
      {Array.from({length: 36}, (_, i) => {
        const t = (i / 36) * Math.PI * 2;
        return <circle key={i} cx={cx + Math.cos(t) * (r - 18)} cy={cy + Math.sin(t) * (r - 18)} r={9} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW3 - 0.5} />;
      })}
      {/* slice cuts */}
      {Array.from({length: slices}, (_, i) => {
        const t = a0 + i * a;
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(t) * r} y2={cy + Math.sin(t) * r} stroke={COLORS.inkSoft} strokeWidth={slices > 20 ? 1.5 : LW3} />;
      })}
      {/* candles */}
      {Array.from({length: candles}, (_, i) => {
        const t = (i / candles) * Math.PI * 2 + 0.2;
        const rr = r * (candles > 20 ? 0.62 + (i % 2) * 0.14 : 0.58);
        const x = cx + Math.cos(t) * rr;
        const y = cy + Math.sin(t) * rr;
        const fl = 1 + 0.15 * Math.sin(frame * 0.5 + random(`fl${i}`) * 6);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={7} fill={i % 3 === 0 ? COLORS.accentSoft : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={2} />
            <path d={`M${x},${y - 6} q-7,-10 0,-${20 * fl} q7,${10 * fl} 0,${20 * fl}`} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={1.5} />
          </g>
        );
      })}
      {/* the pulled-out slice = one year */}
      <g transform={`translate(${cx + Math.cos(mid) * pull} ${cy + Math.sin(mid) * pull})`}>
        <path d={slice(r)} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW} strokeLinejoin="round" />
      </g>
    </g>
  );
};

/** Film strip with sprocket holes and small frames; it scrolls (speed) to show "pictures per day". */
/** Frontal bust holding a camera to the eye; kid = cap, elderly = glasses and grey hair. */
const Bust: React.FC<{x: number; y: number; s: number; kid?: boolean}> = ({x, y, s, kid}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-110,140 L-110,60 C-110,10 -60,0 0,0 C60,0 110,10 110,60 L110,140 Z" fill={kid ? COLORS.accentSoft : COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} strokeLinejoin="round" />
    <circle cx={0} cy={-70} r={64} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
    {kid ? (
      <path d="M-62,-90 C-50,-150 50,-150 62,-90 L100,-86 L62,-80 Z" fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW3} strokeLinejoin="round" />
    ) : (
      <g>
        <path d="M-64,-80 C-60,-140 60,-140 64,-80 C40,-110 -40,-110 -64,-80 Z" fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW3} />
        <circle cx={-24} cy={-66} r={16} fill="none" stroke={COLORS.ink} strokeWidth={LW3} />
        <circle cx={24} cy={-66} r={16} fill="none" stroke={COLORS.ink} strokeWidth={LW3} />
        <line x1={-8} y1={-66} x2={8} y2={-66} stroke={COLORS.ink} strokeWidth={LW3} />
      </g>
    )}
    {/* camera in front of the face */}
    <rect x={30} y={-100} width={110} height={70} rx={10} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
    <circle cx={110} cy={-65} r={22} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3} />
  </g>
);

const Film: React.FC<{x: number; y: number; w: number; frames: number; scroll: number; reveal: number}> = ({x, y, w, frames, scroll, reveal}) => {
  const fw = w / frames;
  return (
    <g>
      <defs>
        <clipPath id={`film${x}-${y}`}>
          <rect x={x} y={y} width={w * reveal} height={120} />
        </clipPath>
      </defs>
      <g clipPath={`url(#film${x}-${y})`}>
        <rect x={x} y={y} width={w} height={120} fill={COLORS.ink} />
        {Array.from({length: frames + 1}, (_, i) => {
          const fx = x + ((i * fw + scroll) % (w + fw)) - fw;
          return (
            <g key={i}>
              <rect x={fx + 6} y={y + 24} width={fw - 12} height={72} rx={4} fill={i % 3 === 0 ? COLORS.accentSoft : COLORS.fillLight} />
              {i % 3 === 0 ? (
                <g>
                  <path d={`M${fx + 14},${y + 88} L${fx + 14},${y + 62} L${fx + fw / 2},${y + 40} L${fx + fw - 14},${y + 62} L${fx + fw - 14},${y + 88} Z`} fill="none" stroke={COLORS.ink} strokeWidth={2} strokeLinejoin="round" />
                </g>
              ) : i % 3 === 1 ? (
                <g>
                  <circle cx={fx + fw / 2} cy={y + 52} r={12} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={2} />
                  <path d={`M${fx + 10},${y + 88} Q${fx + fw / 2},${y + 66} ${fx + fw - 10},${y + 88}`} fill="none" stroke={COLORS.ink} strokeWidth={2} />
                </g>
              ) : (
                <g>
                  <circle cx={fx + fw / 2} cy={y + 55} r={16} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={2} />
                  <line x1={fx + fw / 2} y1={y + 71} x2={fx + fw / 2} y2={y + 90} stroke={COLORS.ink} strokeWidth={2} />
                </g>
              )}
              {[0.25, 0.75].map((k) => (
                <g key={k}>
                  <rect x={fx + fw * k - 5} y={y + 6} width={10} height={10} rx={2} fill={COLORS.fillLight} />
                  <rect x={fx + fw * k - 5} y={y + 104} width={10} height={10} rx={2} fill={COLORS.fillLight} />
                </g>
              ))}
            </g>
          );
        })}
      </g>
      <rect x={x} y={y} width={w * reveal} height={120} fill="none" stroke={COLORS.ink} strokeWidth={LW2} />
    </g>
  );
};

/** Scene 10: (2) a year is one slice of the cake of life — the cake grows, the slice gets thin; (3) a young mind's film has more frames per day. */
export const Scene10Versions: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = beat(scene, 'second');
  const tenth = beat(scene, 'tenth');
  const tiny = beat(scene, 'tiny');
  const third = beat(scene, 'third');
  const images = beat(scene, 'images');
  const grow = interpolate(frame, [tiny - 1.2 * fps, tiny + 0.2 * fps], [0, 1], {...cl, easing: EASE.inOut});
  const slices = Math.round(10 + grow * 40);
  const candles = Math.round(10 + grow * 40);
  const r = 230 + grow * 70;
  const pull = interpolate(frame, [tenth - 14, tenth + 10], [0, 70], {...cl, easing: EASE.overshoot}) * (1 - grow * 0.4);
  const cakeIn = interpolate(frame, [0, 18], [0, 1], {...cl, easing: EASE.out});
  const filmP = interpolate(frame, [third + 10, third + 50], [0, 1], cl);
  const scroll = frame * 6;
  const shots: [number, Cam2D][] = [
    [0, {focus: [500, 760], zoom: 0.8, screen: [484, 720]}], // festive table from above
    [second + 20, {focus: [500, 760], zoom: 1.0, screen: [484, 740]}], // the cake
    [tenth - 20, {focus: [500, 560], zoom: 1.5, screen: [484, 700]}], // the slice comes out
    [tiny - 1.3 * fps, {focus: [500, 760], zoom: 0.85, screen: [484, 740]}], // the cake grows: 50 candles
    [third - 20, {focus: [2200, 700], zoom: 0.9, screen: [484, 720]}], // pan to the child and the elderly person
    [images - 30, {focus: [2200, 640], zoom: 1.0, screen: [484, 720]}],
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.55 * fps], [0, 1], cl));
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        {/* films part: a room to the right of the table (frontal); the table part is seen from above */}
        <g transform="translate(1700 0)">
          <RoomWallBackdrop frame={frame} window={[1180, 260]} shelf={-180} />
        </g>
        <g>
          <clipPath id="tableClip">
            <rect x={-600} y={-400} width={2000} height={2600} />
          </clipPath>
          <g clipPath="url(#tableClip)">
            <TableTop />
            {/* festive table: plates, cups, confetti, a gift */}
            {[[120, 420], [880, 470], [140, 1080], [860, 1100]].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={92} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
                <circle cx={x} cy={y} r={66} fill="none" stroke={COLORS.inkSoft} strokeWidth={LW3} />
              </g>
            ))}
            {[[300, 330], [700, 1180]].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={44} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW} />
                <circle cx={x} cy={y} r={30} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW3} />
                <path d={`M${x + 44},${y} q30,0 30,20`} fill="none" stroke={COLORS.ink} strokeWidth={LW2} />
              </g>
            ))}
            <g transform="translate(820 260) rotate(12)">
              <rect x={-70} y={-70} width={140} height={140} rx={10} fill={COLORS.accentSoft} stroke={COLORS.ink} strokeWidth={LW} />
              <rect x={-14} y={-70} width={28} height={140} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW3} />
              <rect x={-70} y={-14} width={140} height={28} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={LW3} />
            </g>
            {Array.from({length: 40}, (_, i) => (
              <rect key={i} x={-100 + random(`cf${i}`) * 1200} y={200 + random(`cg${i}`) * 1000} width={14} height={8} rx={2} transform={`rotate(${random(`cr${i}`) * 180} ${-100 + random(`cf${i}`) * 1200} ${200 + random(`cg${i}`) * 1000})`} fill={i % 3 === 0 ? COLORS.accent : i % 3 === 1 ? COLORS.accent : COLORS.accentSoft} />
            ))}
            <g opacity={cakeIn} transform={`translate(0 ${(1 - cakeIn) * 60})`}>
              <Cake cx={500} cy={780} r={r} slices={slices} candles={candles} pull={pull} frame={frame} />
            </g>
          </g>
        </g>
        {/* (3) a child and an elderly person with cameras: same day, different number of frames */}
        <g transform="translate(1700 0)">
          {/* both sit at a table: the child on the left, the elderly person on the right; films rise above them */}
          <Film x={40} y={380} w={420} frames={8} scroll={scroll * 1.6} reveal={filmP} />
          <Film x={540} y={380} w={420} frames={4} scroll={scroll * 0.7} reveal={filmP} />
          <Bust x={230} y={850} s={1.0} kid />
          <Bust x={720} y={850} s={1.15} />
          <rect x={-40} y={960} width={1100} height={60} rx={10} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW} />
          <rect x={20} y={1020} width={40} height={100} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW3} />
          <rect x={960} y={1020} width={40} height={100} fill={COLORS.fillDark} stroke={COLORS.ink} strokeWidth={LW3} />
        </g>
      </FrontalSvg>
    </AbsoluteFill>
  );
};
