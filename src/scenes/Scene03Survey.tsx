import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {Cam, RoomSvg, roomPoint} from './RoomScene';
import {shotCam} from './shots';
import {BILL, LINE_Y, SurveySquare} from './SurveySquare';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
export const BOARD_CAM: Cam = {focus: roomPoint([BILL.x + BILL.w / 2, BILL.y, BILL.z0 + BILL.h / 2]), zoom: 2.35, screen: [500, 700]};
export const SAME_CAM: Cam = {...BOARD_CAM, zoom: 2.6};

/** Scene 3: a city square. An interviewer with a clipboard walks along a crowd standing on an age line (14 → 94);
 *  the counter rolls to 499; then the camera dives into the info stand where the answers become a chart. */
export const Scene03Survey: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const people = beat(scene, 'people');
  const month = beat(scene, 'month');
  const same = beat(scene, 'same');
  // lanes appear one by one on their words: «Час» (~268), «неделя» (~301), «месяц» (month)
  const laneP = [people + 68, people + 101, month - 10].map((st) => interpolate(frame, [st, st + 24], [0, 1], {...cl, easing: EASE.out}));
  const crowdP = (i: number) => interpolate(frame, [people - 30 + i * 3, people - 10 + i * 3], [0, 1], {...cl, easing: EASE.overshoot});
  const interviewerX = interpolate(frame, [0, people + 1.5 * fps], [2.4, 7.5], cl);
  const interviewerY = interpolate(frame, [people - 40, people], [5.1, LINE_Y + 1.0], {...cl, easing: EASE.inOut});
  const count = Math.round(interpolate(frame, [people - 20, people + 0.9 * fps], [0, 499], {...cl, easing: EASE.out}));
  const cam = shotCam(
    frame,
    [
      [0, {focus: roomPoint([interviewerX + 0.5, interviewerY, 0.8]), zoom: 3.6, screen: [484, 820]}], // follows the interviewer asking passers-by
      [people - 40, {focus: roomPoint([5.8, LINE_Y, 0.8]), zoom: 1.75, screen: [484, 860]}], // the whole crowd appears
      [people + 38, BOARD_CAM], // onto the billboard: lanes appear on «час», «неделя», «месяц»
      [same, SAME_CAM], // punch in on «не ускорялись»: three flat lanes
    ],
    28,
  );
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <RoomSvg cam={cam}>
        <SurveySquare
          t={t}
          crowdP={crowdP}
          react={0}
          interviewer={{x: interviewerX, y: interviewerY, passerBy: frame < people}}
          chart={{frame, tick: 1, clipboardOut: 1, people: 1, count: 1, lines: 1, laneP, dimShort: 0, decade: 0, peak: 0, small: 0}}
        />
      </RoomSvg>
      {/* 499 counter floats over the crowd */}
      {frame >= people - 20 && frame < people + 38 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${484} ${cam.zoom < 1.6 ? 430 : 400})`} opacity={interpolate(frame, [people - 20, people], [0, 1], cl)}>
            <rect x={-250} y={-90} width={580} height={150} rx={30} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={5} />
            <text x={-200} y={40} fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={110} fill={COLORS.ink} style={{fontVariantNumeric: 'tabular-nums'}}>
              {count}
            </text>
            <text x={70} y={30} fontFamily={fontFamily} fontWeight={TYPE.weightMedium} fontSize={56} fill={COLORS.ink}>человек</text>
          </g>
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
