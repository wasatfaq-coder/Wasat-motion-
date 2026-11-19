import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {balance, bars, pie, ruler} from '../../lib/primitives/data';
import KEYS from './data.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── data: bars with a coral bar and a pie with a coral wedge (scheme objects), and a balance (a real instrument)
const data = new Assembly('data', P, {role: 'secondary', detail: 'schematic'});
export const BARS_PINS = bars(data, [0, 0, 0], {values: [12, 18, 9, 27, 21, 15], perUnit: 1.4, lit: 3, grid: 5});
export const PIE_PINS = pie(data, [44, 70, 0], {shares: [0.45, 0.3, 0.25], r: 18, h: 5, lit: 1});
// a ruler in front of the plinth: the scale the bar heights are read against
ruler(data, [0, 26, 0], {length: 100, step: 2, every: 5});
export const DATA = keyed(data, 'DATA');
const scales = new Assembly('scales', P, {role: 'secondary'});
balance(scales, [0, 0, 0], {arm: 18, litPan: 0});
export const BALANCE = keyed(scales, 'BALANCE');

