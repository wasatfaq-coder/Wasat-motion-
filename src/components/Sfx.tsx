import React from 'react';
import {Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {SceneData} from '../lib/timeline';
import {sfxGain, speechSpans} from '../lib/duck';

/**
 * Plays the scene's sfx events from the timeline (local CC0 files). Events with a role (bed / active / accent) or an
 * explicit duckUnderVoice glide down under the voice and fade in/out smoothly (§23.7, src/lib/duck.ts); events of
 * the finished «время» topic carry neither and keep their mastered constant volume.
 */
export const Sfx: React.FC<{scene: SceneData}> = ({scene}) => {
  const spans = speechSpans(scene.pages);
  return (
    <>
      {scene.sfx.map((e, i) => (
        <Sequence key={i} from={e.frame} durationInFrames={e.durationInFrames} name={`sfx ${e.role ?? ''} ${e.file}`} layout="none">
          <Audio src={staticFile(e.file)} volume={e.role || e.duckUnderVoice !== undefined || e.fadeInFrames || e.fadeOutFrames ? (f) => sfxGain(e, e.frame + f, spans) : e.volume} />
        </Sequence>
      ))}
    </>
  );
};
