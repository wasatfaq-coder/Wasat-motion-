import React from 'react';
import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {COLORS, TYPE} from '../theme/tokens';
import {fontFamily} from '../theme/font';
import {AnatomyStage, Kit} from '../lib/anatomy';
import {ROOM_ORIGIN} from '../lib/camera';
import {coverLayout, CoverSpec} from '../lib/coverLayout';

// Cover template in the house style (MASTER_PROMPT_FINAL §19.5, §22): toned-solid image framed into the central
// zone, a 2–4 word title in bold Rubik with one coral word, nothing in the bottom and the right button column.
// A topic keeps its three variants in src/projects/<slug>/covers.ts (checked by scripts/cover-check.mjs).

/** Covers are seen as thumbnails: contours keep 7 px and inner lines 4.5 px at any zoom (like the «время» cover). */
const COVER_CSS = `.iso .cover .iso-line{stroke-width:4.5px}.iso .cover .iso-line.iso-edge{stroke-width:7px}.iso .cover .tb path{vector-effect:non-scaling-stroke}`;

export const anatomyCoverSchema = z.object({variant: z.enum(['a', 'b', 'c'])});
export type AnatomyCoverProps = z.infer<typeof anatomyCoverSchema>;

export const AnatomyCover: React.FC<{spec: CoverSpec}> = ({spec}) => {
  const L = coverLayout(spec);
  const {focus, zoom, screen} = L.cam;
  return (
    <AnatomyStage>
      <AbsoluteFill style={{background: COLORS.bg}}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
          <defs>
            {/* the image never leaves its region: a close-up fades out at the region's edge (no hard card edge),
                not spilled over the title or the buttons */}
            <filter id="coverFeather" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={14} />
            </filter>
            <mask id="coverArt" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
              <rect x={L.region.left + 14} y={L.region.top + 14} width={L.region.right - L.region.left - 28} height={L.region.bottom - L.region.top - 28} rx={30} fill="white" filter="url(#coverFeather)" />
            </mask>
          </defs>
          <style>{COVER_CSS}</style>
          <g mask="url(#coverArt)">
            <g className="ns cover" transform={`translate(${screen[0]} ${screen[1]}) scale(${zoom}) translate(${-focus[0]} ${-focus[1]})`}>
              <g transform={`translate(${ROOM_ORIGIN[0]} ${ROOM_ORIGIN[1]})`}>
                <Kit svg={spec.art} />
              </g>
            </g>
          </g>
          {L.lines.map((line, li) => (
            <text key={li} x={line.x} y={line.y} textAnchor="middle" fontFamily={fontFamily} fontWeight={TYPE.weightBold} fontSize={L.fontSize} fill={COLORS.ink}>
              {line.words.map((w, wi) => (
                <tspan key={wi} fill={spec.accent && spec.accent[0] === li && spec.accent[1] === wi ? COLORS.accent : COLORS.ink}>
                  {(wi ? ' ' : '') + w}
                </tspan>
              ))}
            </text>
          ))}
        </svg>
      </AbsoluteFill>
    </AnatomyStage>
  );
};
