import {roomPoint} from './camera';
import {P3} from './iso';

// Cover layout for the house style (MASTER_PROMPT_FINAL §19.5, §22). Pure: the cover component draws from it and
// scripts/cover-check.mjs verifies it without rendering.
//   image 50–60 % of the central zone 420–1210 px · title 2–4 words, 96–120 px, inside the zone · the bottom of the
//   frame and the right button column stay free · survives a 4:5 crop · one coral word at most.

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
  lines: string[]; // title lines, 2–4 words in all
  accent?: [number, number]; // [line, word] in coral
  layout: 'top' | 'bottom'; // title above or below the image
  art: string; // kit markup in room coordinates (as RoomSvg children)
  frame: P3[]; // room points the image must show (its corners, or a detail for a close-up)
  placeholder?: boolean; // scaffolded stand-in: must be replaced before the gate
};

export const COVER_ZONE = {top: 420, bottom: 1210, left: 176, right: 904} as const; // right edge: the button column
export const TITLE = {min: 96, max: 120, em: 0.62, lead: 1.08} as const; // em: bold Rubik width per char (conservative)
const CROP45 = {top: (1920 - 1350) / 2, bottom: (1920 + 1350) / 2};

export type CoverLayout = {
  fontSize: number;
  lines: {text: string; words: string[]; x: number; y: number; width: number}[];
  title: {top: number; bottom: number};
  region: {top: number; bottom: number; left: number; right: number};
  cam: {focus: [number, number]; zoom: number; screen: [number, number]};
  image: {left: number; right: number; top: number; bottom: number};
  errors: string[];
  warns: string[];
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
  const gap = 40;
  const top = spec.layout === 'top' ? COVER_ZONE.top + 10 : COVER_ZONE.bottom - 10 - titleH;
  const lines = spec.lines.map((text, i) => {
    const width = text.length * fontSize * TITLE.em;
    return {text, words: text.split(/\s+/).filter(Boolean), x: 540, y: top + i * lh + Math.round(fontSize * 0.86), width};
  });
  for (const l of lines) if (l.x - l.width / 2 < 64 || l.x + l.width / 2 > COVER_ZONE.right) errors.push(`title line «${l.text}» leaves the safe column`);
  const title = {top, bottom: top + titleH};
  const region =
    spec.layout === 'top'
      ? {top: title.bottom + gap - 20, bottom: COVER_ZONE.bottom + 20, left: COVER_ZONE.left - 80, right: COVER_ZONE.right}
      : {top: COVER_ZONE.top - 20, bottom: title.top - gap + 20, left: COVER_ZONE.left - 80, right: COVER_ZONE.right};
  // fit the frame points into the region
  const pts = spec.frame.map((p) => roomPoint(p));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const rw = region.right - region.left;
  const rh = region.bottom - region.top;
  const zoneH = COVER_ZONE.bottom - COVER_ZONE.top;
  const zoom = Math.min((rw - 60) / w, (rh - 60) / h, (zoneH * 0.6) / h); // fill the region inside its fade, at most 60 % of the zone
  const screen: [number, number] = [(region.left + region.right) / 2, (region.top + region.bottom) / 2];
  const cam = {focus: [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2] as [number, number], zoom, screen};
  const image = {left: screen[0] - (w * zoom) / 2, right: screen[0] + (w * zoom) / 2, top: screen[1] - (h * zoom) / 2, bottom: screen[1] + (h * zoom) / 2};
  const share = (image.bottom - image.top) / (COVER_ZONE.bottom - COVER_ZONE.top);
  if (share < 0.45) errors.push(`image takes ${(share * 100).toFixed(0)} % of the central zone height; 50–60 % (§19.5)`);
  else if (share < 0.5 || share > 0.75) warns.push(`image takes ${(share * 100).toFixed(0)} % of the central zone height; aim for 50–60 %`);
  if (image.right > COVER_ZONE.right + 2) errors.push('image runs into the right button column');
  if (title.top < CROP45.top || title.bottom > CROP45.bottom || image.top < CROP45.top || image.bottom > CROP45.bottom) errors.push('cut by a 4:5 crop');
  if (spec.accent) {
    const [li, wi] = spec.accent;
    if (!lines[li] || !lines[li].words[wi]) errors.push('accent points to no word');
  }
  if (spec.placeholder) warns.push('placeholder cover: replace the image and the title before the gate');
  return {fontSize, lines, title, region, cam, image, errors, warns};
};

/** Checks across a topic's variants: three different techniques. */
export const checkCoverSet = (covers: Record<string, CoverSpec>) => {
  const errors: string[] = [];
  const t = Object.values(covers).map((c) => c.technique);
  if (Object.keys(covers).length !== 3) errors.push(`${Object.keys(covers).length} cover variants; 3 (§19.5)`);
  if (new Set(t).size !== t.length) errors.push(`variants repeat a technique (${t.join(', ')}); each uses a different one`);
  return errors;
};
