import React from 'react';
import timelineJson from './data/timeline.json';
import {Timeline} from '../../lib/timeline';
import {Episode, EpisodeProps, SceneMap, selectScenes} from '../../components/Episode';
// Scenes of this topic are drawn with the Anatomy core: AnatomyStage + anatomyProjection from '../../lib/anatomy' (MASTER_PROMPT_FINAL §22).

// Topic «Как работает Claude». Add scenes to SCENES as they are built (scene ids from the timeline).
export const KakRabotaetClaudeTimeline = timelineJson as Timeline;
const SCENES: SceneMap = {};

export const KakRabotaetClaudeSelected = (only: string[]) => selectScenes(KakRabotaetClaudeTimeline, SCENES, only);
export const KakRabotaetClaudeMain: React.FC<EpisodeProps> = (props) => <Episode {...props} timeline={KakRabotaetClaudeTimeline} scenes={SCENES} />;
