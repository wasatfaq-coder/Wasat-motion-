// Design tokens: line-art room on a light solid background, one coral accent.
export const COLORS = {
  bg: '#F5F0E8',          // light solid background
  wallLeft: '#F1EBE2',    // light fills close to bg; occlude back lines
  wallRight: '#F8F4EE',
  floor: '#EFE8DD',
  fillLight: '#FCFAF6',
  fillMid: '#F0E9DF',
  fillDark: '#E3DACD',
  ink: '#25242B',         // dark outline + text (contrast ≈ 14:1 on bg)
  inkSoft: '#6B6770',     // secondary lines and captions (≈ 5:1 on bg)
  accent: '#E8604C',      // coral: novelty and the key meaning
  captionBg: 'rgba(37,36,43,0.82)',
  captionText: '#FCFAF6',
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
} as const;

export const DUR = {
  micro: 0.2,
  appear: 0.5,
  transform: 1.2,
  cut: 0.5,
} as const;
