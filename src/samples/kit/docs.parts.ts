import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {archive, sheet, stamp} from '../../lib/primitives/document';
import KEYS from './docs.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── documents: a sheet with the coral line, a stamp over it, and an archive cabinet with an open drawer
const docs = new Assembly('docs', P, {role: 'secondary', order: ['sheet.line', 'stamp', 'drawer']});
// the marked line (row 2; a thin line is no coral meaning on a phone) rises clear of the stamp, which comes down on the lower right of the sheet
export const SHEET = sheet(docs, [0, 0, 0], {mark: false});
stamp(docs, [32, 22.5, 0.6]);
// a clear gap between the sheet and the cabinet (at 60 the sheet touched its corner on screen)
archive(docs, [64, -10, 0], {rows: 3, cols: 2, open: 2, litDrawer: true});
export const DOCS = keyed(docs, 'DOCS');

