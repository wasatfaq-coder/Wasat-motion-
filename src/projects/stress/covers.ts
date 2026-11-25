import {CoverSpec} from '../../lib/coverLayout';
import {P3} from '../../lib/iso';
import {SHOP} from './world.parts';

// The coral vessel is the fast response. The frame is that vessel, in room units (kit / 10).
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
const FRAME = box(6.05, 1.85, 1.45, 0.95, 0.75, 0.95);
const HERO = box(6.28, 2.02, 1.58, 0.5, 0.42, 0.62);
const ART = SHOP.svg();
const FLOOR = {x: 3.6, y: 1.4, w: 3.6, d: 1.8};

const base = {
  art: ART,
  frame: FRAME,
  hero: HERO,
  floor: FLOOR,
  crop: 1.2,
  layout: 'top' as const,
};

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {...base, technique: 'gap', hook: 'коралловый сосуд уже полон, серый ещё ждёт', lines: ['Стресс', 'и тело']},
  b: {...base, technique: 'contrast', hook: 'быстрый сосуд горит, медленный ещё пуст', lines: ['Два', 'темпа']},
  c: {...base, technique: 'specific', hook: 'ответ горит на быстром сосуде эстафеты', lines: ['Не', 'язва']},
};
