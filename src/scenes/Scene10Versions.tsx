import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, STROKE, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage, Sheet, SHEET_W, TRAY_TOP} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';
import {HEAD_PATH} from '../illustrations/MemoryCards';

const sector = (cx: number, cy: number, r: number, a: number) => {
  const a0 = -Math.PI / 2;
  const a1 = a0 + a;
  const large = a > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`;
};

const Badge: React.FC<{n: string; x: number; y: number; p: number}> = ({n, x, y, p}) => (
  <g transform={`translate(${x} ${y}) scale(${p})`} opacity={p > 0 ? 1 : 0}>
    <circle r={44} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
    <text y={18} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={52} fill={COLORS.fillLight}>
      {n}
    </text>
  </g>
);

/** Scene 10: other explanations. (2) a year is a shrinking share of a growing life; (3) a young mind notices more frames a day. */
export const Scene10Versions: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const second = beat(scene, 'second');
  const tenth = beat(scene, 'tenth');
  const tiny = beat(scene, 'tiny');
  const third = beat(scene, 'third');
  const images = beat(scene, 'images');
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  const open = interpolate(frame, [0, 0.8 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const close = interpolate(frame, [scene.durationInFrames - 0.7 * fps, scene.durationInFrames], [0, 1], {...clamp, easing: EASE.inOut});
  const pieIn = interpolate(frame, [tenth - 30, tenth + 10], [0, 1], {...clamp, easing: EASE.out});
  const growP = interpolate(frame, [tiny - 1.0 * fps, tiny + 0.3 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const toThird = interpolate(frame, [third - 20, third + 20], [0, 1], {...clamp, easing: EASE.inOut});
  const r0 = 110;
  const r = r0 + growP * 170;
  const angle = (2 * Math.PI * (r0 * r0)) / 10 / (r * r); // the year's area stays the same, the life grows
  const cx = SHEET_W / 2;
  const frames = (count: number, x0: number, y: number, p: number) =>
    Array.from({length: count}, (_, i) => {
      const q = interpolate(p, [i / count, i / count + 0.3], [0, 1], clamp);
      return <rect key={i} x={x0 + i * 52} y={y} width={44} height={60} rx={6} fill={i % 3 === 0 ? COLORS.accentSoft : COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.secondary} opacity={q} transform={`translate(0 ${(1 - q) * 20})`} />;
    });
  const imgP = interpolate(frame, [third + 10, images + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <div style={{opacity: 0.25 + 0.75 * close}}>
        <RoomStage cam={{...CAM_TRAY, zoom: 2.0, screen: [484, 900]}} t={t} cards={plainCards(n)} squash={0.28} />
      </div>
      <Sheet p={open * (1 - close)} from={TRAY_TOP(n)}>
        <Badge n="2" x={80} y={90} p={interpolate(frame, [second - 6, second + 10], [0, 1], {...clamp, easing: EASE.overshoot}) * (1 - toThird)} />
        <g opacity={pieIn * (1 - toThird)} transform={`translate(0 ${-toThird * 200})`}>
          <circle cx={cx} cy={430} r={r} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.main} />
          <path d={sector(cx, 430, r, angle)} fill={COLORS.accent} stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round" />
          <text x={cx} y={760} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={56} fill={COLORS.ink} opacity={1 - growP}>
            1/10
          </text>
        </g>
        <Badge n="3" x={80} y={90} p={interpolate(frame, [third - 6, third + 10], [0, 1], {...clamp, easing: EASE.overshoot})} />
        <g opacity={toThird}>
          {/* young mind: many frames a day */}
          <g transform="translate(70 170) scale(0.62)">
            <path d={HEAD_PATH} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main / 0.62} strokeLinejoin="round" />
          </g>
          {frames(9, 250, 250, imgP)}
          {/* older mind: fewer frames */}
          <g transform="translate(70 520) scale(0.72)">
            <path d={HEAD_PATH} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main / 0.72} strokeLinejoin="round" />
          </g>
          {frames(4, 250, 620, imgP)}
        </g>
      </Sheet>
    </AbsoluteFill>
  );
};
