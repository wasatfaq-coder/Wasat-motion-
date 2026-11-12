import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, LW, LW2, LW3, Marker, RoomWallBackdrop, TableTop} from '../illustrations/Board';
import {CARD_H, CARD_W, MemoryCard} from '../illustrations/MemoryCards';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const QUESTION = 'M380,520 C380,400 600,400 600,520 C600,600 490,610 490,690 L490,730';
const QLEN = getLength(QUESTION);

/** Open notebook seen from above: two pages, spiral, handwriting lines. */
const Notebook: React.FC = () => (
  <g>
    <rect x={88} y={318} width={820} height={760} rx={20} fill={COLORS.fillDark} />
    <rect x={80} y={300} width={820} height={760} rx={20} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
    {Array.from({length: 13}, (_, i) => (
      <g key={i}>
        <ellipse cx={130 + i * 60} cy={300} rx={10} ry={22} fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={LW3} />
      </g>
    ))}
    <line x1={150} y1={330} x2={150} y2={1040} stroke={COLORS.accentSoft} strokeWidth={3} />
    {Array.from({length: 12}, (_, i) => (
      <line key={i} x1={110} y1={380 + i * 56} x2={870} y2={380 + i * 56} stroke={COLORS.accentSoft} strokeWidth={1.5} />
    ))}
  </g>
);

/** Scientist bust behind the desk (glasses, lab-coat collar). */
const Scientist: React.FC<{x: number; y: number; flip?: boolean; nod: number}> = ({x, y, flip, nod}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1) rotate(${nod})`}>
    <path d="M-120,200 L-120,90 C-120,40 -70,30 0,30 C70,30 120,40 120,90 L120,200 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} strokeLinejoin="round" />
    <path d="M-30,32 L0,90 L30,32" fill="none" stroke={COLORS.ink} strokeWidth={LW3} />
    <circle cx={0} cy={-40} r={66} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW} />
    <circle cx={-24} cy={-40} r={16} fill="none" stroke={COLORS.ink} strokeWidth={LW3} />
    <circle cx={24} cy={-40} r={16} fill="none" stroke={COLORS.ink} strokeWidth={LW3} />
    <line x1={-8} y1={-40} x2={8} y2={-40} stroke={COLORS.ink} strokeWidth={LW3} />
    <path d="M-60,-70 C-50,-120 50,-120 60,-70" fill="none" stroke={COLORS.ink} strokeWidth={LW2} />
  </g>
);

const Bubble: React.FC<{x: number; y: number; flip?: boolean; p: number; jiggle: number}> = ({x, y, flip, p, jiggle}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -p : p} ${p}) rotate(${jiggle})`}>
    <path d="M-110,-60 Q-110,-110 -50,-110 L60,-110 Q120,-110 120,-60 L120,-10 Q120,40 60,40 L-20,40 L-60,80 L-50,40 Q-110,40 -110,-10 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} strokeLinejoin="round" />
    {[-70, -10, 50].map((cx) => (
      <circle key={cx} cx={cx} cy={-35} r={12} fill={COLORS.ink} />
    ))}
  </g>
);

const Magnifier: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <line x1={70} y1={70} x2={150} y2={150} stroke={COLORS.ink} strokeWidth={22} strokeLinecap="round" />
    <line x1={70} y1={70} x2={150} y2={150} stroke={COLORS.accent} strokeWidth={14} strokeLinecap="round" />
    <circle r={100} fill="rgba(255,255,255,0.25)" stroke={COLORS.ink} strokeWidth={LW * 1.6} />
  </g>
);

/** Scene 11: honest caveat. A marker writes a big question mark in the notebook; two speech bubbles argue; a magnifier finds attention and emotions. */
export const Scene11Caveat: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hyp = beat(scene, 'hypotheses');
  const argue = beat(scene, 'argue');
  const attention = beat(scene, 'attention');
  const stretch = beat(scene, 'stretch');
  const q = interpolate(frame, [0, hyp + 0.9 * fps], [0, 1], cl);
  const evo = evolvePath(EASE.inOut(q), QUESTION);
  const pen = getPointAtLength(QUESTION, Math.max(0.01, QLEN * EASE.inOut(q)));
  const bub = interpolate(frame, [argue - 10, argue + 10], [0, 1], {...cl, easing: EASE.overshoot});
  const jig = Math.sin(frame * 0.6) * 6 * interpolate(frame, [argue, argue + 60, argue + 80], [1, 1, 0], cl);
  const icons = [0, 1, 2].map((i) => interpolate(frame, [argue + 40 + i * 8, argue + 60 + i * 8], [0, 1], {...cl, easing: EASE.overshoot}));
  const magX = interpolate(frame, [attention - 40, attention, attention + 40, attention + 70], [300, 490, 490, 700], {...cl, easing: EASE.inOut});
  const eyeLit = interpolate(frame, [attention - 4, attention + 4], [0, 1], cl);
  const heartLit = interpolate(frame, [attention + 50, attention + 58], [0, 1], cl);
  const shots: [number, Cam2D][] = [
    [0, {focus: [490, 420], zoom: 0.95, screen: [484, 720]}], // scientists at the desk, the marker already writing
    [hyp - 10, {focus: [490, 600], zoom: 1.15, screen: [484, 740]}], // the question mark
    [argue - 16, {focus: [490, 120], zoom: 1.2, screen: [484, 720]}], // the scientists argue
    [attention - 50, {focus: [490, 920], zoom: 1.55, screen: [484, 760]}], // magnifier over icons
    [stretch - 30, {focus: [490, 700], zoom: 0.95, screen: [484, 740]}], // open question to the viewer
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.55 * fps], [0, 1], cl));
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <RoomWallBackdrop frame={frame} window={[700, -260]} shelf={-200} />
        <Scientist x={230} y={40} nod={jig * 0.6} />
        <Scientist x={750} y={40} flip nod={-jig * 0.6} />
        <g>
          <clipPath id="deskClip">
            <rect x={-600} y={250} width={2400} height={2200} />
          </clipPath>
          <g clipPath="url(#deskClip)">
            <TableTop />
            <line x1={-600} y1={250} x2={1800} y2={250} stroke={COLORS.ink} strokeWidth={LW} />
            <Notebook />
            <path d={QUESTION} fill="none" stroke={COLORS.ink} strokeWidth={LW * 3.2} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
            {q >= 1 ? <circle cx={490} cy={800} r={22} fill={COLORS.accent} /> : null}
            {q > 0 && q < 1 && pen ? <Marker x={pen.x} y={pen.y} /> : null}
            {/* three memory cards: a new place, a bright event (attention), an emotion */}
            {(['street', 'ticket', 'party'] as const).map((k, i) => (
              <g key={k} transform={`translate(${250 + (i - 1) * 260 + 240} ${930}) scale(${icons[i] * 0.85}) rotate(${(i - 1) * 6}) translate(${-CARD_W / 2} ${-CARD_H / 2})`}>
                <MemoryCard kind={k} novel={(i === 1 && eyeLit > 0.5) || (i === 2 && heartLit > 0.5)} />
              </g>
            ))}
            {frame > attention - 45 ? <Magnifier x={magX} y={940} /> : null}
          </g>
        </g>
        <Bubble x={380} y={-120} p={bub} jiggle={jig} />
        <Bubble x={600} y={-120} flip p={bub} jiggle={-jig} />
      </FrontalSvg>
    </AbsoluteFill>
  );
};
