#!/usr/bin/env node
// Self-test of the topic scaffold (root cause of a past miss: scripts/new-topic.mjs lagged behind the cover and
// style rules, so a fresh topic did not even compile). Creates a throw-away topic, then checks that it type-checks,
// lints, passes its own audit and cover-check with ERRORS = 0 (placeholders are warnings), and removes it again.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const slug = 'zz-selftest';
const pascal = 'ZzSelftest';
const root = fs.readFileSync('src/Root.tsx', 'utf8');
const sh = (cmd, args) => execFileSync(cmd, args, {stdio: 'pipe', encoding: 'utf8'});
let failed = null;
try {
  sh('node', ['scripts/new-topic.mjs', slug, 'Самопроверка шаблона']);
  sh('npx', ['tsc', '--noEmit']);
  sh('npx', ['eslint', 'src', '--max-warnings', '0']);
  sh('node', ['scripts/cover-check.mjs', '--quiet', `src/projects/${slug}/covers.ts`]);
  sh('node', ['scripts/audit.mjs', '--scenes', `src/projects/${slug}/scenes`, '--content', `projects/${slug}/content`, '--timeline', `src/projects/${slug}/data/timeline.json`]);
  if (!fs.readFileSync('src/Root.tsx', 'utf8').includes(`id="${pascal}Cover"`)) throw new Error('the scaffold did not register the cover composition');
} catch (e) {
  failed = String(e.stdout || '') + String(e.stderr || '') + String(e.message || '');
} finally {
  for (const d of [`projects/${slug}`, `src/projects/${slug}`, `public/${slug}`]) fs.rmSync(d, {recursive: true, force: true});
  fs.writeFileSync('src/Root.tsx', root);
}
if (failed) {
  console.log(`selftest-new-topic FAILED:\n${failed.slice(-1500)}`);
  process.exitCode = 1;
} else console.log('selftest-new-topic ok: a fresh topic compiles, lints, audits and checks its covers with 0 errors');
