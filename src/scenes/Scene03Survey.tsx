import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam2D, FrontalSvg, lerpCam2D, WallBackdrop} from '../illustrations/Board';
import {BOARD, PX0, PX1, PY0, SurveyBoard} from './SurveyBoard';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

/** Scene 3: a questionnaire gets ticked → a crowd of 499 respondents along the age axis → hour/week/month stay flat. Shot changes every 2–3 s. */
export const Scene03Survey: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const people = beat(scene, 'people');
  const month = beat(scene, 'month');
  const same = beat(scene, 'same');
  const shots: [number, Cam2D][] = [
    [0, {focus: [710, 760], zoom: 1.9, screen: [484, 720]}], // clipboard close-up: someone answers
    [people - 50, {focus: [BOARD.x + BOARD.w / 2, 700], zoom: 1.0, screen: [484, 720]}], // whole board: the crowd appears
    [people + 1.6 * fps, {focus: [(PX0 + PX1) / 2, PY0 + 110], zoom: 1.7, screen: [484, 800]}], // the crowd close
    [month - 1.6 * fps, {focus: [(PX0 + PX1) / 2, PY0 - 120], zoom: 1.45, screen: [484, 760]}], // the flat lines
    [same + 0.3 * fps, {focus: [BOARD.x + BOARD.w / 2, 700], zoom: 1.05, screen: [484, 720]}], // back to the board
  ];
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) {
    cam = lerpCam2D(cam, shots[i][1], interpolate(frame, [shots[i][0], shots[i][0] + 0.7 * fps], [0, 1], cl));
  }
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <FrontalSvg cam={cam}>
        <WallBackdrop />
        <SurveyBoard
          s={{
            frame,
            tick: interpolate(frame, [6, people - 60], [0, 1], cl),
            clipboardOut: interpolate(frame, [people - 50, people - 10], [0, 1], {...cl, easing: EASE.in}),
            people: interpolate(frame, [people - 20, people + 1.4 * fps], [0, 1], cl),
            count: interpolate(frame, [people - 30, people + 0.8 * fps], [0, 1], {...cl, easing: EASE.out}),
            lines: interpolate(frame, [month - 1.4 * fps, month + 0.2 * fps], [0, 1], cl),
            dimShort: 0,
            decade: 0,
            peak: 0,
            small: 0,
          }}
        />
      </FrontalSvg>
    </AbsoluteFill>
  );
};
