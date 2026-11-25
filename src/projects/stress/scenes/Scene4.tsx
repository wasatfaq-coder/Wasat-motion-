import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SceneData} from '../../../lib/timeline';
import {AnatomyStage, Kit} from '../../../lib/anatomy';
import {ListPlate} from '../../../components/Frontal';
import {STAND} from '../world.parts';
import {ballSvg} from '../symbols.parts';
import {scene4Pose} from './play.motion';
import {Stage} from './Stage';

const BALL = ballSvg(1);
const ramp = (frame: number, a: number, b: number) => Math.max(0, Math.min(1, (frame - a) / (b - a)));

export const Scene4: React.FC<{scene: SceneData}> = () => {
  const frame = useCurrentFrame();
  const pose = scene4Pose(frame);
  const o = pose.plates[0]?.opacity ?? 0;
  return (
    <AnatomyStage>
    <Stage cam={pose.cam} svg={STAND.svg({}, {extra: pose.extra})} chapter={[3, 'Срок']} world={<g opacity={ramp(frame, 12, 48)}><Kit svg={BALL} /></g>}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <g opacity={o}>
          <ListPlate x={72} y={680} w={560} title="Два срока" rows={[['Минуты', 'ответ стихает'], ['Дни', 'мышцы настороже']]} foot="APA, тело, 21.10.2024" highlight={0} />
        </g>
      </svg>
    </Stage>
    </AnatomyStage>
  );
};
