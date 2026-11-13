import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {z} from 'zod';
import {COLORS} from '../theme/tokens';
import {SceneData, Timeline} from '../lib/timeline';
import {Captions} from './Captions';
import {Sfx} from './Sfx';

// Shared episode renderer for every topic: scenes in sequence, captions, voice segments and sfx from the timeline.
// A topic only provides its timeline, its scene components and (optionally) where captions start in a scene.
export const episodeSchema = z.object({
  muteVoice: z.boolean(),
  hideCaptions: z.boolean(),
  onlyScenes: z.array(z.string()),
});
export type EpisodeProps = z.infer<typeof episodeSchema>;
export type SceneMap = Record<string, React.FC<{scene: SceneData}>>;

/** Scenes included in a render: all implemented ones, or the subset passed in props. */
export const selectScenes = (timeline: Timeline, scenes: SceneMap, only: string[]) =>
  timeline.scenes.filter((s) => scenes[s.id] && (only.length === 0 || only.includes(s.id)));

export const Episode: React.FC<EpisodeProps & {timeline: Timeline; scenes: SceneMap; captionsFrom?: (scene: SceneData) => number}> = ({
  muteVoice,
  hideCaptions,
  onlyScenes,
  timeline,
  scenes,
  captionsFrom = () => 0,
}) => {
  const list = selectScenes(timeline, scenes, onlyScenes);
  let cursor = 0;
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      {list.map((scene) => {
        const C = scenes[scene.id];
        const from = cursor;
        cursor += scene.durationInFrames;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.durationInFrames} name={scene.id}>
            <C scene={scene} />
            {hideCaptions ? null : <Captions scene={scene} hideBefore={captionsFrom(scene)} />}
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
