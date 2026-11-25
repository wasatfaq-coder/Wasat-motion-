import React from 'react';
import timelineJson from './data/timeline.json';
import {Timeline} from '../../lib/timeline';
import {Episode, EpisodeProps, SceneMap, selectScenes} from '../../components/Episode';
import {Scene1} from './scenes/Scene1';
import {Scene2} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4} from './scenes/Scene4';
import {Scene5} from './scenes/Scene5';

export const StressTimeline = timelineJson as Timeline;
const SCENES: SceneMap = {
  'scene-1': Scene1,
  'scene-2': Scene2,
  'scene-3': Scene3,
  'scene-4': Scene4,
  'scene-5': Scene5,
};

export const StressSelected = (only: string[]) => selectScenes(StressTimeline, SCENES, only);
export const StressMain: React.FC<EpisodeProps> = (props) => <Episode {...props} timeline={StressTimeline} scenes={SCENES} />;
