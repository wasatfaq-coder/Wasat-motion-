#!/usr/bin/env node
// Records that the shorts-quality-gate agent passed these exact files (MASTER_PROMPT_FINAL §19, CLAUDE.md: «Before
// showing frames, covers or video to the user, run the shorts-quality-gate agent»). The PreToolUse hook
// .claude/hooks/require-gate.mjs refuses to send an image or a video to the user unless its SHA-256 is stamped here.
// Root cause (docs/root-causes.md): frames were sent before the gate because nothing stopped it.
//   node scripts/gate-stamp.mjs --gate "<the gate's one-line verdict>" <file>…
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const at = args.indexOf('--gate');
const verdict = at >= 0 ? args[at + 1] : '';
const files = args.filter((a, i) => i !== at && i !== at + 1);
if (!/pass/i.test(verdict) || !files.length) {
  console.error('gate-stamp: give --gate "<verdict containing PASS>" and the files the gate passed');
  process.exit(1);
}
const store = path.join('.claude', 'gate-pass.json');
const db = fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : {};
for (const f of files) {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  db[sha] = {file: f, verdict, at: new Date().toISOString()};
  console.log(`stamped ${f} ${sha.slice(0, 12)}`);
}
fs.writeFileSync(store, JSON.stringify(db, null, 1) + '\n');
