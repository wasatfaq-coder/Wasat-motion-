import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage, Sheet, SHEET_W, TRAY_TOP} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';

const QUESTION = 'M-90,-60 C-90,-150 90,-150 90,-60 C90,0 0,10 0,70 L0,100';

const Sparkle: React.FC = () => <path d="M0,-50 L12,-12 L50,0 L12,12 L0,50 L-12,12 L-50,0 L-12,-12 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />;
const Eye: React.FC = () => (
  <g fill="none" stroke={COLORS.ink} strokeWidth={STROKE.main}>
    <path d="M-55,0 Q0,-45 55,0 Q0,45 -55,0 Z" fill={COLORS.fillLight} />
    <circle r={16} fill={COLORS.ink} />
  </g>
);
const Heart: React.FC = () => <path d="M0,40 C-60,0 -50,-45 -20,-45 C-5,-45 0,-30 0,-25 C0,-30 5,-45 20,-45 C50,-45 60,0 0,40 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} strokeLinejoin="round" />;

/** Scene 11: honest caveat. A question mark draws itself; novelty, attention and emotions appear as three icons. Calm pacing. */
export const Scene11Caveat: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const hyp = beat(scene, 'hypotheses');
  const argue = beat(scene, 'argue');
  const attention = beat(scene, 'attention');
  const stretch = beat(scene, 'stretch');
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  const open = interpolate(frame, [0, 0.8 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const close = interpolate(frame, [stretch - 10, stretch + 0.6 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const q = interpolate(frame, [hyp - 20, hyp + 1.0 * fps], [0, 1], clamp);
  const evo = evolvePath(q, QUESTION);
  const sway = Math.sin((frame / (3 * fps)) * Math.PI * 2) * 2;
  const icon = (start: number, i: number) => interpolate(frame, [start - 10 + i * 8, start + 14 + i * 8], [0, 1], {...clamp, easing: EASE.overshoot});
  const cx = SHEET_W / 2;
  const icons = [
    {el: <Sparkle />, p: icon(argue + 20, 0), hl: 0},
    {el: <Eye />, p: icon(argue + 20, 1), hl: interpolate(frame, [attention - 6, attention + 10], [0, 1], clamp)},
    {el: <Heart />, p: icon(argue + 20, 2), hl: interpolate(frame, [attention + 30, attention + 46], [0, 1], clamp)},
  ];
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <div style={{opacity: 0.25 + 0.75 * close}}>
        <RoomStage cam={{...CAM_TRAY, zoom: 2.4 + close * 0.3, screen: [484, 880]}} t={t} cards={plainCards(n)} squash={0.28} dashedExtra={close * 0.9} />
      </div>
      <Sheet p={open * (1 - close)} from={TRAY_TOP(n)}>
        <g transform={`translate(${cx} 330) rotate(${sway})`}>
          <path d={QUESTION} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.main * 4} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
          <circle cx={0} cy={170} r={18 * (q >= 1 ? 1 : 0)} fill={COLORS.accent} />
        </g>
        {icons.map((ic, i) => (
          <g key={i} transform={`translate(${cx + (i - 1) * 250} 700) scale(${ic.p})`}>
            <circle r={90} fill={ic.hl > 0.5 ? COLORS.accentSoft : COLORS.fillMid} stroke={ic.hl > 0.5 ? COLORS.accent : COLORS.ink} strokeWidth={STROKE.main} />
            {ic.el}
          </g>
        ))}
      </Sheet>
    </AbsoluteFill>
  );
};
