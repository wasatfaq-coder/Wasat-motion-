import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {AnatomyStage, Kit} from '../../../lib/anatomy';
import {UnknownCard} from '../../../components/Explain';
import {TruthPlate} from '../../../components/Frontal';
import {HOME} from '../world.parts';
import {ballSvg, cloudSvg} from '../symbols.parts';
import {scene5Pose} from './play.motion';
import {Stage} from './Stage';

const CLOUD = cloudSvg(0.7);
const BALL = ballSvg(1);
const ramp = (frame: number, a: number, b: number) => Math.max(0, Math.min(1, (frame - a) / (b - a)));

export const Scene5: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene5Pose(frame);
  const o = (name: string) => pose.plates.find((p) => p.name === name)?.opacity ?? 0;
  return (
    <AnatomyStage>
    <Stage
      dark
      cam={pose.cam}
      svg={HOME.svg({}, {extra: pose.extra})}
      chapter={[4, 'Честно']}
      world={
        <>
          <g opacity={1 - ramp(frame, 36, 96)}>
            <Kit svg={CLOUD} />
          </g>
          <g opacity={1 - ramp(frame, 120, 180)}>
            <Kit svg={BALL} />
          </g>
        </>
      }
    >
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <g opacity={o('ulcer')}>
          <TruthPlate x={500} y={760} w={390} fact="Язву вызывает бактерия" source="APA, тело, 21.10.2024" dark />
        </g>
        <g opacity={o('unknown')}>
          <UnknownCard x={500} y={760} w={390} title="у одного человека" source="Herman и др., 2016" dark />
        </g>
      </svg>
    </Stage>
    </AnatomyStage>
  );
};
