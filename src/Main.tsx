import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {z} from 'zod';
import {COLORS} from './theme/tokens';
import {TIMELINE, SceneData} from './lib/timeline';
import {Captions} from './components/Captions';
import {Sfx} from './components/Sfx';
import {previewTitleOut, Scene01Hook} from './scenes/Scene01Hook';
import {Scene02Stake} from './scenes/Scene02Stake';
import {Scene03Survey} from './scenes/Scene03Survey';
import {Scene04Decade} from './scenes/Scene04Decade';
import {Scene05Insight} from './scenes/Scene05Insight';
import {Scene06TwoWays} from './scenes/Scene06TwoWays';
import {Scene07Holiday} from './scenes/Scene07Holiday';
import {Scene08Novelty} from './scenes/Scene08Novelty';
import {Scene09Routine} from './scenes/Scene09Routine';
import {Scene10Versions} from './scenes/Scene10Versions';
import {Scene11Caveat} from './scenes/Scene11Caveat';
import {Scene12Advice} from './scenes/Scene12Advice';

export const mainSchema = z.object({
  muteVoice: z.boolean(),
  hideCaptions: z.boolean(),
  onlyScenes: z.array(z.string()),
});
export type MainProps = z.infer<typeof mainSchema>;

const SCENES: Record<string, React.FC<{scene: SceneData}>> = {
  'scene-01': Scene01Hook,
  'scene-02': Scene02Stake,
  'scene-03': Scene03Survey,
  'scene-04': Scene04Decade,
  'scene-05': Scene05Insight,
  'scene-06': Scene06TwoWays,
  'scene-07': Scene07Holiday,
  'scene-08': Scene08Novelty,
  'scene-09': Scene09Routine,
  'scene-10': Scene10Versions,
  'scene-11': Scene11Caveat,
  'scene-12': Scene12Advice,
};

/** Scenes included in a render: all implemented ones, or the subset passed in props. */
export const selectedScenes = (only: string[]) =>
  TIMELINE.scenes.filter((s) => SCENES[s.id] && (only.length === 0 || only.includes(s.id)));

export const Main: React.FC<MainProps> = ({muteVoice, hideCaptions, onlyScenes}) => {
  const scenes = selectedScenes(onlyScenes);
  let cursor = 0;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      {scenes.map((scene) => {
        const C = SCENES[scene.id];
        const from = cursor;
        cursor += scene.durationInFrames;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.durationInFrames} name={scene.id}>
            <C scene={scene} />
            {hideCaptions ? null : <Captions scene={scene} hideBefore={scene.id === 'scene-01' ? previewTitleOut(scene) : 0} />}
            {muteVoice
              ? null
              : scene.audioSegments.map((seg, i) => (
                  <Sequence key={i} from={seg.startFrame} layout="none" name={`voice ${scene.id} ${i}`}>
                    <Audio src={staticFile(scene.audio)} trimBefore={seg.trimBefore} trimAfter={seg.trimAfter ?? undefined} />
                  </Sequence>
                ))}
            <Sfx scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
