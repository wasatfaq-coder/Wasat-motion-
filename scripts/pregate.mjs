#!/usr/bin/env node
// Pre-gate: everything a machine can check BEFORE the quality-gate agents see a frame (MASTER_PROMPT_FINAL §15, §22.4).
// Root cause of the long gate loops of the pilot: known defects (hidden arrows, a tiny hero, a mirrored force, a cut
// picture) were found by the agents, round after round. The gate runs only when this is green, and a round that only
// repeats a pre-gate finding is wasted.
//   node scripts/pregate.mjs <slug>            all checks for a topic (src/projects/<slug>, projects/<slug>/content)
//   node scripts/pregate.mjs --kit             the shared kit only (no topic)
// Runs: tsc, eslint, handedness, audit (topic flags; it includes motion-check of the topic's *.motion.ts), object-audit
// and rig-check (cached by input hash), cover-check,
// still-check (projects/<slug>/content/stills.json, when present). The slow geometry checks are skipped when their
// inputs did not change since the last pass. Exit code 1 on any failure.
import {spawn} from 'node:child_process';
import fs from 'node:fs';

const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
const kitOnly = process.argv.includes('--kit');
const jobs = [
  ['tsc', 'npx', ['tsc', '--noEmit']],
  ['eslint', 'npx', ['eslint', 'src', '--max-warnings', '0']],
  ['handedness', 'node', ['scripts/handed-check.mjs']],
];
if (slug) {
  const flags = ['--scenes', `src/projects/${slug}/scenes`, '--content', `projects/${slug}/content`, '--timeline', `src/projects/${slug}/data/timeline.json`];
  jobs.push(['audit (topic)', 'node', ['scripts/audit.mjs', ...flags]]);
  const covers = `src/projects/${slug}/covers.ts`;
  if (fs.existsSync(covers)) jobs.push(['cover-check', 'node', ['scripts/cover-check.mjs', '--quiet', covers]]);
} else if (kitOnly) jobs.push(['audit (kit)', 'node', ['scripts/audit.mjs']]);

const run = ([name, cmd, args]) =>
  new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let buf = '';
    p.stdout.on('data', (d) => (buf += d));
    p.stderr.on('data', (d) => (buf += d));
    p.on('close', (code) => resolve({name, code, buf, s: (Date.now() - t0) / 1000}));
  });

const results = await Promise.all(jobs.map(run)); // independent checks run in parallel
const stills = slug ? `projects/${slug}/content/stills.json` : null;
if (stills && fs.existsSync(stills)) results.push(await run(['still-check', 'node', ['scripts/still-check.mjs', stills]]));

let bad = 0;
for (const r of results) {
  const ok = r.code === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok   ' : 'FAIL '} ${r.name} (${r.s.toFixed(1)} s)`);
  if (!ok || r.name === 'still-check') console.log(r.buf.trim().split('\n').slice(-40).map((l) => '    ' + l).join('\n'));
}
console.log(bad ? `\npregate FAILED: ${bad} check(s). Fix them before the quality gate.` : '\npregate passed: the gate may look at the frames now.');
process.exitCode = bad ? 1 : 0;
