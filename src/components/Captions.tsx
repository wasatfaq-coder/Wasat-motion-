import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {ZONES, SAFE} from '../theme/layout';
import {fontFamily} from '../theme/font';
import {Beat, Page, SceneData} from '../lib/timeline';

const norm = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');

/** The page's key word is the word the beat inside the page lands on (regulation v3.0, section 10). */
export const keyWordIndex = (page: Page, beats: Beat[]) => {
  const beat = beats.find((b) => b.frame !== null && b.frame >= page.startFrame && b.frame < page.endFrame);
  if (!beat || beat.frame === null) return -1;
  const at = beat.frame;
  const target = norm(beat.word);
  const spoken = page.words.findIndex((w) => w.startFrame <= at && at < w.endFrame + 6);
  if (spoken >= 0 && norm(page.words[spoken].text) === target) return spoken;
  return page.words.findIndex((w) => norm(w.text) === target);
};

/** Reveal of one word from blur: 0 before it is spoken, 1 from its start (over `REVEAL` frames). Pure, per frame. */
export const REVEAL = 6;
export const wordReveal = (frame: number, startFrame: number) => interpolate(frame, [startFrame - REVEAL, startFrame], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** The caption colours on a light or on the one dark scene. The pill is ink with light text (never coral: coral belongs
 *  to the topic's meaning in the picture, decision 12); on the dark scene it inverts. */
export const captionInk = (dark = false) => ({
  text: dark ? COLORS.fillLight : COLORS.ink,
  pill: dark ? COLORS.fillLight : COLORS.ink,
  pillText: dark ? COLORS.ink : COLORS.fillLight,
});

/** One caption line set as words: spoken words sharp, coming words in blur, the key word in the pill. Used by
 *  Captions and by the showcase (src/samples), so the look is one. */
export const CaptionLine: React.FC<{words: {text: string; reveal: number}[]; keyIndex: number; dark?: boolean}> = ({words, keyIndex, dark}) => {
  const ink = captionInk(dark);
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center', fontFamily, fontSize: TYPE.caption, fontWeight: TYPE.weightCaption, lineHeight: 1.16, color: ink.text}}>
      {words.map((w, i) => {
        const key = i === keyIndex;
        return (
          <span
            key={i}
            style={{
              filter: w.reveal < 1 ? `blur(${((1 - w.reveal) * 9).toFixed(1)}px)` : undefined,
              opacity: 0.35 + 0.65 * w.reveal,
              ...(key ? {background: ink.pill, color: ink.pillText, fontWeight: TYPE.weightKey, padding: '0 18px', borderRadius: 18} : {}),
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Captions ON TOP (regulation v3.0, section 10): the band y 262…450 under the platform UI, left-aligned in the safe
 * column. A page is 2–5 words; its words come out of blur as they are spoken and stay; the page holds until the next
 * page or the end of the scene. The key word sits in the dark pill.
 */
export const Captions: React.FC<{scene: SceneData; hideBefore?: number; dark?: boolean}> = ({scene, hideBefore = 0, dark}) => {
  const frame = useCurrentFrame();
  if (frame < hideBefore) return null;
  const page = scene.pages.find((p, i) => {
    const next = scene.pages[i + 1];
    const end = next ? next.startFrame : scene.durationInFrames;
    return frame >= p.startFrame - REVEAL && frame < end;
  });
  if (!page) return null;
  return (
    <div style={{position: 'absolute', left: SAFE.left, width: 1080 - SAFE.left - SAFE.right, top: ZONES.captionsTop, height: ZONES.captionsBottom - ZONES.captionsTop}}>
      <CaptionLine words={page.words.map((w) => ({text: w.text, reveal: wordReveal(frame, w.startFrame)}))} keyIndex={keyWordIndex(page, scene.beats)} dark={dark} />
    </div>
  );
};
