import {COLORS, STROKE} from './tokens';
import {ISO_CSS} from '../vendor/anatomy/iso-kit';

// House style for new topics (MASTER_PROMPT_FINAL §22): Anatomy's toned solids (four face tones by facing, bevels,
// a soft halo) in our palette, with our thick dark contour and ONE coral lit part. All colours come from COLORS.
const SHADE = {
  s0: COLORS.fillDark, // face turned away from the light
  s1: '#E9E1D5',
  s2: COLORS.fillMid,
  s3: '#F6F1E9', // face turned to the light
  litShade: '#C94E3C', // coral side faces of the lit part
  lo: '#9A949C',
  faint: '#D9D1C5',
  halo: '#8A7F70',
} as const;

export const ANATOMY_STYLE = {
  outer: STROKE.main, // outline of every solid
  inner: STROKE.secondary, // creases, bevels, wires, ticks
} as const;

/** CSS for the Anatomy kit classes, light theme, mapped to our tokens. Put it once inside <AnatomyStage>. */
export const ANATOMY_CSS = `${ISO_CSS}
.iso[data-theme="light"]{
 --anatomy-paper:${COLORS.fillLight};--anatomy-face:${COLORS.fillLight};--anatomy-top:${COLORS.fillLight};
 --anatomy-shade-0:${SHADE.s0};--anatomy-shade-1:${SHADE.s1};--anatomy-shade-2:${SHADE.s2};--anatomy-shade-3:${SHADE.s3};
 --anatomy-lit-top:${COLORS.accent};--anatomy-lit-shade:${SHADE.litShade};
 --anatomy-hi:${COLORS.ink};--anatomy-mid:${COLORS.inkSoft};--anatomy-lo:${SHADE.lo};--anatomy-faint:${SHADE.faint};--anatomy-lit:${COLORS.ink};
 --anatomy-halo:${SHADE.halo};--anatomy-dot:${COLORS.ink};--anatomy-weight:${ANATOMY_STYLE.inner}px}
.iso .iso-svg{overflow:visible}
.iso .iso-line.iso-edge{stroke-width:${ANATOMY_STYLE.outer}px}
`;
