import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {AnatomyStage} from '../../../lib/anatomy';
import {HonestyTag} from '../../../components/Explain';
import {TruthPlate} from '../../../components/Frontal';
import {SHOP} from '../world.parts';
import {scene2Pose} from './play.motion';
import {Stage} from './Stage';

export const Scene2: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene2Pose(frame);
  const o = (name: string) => pose.plates.find((p) => p.name === name)?.opacity ?? 0;
  return (
    <AnatomyStage>
    <Stage cam={pose.cam} svg={SHOP.svg({}, {extra: pose.extra})} chapter={[2, 'Ось']}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <HonestyTag x={72} y={590} kind="simplified" show={o('honest')} />
        <g opacity={o('truth')}>
          <TruthPlate x={72} y={1040} w={520} fact="Кортизол — десятки минут" source="Ulrich-Lai, Herman, 2009" />
        </g>
      </svg>
    </Stage>
    </AnatomyStage>
  );
};
