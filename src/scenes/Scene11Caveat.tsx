import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, LW, LW2, LW3, Marker, WallBackdrop} from '../illustrations/Board';

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

const Bubble: React.FC<{x: number; y: number; flip?: boolean; p: number; jiggle: number}> = ({x, y, flip, p, jiggle}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -p : p} ${p}) rotate(${jiggle})`}>
    <path d="M-110,-60 Q-110,-110 -50,-110 L60,-110 Q120,-110 120,-60 L120,-10 Q120,40 60,40 L-20,40 L-60,80 L-50,40 Q-110,40 -110,-10 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} strokeLinejoin="round" />
    {[-70, -10, 50].map((cx) => (
      <circle key={cx} cx={cx} cy={-35} r={12} fill={COLORS.ink} />
    ))}
  </g>
);

const Icon: React.FC<{kind: 'spark' | 'eye' | 'heart'; x: number; y: number; p: number; lit: number; beat: number}> = ({kind, x, y, p, lit, beat}) => (
  <g transform={`translate(${x} ${y}) scale(${p * (1 + 0.08 * beat)})`}>
    <circle r={78} fill={lit > 0.5 ? COLORS.accentSoft : COLORS.fillMid} stroke={lit > 0.5 ? COLORS.accent : COLORS.ink} strokeWidth={LW} />
    {kind === 'spark' ? <path d="M0,-44 L11,-11 L44,0 L11,11 L0,44 L-11,11 L-44,0 L-11,-11 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} strokeLinejoin="round" /> : null}
    {kind === 'eye' ? (
      <g>
        <path d="M-48,0 Q0,-40 48,0 Q0,40 -48,0 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} />
        <circle r={14} fill={COLORS.ink} />
      </g>
    ) : null}
    {kind === 'heart' ? <path d="M0,36 C-52,0 -44,-40 -18,-40 C-5,-40 0,-27 0,-22 C0,-27 5,-40 18,-40 C44,-40 52,0 0,36 Z" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={LW2} strokeLinejoin="round" /> : null}
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
  const q = interpolate(frame, [hyp - 30, hyp + 0.9 * fps], [0, 1], cl);
  const evo = evolvePath(EASE.inOut(q), QUESTION);
  const pen = getPointAtLength(QUESTION, Math.max(0.01, QLEN * EASE.inOut(q)));
  const bub = interpolate(frame, [argue - 10, argue + 10], [0, 1], {...cl, easing: EASE.overshoot});
  const jig = Math.sin(frame * 0.6) * 6 * interpolate(frame, [argue, argue + 60, argue + 80], [1, 1, 0], cl);
  const icons = [0, 1, 2].map((i) => interpolate(frame, [argue + 40 + i * 8, argue + 60 + i * 8], [0, 1], {...cl, easing: EASE.overshoot}));
  const magX = interpolate(frame, [attention - 40, attention, attention + 40, attention + 70], [300, 490, 490, 700], {...cl, easing: EASE.inOut});
  const eyeLit = interpolate(frame, [attention - 4, attention + 4], [0, 1], cl);
  const heartLit = interpolate(frame, [attention + 50, attention + 58], [0, 1], cl);
  const shots: [number, Cam2D][] = [
    [0, {focus: [490, 680], zoom: 1.0, screen: [484, 740]}],
    [hyp - 34, {focus: [490, 580], zoom: 1.5, screen: [484, 720]}], // the question mark being written
    [argue - 16, {focus: [490, 480], zoom: 1.2, screen: [484, 700]}], // bubbles argue
    [attention - 50, {focus: [490, 920], zoom: 1.55, screen: [484, 760]}], // magnifier over icons
    [stretch - 30, {focus: [490, 700], zoom: 0.95, screen: [484, 740]}], // open question to the viewer
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.55 * fps], [0, 1], cl));
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <WallBackdrop />
        <rect x={-400} y={200} width={1880} height={1000} fill={COLORS.fillMid} />
        <Notebook />
        <path d={QUESTION} fill="none" stroke={COLORS.ink} strokeWidth={LW * 3.2} strokeLinecap="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} />
        {q >= 1 ? <circle cx={490} cy={800} r={22} fill={COLORS.accent} /> : null}
        {q > 0 && q < 1 && pen ? <Marker x={pen.x} y={pen.y} /> : null}
        <Bubble x={250} y={430} p={bub} jiggle={jig} />
        <Bubble x={730} y={430} flip p={bub} jiggle={-jig} />
        <Icon kind="spark" x={250} y={940} p={icons[0]} lit={0} beat={0} />
        <Icon kind="eye" x={490} y={940} p={icons[1]} lit={eyeLit} beat={0} />
        <Icon kind="heart" x={730} y={940} p={icons[2]} lit={heartLit} beat={Math.max(0, Math.sin(frame * 0.4)) * heartLit} />
        {frame > attention - 45 ? <Magnifier x={magX} y={940} /> : null}
      </FrontalSvg>
    </AbsoluteFill>
  );
};
