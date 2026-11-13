import React from 'react';
import {TIMELINE} from './lib/timeline';
import {Episode, episodeSchema, EpisodeProps, SceneMap, selectScenes} from './components/Episode';
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

// Topic «Почему нам кажется, что время течёт быстро» (root layout). Rendering is shared: components/Episode.tsx.
export const mainSchema = episodeSchema;
export type MainProps = EpisodeProps;

const SCENES: SceneMap = {
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
export const selectedScenes = (only: string[]) => selectScenes(TIMELINE, SCENES, only);

export const Main: React.FC<MainProps> = (props) => (
  <Episode {...props} timeline={TIMELINE} scenes={SCENES} captionsFrom={(scene) => (scene.id === 'scene-01' ? previewTitleOut(scene) : 0)} />
);
