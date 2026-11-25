import {CoverSpec} from '../../lib/coverLayout';
import {P3} from '../../lib/iso';
import {BODY} from './organs.parts';

const box = (x: number, y: number, z: number, w: number, d: number, h: number): P3[] => [
  [x, y, z],
  [x + w, y, z],
  [x, y + d, z],
  [x + w, y + d, z],
  [x, y, z + h],
  [x + w, y, z + h],
  [x, y + d, z + h],
  [x + w, y + d, z + h],
];
// Heart in room units (kit / 10): centre about (-0.2, 0.6, 1.6).
const FRAME = box(-1.6, -0.6, 0.4, 3.2, 2.6, 2.4);
const HERO = box(-0.9, 0.1, 0.9, 1.4, 1.3, 1.3);
const base = {
  art: BODY.svg(),
  frame: FRAME,
  hero: HERO,
  floor: {x: -2.6, y: -1.4, w: 5.2, d: 3.6},
  crop: 1.05,
  layout: 'top' as const,
};

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {...base, technique: 'gap', hook: 'сердце уже бьётся, туча ещё над ним', lines: ['Стресс', 'и тело']},
  b: {...base, technique: 'contrast', hook: 'одно сердце горит, соседние органы молчат', lines: ['Два', 'темпа']},
  c: {...base, technique: 'specific', hook: 'коралл на сердце — это ответ тела', lines: ['Пульс', 'растёт']},
};
