// Scene composition contract shared by Episode, Root (calculateMetadata), build-timeline, audit and QA
// (patch items 10 and 14, MASTER_PROMPT_FINAL §23.4). Pure TypeScript without React or Remotion so scripts and
// tests can import it through tsx.
//
// A scene may overlap the previous one by `transitionInFrames` (a cross transition). The overlap is subtracted once:
//   start[0] = 0, start[i] = start[i-1] + duration[i-1] - transition[i], total = start[last] + duration[last].
// Voice, sfx and captions live inside each scene's Sequence, so their global frame is start[i] + local frame for
// every consumer (render, QA strips, sound review). Sequential scenes (no transitions) keep the old timing exactly.

export type LayoutScene = {id: string; durationInFrames: number; transitionInFrames?: number};
export type Placed<S extends LayoutScene> = {scene: S; start: number; transition: number};

export class SceneSetError extends Error {
  constructor(message: string) {
    super(`scene set: ${message}`);
    this.name = 'SceneSetError';
  }
}

/** Global start frame of every scene; the first scene of a set never overlaps anything. */
export const layoutScenes = <S extends LayoutScene>(scenes: S[]): Placed<S>[] => {
  const out: Placed<S>[] = [];
  let end = 0;
  scenes.forEach((scene, i) => {
    if (!Number.isInteger(scene.durationInFrames) || scene.durationInFrames <= 0) throw new SceneSetError(`${scene.id} has durationInFrames ${scene.durationInFrames}; expected a positive integer`);
    const t = i === 0 ? 0 : scene.transitionInFrames ?? 0;
    if (!Number.isInteger(t) || t < 0) throw new SceneSetError(`${scene.id} has transitionInFrames ${t}; expected an integer ≥ 0`);
    const prev = out[i - 1];
    if (prev && (t >= prev.scene.durationInFrames || t >= scene.durationInFrames)) throw new SceneSetError(`${scene.id}: transition ${t} must be shorter than both overlapping scenes`);
    const start = end - t;
    out.push({scene, start, transition: t});
    end = start + scene.durationInFrames;
  });
  return out;
};

/** Total frames of a set of scenes (overlaps subtracted once). */
export const totalFrames = (scenes: LayoutScene[]) => {
  const placed = layoutScenes(scenes);
  const last = placed[placed.length - 1];
  return last ? last.start + last.scene.durationInFrames : 0;
};

/**
 * Strict check of a timeline against the topic's scene components (item 10):
 *  - duplicate scene ids in the timeline → error;
 *  - a component registered for an id that is not in the timeline → error;
 *  - an id in `only` that is not in the timeline, or listed twice → error;
 *  - a full render (`only` empty) needs a component for every timeline scene → error naming the missing ones;
 *  - an explicit subset (`only`) needs components only for the chosen scenes: a preview of a topic in progress.
 * Returns the chosen scenes in timeline order.
 */
export const pickScenes = <S extends LayoutScene>(timelineScenes: S[], componentIds: string[], only: string[]): S[] => {
  const ids = timelineScenes.map((s) => s.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) throw new SceneSetError(`duplicate scene id(s) in the timeline: ${[...new Set(dup)].join(', ')}`);
  const stray = componentIds.filter((id) => !ids.includes(id));
  if (stray.length) throw new SceneSetError(`component(s) registered for id(s) not in the timeline: ${stray.join(', ')}`);
  const unknown = only.filter((id) => !ids.includes(id));
  if (unknown.length) throw new SceneSetError(`onlyScenes lists unknown id(s): ${unknown.join(', ')} (timeline has ${ids.join(', ') || 'no scenes'})`);
  const twice = only.filter((id, i) => only.indexOf(id) !== i);
  if (twice.length) throw new SceneSetError(`onlyScenes lists id(s) twice: ${[...new Set(twice)].join(', ')}`);
  const chosen = only.length ? timelineScenes.filter((s) => only.includes(s.id)) : timelineScenes;
  const missing = chosen.filter((s) => !componentIds.includes(s.id)).map((s) => s.id);
  if (missing.length) throw new SceneSetError(`no scene component for ${missing.join(', ')}; register it in the topic's SCENES or preview a subset with onlyScenes`);
  return chosen;
};
