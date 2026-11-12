import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {ZONES, SAFE} from '../theme/layout';
import {fontFamily} from '../theme/font';
import {SceneData} from '../lib/timeline';

/** Caption pages in the reserved band y=1210…1470. Active word changes colour only, so width never changes. */
export const Captions: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
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
        top: ZONES.captionsTop + 40,
        display: 'flex',
        justifyContent: 'center',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 10}px)`,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: TYPE.weightMedium,
          fontSize: TYPE.caption,
          lineHeight: 1.2,
          color: COLORS.captionText,
          background: COLORS.captionBg,
          padding: '14px 28px',
          borderRadius: 18,
          textAlign: 'center',
          maxWidth: 840,
        }}
      >
        {page.words.map((w, i) => (
          <span key={i} style={{color: frame >= w.startFrame && frame < w.endFrame + 6 ? COLORS.accentSoft : COLORS.captionText}}>
            {w.text}
            {i < page.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
};
