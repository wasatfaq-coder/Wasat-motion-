#!/usr/bin/env node
// Self-check of the kit's handedness (src/lib/handed.ts): the anatomy projection is drawn LEFT-handed, so right-hand
// rules must use physCross. Fails if the projection or the helper change in a way that would mirror physics again.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const H = await tsImport(pathToFileURL(resolve(root, 'src/lib/handed.ts')).href, import.meta.url);
const A = await tsImport(pathToFileURL(resolve(root, 'src/lib/anatomy.tsx')).href, import.meta.url);
const r = H.assertHandedness(A.anatomyProjection(8));
// force on a wire with current up in a field along +x must point to −y in kit coordinates (up-right on screen)
const f = H.forceOnWire([0, 0, 1], [1, 0, 0]);
const screen = H.screenDir(f, A.anatomyProjection(8));
const ok = r.ok && f[1] < 0 && screen[0] > 0 && screen[1] < 0;
console.log(ok ? 'handedness ok: x right-down, y left-down (left-handed); I up in B along +x gives a force up-right on screen' : `handedness FAILED ${JSON.stringify({r, f, screen})}`);
process.exitCode = ok ? 0 : 1;
