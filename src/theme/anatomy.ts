import {COLORS, SHADOW} from './tokens';
import {ISO_CSS} from '../vendor/anatomy/iso-kit';

// House style (regulation v3.0.4, decision of 25.11.2026): the upstream Anatomy light look — white solids, four grey
// face tones by facing, a dark contour, a soft grey halo, no surface patterns; coral stays the only meaning colour.
// Strokes are thicker than upstream's 0.6 px desktop line so they survive a ~390 px phone.
const SHADE = {
  s0: '#D6D6D3', // face turned away from the light
  s1: '#E2E2DF',
  s2: '#EBEBE8',
  s3: '#F4F4F1', // face turned toward the light
  top: '#FFFFFF', // the lit top
  litShade: '#B13D30', // coral side of the one lit part; the top stays COLORS.accent
  lo: '#B4B4B8',
  faint: '#D4D4D6',
} as const;

// Clothing tones for the character (hair, trousers, shoes = dark; shirt = mid), so the body reads apart from skin.
const DARK = {paper: '#7C7882', top: '#8E8A93', s0: '#57535D', s1: COLORS.inkSoft, s2: '#7C7882', s3: '#8E8A93'} as const;
const MID = {paper: COLORS.fillDark, top: '#EDEDEA', s0: '#C9C9C6', s1: '#D4D4D1', s2: COLORS.fillDark, s3: '#EDEDEA'} as const;
const tones = (name: string, t: {paper: string; top: string; s0: string; s1: string; s2: string; s3: string}) =>
  `.iso .iso-solid.${name}{--anatomy-paper:${t.paper};--anatomy-top:${t.top};--anatomy-shade-0:${t.s0};--anatomy-shade-1:${t.s1};--anatomy-shade-2:${t.s2};--anatomy-shade-3:${t.s3}}`;

export const ANATOMY_STYLE = {
  outer: 2, // outline of every solid (px at 1080)
  inner: 1.3, // creases, bevels, wires, ticks
} as const;

/** CSS for the Anatomy kit classes, light theme, mapped to our tokens. Put it once inside <AnatomyStage>. */
export const ANATOMY_CSS = `${ISO_CSS}
.iso[data-theme="light"]{
 --anatomy-paper:${COLORS.fillLight};--anatomy-face:${COLORS.fillLight};--anatomy-top:${SHADE.top};
 --anatomy-shade-0:${SHADE.s0};--anatomy-shade-1:${SHADE.s1};--anatomy-shade-2:${SHADE.s2};--anatomy-shade-3:${SHADE.s3};
 --anatomy-lit-top:${COLORS.accent};--anatomy-lit-shade:${SHADE.litShade};
 --anatomy-hi:${COLORS.ink};--anatomy-mid:${COLORS.inkSoft};--anatomy-lo:${SHADE.lo};--anatomy-faint:${SHADE.faint};--anatomy-lit:${COLORS.ink};
 --anatomy-halo:${SHADOW.color};--anatomy-halo-opacity:${SHADOW.opacity};--anatomy-dot:${COLORS.ink};--anatomy-weight:${ANATOMY_STYLE.inner}px}
.iso .iso-svg{overflow:visible}
/* Contact shadow (§22.1): down the isometric vertical, paper-derived colour, not the kit's black halo.
   Small parts use the default; a hero body adds class halo-hero (Assembly shadow: 'hero'). */
.iso .iso-halo{fill:${SHADOW.color};opacity:${SHADOW.opacity};filter:blur(${SHADOW.blurPart}px);transform:translateY(${SHADOW.drop}px)}
.iso .iso-solid.halo-hero>.iso-halo{filter:blur(${SHADOW.blurHero}px)}
/* Remotion renders frame by frame: the kit's CSS animations (flow dashes, pulsing dots) are switched off (§12);
   animate those with the frame number instead */
.iso .iso-line[data-flow],.iso .iso-dots circle[data-pulse]{animation:none!important}
.iso .iso-line.iso-edge{stroke-width:${ANATOMY_STYLE.outer}px}
${tones('cl-dark', DARK)}
${tones('cl-mid', MID)}
/* Every kit stroke keeps its pixel width when the camera zooms, including the AnatomyStyle sample
   (RoomSvg carries class iso-svg). A lit tube uses the coral faces; its contour stays the dark lit edge. */
.iso .iso-svg path,.iso .iso-svg circle{vector-effect:non-scaling-stroke}
.iso .tb[data-lit] .tb-body,.iso .tb[data-lit] .tb-shade{fill:var(--anatomy-lit-shade)}
.iso .tb[data-lit] .tb-shine{fill:var(--anatomy-lit-top)}
.iso .tb[data-lit] .iso-line{stroke:var(--anatomy-lit)}
`;

