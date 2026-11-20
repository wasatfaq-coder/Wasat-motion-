import React from 'react';

// Surface textures of the house style (MASTER_PROMPT_FINAL v3.0, section 8, «узоры заливки»; taken from the references as
// a way to give detail on the 4× loupe without a hundred parts). A texture is a pattern laid ON each face of a body, in
// the plane of that face (top, right, left), drawn in the kit's own tone: it never adds a colour and never flattens the
// volume (the face tones stay under it). Pure: patterns are fixed, no randomness.

export const TEXTURES = ['ridges', 'grain', 'cells', 'weave', 'waves', 'dots'] as const;
export type Texture = (typeof TEXTURES)[number];

type Face = 'top' | 'a' | 'b'; // top face, the face along the y axis (shade 0, 1), the face along the x axis (shade 2, 3)
export const FACE_OF_SHADE = (shade: number): Face => (shade < 2 ? 'a' : 'b');

const S = 0.866; // cos 30°: the isometric axes
// the pattern plane of each face in screen space: x axis, y axis of the tile
const PLANE: Record<Face, string> = {
  top: `matrix(${S} 0.5 ${-S} 0.5 0 0)`,
  a: `matrix(${-S} 0.5 0 1 0 0)`,
  b: `matrix(${S} 0.5 0 1 0 0)`,
};

const ink = {stroke: 'var(--anatomy-lo)', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};

/** One tile of each texture, 12 × 12 units, drawn in tone `lo` with a light opacity. */
const TILE: Record<Texture, React.ReactNode> = {
  // brushed metal: fine long lines along the tile's x axis
  ridges: (
    <g {...ink} strokeWidth={0.9} opacity={0.7}>
      <path d="M0 2H12M0 6H12M0 10H12" />
    </g>
  ),
  // wood grain: wavy lines of varied spacing
  grain: (
    <g {...ink} strokeWidth={0.95} opacity={0.7}>
      <path d="M0 2.4Q3 1 6 2.4T12 2.4M0 6.6Q3 8 6 6.6T12 6.6M0 10.4Q4 9.4 8 10.4T12 10" />
    </g>
  ),
  // cells (fat tissue, honeycomb): rounded polygons
  cells: (
    <g {...ink} strokeWidth={1} opacity={0.75}>
      <path d="M3 0.6L6 0.6L7.6 3L6 5.4L3 5.4L1.4 3Z M9 6.6L12 6.6L13.6 9L12 11.4L9 11.4L7.4 9Z M-3 6.6L0 6.6L1.6 9L0 11.4L-3 11.4L-4.6 9Z" />
    </g>
  ),
  // woven fabric and tile: a light cross-hatch
  weave: (
    <g {...ink} strokeWidth={0.8} opacity={0.65}>
      <path d="M0 3H12M0 9H12M3 0V12M9 0V12" />
    </g>
  ),
  // water: ripples
  waves: (
    <g {...ink} strokeWidth={0.95} opacity={0.7}>
      <path d="M0 3Q1.5 1.6 3 3T6 3T9 3T12 3M0 9Q1.5 7.6 3 9T6 9T9 9T12 9" />
    </g>
  ),
  // stipple: stone, grain, bone
  dots: (
    <g fill="var(--anatomy-lo)" opacity={0.75}>
      <circle cx="2" cy="2" r="0.8" />
      <circle cx="7" cy="4" r="0.75" />
      <circle cx="4" cy="7.5" r="0.8" />
      <circle cx="10" cy="9" r="0.75" />
      <circle cx="9.5" cy="1" r="0.7" />
    </g>
  ),
};

/** The pattern definitions; AnatomyStage renders them once (an invisible svg), the face CSS refers to them by id. */
export const TextureDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
    <defs>
      {TEXTURES.flatMap((t) =>
        (['top', 'a', 'b'] as Face[]).map((f) => (
          <pattern key={`${t}-${f}`} id={`tex-${t}-${f}`} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform={`${PLANE[f]} scale(1.15)`}>
            {TILE[t]}
          </pattern>
        )),
      )}
    </defs>
  </svg>
);

/** CSS: an overlay path of a face takes the pattern of its texture and face. */
export const TEXTURE_CSS = TEXTURES.flatMap((t) => (['top', 'a', 'b'] as Face[]).map((f) => `.iso .iso-tex[data-tex="${t}"][data-face="${f}"]{fill:url(#tex-${t}-${f});stroke:none;pointer-events:none}`)).join('\n');

/** Add a pattern layer above every face of a solid's svg (the shades and the top): used by Assembly for `texture`. */
export const texturize = (svg: string, texture: Texture) =>
  svg
    .replace(/<path class="iso-shade" data-shade="(\d)" d="([^"]*)"\/>/g, (m, s: string, d: string) => `${m}<path class="iso-tex" data-tex="${texture}" data-face="${FACE_OF_SHADE(Number(s))}" d="${d}"/>`)
    .replace(/<path class="iso-top" d="([^"]*)"\/>/g, (m, d: string) => `${m}<path class="iso-tex" data-tex="${texture}" data-face="top" d="${d}"/>`);
