import React from 'react';
import {Rect} from '../lib/camera';
import {PlateProbe} from '../lib/motion';
import {COLORS, STROKE} from '../theme/tokens';

// An inset (врезка, §19.2, §20.4): a framed screen-space panel over a scene that shows a second view of the subject
// (a plan view down a wire, a schematic of the model inside the phone). The frame is drawn on a `grid`-unit box scaled
// to its pixel size, so content written for a 240-unit grid keeps its strokes whatever the inset's size. Content is
// the children, in grid units. motion-check refuses an inset smaller than LIMITS.insetMin (320 px) on its short side:
// insetRect clamps to it, insetProbe reports it (kind 'inset').

/** The smallest short side of an inset, px (motion-check `small`, scripts/motion-check.mjs LIMITS.insetMin). */
export const INSET_MIN = 320;

export type InsetBox = {x: number; y: number; w: number; h: number};

/** The offset shadow under the frame: 6 grid units, i.e. 6·w/grid px (8 px for a 320 px inset on the 240 grid). */
const shadowOf = (w: number, grid = 240) => (6 * w) / grid;

/** The inset's screen box in a corner of the safe rect, at least INSET_MIN on each side; the frame's shadow stays inside
 *  the rect too (a box flush with the corner put the shadow 8 px past it: style-check «bounds», 20.11.2026). */
export const insetRect = (rect: Rect, size: {w: number; h: number} = {w: INSET_MIN, h: INSET_MIN}, corner: 'bl' | 'br' | 'tl' | 'tr' = 'bl', grid = 240): InsetBox => {
  const w = Math.max(INSET_MIN, size.w);
  const h = Math.max(INSET_MIN, size.h);
  const sh = shadowOf(w, grid);
  return {x: corner[1] === 'l' ? rect.x0 : rect.x1 - w - sh, y: corner[0] === 'b' ? rect.y1 - h - sh : rect.y0, w, h};
};

/** The inset as a plate probe for MotionPose.plates. */
export const insetProbe = (name: string, box: InsetBox, opacity: number): PlateProbe => ({name, kind: 'inset', ...box, opacity});

/** The framed panel: offset shadow, light fill, ink contour; children are drawn in grid units inside it. */
export const Inset: React.FC<{box: InsetBox; opacity?: number; grid?: number; children?: React.ReactNode}> = ({box, opacity = 1, grid = 240, children}) => {
  if (opacity <= 0.001) return null;
  const k = box.w / grid;
  const gh = box.h / k;
  return (
    <g opacity={opacity} transform={`translate(${box.x} ${box.y}) scale(${k})`}>
      <rect x={6} y={6} width={grid} height={gh} rx={22} fill={COLORS.fillDark} />
      <rect x={0} y={0} width={grid} height={gh} rx={22} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
      {children}
    </g>
  );
};
