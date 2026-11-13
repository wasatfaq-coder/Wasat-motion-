import * as K from '../../vendor/anatomy/iso-kit';
import {anatomyProjection} from '../../lib/anatomy';
import {CoverSpec} from '../../lib/coverLayout';
import {P3} from '../../lib/iso';

// Covers of «Как работает электромотор» (MASTER_PROMPT_FINAL §19.5): three variants, each with a different technique
// (gap, violation, incomplete, contrast, specific); title 2–4 words with one coral word; the image is the topic's
// hero object drawn in the house style (§22), framed by `frame` (room points). Checked by scripts/cover-check.mjs.
// PLACEHOLDERS: replace `art`, `frame` and `lines` and drop `placeholder` before the gate.
const U = 10;
const P = anatomyProjection(U);
const PLACEHOLDER = K.solidSvg(K.slabOf({x: 0, y: 0, w: 40, d: 40, r: 3}, 0, 40, P, 8, 1), {tone: 'hi', lit: true});
const FRAME: P3[] = [[0, 0, 0], [4, 0, 0], [0, 4, 0], [4, 4, 0], [0, 0, 4], [4, 4, 4]];
const FLOOR = {x: -2, y: -2, w: 8, d: 8};
const HERO: P3[] = [[1, 1, 0], [3, 3, 3]]; // the hook detail, inside the frame

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {technique: 'gap', hook: 'ЗАМЕНИТЬ: что в картинке не так с героем', lines: ['Вопрос', 'темы?'], layout: 'top', art: PLACEHOLDER, frame: FRAME, hero: HERO, floor: FLOOR, crop: 1, placeholder: true},
  b: {technique: 'contrast', hook: 'ЗАМЕНИТЬ: что в картинке не так с героем', lines: ['Было', 'и стало'], accent: [1, 1], layout: 'top', art: PLACEHOLDER.replace(' data-lit=""', ''), frame: FRAME, hero: HERO, floor: FLOOR, crop: 1, placeholder: true},
  c: {technique: 'incomplete', hook: 'ЗАМЕНИТЬ: что в картинке не так с героем', lines: ['Что', 'внутри?'], layout: 'top', art: PLACEHOLDER, frame: FRAME, hero: HERO, floor: FLOOR, crop: 1, placeholder: true},
};
