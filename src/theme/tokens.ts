// Design tokens: white solids with grey face tones on a near-white background (the upstream Anatomy light look,
// decision of 25.11.2026), dark contour, one coral accent.
export const COLORS = {
  bg: '#FBFBFA',          // light solid background
  wallLeft: '#F4F4F1',    // light fills close to bg; occlude back lines
  wallRight: '#FAFAF8',
  floor: '#F0F0ED',
  fillLight: '#FFFFFF',
  fillMid: '#EFEFEC',
  fillDark: '#E2E2DF',
  ink: '#25242B',         // dark outline + text (contrast ≈ 14:1 on bg)
  inkSoft: '#6B6770',     // secondary lines and captions (≈ 5:1 on bg)
  accent: '#E8604C',      // coral: novelty and the key meaning
  captionBg: 'rgba(37,36,43,0.82)', // fallback plate only, when ink-on-bg contrast fails (§19.1)
  captionText: '#FFFFFF',
  bgDark: '#2B2A30',      // the one dark scene of a video (regulation v3.0, section 7)
  plateDark: '#3A3940',   // a frontal plate on the dark scene
} as const;

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

const mixChannel = (a: string, b: string, t: number) =>
  rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t));

const hexOf = (channels: number[]) => `#${channels.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const linear = (channel: number) => {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/** WCAG contrast of two #rrggbb colours. */
export const contrastRatio = (fg: string, bg: string) => {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

export const CAPTION_CONTRAST_MIN = 4.5;

/** True only when dark text on the page background is below §5. Captions then use captionBg (§19.1). */
export const captionNeedsPlate = contrastRatio(COLORS.ink, COLORS.bg) < CAPTION_CONTRAST_MIN;

/** Soft contact shadow (§22.1). Colour is the background mixed toward ink, never black.
 *  CSS uses the midpoints; the min/max are the allowed band. */
export const SHADOW = {
  color: hexOf(mixChannel(COLORS.bg, COLORS.ink, 0.55)),
  opacity: 0.15,
  opacityMin: 0.12,
  opacityMax: 0.18,
  blurPart: 7,
  blurPartMin: 6,
  blurPartMax: 8,
  blurHero: 14,
  blurHeroMin: 12,
  blurHeroMax: 16,
  drop: 4, // px straight down the screen, which is the isometric vertical
} as const;

export const STROKE = {main: 3.5, secondary: 2.5, micro: 1.75} as const;

export const TYPE = {
  family: 'Rubik',
  title: 96,
  thesis: 72,
  caption: 68,
  label: 44,
  weightBold: 700,
  weightMedium: 500,
  weightCaption: 600,
  weightKey: 700, // the one key word on a caption page (§10, §19.1)
} as const;

/** Floors for type that is not a caption or a plate label (§5). */
export const TYPE_FLOOR = {
  figure: 32, // a number the sentence needs
  auxiliary: 26, // an axis tick the sentence does not need
} as const;

export const DUR = {
  micro: 0.2,
  appear: 0.5,
  transform: 1.2,
  cut: 0.5,
} as const;
