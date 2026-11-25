import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {BODY, MUSCLE} from '../organs.parts';
import {scene4Pose} from './play.motion';
import {marksOf} from './marks';
import {View} from './View';

export const Scene4: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene4Pose(frame);
  return (
    <View
      dark
      pose={pose}
      svg={BODY.svg({}, {extra: pose.extra})}
      chapter={[3, 'Мышца']}
      sensor={{value: 0.72, label: 'кортизол', source: 'APA, тело, 21.10.2024'}}
      callouts={marksOf(pose, {muscle: MUSCLE})}
    />
  );
};
