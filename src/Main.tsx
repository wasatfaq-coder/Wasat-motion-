import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {z} from 'zod';
import {COLORS} from './theme/tokens';
import {TIMELINE, SceneData} from './lib/timeline';
import {Captions} from './components/Captions';
import {Sfx} from './components/Sfx';
import {Scene01Hook} from './scenes/Scene01Hook';
import {Scene02Stake} from './scenes/Scene02Stake';

export const mainSchema = z.object({
  muteVoice: z.boolean(),
  hideCaptions: z.boolean(),
  onlyScenes: z.array(z.string()),
});
export type MainProps = z.infer<typeof mainSchema>;

const SCENES: Record<string, React.FC<{scene: SceneData}>> = {
  'scene-01': Scene01Hook,
  'scene-02': Scene02Stake,
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
            {hideCaptions ? null : <Captions scene={scene} />}
            {muteVoice ? null : (
              <Sequence from={scene.voiceStartFrame} layout="none" name={`voice ${scene.id}`}>
                <Audio src={staticFile(scene.audio)} />
              </Sequence>
            )}
            <Sfx scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
