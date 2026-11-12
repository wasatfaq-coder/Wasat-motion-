import React from 'react';
import {Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {SceneData} from '../lib/timeline';

/** Plays the scene's sfx events from the timeline (local CC0 files). */
export const Sfx: React.FC<{scene: SceneData}> = ({scene}) => (
  <>
    {scene.sfx.map((e, i) => (
      <Sequence key={i} from={e.frame} name={`sfx ${e.file}`} layout="none">
        <Audio src={staticFile(e.file)} volume={e.volume} />
      </Sequence>
    ))}
  </>
);
