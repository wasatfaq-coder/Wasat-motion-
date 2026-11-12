import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, WallBackdrop} from '../illustrations/Board';
import {BOARD, DECADE_PATH, PEAK, PX1, PY0, SurveyBoard} from './SurveyBoard';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const LEN = getLength(DECADE_PATH);

/** Scene 4: a marker draws the "last 10 years" line (camera follows the pen), a pin marks ≈50, a bracket shows the rise is modest. */
export const Scene04Decade: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const decade = beat(scene, 'decade');
  const faster = beat(scene, 'faster');
  const peak = beat(scene, 'peak');
  const small = beat(scene, 'small');
  const drawP = interpolate(frame, [faster - 1.2 * fps, faster + 0.6 * fps], [0, 1], cl);
  const pen = getPointAtLength(DECADE_PATH, Math.max(0.01, LEN * EASE.inOut(drawP)));
  const follow: Cam2D = {focus: [pen ? pen.x : PX1, pen ? pen.y : PY0], zoom: 1.7, screen: [484, 760]};
  const shots: [number, Cam2D][] = [
    [0, {focus: [BOARD.x + BOARD.w / 2, 700], zoom: 1.05, screen: [484, 720]}],
    [decade - 10, {focus: [BOARD.x + 230, PY0 - 150], zoom: 1.7, screen: [484, 760]}], // where the pen starts
    [faster - 1.2 * fps, follow], // follow the pen
    [peak - 20, {focus: [PEAK[0] + 80, PEAK[1] + 60], zoom: 2.0, screen: [484, 720]}], // punch in on ≈50
    [small - 30, {focus: [PX1 - 120, PY0 - 200], zoom: 1.6, screen: [484, 760]}], // the bracket: modest rise
    [scene.durationInFrames - 0.9 * fps, {focus: [BOARD.x + BOARD.w / 2, 700], zoom: 0.95, screen: [484, 720]}],
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) {
    cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.6 * fps], [0, 1], cl));
  }
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <WallBackdrop />
        <SurveyBoard
          s={{
            frame,
            tick: 1,
            clipboardOut: 1,
            people: 1,
            count: 1,
            lines: 1,
            dimShort: interpolate(frame, [decade - 10, decade + 20], [0, 1], cl),
            decade: drawP,
            peak: interpolate(frame, [peak - 8, peak + 14], [0, 1], {...cl, easing: EASE.overshoot}),
            small: interpolate(frame, [small - 6, small + 18], [0, 1], cl),
          }}
        />
      </FrontalSvg>
    </AbsoluteFill>
  );
};
