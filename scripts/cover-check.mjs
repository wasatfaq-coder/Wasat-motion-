#!/usr/bin/env node
// Cover check without rendering (MASTER_PROMPT_FINAL §19.5, §22): for every `covers.ts` (a topic's three variants,
// `export const COVERS = {a, b, c}`) verify the layout: 2–4 title words at 96–120 px inside the central zone,
// image 50–60 % of the zone, the right button column and the bottom free, a 4:5 crop, one coral word, three
// different techniques; placeholders are reported. Exit code 1 on any error.
//   node scripts/cover-check.mjs [files…] [--quiet]
import {readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const given = args.filter((a) => !a.startsWith('--'));
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'vendor') return [];
    return statSync(p).isDirectory() ? walk(p) : name === 'covers.ts' ? [p] : [];
  });
const files = given.length ? given.map((f) => resolve(f)) : walk(join(root, 'src'));
const {coverLayout, checkCoverSet, TECHNIQUES} = await tsImport(pathToFileURL(join(root, 'src/lib/coverLayout.ts')).href, import.meta.url);
let errors = 0;
for (const file of files) {
  const {COVERS} = await tsImport(pathToFileURL(file).href, import.meta.url);
  const rel = relative(root, file);
  for (const e of checkCoverSet(COVERS)) (errors++, console.log(`ERROR ${rel}: ${e}`));
  for (const [v, spec] of Object.entries(COVERS)) {
    const L = coverLayout(spec);
    const share = L.share * 100;
    for (const e of L.errors) (errors++, console.log(`ERROR ${rel} ${v}: ${e}`));
    for (const w of L.warns) console.log(`WARN  ${rel} ${v}: ${w}`);
    if (!quiet) console.log(`ok    ${rel} ${v}: ${TECHNIQUES[spec.technique]}, «${spec.lines.join(' ')}», ${L.fontSize} px, image ${share.toFixed(0)} % of the frame, hook detail ${Math.max(L.hero.right - L.hero.left, L.hero.bottom - L.hero.top).toFixed(0)} px`);
  }
}
if (!files.length) console.log('cover-check: no covers.ts found');
process.exitCode = errors ? 1 : 0;
