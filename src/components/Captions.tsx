import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {ZONES, SAFE} from '../theme/layout';
import {fontFamily} from '../theme/font';
import {SceneData} from '../lib/timeline';

/**
 * Caption pages in the reserved band y=1210…1470, on the clean background (graphics fade out above it).
 * Dark ink text; the active word gets a coral underline bar drawn with an inset shadow, so its width never changes.
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
          color: COLORS.ink,
          textAlign: 'center',
          maxWidth: 840,
          textWrap: 'balance',
        }}
      >
        {page.words.map((w, i) => {
          const active = frame >= w.startFrame && frame < w.endFrame + 6;
          return (
            <span key={i} style={{boxShadow: active ? `inset 0 -0.16em 0 ${COLORS.accent}` : 'none', borderRadius: 4}}>
              {w.text}
              {i < page.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};
