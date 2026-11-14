import React from 'react';
import timelineJson from './data/timeline.json';
import {Timeline} from '../../lib/timeline';
import {Episode, EpisodeProps, SceneMap, selectScenes} from '../../components/Episode';
// Scenes of this topic are drawn with the Anatomy core: AnatomyStage + anatomyProjection from '../../lib/anatomy' (MASTER_PROMPT_FINAL §22).

// Topic «Как MCP вызывает инструмент». Add scenes to SCENES as they are built (scene ids from the timeline).
export const McpToolCallTimeline = timelineJson as Timeline;
const SCENES: SceneMap = {};

export const McpToolCallSelected = (only: string[]) => selectScenes(McpToolCallTimeline, SCENES, only);
export const McpToolCallMain: React.FC<EpisodeProps> = (props) => <Episode {...props} timeline={McpToolCallTimeline} scenes={SCENES} />;
