import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, FrontCrowd, lerpCam2D, StreetBackdrop} from '../illustrations/Board';
import {Box2DPosts} from './SurveyBoard';
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
  const follow: Cam2D = {focus: [pen ? pen.x : PX1, pen ? pen.y : PY0], zoom: 1.3, screen: [484, 740]};
  const shots: [number, Cam2D][] = [
    [0, {focus: [490, 780], zoom: 0.82, screen: [484, 720]}], // the stand in the street with the crowd
    [decade - 10, {focus: [490, 680], zoom: 1.1, screen: [484, 720]}], // the chart, short lanes fade away
    [faster - 1.2 * fps, follow], // follow the pen
    [peak - 20, {focus: [PEAK[0] + 60, PEAK[1] + 60], zoom: 1.7, screen: [484, 720]}], // punch in on ≈50
    [small - 30, {focus: [490, 780], zoom: 0.82, screen: [484, 720]}], // wide: modest rise, crowd reacts
    [scene.durationInFrames - 0.9 * fps, {focus: [490, 760], zoom: 0.75, screen: [484, 720]}],
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) {
    cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.6 * fps], [0, 1], cl));
  }
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <StreetBackdrop frame={frame} />
        <Box2DPosts />
        <SurveyBoard
          s={{
            frame,
            tick: 1,
            clipboardOut: 1,
            people: 1,
            count: 1,
            lines: 1,
            dimShort: interpolate(frame, [decade - 20, decade + 10], [0, 1], cl),
            decade: drawP,
            peak: interpolate(frame, [peak - 8, peak + 14], [0, 1], {...cl, easing: EASE.overshoot}),
            small: interpolate(frame, [small - 6, small + 18], [0, 1], cl),
          }}
        />
        <FrontCrowd y={1215} react={drawP} frame={frame} />
      </FrontalSvg>
    </AbsoluteFill>
  );
};
