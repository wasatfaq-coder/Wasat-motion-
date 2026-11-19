import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {archive, sheet, stamp} from '../../lib/primitives/document';
import KEYS from './docs.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── documents: a sheet with the coral line, a stamp over it, and an archive cabinet with an open drawer
const docs = new Assembly('docs', P, {role: 'secondary', order: ['sheet.line', 'stamp', 'drawer']});
export const SHEET = sheet(docs, [0, 0, 0], {lit: 4, mark: false});
stamp(docs, [32, 20, 0.6]);
archive(docs, [60, -10, 0], {rows: 3, cols: 2, open: 2});
export const DOCS = keyed(docs, 'DOCS');

