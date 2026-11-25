import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {AXIS, ADRENAL} from '../axis.parts';
import {scene2Pose} from './play.motion';
import {marksOf} from './marks';
import {View} from './View';

export const Scene2: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene2Pose(frame);
  const sensor = pose.plates.find((p) => p.name === 'sensor');
  return (
    <View
      dark
      pose={pose}
      svg={AXIS.svg({}, {extra: pose.extra})}
      chapter={[2, 'Ось']}
      sensor={{value: sensor?.value ?? 0.5, label: 'кортизол', source: 'Ulrich-Lai, Herman, 2009'}}
      callouts={marksOf(pose, {adrenal: ADRENAL})}
    />
  );
};
