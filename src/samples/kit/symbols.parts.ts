import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {bloom, storm, tangle, trapdoor} from '../../lib/symbols';
import KEYS from './symbols.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── symbols
export const STORM = storm('storm', P, [0, 0, 40], {lit: true});
keyed(STORM.A, 'STORM_A');
export const STORM_A = STORM.A;
export const TANGLE = tangle('tangle', P, [0, 0, 12], {r: 10});
keyed(TANGLE.A, 'TANGLE_A');
export const TANGLE_A = TANGLE.A;
export const BLOOM = keyed(bloom('bloom', P, [0, 0, 0], 1, {lit: true}), 'BLOOM');
export const TRAPDOOR = keyed(trapdoor('trapdoor', P, [0, 0, 0], 0), 'TRAPDOOR');

// shapes that change with the state are checked at every step of it (object-audit: stateSweep)
export const stateSweep = {
  bloom: (s: number) => bloom('bloom', P, [0, 0, 0], s),
  trapdoor: (s: number) => trapdoor('trapdoor', P, [0, 0, 0], s),
};
