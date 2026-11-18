#!/usr/bin/env node
// Text QA for caption pages. Flags a page that is too long, too short on screen,
// ends with a hanging preposition or conjunction, or is a single word.
// Exit 1 on any defect and on bad input (missing file, broken JSON, a page without text).
// A correct timeline exits 0. audit.mjs passes --timeline as an argv array.
import fs from 'node:fs';

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const ti = process.argv.indexOf('--timeline');
if (ti < 0 || !process.argv[ti + 1]) fail('usage: node scripts/check-text.mjs --timeline <timeline.json>');
const file = process.argv[ti + 1];

let tl;
try {
  tl = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  fail(`check-text: cannot read timeline ${file}: ${e.message}`);
}
if (!tl || typeof tl !== 'object' || !Array.isArray(tl.scenes)) fail(`check-text: ${file} has no scenes array`);
if (!(Number(tl.fps) > 0)) fail(`check-text: ${file} has no positive fps`);

const FPS = tl.fps;
const HANGING = new Set(['в', 'во', 'на', 'с', 'со', 'к', 'ко', 'и', 'а', 'но', 'о', 'об', 'у', 'от', 'до', 'по', 'за', 'из', 'не', 'как', 'что', 'про', 'для', 'при', 'мы', 'и,']);
const MAX_LINE = 24; // chars per caption line
let issues = 0;
for (const s of tl.scenes) {
  if (!Array.isArray(s.pages)) {
    issues++;
    console.log(`${s.id ?? '?'}: no pages array`);
    continue;
  }
  s.pages.forEach((p, i) => {
    if (!p || typeof p.text !== 'string' || !p.text.trim()) {
      issues++;
      console.log(`${s.id} p${i + 1}: page has no text`);
      return;
    }
    if (!Number.isFinite(p.startFrame)) {
      issues++;
      console.log(`${s.id} p${i + 1} «${p.text}»: startFrame is not a number`);
      return;
    }
    const next = s.pages[i + 1];
    const end = next && Number.isFinite(next.startFrame) ? next.startFrame : s.durationInFrames;
    if (!Number.isFinite(end)) {
      issues++;
      console.log(`${s.id} p${i + 1} «${p.text}»: duration is not a number`);
      return;
    }
    const shown = (end - p.startFrame) / FPS;
    const words = p.text.trim().split(/\s+/);
    const last = words[words.length - 1].toLowerCase().replace(/[.,:;!?]/g, '');
    const lines = p.text.length > MAX_LINE ? 2 : 1;
    const problems = [];
    if (p.text.length > MAX_LINE * 2) problems.push(`too long (${p.text.length} chars)`);
    if (!(shown >= 0) || shown < 0.6) problems.push(`short on screen ${Number.isFinite(shown) ? shown.toFixed(2) : 'NaN'} s`);
    if (HANGING.has(last)) problems.push(`ends with "${last}"`);
    if (words.length < 2) problems.push('single word page');
    if (problems.length) {
      issues++;
      console.log(`${s.id} p${i + 1} «${p.text}» [${lines} line(s), ${Number.isFinite(shown) ? shown.toFixed(2) : 'NaN'} s]: ${problems.join('; ')}`);
    }
  });
}
console.log(issues ? `${issues} caption issue(s)` : 'captions OK');
if (issues) process.exitCode = 1;
