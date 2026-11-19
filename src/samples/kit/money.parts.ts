import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {coinStack, note, noteStack} from '../../lib/money';
import KEYS from './money.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── money: three coin stacks of different height and a banded bundle of notes; the tallest stack is coral
const cash = new Assembly('cash', P, {role: 'secondary'});
coinStack(cash, 'stackA', [0, 0, 0], 6);
coinStack(cash, 'stackB', [10, 2, 0], 4);
// the tallest stack is the coral part: one top coin is too small a coral meaning on a phone (style-check frame rule)
coinStack(cash, 'stackC', [20, 0, 0], 8, {lit: true});
noteStack(cash, 'notes', [-4, 12, 0], 8);
// one loose note beside the bundle (part of the object, so the frame and the depth order hold it)
note(cash, 'loose', [-2, 30, 0], {ground: true});
export const CASH = keyed(cash, 'CASH');
