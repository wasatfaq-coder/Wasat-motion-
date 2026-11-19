import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {coinStack, noteStack} from '../../lib/money';
import KEYS from './money.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── money: three coin stacks of different height and a banded bundle of notes; the tallest stack's top coin is coral
const cash = new Assembly('cash', P, {role: 'secondary'});
coinStack(cash, 'stackA', [0, 0, 0], 6);
coinStack(cash, 'stackB', [10, 2, 0], 4);
coinStack(cash, 'stackC', [20, 0, 0], 8, {litTop: true});
noteStack(cash, 'notes', [-4, 12, 0], 8);
export const CASH = keyed(cash, 'CASH');
