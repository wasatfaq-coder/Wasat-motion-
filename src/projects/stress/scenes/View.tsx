import React from 'react';
import {AnatomyStage, Kit} from '../../../lib/anatomy';
import {MotionPose} from '../../../lib/motion';
import {RoomSvg} from '../../../lib/camera';
import {Atmos, AtmosField} from '../../../components/Atmos';
import {Callouts, ChapterMark} from '../../../components/Atlas';
import {Sensor} from '../../../components/Sensor';

export const View: React.FC<{
  pose: MotionPose;
  svg: string;
  chapter: [number, string];
  dark?: boolean;
  shell?: {svg: string; opacity: number};
  storm?: {svg: string; opacity: number};
  sensor: {value: number; label: string; source: string};
  callouts: {n: number; label: string; at: [number, number]; to: [number, number]; show?: number}[];
}> = ({pose, svg, chapter, dark, shell, storm, sensor, callouts}) => (
  <AnatomyStage>
    <RoomSvg cam={pose.cam} dark={dark} sides={90} fade={110} under={<AtmosField hero={[540, 980]} dark={dark} />}>
      {shell && shell.opacity > 0.02 ? (
        <g opacity={shell.opacity}>
          <Kit svg={shell.svg} />
        </g>
      ) : null}
      <Kit svg={svg} />
      {storm && storm.opacity > 0.02 ? (
        <g opacity={storm.opacity}>
          <Kit svg={storm.svg} />
        </g>
      ) : null}
    </RoomSvg>
    <Atmos dark={dark} />
    <ChapterMark n={chapter[0]} of={4} title={chapter[1]} dark={dark} sound={false} />
    <Sensor x={72} y={1296} w={760} value={sensor.value} label={sensor.label} source={sensor.source} dark={dark} />
    <Callouts items={callouts} dark={dark} />
  </AnatomyStage>
);
