import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam, RoomSvg, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {DECADE_PATH, PEAK} from './SurveyBoard';
import {boardPt, LINE_Y, SurveySquare} from './SurveySquare';
import {BOARD_CAM} from './Scene03Survey';

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
    [0, BOARD_CAM], // the billboard with the lanes
    [decade - 10, {...BOARD_CAM, zoom: 2.5}], // short lanes fade away
    [faster - 1.2 * fps, follow], // follow the pen
    [peak - 20, {focus: roomPoint(boardPt(PEAK[0] + 40, PEAK[1] + 60)), zoom: 3.2, screen: [500, 720]}], // punch in on ≈50
    [small - 30, {focus: roomPoint([6.0, 4.4, 2.4]), zoom: 1.6, screen: [484, 760]}], // wide: modest rise, crowd reacts
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
            dimShort: interpolate(frame, [faster - 1.6 * fps, faster - 1.25 * fps], [0, 1], cl), // lanes stay until just before the pen starts (fully faded first)
            decade: drawP,
            peak: peakP,
            small: interpolate(frame, [small - 6, small + 18], [0, 1], cl),
          }}
        />
      </RoomSvg>
    </AbsoluteFill>
  );
};
