import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {COLORS, STROKE} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage, Sheet, SHEET_W, TRAY_TOP} from './stage';
import {HOLIDAY_CARDS} from './Scene07Holiday';
import {CARD_H, CARD_W, HEAD_PATH, MemoryCard} from '../illustrations/MemoryCards';

const KINDS = ['street', 'ticket', 'wave'] as const;

/** Scene 8: novelty. Bright cards with distinct drawings go into the head; many new cards → the period stack stands tall. */
export const Scene08Novelty: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  const streets = beat(scene, 'streets');
  const brain = beat(scene, 'brain');
  const memories = beat(scene, 'memories');
  const long = beat(scene, 'long');
  const open = interpolate(frame, [0, 0.8 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const close = interpolate(frame, [scene.durationInFrames - 0.7 * fps, scene.durationInFrames], [0, 1], {...clamp, easing: EASE.inOut});
  const n = HOOK_CARDS + HOLIDAY_CARDS;
  // phase A: three cards fan out; phase B: head outline draws and the cards slide into it; phase C: the stack grows tall
  const fan = (i: number) => interpolate(frame, [streets - 20 + i * 10, streets + 15 + i * 10], [0, 1], {...clamp, easing: EASE.overshoot});
  const head = interpolate(frame, [brain - 10, brain + 0.9 * fps], [0, 1], clamp);
  const intoHead = interpolate(frame, [memories - 20, memories + 0.6 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const grow = interpolate(frame, [long - 1.0 * fps, long + 0.3 * fps], [0, 1], {...clamp, easing: EASE.inOut});
  const headEvo = evolvePath(head, HEAD_PATH);
  const cx = SHEET_W / 2;
  const stackCount = Math.round(4 + grow * 14);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <div style={{opacity: 0.25 + 0.75 * close}}>
        <RoomStage cam={{...CAM_TRAY, zoom: 2.4, screen: [484, 900]}} t={t} cards={plainCards(n)} />
      </div>
      <Sheet p={open * (1 - close)} from={TRAY_TOP(n)}>
        {/* head outline (memory) */}
        <g transform={`translate(${cx - 230} 120) scale(1.5)`} opacity={head > 0 ? 1 - grow * 0.9 : 0}>
          <path d={HEAD_PATH} fill="none" stroke={COLORS.ink} strokeWidth={STROKE.main / 1.5} strokeDasharray={headEvo.strokeDasharray} strokeDashoffset={headEvo.strokeDashoffset} strokeLinejoin="round" />
        </g>
        {/* three new-memory cards */}
        {KINDS.map((k, i) => {
          const p = fan(i);
          const fx = cx - CARD_W / 2 + (i - 1) * 250;
          const fy = 560 + Math.abs(i - 1) * 30;
          const hx = cx - CARD_W / 2 + 20 + (i - 1) * 30;
          const hy = 260 + i * 40;
          const x = fx + (hx - fx) * intoHead;
          const y = fy + (hy - fy) * intoHead;
          const sc = p * (1 - intoHead * 0.45);
          const rot = (i - 1) * 8 * (1 - intoHead);
          return p > 0 ? (
            <g key={k} transform={`translate(${x + CARD_W / 2} ${y + CARD_H / 2}) rotate(${rot}) scale(${sc}) translate(${-CARD_W / 2} ${-CARD_H / 2})`} opacity={1 - grow}>
              <MemoryCard kind={k} />
            </g>
          ) : null;
        })}
        {/* the period stack: many new cards → tall stack */}
        {grow > 0 ? (
          <g opacity={grow}>
            {Array.from({length: stackCount}, (_, i) => (
              <g key={i} transform={`translate(${cx - 120 + (i % 2) * 6} ${720 - i * 26}) scale(1, 0.32)`}>
                <MemoryCard kind={KINDS[i % 3]} novel={i % 2 === 0} />
              </g>
            ))}
            <line x1={cx + 170} y1={770} x2={cx + 170} y2={770 - stackCount * 26 - 40} stroke={COLORS.accent} strokeWidth={STROKE.main} strokeLinecap="round" />
            <path d={`M${cx + 155},${770 - stackCount * 26 - 25} L${cx + 170},${770 - stackCount * 26 - 45} L${cx + 185},${770 - stackCount * 26 - 25}`} fill="none" stroke={COLORS.accent} strokeWidth={STROKE.main} strokeLinejoin="round" />
          </g>
        ) : null}
      </Sheet>
    </AbsoluteFill>
  );
};
