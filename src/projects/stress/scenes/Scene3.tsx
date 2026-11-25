import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {BODY, HEART, SHELL} from '../organs.parts';
import {scene3Pose, scene3Shell} from './play.motion';
import {marksOf} from './marks';
import {View} from './View';

const SHELL_SVG = SHELL.svg();

export const Scene3: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene3Pose(frame);
  const sensor = pose.plates.find((p) => p.name === 'sensor');
  return (
    <View
      dark
      pose={pose}
      svg={BODY.svg({}, {extra: pose.extra})}
      chapter={[2, 'Ответ']}
      shell={{svg: SHELL_SVG, opacity: scene3Shell(frame)}}
      sensor={{value: sensor?.value ?? 0.7, label: 'пульс', source: 'APA, fight-or-flight'}}
      callouts={marksOf(pose, {heart: HEART})}
    />
  );
};
