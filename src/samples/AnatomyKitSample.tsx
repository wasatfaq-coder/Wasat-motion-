import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as K from '../vendor/anatomy/iso-kit';
import {G} from '../lib/assembly';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {camOn, RoomSvg, screenOf} from '../lib/camera';
import {FrontalChart, FrontalLayer, Plate} from '../components/Frontal';
import {MOTOR, MOTOR_AXIS, MOTOR_CORNERS, MOTOR_P, MOTOR_U} from './motor.parts';

// Kit sample (§22, §20.4): the motor Assembly (turned parts, cable, audited geometry) with a turning pulley, a
// label plate pinned to the object and a frontal chart. Illustrative values: this is a tool demo, not a topic.
const SPEED = [
  {label: '0 с', value: 0},
  {label: '0,5', value: 900},
  {label: '1', value: 1900},
  {label: '1,5', value: 2600},
  {label: '2', value: 2900},
  {label: '2,5', value: 3000},
];

const BODY = MOTOR.svg();

export const AnatomyKitSample: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cam = camOn(MOTOR_CORNERS.map((p) => toRoom(p, MOTOR_U)), 0.62, [540, 600]);
  // the pulley turns: its spokes are redrawn from the frame time (a body of revolution only shows rotation by marks)
  const turn = Math.max(0, t - 0.5) * 2 * Math.PI * 1.2;
  const spokes = K.lineSvg(G.spokesOf(MOTOR_AXIS, 67, 2.4, 6.6, 5, MOTOR_P, {phase: turn}), {tone: 'hi'});
  const plateShow = interpolate(t, [0.6, 1.0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const chart = interpolate(t, [1.2, 3.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const anchor = screenOf(cam, toRoom([30, 10, 25], MOTOR_U));
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={BODY + spokes} />
      </RoomSvg>
      <FrontalLayer>
        <Plate at={[330, 300]} to={anchor} text="Электродвигатель" show={plateShow} />
        <FrontalChart x={110} y={850} w={860} h={350} kind="line" title="Разгон" unit="об/мин" data={SPEED} progress={chart} highlight={5} format={(v) => v.toLocaleString('ru-RU')} />
      </FrontalLayer>
    </AnatomyStage>
  );
};
