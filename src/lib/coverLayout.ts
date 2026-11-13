import {roomPoint} from './camera';
import {P3} from './iso';

// Cover layout v2 for the house style (MASTER_PROMPT_FINAL §19.5, §22). Pure: the cover component draws from it and
// scripts/cover-check.mjs verifies it without rendering.
//   title 2–4 words, 96–120 px, inside the central zone 420–1210 · the IMAGE fills all the free space (from the top
//   UI line to the bottom strip, beside the title) edge to edge and takes ≥ 22 % of the frame (old covers: 10–13 %) · the right button column (x > 904) and the bottom strip (y > 1470)
//   stay free · a 4:5 crop keeps the title and the hook detail · the picture itself carries the hook (`hook`), its
//   key detail reads in a 270×480 thumbnail · ONE coral spot: the hook detail in the image OR one title word.

/** The five cover techniques of §19.5; a topic's three variants use three different ones. */
export type Technique = 'gap' | 'violation' | 'incomplete' | 'contrast' | 'specific';
export const TECHNIQUES: Record<Technique, string> = {
  gap: 'разрыв любопытства',
  violation: 'нарушение ожидания',
  incomplete: 'незавершённость',
  contrast: 'контраст',
  specific: 'конкретика',
};

export type CoverSpec = {
  technique: Technique;
  hook: string; // what IN THE PICTURE raises the question (not the title): a cutaway, a part out of place, a reaction…
  lines: string[]; // title lines, 2–4 words in all
  accent?: [number, number]; // [line, word] in coral — only when the image has no coral part
  layout: 'top' | 'bottom'; // title above or below the image
  art: string; // kit markup in room coordinates (as RoomSvg children)
  frame: P3[]; // room points the image must show
  hero: P3[]; // room points of the key detail (the hook): must read at thumbnail size
  backdrop?: 'spot' | 'none'; // spot (default): a soft light spot behind the image and darker edges
  placeholder?: boolean; // scaffolded stand-in: must be replaced before the gate
};

export const COVER_ZONE = {top: 420, bottom: 1210, left: 176, right: 904} as const; // title zone; right edge: buttons
export const IMAGE_ZONE = {top: 250, bottom: 1470, left: 24, right: 904} as const; // below the top UI, above the bottom strip
export const TITLE = {min: 96, max: 120, em: 0.62, lead: 1.08} as const; // em: bold Rubik width per char (conservative)
export const IMAGE_SHARE = {min: 0.22, aim: 0.26} as const; // image box / frame area (a wide iso object in a tall frame)
export const HERO_MIN = 220; // px at full size (≈ 55 px in a 270×480 thumbnail)
const CROP45 = {top: (1920 - 1350) / 2, bottom: (1920 + 1350) / 2};

export type Box = {left: number; right: number; top: number; bottom: number};
export type CoverLayout = {
  fontSize: number;
  lines: {text: string; words: string[]; x: number; y: number; width: number}[];
  title: {top: number; bottom: number};
  region: Box;
  cam: {focus: [number, number]; zoom: number; screen: [number, number]};
  image: Box;
  hero: Box;
  share: number; // image area / frame area
  errors: string[];
  warns: string[];
};

const bbox = (pts: [number, number][]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)};
};

export const coverLayout = (spec: CoverSpec): CoverLayout => {
  const errors: string[] = [];
  const warns: string[] = [];
  const words = spec.lines.flatMap((l) => l.split(/\s+/).filter(Boolean));
  if (words.length < 2 || words.length > 4) errors.push(`title has ${words.length} words; 2–4 (§19.5)`);
  const half = Math.min(540 - 64, COVER_ZONE.right - 540);
  const longest = Math.max(...spec.lines.map((l) => l.length));
  let fontSize = Math.min(TITLE.max, Math.floor((2 * half) / (longest * TITLE.em)));
  if (fontSize < TITLE.min) {
    errors.push(`title line «${spec.lines.find((l) => l.length === longest)}» too long: ${fontSize} px < ${TITLE.min} px; shorten or split it`);
    fontSize = TITLE.min;
  }
  const lh = Math.round(fontSize * TITLE.lead);
  const titleH = spec.lines.length * lh;
  const gap = 30;
  const top = spec.layout === 'top' ? COVER_ZONE.top + 10 : COVER_ZONE.bottom - 10 - titleH;
  const lines = spec.lines.map((text, i) => ({text, words: text.split(/\s+/).filter(Boolean), x: 540, y: top + i * lh + Math.round(fontSize * 0.86), width: text.length * fontSize * TITLE.em}));
  for (const l of lines) if (l.x - l.width / 2 < 64 || l.x + l.width / 2 > COVER_ZONE.right) errors.push(`title line «${l.text}» leaves the safe column`);
  const title = {top, bottom: top + titleH};
  const region: Box =
    spec.layout === 'top'
      ? {top: title.bottom + gap, bottom: IMAGE_ZONE.bottom, left: IMAGE_ZONE.left, right: IMAGE_ZONE.right}
      : {top: IMAGE_ZONE.top, bottom: title.top - gap, left: IMAGE_ZONE.left, right: IMAGE_ZONE.right};
  // fit the frame points into the whole region: the image is the cover
  const fb = bbox(spec.frame.map((p) => roomPoint(p)));
  const w = Math.max(1, fb.x1 - fb.x0);
  const h = Math.max(1, fb.y1 - fb.y0);
  const zoom = Math.min((region.right - region.left - 20) / w, (region.bottom - region.top - 20) / h);
  const screen: [number, number] = [(region.left + region.right) / 2, (region.top + region.bottom) / 2];
  const focus: [number, number] = [(fb.x0 + fb.x1) / 2, (fb.y0 + fb.y1) / 2];
  const to = ([x, y]: [number, number]): [number, number] => [screen[0] + (x - focus[0]) * zoom, screen[1] + (y - focus[1]) * zoom];
  const image: Box = {left: screen[0] - (w * zoom) / 2, right: screen[0] + (w * zoom) / 2, top: screen[1] - (h * zoom) / 2, bottom: screen[1] + (h * zoom) / 2};
  const share = ((image.right - image.left) * (image.bottom - image.top)) / (1080 * 1920);
  if (share < IMAGE_SHARE.min) errors.push(`image takes ${(share * 100).toFixed(0)} % of the frame; at least ${IMAGE_SHARE.min * 100} % — frame a closer view or a squarer group`);
  else if (share < IMAGE_SHARE.aim) warns.push(`image takes ${(share * 100).toFixed(0)} % of the frame; aim for ≥ ${IMAGE_SHARE.aim * 100} %`);
  if (image.right > IMAGE_ZONE.right + 2) errors.push('image runs into the right button column');
  if (image.bottom > IMAGE_ZONE.bottom + 2) errors.push('image runs into the bottom strip');
  // the hook detail: big enough at thumbnail size, inside the 4:5 crop
  const hb = bbox(spec.hero.map((p) => to(roomPoint(p))));
  const hero: Box = {left: hb.x0, right: hb.x1, top: hb.y0, bottom: hb.y1};
  const heroSize = Math.max(hero.right - hero.left, hero.bottom - hero.top);
  if (heroSize < HERO_MIN) errors.push(`the hook detail is ${heroSize.toFixed(0)} px (${(heroSize / 4).toFixed(0)} px in the thumbnail); at least ${HERO_MIN} px`);
  if (!spec.hook || spec.hook.trim().split(/\s+/).length < 3) errors.push('no hook in the picture: describe what in the image raises the question (`hook`)');
  if (title.top < CROP45.top || title.bottom > CROP45.bottom) errors.push('the title is cut by a 4:5 crop');
  if (hero.top < CROP45.top || hero.bottom > CROP45.bottom) errors.push('the hook detail is cut by a 4:5 crop');
  // one coral spot
  const artCoral = /data-lit/.test(spec.art);
  if (spec.accent) {
    const [li, wi] = spec.accent;
    if (!lines[li] || !lines[li].words[wi]) errors.push('accent points to no word');
    if (artCoral) errors.push('two coral spots: the image has a coral part and the title a coral word; keep one');
  } else if (!artCoral) warns.push('no coral spot: mark the hook detail (lit) or one title word');
  if (spec.placeholder) warns.push('placeholder cover: replace the image, the hook and the title before the gate');
  return {fontSize, lines, title, region, cam: {focus, zoom, screen}, image, hero, share, errors, warns};
};

/** Checks across a topic's variants: three different techniques. */
export const checkCoverSet = (covers: Record<string, CoverSpec>) => {
  const errors: string[] = [];
  const t = Object.values(covers).map((c) => c.technique);
  if (Object.keys(covers).length !== 3) errors.push(`${Object.keys(covers).length} cover variants; 3 (§19.5)`);
  if (new Set(t).size !== t.length) errors.push(`variants repeat a technique (${t.join(', ')}); each uses a different one`);
  return errors;
};
