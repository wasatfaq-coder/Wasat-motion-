#!/usr/bin/env node
// Geometry audit of house-style objects (MASTER_PROMPT_FINAL §22): imports every `*.parts.ts` under src/ (or the
// files given), takes each exported Assembly (src/lib/assembly.ts) and runs the Anatomy audit on the shapes it
// recorded while drawing: pipes/cables through parts, floating or sunk parts, ends off their mounts, folds, wrong
// paint order, stand-in shapes; plus the §22.2 part count (hero ≥ 80 and secondary ≥ 40 are errors;
// environment < 15, or above 40% of the hero in the same file, is a warning).
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
const {isAssembly, PART_NORM, ENV_HERO_SHARE, A} = await tsImport(pathToFileURL(join(root, 'src/lib/assembly.ts')).href, import.meta.url);

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
    // root cause of a past failure: the audit judged a different paint order than the scene drew. The parts file itself
    // must apply its settled keys (`X.applyKeys(KEYS.X)`), so the audit and every render see the same order.
    const notApplied = !value.keysApplied && !settleKeys;
    let report =
      (notApplied ? `paint order not applied: ${exportName} never calls applyKeys(KEYS.${exportName}) in ${relative(root, file)}; run with --settle, import <file>.keys.json and apply it in the parts file (not in the scene)\n` : '') +
      (unsettled.length ? `unsettled paint order: ${unsettled.length} item(s) have no stored key (${unsettled.slice(0, 5).join(', ')}…): run with --settle\n` : '') +
      audited.report;
    // parts that turn are rebuilt every frame and are not in the assembly: the module may export `dynamicShapes(theta)`;
    // swept through a half turn they must not sink into the static solids (a part and its OWN owner excepted)
    let sweepProblems = 0;
    let swept = 0;
    if (typeof mod.dynamicShapes === 'function') {
      const sunk = new Set();
      for (let deg = 0; deg <= 180; deg += 10) {
        swept++;
        const th = (deg * Math.PI) / 180;
        for (const {name, shape} of mod.dynamicShapes(th)) {
          const alongTube = (points) => {
            const out = [];
            for (let i = 1; i < points.length; i++) {
              const a = points[i - 1];
              const b = points[i];
              const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.8)); // a sample every 0.8 units
              for (let k = 0; k <= n; k++) out.push(a.map((v, j) => v + ((b[j] - v) * k) / n));
            }
            return out;
          };
          const pts =
            shape.kind === 'tube'
              ? alongTube(shape.points)
              : (() => {
                  const b = A.boundsOf(shape);
                  const out = [];
                  for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) for (const z of [0, 0.5, 1]) out.push([b.min[0] + (b.max[0] - b.min[0]) * x, b.min[1] + (b.max[1] - b.min[1]) * y, b.min[2] + (b.max[2] - b.min[2]) * z]);
                  return out;
                })();
          for (const solid of value.R.solids) {
            if ((solid.owner && /axis|brush/.test(solid.owner)) || /bearing|brush/.test(solid.name ?? '')) continue; // attached by design
            if (pts.some((p) => A.sdf(solid, p) < -0.6)) sunk.add(`${name} × ${solid.name} (at ${deg}°)`);
          }
        }
      }
      sweepProblems = sunk.size;
      for (const m of [...sunk].slice(0, 8)) report += `\n      dynamic ${m}`;
      report += `\n    dynamic sweep: ${sweepProblems} part(s) sink into the static stand`;
    }
    let failures = audited.failures + (unsettled.length ? 1 : 0) + (notApplied ? 1 : 0) + sweepProblems;
    const detail = value.detail ?? 'complex';
    // §22.2: no «simple» exemption; a schematic node (block, arrow, plate) is judged by legibility at 360×640, not by count.
    if (!['complex', 'schematic'].includes(detail)) {
      report += `\n    detail «${detail}» is not allowed: use complex (physical object) or schematic (scheme node) (§22.2)`;
      failures++;
    }
    const norm = detail === 'schematic' ? 0 : PART_NORM[value.role];
    const short = value.role !== 'environment' && value.parts < norm;
    results.push({swept, file: relative(root, file), export: exportName, name: value.name, role: value.role, detail, parts: value.parts, norm, failures, short, seconds: (Date.now() - started) / 1000, report});
  }
  if (settleKeys && Object.keys(solved).length) {
    const out = file.replace(/\.ts$/, '.keys.json');
    writeFileSync(out, JSON.stringify(solved, null, 1) + '\n');
    if (!json) console.log(`keys → ${relative(root, out)}`);
  }
}

const warns = [];
const byFile = new Map();
for (const r of results) {
  const list = byFile.get(r.file) ?? [];
  list.push(r);
  byFile.set(r.file, list);
}
for (const [file, list] of byFile) {
  const heroes = list.filter((r) => r.role === 'hero');
  const heroMax = heroes.length ? Math.max(...heroes.map((r) => r.parts)) : 0;
  for (const r of list) {
    if (r.role !== 'environment') continue;
    if (r.parts < r.norm) warns.push(`WARN  ${file} ${r.export}: ${r.parts} environment parts < ${r.norm} (§22.2)`);
    if (heroMax > 0 && r.parts > ENV_HERO_SHARE * heroMax) warns.push(`WARN  ${file} ${r.export}: ${r.parts} environment parts > ${Math.round(ENV_HERO_SHARE * 100)}% of the hero (${heroMax}) (§22.2)`);
  }
}

let bad = 0;
for (const r of results) {
  if (r.failures || r.short) bad++;
  if (json) continue;
  const head = `${r.failures || r.short ? 'ERROR' : 'ok   '} ${r.file} ${r.export} (${r.role}): ${r.parts} parts${r.swept ? `, dynamic sweep ${r.swept} poses` : ''}${r.short ? ` < ${r.norm} (§22.2)` : ''}, ${r.failures} geometry problem${r.failures === 1 ? '' : 's'}, ${r.seconds.toFixed(1)} s`;
  console.log(head);
  if (r.failures && !quiet) console.log(r.report.split('\n').map((l) => '    ' + l).join('\n'));
}
if (json) console.log(JSON.stringify({parts: results.map(({report, ...r}) => ({...r, report: r.failures ? report : ''})), warnings: warns}, null, 1));
else {
  for (const w of warns) console.log(w);
  if (!results.length) console.log('object-audit: no *.parts.ts assemblies found');
}
process.exitCode = bad ? 1 : 0;
