import * as K from '../../vendor/anatomy/iso-kit';
import {G, Point3} from '../assembly';
import {paint, Painted} from '../anatomy';

// Sparks (MASTER_PROMPT_FINAL §24.1, symbol «sparks»: a flash of insight, surprise, delight). Small four-sided
// chips burst from a point and fly on ballistic paths under gravity, spinning, and are gone in 0.6–1.2 s. They are
// a short effect, like flow dots (§22.3), not an object: not an Assembly, not in the part norm, never coral.

const rand = (seed: number) => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The sparks at `t` seconds after the burst at `at` (kit units, gravity `g` kit units/s² down). */
export const sparks = (P: K.Projection, at: Point3, t: number, o: {count?: number; speed?: number; g?: number; size?: number; life?: number} = {}) => {
  const n = o.count ?? 24;
  const speed = o.speed ?? 40;
  const g = o.g ?? 90;
  const size = o.size ?? 1.2;
  const life = o.life ?? 1;
  if (t <= 0 || t >= life) return '';
  const items: Painted[] = [];
  for (let i = 0; i < n; i++) {
    const a = rand(i) * Math.PI * 2;
    const up = 0.35 + rand(i + 50) * 0.65;
    const v = speed * (0.6 + rand(i + 99) * 0.6);
    const dir: Point3 = [Math.cos(a) * Math.sqrt(1 - up * up), Math.sin(a) * Math.sqrt(1 - up * up), up];
    const p: Point3 = [at[0] + dir[0] * v * t, at[1] + dir[1] * v * t, at[2] + dir[2] * v * t - 0.5 * g * t * t];
    const own = life * (0.6 + rand(i + 7) * 0.4);
    if (t > own) continue;
    const k = size * (1 - t / own) ** 0.6;
    const spin = t * (8 + rand(i + 3) * 10) + i;
    const F = G.frameAlong(p, [Math.cos(spin), Math.sin(spin), 0.4]);
    const paths = G.prismOf(F, [[-k, 0], [0, k * 0.6], [k, 0], [0, -k * 0.6]], -k * 0.3, k * 0.3, P);
    items.push({at: p, svg: K.solidSvg(paths, {tone: 'hi'})});
  }
  return paint(items, P);
};
