import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {cluster, crowd} from '../../lib/crowd';
import KEYS from './crowd.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── crowd: a loose group of six figures facing a centre (a market, a meeting); one coral figure
const group = new Assembly('crowd', P, {role: 'secondary'});
crowd(group, cluster([30, 30, 0], 6, 22, {gap: 9, seed: 4}), {lit: 2});
export const CROWD = keyed(group, 'CROWD');
