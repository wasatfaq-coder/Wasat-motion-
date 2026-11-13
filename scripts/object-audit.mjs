#!/usr/bin/env node
// Geometry audit of house-style objects (MASTER_PROMPT_FINAL §22): imports every `*.parts.ts` under src/ (or the
// files given), takes each exported Assembly (src/lib/assembly.ts) and runs the Anatomy audit on the shapes it
// recorded while drawing: pipes/cables through parts, floating or sunk parts, ends off their mounts, folds, wrong
// paint order, stand-in shapes; plus the §22.2 part count for its role (hero ≥ 80, secondary ≥ 40).
// No rendering. Exit code 1 on any problem.
// Paint order: `--settle` solves it from the geometry and writes `<name>.parts.keys.json` next to the file
// ({exportName: {itemName: key}}); the parts file applies it with `X.applyKeys(KEYS.X)`. Items without a stored key
// (the object changed since) are an error until the keys are settled again.
//   node scripts/object-audit.mjs [files…] [--settle] [--json] [--quiet]
import {readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const json = args.includes('--json');
const quiet = args.includes('--quiet');
const settleKeys = args.includes('--settle');
const given = args.filter((a) => !a.startsWith('--'));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'vendor') return [];
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.parts.ts') ? [p] : [];
  });

const files = given.length ? given.map((f) => resolve(f)) : walk(join(root, 'src'));
const {isAssembly, PART_NORM} = await tsImport(pathToFileURL(join(root, 'src/lib/assembly.ts')).href, import.meta.url);

const results = [];
for (const file of files) {
  const mod = await tsImport(pathToFileURL(file).href, import.meta.url);
  const solved = {};
  for (const [exportName, value] of Object.entries(mod)) {
    if (!isAssembly(value)) continue;
    const started = Date.now();
    if (settleKeys) {
      solved[exportName] = value.settle();
      value.unsettled = [];
    }
    const audited = value.audit();
    const unsettled = value.keysApplied && !settleKeys ? value.unsettled : [];
    const failures = audited.failures + (unsettled.length ? 1 : 0);
    const report = (unsettled.length ? `unsettled paint order: ${unsettled.length} item(s) have no stored key (${unsettled.slice(0, 5).join(', ')}…): run with --settle\n` : '') + audited.report;
    const norm = PART_NORM[value.role];
    const short = value.parts < norm;
    results.push({file: relative(root, file), export: exportName, name: value.name, role: value.role, parts: value.parts, norm, failures, short, seconds: (Date.now() - started) / 1000, report});
  }
  if (settleKeys && Object.keys(solved).length) {
    const out = file.replace(/\.ts$/, '.keys.json');
    writeFileSync(out, JSON.stringify(solved, null, 1) + '\n');
    if (!json) console.log(`keys → ${relative(root, out)}`);
  }
}

let bad = 0;
for (const r of results) {
  if (r.failures || r.short) bad++;
  if (json) continue;
  const head = `${r.failures || r.short ? 'ERROR' : 'ok   '} ${r.file} ${r.export} (${r.role}): ${r.parts} parts${r.short ? ` < ${r.norm} (§22.2)` : ''}, ${r.failures} geometry problem${r.failures === 1 ? '' : 's'}, ${r.seconds.toFixed(1)} s`;
  console.log(head);
  if (r.failures && !quiet) console.log(r.report.split('\n').map((l) => '    ' + l).join('\n'));
}
if (json) console.log(JSON.stringify(results.map(({report, ...r}) => ({...r, report: r.failures ? report : ''})), null, 1));
else if (!results.length) console.log('object-audit: no *.parts.ts assemblies found');
process.exitCode = bad ? 1 : 0;
