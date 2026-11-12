import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, LW, LW2, LW3, Sticky, WallBackdrop} from '../illustrations/Board';
import {HEAD_PATH} from '../illustrations/MemoryCards';

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
      <circle cx={cx} cy={cy} r={r} fill="#F6E1C8" stroke={COLORS.ink} strokeWidth={LW} />
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
            <path d={`M${x},${y - 6} q-7,-10 0,-${20 * fl} q7,${10 * fl} 0,${20 * fl}`} fill="#F8C35A" stroke={COLORS.ink} strokeWidth={1.5} />
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
const Film: React.FC<{x: number; y: number; w: number; frames: number; scroll: number; reveal: number}> = ({x, y, w, frames, scroll, reveal}) => {
  const fw = w / frames;
  return (
    <g>
      <defs>
        <clipPath id={`film${y}`}>
          <rect x={x} y={y} width={w * reveal} height={120} />
        </clipPath>
      </defs>
      <g clipPath={`url(#film${y})`}>
        <rect x={x} y={y} width={w} height={120} fill={COLORS.ink} />
        {Array.from({length: frames + 1}, (_, i) => {
          const fx = x + ((i * fw + scroll) % (w + fw)) - fw;
          return (
            <g key={i}>
              <rect x={fx + 6} y={y + 24} width={fw - 12} height={72} rx={4} fill={i % 3 === 0 ? COLORS.accentSoft : COLORS.fillLight} />
              <path d={`M${fx + 12},${y + 86} L${fx + fw * 0.4},${y + 50} L${fx + fw * 0.6},${y + 70} L${fx + fw - 12},${y + 44}`} fill="none" stroke={COLORS.ink} strokeWidth={2} />
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
  const cakeIn = interpolate(frame, [second, second + 24], [0, 1], {...cl, easing: EASE.out});
  const filmP = interpolate(frame, [third + 10, third + 50], [0, 1], cl);
  const scroll = frame * 6;
  const shots: [number, Cam2D][] = [
    [0, {focus: [300, 450], zoom: 1.6, screen: [484, 640]}], // sticky "2"
    [second + 20, {focus: [500, 760], zoom: 1.0, screen: [484, 740]}], // the cake
    [tenth - 20, {focus: [500, 560], zoom: 1.5, screen: [484, 700]}], // the slice comes out
    [tiny - 1.3 * fps, {focus: [500, 760], zoom: 0.85, screen: [484, 740]}], // the cake grows: 50 candles
    [third - 20, {focus: [500, 1700], zoom: 1.0, screen: [484, 740]}], // pan down to the films
    [images - 30, {focus: [560, 1640], zoom: 1.25, screen: [484, 760]}],
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.55 * fps], [0, 1], cl));
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <WallBackdrop />
        <rect x={-400} y={1160} width={1880} height={1400} fill={COLORS.fillLight} />
        <Sticky x={170} y={330} w={200} rot={-6}>
          <text x={100} y={140} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={120} fill={COLORS.accent}>2</text>
        </Sticky>
        <g opacity={cakeIn} transform={`translate(0 ${(1 - cakeIn) * 60})`}>
          <Cake cx={500} cy={780} r={r} slices={slices} candles={candles} pull={pull} frame={frame} />
        </g>
        {/* (3) young vs older: same day, different number of frames */}
        <Sticky x={120} y={1360} w={200} rot={5}>
          <text x={100} y={140} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={120} fill={COLORS.accent}>3</text>
        </Sticky>
        <g transform="translate(110 1540) scale(0.5)">
          <path d={HEAD_PATH} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW / 0.5} strokeLinejoin="round" />
        </g>
        <Film x={260} y={1570} w={640} frames={9} scroll={scroll * 1.6} reveal={filmP} />
        <g transform="translate(100 1760) scale(0.62)">
          <path d={HEAD_PATH} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW / 0.62} strokeLinejoin="round" />
        </g>
        <Film x={260} y={1800} w={640} frames={4} scroll={scroll * 0.7} reveal={filmP} />
      </FrontalSvg>
    </AbsoluteFill>
  );
};
