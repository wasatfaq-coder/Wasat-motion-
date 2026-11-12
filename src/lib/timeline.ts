import timelineJson from '../data/timeline.json';

export type Word = {text: string; startFrame: number; endFrame: number; status: string};
export type Page = {text: string; startFrame: number; endFrame: number; words: Word[]};
export type Beat = {id: string; word: string; frame: number | null; status: string};
export type SfxEvent = {file: string; frame: number; volume: number; reason: string};
export type SceneData = {
  id: string;
  from: number;
  durationInFrames: number;
  audio: string;
  audioDurationInFrames: number;
  voiceStartFrame: number;
  beats: Beat[];
  pages: Page[];
  sfx: SfxEvent[];
};
export type Timeline = {fps: number; totalFrames: number; scenes: SceneData[]};

export const TIMELINE = timelineJson as Timeline;

export const sceneById = (id: string) => {
  const s = TIMELINE.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`Scene ${id} not in timeline`);
  return s;
};

/** Local frame of a named beat; throws if the beat is missing so errors are not silent. */
export const beat = (scene: SceneData, id: string) => {
  const b = scene.beats.find((x) => x.id === id);
  if (!b || b.frame === null) throw new Error(`Beat ${id} missing in ${scene.id}`);
  return b.frame;
};
