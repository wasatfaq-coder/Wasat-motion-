import {Assembly, G} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {grain, mat, Material, MATERIALS} from '../../theme/materials';
import KEYS from './materials.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── materials: a sample board with one swatch of every material on a peg-mounted tile, its surface marks drawn by
// grain(); the swatches read the same in every topic because they come from one recipe (src/theme/materials.ts)
const board = new Assembly('swatches', P, {role: 'secondary'});
const names = Object.keys(MATERIALS) as Material[];
const cols = 5;
board.slab('board', {x: -2, y: -2, w: cols * 16 + 2, d: Math.ceil(names.length / cols) * 16 + 2, r: 1.2}, 0, 2, {...mat('wood'), ground: true, shadow: 'hero'});
names.forEach((m, i) => {
  const x = (i % cols) * 16;
  const y = Math.floor(i / cols) * 16;
  board.slab(`tile${i}`, {x: x + 1, y: y + 1, w: 12, d: 12, r: 0.8}, 2, 0.8, {tone: 'mid', bevel: 0.3});
  const plan = {x: x + 2.5, y: y + 2.5, w: 9, d: 9, r: Math.min(1.6, MATERIALS[m].bevel + 0.4)};
  board.slab(`swatch.${m}`, plan, 2.8, 3, {...mat(m), over: grain(m, plan, 5.8, P, i + 1)});
  // a label tab on the tile's front edge (the material's name goes on a frontal plate pinned to it)
  board.slab(`tab${i}`, {x: x + 4, y: y + 11.6, w: 6, d: 1.2, r: 0.3}, 2.8, 0.4, {tone: 'hi', bevel: 0.1});
  board.turned(`peg${i}`, [[0, 0.5], [0.4, 0.5], [0.6, 0.0001]], G.frameAlong([x + 1.8, y + 1.8, 2.8], [0, 0, 1]), {tone: 'hi'});
});
export const SWATCHES = keyed(board, 'SWATCHES');
