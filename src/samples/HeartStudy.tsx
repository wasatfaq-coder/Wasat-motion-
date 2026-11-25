import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, camFitHeight, RoomSvg, safeRect, screenOf} from '../lib/camera';
import {Callouts} from '../components/Atlas';
import {APEX_AT, AORTA_AT, HEART_BOX, HEART_MECH, HEART_U, VALVE_AT, VALVE_BOX} from './kit/heart.parts';

// Stop-frames of a heart built only from the Anatomy kit: pump housings, flaps, flanged tubes.
// Frame 0 is the whole heart, frame 1 is the valve and the vessel joint.
const RECT = safeRect({captions: false});
const room = (box: [typeof APEX_AT, typeof APEX_AT]) =>
  boxCorners(
    [box[0][0] / HEART_U, box[0][1] / HEART_U, box[0][2] / HEART_U],
    [(box[0][0] + box[1][0]) / HEART_U, (box[0][1] + box[1][1]) / HEART_U, (box[0][2] + box[1][2]) / HEART_U],
  );

const camOf = (box: [typeof APEX_AT, typeof APEX_AT]) => camFitHeight(room(box), {rect: RECT, fill: 0.92});
const call = (n: number, label: string, at: [number, number], to: [number, number]) => ({n, label, at, to, show: 1});

export const HeartStudy: React.FC = () => {
  const detail = useCurrentFrame() === 1;
  const cam = camOf(detail ? VALVE_BOX : HEART_BOX);
  const at = (p: typeof APEX_AT) => screenOf(cam, toRoom(p, HEART_U));
  const items = detail
    ? [call(1, 'клапан', at(VALVE_AT), [220, 640]), call(2, 'заслонка', at([20, 14, 12.2]), [780, 720])]
    : [call(1, 'аорта', at(AORTA_AT), [180, 520]), call(2, 'клапан', at(VALVE_AT), [860, 980]), call(3, 'желудочек', at(APEX_AT), [200, 1280])];
  return (
    <AnatomyStage>
      <RoomSvg cam={cam} sides={40} fade={80}>
        <Kit svg={HEART_MECH.svg()} />
      </RoomSvg>
      <Callouts items={items} />
    </AnatomyStage>
  );
};

export const HEART_STUDY_FRAMES = 2;
