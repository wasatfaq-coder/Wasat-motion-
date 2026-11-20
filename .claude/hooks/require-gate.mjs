#!/usr/bin/env node
// PreToolUse hook for SendUserFile: an image or a video goes to the user only after the shorts-quality-gate passed
// that exact file (scripts/gate-stamp.mjs writes its SHA-256 to .claude/gate-pass.json). Exit code 2 blocks the call
// and the message tells the session what to do. Other files (code, text) pass.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const data = JSON.parse(input || '{}');
const files = data.tool_input?.files ?? [];
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const store = path.join(root, '.claude', 'gate-pass.json');
const db = fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : {};
// Sketches (user's decision 20.11.2026, docs/proposals): out/sketch/eskiz-* (no stamp in the frame, by the user's
// call) go to the user after the machine checks only; the gate runs at the stops and before the master.
const sketch = (f) => /(^|[\\/])out[\\/]sketch[\\/]eskiz-[^\\/]+$/i.test(f);
const media = files.filter((f) => /\.(png|jpe?g|gif|webp|mp4|webm|mov)$/i.test(f) && !sketch(f));
const missing = media.filter((f) => {
  const p = path.isAbsolute(f) ? f : path.join(root, f);
  if (!fs.existsSync(p)) return true;
  return !db[crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')];
});
if (missing.length) {
  console.error(`Blocked: ${missing.join(', ')} not passed by the shorts-quality-gate. Run the gate agent on exactly these files, fix what it finds, then: node scripts/gate-stamp.mjs --gate "<PASS verdict>" ${missing.join(' ')}`);
  process.exit(2);
}
