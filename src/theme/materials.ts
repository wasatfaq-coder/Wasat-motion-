import * as K from '../vendor/anatomy/iso-kit';
import type {Point3} from '../vendor/anatomy/iso-kit';

// Materials of the house style (MASTER_PROMPT_FINAL §24.4, §22.1): a material is a recipe inside OUR palette — a face
// tone, a clothing class (cl-mid / cl-dark from src/theme/anatomy.ts), a bevel, a crease, and a surface mark drawn on
// the part's top (wood grain, brushed metal, fabric weave, paper ruling). No new colours: colour lives only in
// src/theme/anatomy.ts. Root cause this file removes: every object picked tone, bevel and marks by hand, so the same
// material read differently from object to object and topic to topic.
//
// Usage: A.slab('desk', plan, z, h, {...mat('wood'), over: grain('wood', plan, z + h, A.P)})

export type Material = 'metal' | 'wood' | 'plastic' | 'glass' | 'fabric' | 'paper' | 'stone' | 'rubber' | 'skin' | 'ceramic';

type Recipe = {tone: K.Tone; className?: string; bevel: number; crease: K.Tone | 'none'; note: string};

export const MATERIALS: Record<Material, Recipe> = {
  metal: {tone: 'hi', bevel: 0.3, crease: 'faint', note: 'machined: small bevels, brushed lines along the long side'},
  wood: {tone: 'mid', className: 'cl-mid', bevel: 0.8, crease: 'faint', note: 'soft bevels, grain lines along the board'},
  plastic: {tone: 'hi', bevel: 1.2, crease: 'none', note: 'moulded: large round bevels, no marks'},
  glass: {tone: 'hi', bevel: 0.1, crease: 'none', note: 'thin edges, two short glint lines on the top'},
  fabric: {tone: 'mid', className: 'cl-mid', bevel: 1.4, crease: 'none', note: 'very soft edges, a weave of fine lines'},
  paper: {tone: 'hi', bevel: 0.08, crease: 'none', note: 'almost no thickness or bevel'},
  stone: {tone: 'lo', bevel: 1, crease: 'faint', note: 'rough: uneven bevels, short scattered strokes'},
  rubber: {tone: 'lo', className: 'cl-dark', bevel: 0.9, crease: 'none', note: 'dark, soft edges, no marks'},
  skin: {tone: 'hi', bevel: 1, crease: 'none', note: 'the mannequin tone (character.ts)'},
  ceramic: {tone: 'hi', bevel: 0.6, crease: 'faint', note: 'glazed: smooth, one glint line'},
};

/** Solid options for a material (spread into an Assembly call). */
export const mat = (m: Material) => {
  const r = MATERIALS[m];
  return {tone: r.tone, bevel: r.bevel, crease: r.crease, ...(r.className ? {className: r.className} : {})};
};

const rand = (seed: number) => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Surface marks of a material on the top face of a plan at height z (kit units). Returns markup for `over`.
 *  Lines run along the plan's longer side and stop inside the face (every line ends on the face, §22.2). */
export const grain = (m: Material, plan: K.Plan, z: number, P: K.Projection, seed = 1): string => {
  const long = plan.w >= plan.d;
  const L = long ? plan.w : plan.d;
  const S = long ? plan.d : plan.w;
  const inset = Math.max(plan.r, 0.6);
  const at = (a: number, s: number): [number, number] => (long ? [plan.x + a, plan.y + s] : [plan.x + s, plan.y + a]);
  const line = (a0: number, a1: number, s: number, tone: K.Tone = 'lo') => K.lineSvg(K.lineOnTop(at(a0, s), at(a1, s), z, P), {tone});
  const out: string[] = [];
  if (m === 'wood') {
    for (let s = inset + 0.9; s < S - inset; s += 1.4 + rand(s + seed) * 0.8) {
      const a0 = inset + rand(s * 3 + seed) * L * 0.3;
      out.push(line(a0, Math.min(L - inset, a0 + L * (0.35 + rand(s * 7) * 0.4)), s));
    }
  } else if (m === 'metal') {
    for (let s = inset + 0.6; s < S - inset; s += 0.9) out.push(line(inset + 0.4, L - inset - 0.4, s, 'faint'));
  } else if (m === 'fabric') {
    for (let s = inset + 0.5; s < S - inset; s += 0.7) out.push(line(inset, L - inset, s, 'faint'));
    for (let a = inset + 0.5; a < L - inset; a += 0.7) out.push(K.lineSvg(K.lineOnTop(at(a, inset), at(a, S - inset), z, P), {tone: 'faint'}));
  } else if (m === 'paper') {
    for (let s = inset + 1.2; s < S - inset; s += 1.2) out.push(line(inset + 0.8, L - inset - 0.8, s, 'faint'));
  } else if (m === 'stone') {
    for (let i = 0; i < Math.round((L * S) / 20); i++) {
      const a = inset + rand(i * 5 + seed) * (L - 2 * inset - 1.2);
      const s = inset + rand(i * 11 + seed) * (S - 2 * inset);
      out.push(line(a, a + 0.6 + rand(i) * 0.8, s));
    }
  } else if (m === 'glass' || m === 'ceramic') {
    out.push(line(inset + L * 0.1, inset + L * 0.3, S * 0.3, 'hi'));
    if (m === 'glass') out.push(line(inset + L * 0.14, inset + L * 0.22, S * 0.45, 'hi'));
  }
  return out.join('');
};

/** The materials an object uses, for the parts list (PARTS) and the art-director's check. */
export const describe = (used: Material[]): string => used.map((m) => `${m}: ${MATERIALS[m].note}`).join('; ');
export type {Point3};
