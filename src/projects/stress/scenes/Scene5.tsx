import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {act} from '../../../lib/process';
import {BODY, HEART} from '../organs.parts';
import {cloudSvg} from '../symbols.parts';
import {scene5Pose} from './play.motion';
import {marksOf} from './marks';
import {View} from './View';

const CLOUD = cloudSvg(0.7);

export const Scene5: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene5Pose(frame);
  return (
    <View
      dark
      pose={pose}
      svg={BODY.svg({}, {extra: pose.extra})}
      chapter={[4, 'Покой']}
      storm={{svg: CLOUD, opacity: 1 - act(frame, 24, 80)}}
      sensor={{value: pose.plates.find((p) => p.name === 'sensor')?.value ?? 0.4, label: 'пульс', source: 'APA, 21.10.2024'}}
      callouts={marksOf(pose, {heart: HEART})}
    />
  );
};
