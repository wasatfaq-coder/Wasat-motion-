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
import {execFileSync} from 'node:child_process';
import {readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const {isAssembly, PART_NORM, ENV_HERO_SHARE, A} = await tsImport(pathToFileURL(join(root, 'src/lib/assembly.ts')).href, import.meta.url);
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

// parts that turn are rebuilt every frame and are not in the assembly. Swept through a half turn they must not sink
// into the static solids (a part and its own owner excepted). `double`: a turning part ALSO drawn in the static object
// (at 0° its shape coincides with a static solid): it sinks into itself at every angle, hundreds of problems with one
// cause (motor 130 armature, 2026-11-19). Build it per frame and keep it out of the static Assembly.
export const sweepDynamic = (R, dynamicShapes) => {
  const sunk = new Set();
  const doubles = new Set();
  let swept = 0;
  for (const {name, shape} of dynamicShapes(0)) {
    const b = A.boundsOf(shape);
    for (const solid of R.solids) {
      const c = A.boundsOf(solid);
      if ([0, 1, 2].every((k) => Math.abs(b.min[k] - c.min[k]) < 0.3 && Math.abs(b.max[k] - c.max[k]) < 0.3)) doubles.add(`${name} = ${solid.name}`);
    }
  }
  if (doubles.size) return {sunk, doubles, swept};
  for (let deg = 0; deg <= 180; deg += 10) {
    swept++;
    const th = (deg * Math.PI) / 180;
        for (const {name, shape} of dynamicShapes(th)) {
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
          for (const solid of R.solids) {
            if ((solid.owner && /axis|brush/.test(solid.owner)) || /bearing|brush/.test(solid.name ?? '')) continue; // attached by design
            if (pts.some((p) => A.sdf(solid, p) < -0.6)) sunk.add(`${name} × ${solid.name} (at ${deg}°)`);
          }
        }
      }
  return {sunk, doubles, swept};
};

// --selftest: the deliberately broken objects of scripts/fixtures/lint-broken.parts.ts must each be caught by
// Assembly.lint() under its own keyword, a markup without a shape must throw, a `touch` string must not crash and a
// short or doubled owner name must resolve. Root-cause guards (docs/root-causes.md) prove they still bite.
if (args.includes('--selftest')) {
  const {Assembly: Asm} = await tsImport(pathToFileURL(join(root, 'src/lib/assembly.ts')).href, import.meta.url);
  const {anatomyProjection} = await tsImport(pathToFileURL(join(root, 'src/lib/anatomy.tsx')).href, import.meta.url);
  const fx = await tsImport(pathToFileURL(join(root, 'scripts/fixtures/lint-broken.parts.ts')).href, import.meta.url);
  const fails = [];
  const objects = Object.entries(fx).filter(([, o]) => typeof o?.lint === 'function');
  for (const [key, obj] of objects) {
    const found = obj.lint();
    const word = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`); // selfOverlap → self-overlap, faceOrder → face-order
    if (!found.some((l) => l.startsWith(`${word}:`))) fails.push(`«${key}» not caught (lint said: ${found.join(' | ') || 'nothing'})`);
  }
  const P = anatomyProjection(10);
  const m = new Asm('m', P);
  try {
    m.markup('seam', [0, 0, 0], '<path d="M0 0"/>', []);
    fails.push('markup without a shape did not throw');
  } catch {
    /* expected */
  }
  {
    const d = new Asm('d', P);
    d.cyl('base', 0, 0, 6, 0, 2, {ground: true});
    d.cyl('blade', 0, 0, 4, 2, 1, {meta: {touch: ['base']}});
    const blade = d.R.solids.find((x) => x.name === 'd.blade');
    if (!sweepDynamic(d.R, () => [{name: 'blade', shape: blade}]).doubles.size) fails.push('a turning part also drawn in the static object was not caught (double)');
  }
  const t = new Asm('t', P);
  t.slab('base', {x: 0, y: 0, w: 4, d: 4, r: 0.4}, 0, 1, {ground: true});
  t.slab('monitor.column', {x: 0, y: 0, w: 2, d: 2, r: 0.2}, 1, 4, {meta: {touch: 'base'}});
  t.cyl('cap', 1, 1, 0.5, 5, 0.5, {meta: {owner: 'monitor.column'}});
  const cap = t.R.solids.find((s) => s.name === 't.cap');
  if (cap?.owner !== 't.monitor.column') fails.push(`doubled owner name resolved to «${cap?.owner}», expected «t.monitor.column»`);
  const col = t.R.solids.find((s) => s.name === 't.monitor.column');
  if (!Array.isArray(col?.touch) || col.touch[0] !== 't.base') fails.push(`touch string became ${JSON.stringify(col?.touch)}, expected ["t.base"]`);
  // the state sweep must catch a lid whose thickness swings into its wall while opening
  try {
    execFileSync(process.execPath, [join(root, 'scripts/object-audit.mjs'), join(root, 'scripts/fixtures/sweep-broken.parts.ts')], {stdio: 'pipe'});
    fails.push('stateSweep: the swinging lid passed');
  } catch (e) {
    if (!/state sweep: [1-9]/.test(String(e.stdout))) fails.push(`stateSweep: no state-sweep finding for the swinging lid\n${String(e.stdout).slice(-400)}`);
  }
  if (fails.length) {
    console.log(`object-audit --selftest: ${fails.length} guard(s) failed\n  ${fails.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`object-audit --selftest: ${objects.length} lint guards, 3 Assembly guards and the state sweep bite`);
  process.exit(0);
}

const files = given.length ? given.map((f) => resolve(f)) : walk(join(root, 'src'));

const results = [];
for (const file of files) {
  const mod = await tsImport(pathToFileURL(file).href, import.meta.url);
  const solved = {};
  for (const [exportName, value] of Object.entries(mod)) {
    if (!isAssembly(value)) continue;
    const started = Date.now();
    // fast root-cause checks first (seconds): a finding here would only resurface after a slow settle
    const linted = typeof value.lint === 'function' ? value.lint() : [];
    if (linted.length) {
      results.push({swept: 0, file: relative(root, file), export: exportName, name: value.name, role: value.role, detail: value.detail ?? 'complex', parts: value.parts, norm: PART_NORM[value.role], failures: linted.length, short: false, seconds: (Date.now() - started) / 1000, report: `    lint: ${linted.length} problem(s), fix before the audit runs\n${linted.map((l) => `      ${l}`).join('\n')}`});
      continue;
    }
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
      const res = sweepDynamic(value.R, mod.dynamicShapes);
      swept = res.swept;
      sweepProblems = res.sunk.size + res.doubles.size;
      for (const m of [...res.doubles].slice(0, 8)) report += `\n      double ${m}: the turning part is also drawn in the static object; build it per frame and leave it out of the Assembly`;
      for (const m of [...res.sunk].slice(0, 8)) report += `\n      dynamic ${m}`;
      report += `\n    dynamic sweep: ${res.doubles.size} part(s) drawn twice, ${res.sunk.size} part(s) sink into the static stand`;
    }
    const failures = audited.failures + (unsettled.length ? 1 : 0) + (notApplied ? 1 : 0) + sweepProblems;
    const detail = value.detail ?? 'complex';
    // detail is recorded only. simple/schematic does not lower the §22.2 count.
    const norm = PART_NORM[value.role];
    const short = value.role !== 'environment' && value.parts < norm;
    results.push({swept, file: relative(root, file), export: exportName, name: value.name, role: value.role, detail, parts: value.parts, norm, failures, short, seconds: (Date.now() - started) / 1000, report});
  }
  // objects whose SHAPE changes with a state (a flower opening, a hatch swinging) are rebuilt per frame; the module
  // exports `stateSweep: {name: (state 0..1) => Assembly}` and every in-between build must pass lint, supports and
  // tube clearance. Root cause (docs/root-causes.md): only the open and the closed builds were ever checked.
  if (mod.stateSweep && typeof mod.stateSweep === 'object') {
    for (const [sweepName, build] of Object.entries(mod.stateSweep)) {
      const started = Date.now();
      const found = [];
      for (const st of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
        const obj = build(st);
        for (const l of obj.lint()) found.push(`state ${st}: ${l}`);
        const sup = A.supports(obj.R.solids, obj.R.tubes, {ground: obj.R.ground});
        for (const n of sup.loose) found.push(`state ${st}: loose ${n}`);
        for (const d of sup.sunk) found.push(`state ${st}: sunk ${d.a} × ${d.b} ${d.depth.toFixed(2)} deep`);
        for (const c of A.clearances(obj.R.tubes, obj.R.solids, {only: 'through'})) found.push(`state ${st}: through ${c.tube} × ${c.other}`);
      }
      const uniq = [...new Set(found)];
      results.push({swept: 8, file: relative(root, file), export: `stateSweep.${sweepName}`, name: sweepName, role: 'secondary', detail: 'complex', parts: build(1).parts, norm: 0, failures: uniq.length, short: false, seconds: (Date.now() - started) / 1000, report: `    state sweep: ${uniq.length} problem(s) over 8 states\n${uniq.slice(0, 12).map((l) => `      ${l}`).join('\n')}`});
    }
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
