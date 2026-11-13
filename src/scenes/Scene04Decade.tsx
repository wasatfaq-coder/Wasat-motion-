import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam, RoomSvg, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {DECADE_PATH, PEAK, PX0, PX1, PY0} from './SurveyBoard';
import {boardPt, LINE_Y, SurveySquare} from './SurveySquare';
import {SAME_CAM} from './Scene03Survey';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const LEN = getLength(DECADE_PATH);

/** Scene 4 (same square, isometric billboard): a marker draws the "last 10 years" line (camera follows the pen),
 *  a pin marks ≈50, a bracket shows the rise is modest; the crowd in front reacts. */
export const Scene04Decade: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const decade = beat(scene, 'decade');
  const faster = beat(scene, 'faster');
  const peak = beat(scene, 'peak');
  const small = beat(scene, 'small');
  const drawP = interpolate(frame, [faster - 1.2 * fps, faster + 0.6 * fps], [0, 1], cl);
  const pen = getPointAtLength(DECADE_PATH, Math.max(0.01, LEN * EASE.inOut(drawP)));
  const penPt = boardPt(pen ? pen.x : PEAK[0], pen ? pen.y : PEAK[1]);
  const peakP = interpolate(frame, [peak - 8, peak + 14], [0, 1], {...cl, easing: EASE.overshoot});
  const follow: Cam = {focus: roomPoint(penPt), zoom: 2.9, screen: [520, 720]};
  const cam = shotCam(frame, [
    [0, SAME_CAM], // continues the last shot of scene 3 (no zoom jump on the cut)
    [decade - 4, {focus: roomPoint(boardPt(PX0 + 120, PY0 - 160)), zoom: 2.9, screen: [520, 720]}], // «десятилетие»: lanes go, the speed axis draws in
    [faster - 1.2 * fps, follow], // follow the pen
    [peak - 20, {focus: roomPoint(boardPt(PEAK[0] + 40, PEAK[1] + 60)), zoom: 3.2, screen: [500, 720]}], // punch in on ≈50
    [small - 30, {focus: roomPoint(boardPt(PX1 + 30, PY0 - 215)), zoom: 3.0, screen: [520, 720]}], // «небольшой»: the bracket
    [small + 47, {focus: roomPoint([6.0, 4.4, 2.4]), zoom: 1.6, screen: [484, 760]}], // wide: the crowd reacts
    [scene.durationInFrames - 0.9 * fps, {focus: roomPoint([6.0, LINE_Y - 0.4, 1.6]), zoom: 1.4, screen: [484, 760]}],
  ]);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <SurveySquare
          t={t}
          crowdP={() => 1}
          react={Math.max(drawP * (1 - drawP) * 4, peakP * (1 - interpolate(frame, [peak + 30, peak + 60], [0, 1], cl)))}
          chart={{
            frame,
            tick: 1,
            clipboardOut: 1,
            people: 1,
            count: 1,
            lines: 1,
            dimShort: interpolate(frame, [decade - 4, decade + 18], [0, 1], cl), // lanes go on «десятилетие»; fully faded before the pen starts
            decade: drawP,
            marker: interpolate(frame, [faster + 0.6 * fps, faster + 0.6 * fps + 10], [1, 0], cl),
            peak: peakP,
            small: interpolate(frame, [small - 6, small + 18], [0, 1], cl),
          }}
        />
      </RoomSvg>
    </AbsoluteFill>
  );
};
