import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {act} from '../../../lib/process';
import {BODY, HEART} from '../organs.parts';
import {cloudSvg} from '../symbols.parts';
import {scene1Pose} from './play.motion';
import {marksOf} from './marks';
import {View} from './View';

const CLOUD = cloudSvg(0.7);

export const Scene1: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene1Pose(frame);
  const sensor = pose.plates.find((p) => p.name === 'sensor');
  return (
    <View
      dark
      pose={pose}
      svg={BODY.svg({}, {extra: pose.extra})}
      chapter={[1, 'Сердце']}
      storm={{svg: CLOUD, opacity: act(frame, 0, 36)}}
      sensor={{value: sensor?.value ?? 0.3, label: 'пульс', source: 'острый стресс · APA, 21.10.2024'}}
      callouts={marksOf(pose, {heart: HEART})}
    />
  );
};
