import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit} from '../../lib/anatomy';
import {RoomSvg} from '../../lib/camera';
import {BENCH} from './workbench.parts';
import {DC} from './dcmotor.parts';
import {motorStill, MOTOR_RECT} from './motor.motion';

// Style frames of scenes 1, 6 and 7 (hero A on the workbench). The state of each frame comes from motor.motion.ts.
export const ElektromotorMotor: React.FC = () => {
  const s = motorStill(useCurrentFrame());
  const picture = (s.bench ? BENCH.svg() : '') + DC.svg({half: s.half});
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
