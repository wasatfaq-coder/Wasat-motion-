import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit} from '../../lib/anatomy';
import {RoomSvg} from '../../lib/camera';
import {BENCH} from './workbench.parts';
import {DC, rotorItems} from './dcmotor.parts';
import {motorStill, MOTOR_RECT} from './motor.motion';

// scene 6 is a close-up of the armature: the slid-out front half (shell, magnet, clamp band, label, clips) is not drawn
const FRONT_HALF = /\.(shell\.front|magnet\.S|clamp\.front|label|clip\.S)/;

// Style frames of scenes 1, 6 and 7 (hero A on the workbench). The state of each frame comes from motor.motion.ts.
export const ElektromotorMotor: React.FC = () => {
  const s = motorStill(useCurrentFrame());
  const picture = (s.bench ? BENCH.svg() : '') + DC.svgFaded(rotorItems(s.theta), {half: s.half}, s.hideHalf ? {hide: (n) => FRONT_HALF.test(n)} : {});
  return (
    <AnatomyStage>
      <RoomSvg cam={s.cam} bottom={MOTOR_RECT.y1 + 40} sides={90} fade={110}>
        <g className="ns">
          <Kit svg={picture} />
        </g>
      </RoomSvg>
    </AnatomyStage>
  );
};
