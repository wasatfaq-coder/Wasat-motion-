// Sound attention (MASTER_PROMPT_FINAL §23.7, patch item 6): effects duck smoothly under the voice and fade in and
// out without jumps. Pure functions of the frame so the render, tests and the sound review compute the same gain.
import type {Page, SfxEvent, SfxRole} from './timeline';

/** Default gain under speech per role; events without a role (the finished «время» topic) are left as mastered. */
export const DUCK_BY_ROLE: Record<SfxRole, number> = {bed: 0.35, active: 0.6, accent: 0.8};
/** Frames to glide into and out of a duck (≈ 0.15 s at 60 fps): no audible step. */
export const DUCK_RAMP = 9;

export type Span = [number, number];

/** Speech spans of a scene in local frames, from the timed words of its caption pages (merged when close). */
export const speechSpans = (pages: Page[], gap = 12): Span[] => {
  const spans = pages
    .flatMap((p) => p.words.map((w): Span => [w.startFrame, w.endFrame]))
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b >= a)
    .sort((x, y) => x[0] - y[0]);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] - last[1] <= gap) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  return merged;
};

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** 0 … 1: how much speech covers this frame, with smooth ramps before and after each span. */
export const speechAmount = (frame: number, spans: Span[], ramp = DUCK_RAMP) => {
  let amount = 0;
  for (const [a, b] of spans) {
    if (frame >= a && frame <= b) return 1;
    if (frame < a) amount = Math.max(amount, smooth(1 - (a - frame) / ramp));
    else amount = Math.max(amount, smooth(1 - (frame - b) / ramp));
  }
  return amount;
};

/** Gain of an effect at a scene-local frame: base volume × fades × duck under speech. */
export const sfxGain = (e: SfxEvent, localFrame: number, spans: Span[]) => {
  const duck = e.duckUnderVoice ?? (e.role ? DUCK_BY_ROLE[e.role] : 1);
  const since = localFrame - e.frame;
  const fadeIn = e.fadeInFrames ? smooth(since / e.fadeInFrames) : 1;
  const fadeOut = e.fadeOutFrames && e.durationInFrames ? smooth((e.durationInFrames - since) / e.fadeOutFrames) : 1;
  const g = e.volume * fadeIn * fadeOut * (1 - (1 - duck) * speechAmount(localFrame, spans));
  return Number.isFinite(g) ? Math.max(0, g) : 0;
};
