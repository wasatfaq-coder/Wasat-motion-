import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {AnatomyStage, Kit} from '../../../lib/anatomy';
import {SourceLine} from '../../../components/Frontal';
import {HOME} from '../world.parts';
import {cloudSvg} from '../symbols.parts';
import {scene1Pose} from './play.motion';
import {Stage} from './Stage';

const CLOUD = cloudSvg(0.7);
const ramp = (frame: number, a: number, b: number) => Math.max(0, Math.min(1, (frame - a) / (b - a)));

export const Scene1: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene1Pose(frame);
  const src = pose.plates.find((p) => p.name === 'src');
  return (
    <AnatomyStage>
    <Stage dark cam={pose.cam} svg={HOME.svg({}, {extra: pose.extra})} chapter={[1, 'Тревога']} world={<g opacity={ramp(frame, 0, 40)}><Kit svg={CLOUD} /></g>}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <g opacity={src?.opacity ?? 0}>
          <SourceLine x={72} y={628} text="острый стресс · APA, 21.10.2024" dark />
        </g>
      </svg>
    </Stage>
    </AnatomyStage>
  );
};
