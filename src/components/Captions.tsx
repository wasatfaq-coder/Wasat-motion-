import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {captionNeedsPlate, COLORS, TYPE} from '../theme/tokens';
import {ZONES, SAFE} from '../theme/layout';
import {fontFamily} from '../theme/font';
import {Beat, Page, SceneData} from '../lib/timeline';

const norm = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');

/** The page's key word is the beat that lands inside it (§10, §19.1). One word, bold for the whole page. */
const keyWordIndex = (page: Page, beats: Beat[]) => {
  const beat = beats.find((b) => b.frame !== null && b.frame >= page.startFrame && b.frame < page.endFrame);
  if (!beat || beat.frame === null) return -1;
  const at = beat.frame;
  const target = norm(beat.word);
  const spoken = page.words.findIndex((w) => w.startFrame <= at && at < w.endFrame + 6);
  if (spoken >= 0 && norm(page.words[spoken].text) === target) return spoken;
  return page.words.findIndex((w) => norm(w.text) === target);
};

/**
 * Caption pages in the reserved band y=1210…1470. No plate while ink on the background clears 4.5:1;
 * captionBg is the fallback when that check fails (§19.1). Pages stay 2–6 words. Only the key word
 * is bold, with a coral underline that does not change the line width as speech moves on.
 */
export const Captions: React.FC<{scene: SceneData; hideBefore?: number}> = ({scene, hideBefore = 0}) => {
  const frame = useCurrentFrame();
  if (frame < hideBefore) return null;
  const page = scene.pages.find((p, i) => {
    const next = scene.pages[i + 1];
    const end = next ? next.startFrame : scene.durationInFrames;
    return frame >= p.startFrame - 4 && frame < end;
  });
  if (!page) return null;
  const appear = interpolate(frame, [page.startFrame - 4, page.startFrame + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: 1080 - SAFE.left - SAFE.right,
        top: ZONES.captionsTop + 24,
        height: ZONES.captionsBottom - ZONES.captionsTop - 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 12}px)`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: TYPE.weightCaption,
          fontSize: TYPE.caption,
          lineHeight: 1.18,
          color: captionNeedsPlate ? COLORS.captionText : COLORS.ink,
          background: captionNeedsPlate ? COLORS.captionBg : 'transparent',
          borderRadius: captionNeedsPlate ? 12 : 0,
          padding: captionNeedsPlate ? '8px 16px' : 0,
          textAlign: 'center',
          maxWidth: 840,
          textWrap: 'balance',
        }}
      >
        {page.words.map((w, i) => {
          const key = i === keyWordIndex(page, scene.beats);
          return (
            <span
              key={i}
              style={{
                fontWeight: key ? TYPE.weightKey : TYPE.weightCaption,
                boxShadow: key ? `inset 0 -0.16em 0 ${COLORS.accent}` : 'none',
                borderRadius: 4,
              }}
            >
              {w.text}
              {i < page.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};
