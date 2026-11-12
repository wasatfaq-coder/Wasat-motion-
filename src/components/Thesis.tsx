import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPE} from '../theme/tokens';
import {SAFE} from '../theme/layout';
import {fontFamily} from '../theme/font';
import {EASE} from '../lib/anim';

/** Short on-screen thesis at the top of the graphics area; lines rise from under a mask. */
export const Thesis: React.FC<{lines: string[]; startFrame: number; endFrame?: number; size?: number; accentLine?: number; top?: number}> = ({
  lines,
  startFrame,
  endFrame,
  size = TYPE.thesis,
  accentLine,
  top = SAFE.top + 4,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = endFrame === undefined ? 0 : interpolate(frame, [endFrame - 0.3 * fps, endFrame], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.in});
  return (
    <div style={{position: 'absolute', left: SAFE.left, top, width: 1080 - SAFE.left - SAFE.right, opacity: 1 - out}}>
      {lines.map((line, i) => {
        const p = interpolate(frame, [startFrame + i * 4, startFrame + i * 4 + 0.45 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out});
        return (
          <div key={i} style={{overflow: 'hidden', height: size * 1.12}}>
            <div
              style={{
                fontFamily,
                fontWeight: TYPE.weightBold,
                fontSize: size,
                lineHeight: 1.1,
                color: i === accentLine ? COLORS.accent : COLORS.ink,
                transform: `translateY(${(1 - p) * size * 1.15}px)`,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};
