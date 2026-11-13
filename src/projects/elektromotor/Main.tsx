import React from 'react';
import timelineJson from './data/timeline.json';
import {Timeline} from '../../lib/timeline';
import {Episode, EpisodeProps, SceneMap, selectScenes} from '../../components/Episode';
// Scenes of this topic are drawn with the Anatomy core: AnatomyStage + anatomyProjection from '../../lib/anatomy' (MASTER_PROMPT_FINAL §22).

// Topic «Как работает электромотор». Add scenes to SCENES as they are built (scene ids from the timeline).
export const ElektromotorTimeline = timelineJson as Timeline;
const SCENES: SceneMap = {};

export const ElektromotorSelected = (only: string[]) => selectScenes(ElektromotorTimeline, SCENES, only);
export const ElektromotorMain: React.FC<EpisodeProps> = (props) => <Episode {...props} timeline={ElektromotorTimeline} scenes={SCENES} />;
