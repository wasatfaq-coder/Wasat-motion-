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

// Clothing tones for the character (hair, trousers, shoes = dark; shirt = mid), so the body reads apart from skin.
const DARK = {paper: '#7C7882', top: '#8E8A93', s0: '#57535D', s1: COLORS.inkSoft, s2: '#7C7882', s3: '#8E8A93'} as const;
const MID = {paper: COLORS.fillDark, top: '#EDE6DB', s0: '#CFC5B6', s1: '#D9D0C2', s2: COLORS.fillDark, s3: '#EDE6DB'} as const;
const tones = (name: string, t: {paper: string; top: string; s0: string; s1: string; s2: string; s3: string}) =>
  `.iso .iso-solid.${name}{--anatomy-paper:${t.paper};--anatomy-top:${t.top};--anatomy-shade-0:${t.s0};--anatomy-shade-1:${t.s1};--anatomy-shade-2:${t.s2};--anatomy-shade-3:${t.s3}}`;

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
/* Remotion renders frame by frame: the kit's CSS animations (flow dashes, pulsing dots) are switched off (§12);
   animate those with the frame number instead */
.iso .iso-line[data-flow],.iso .iso-dots circle[data-pulse]{animation:none!important}
.iso .iso-line.iso-edge{stroke-width:${ANATOMY_STYLE.outer}px}
${tones('cl-dark', DARK)}
${tones('cl-mid', MID)}
/* close-ups: lines keep their pixel width whatever the camera zoom (wrap the drawing in <g class="ns">) */
.iso .ns .iso-line,.iso .ns .iso-dots circle{vector-effect:non-scaling-stroke}
`;
