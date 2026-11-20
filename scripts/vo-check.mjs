#!/usr/bin/env node
// Voice check (MASTER_PROMPT_FINAL §9.5): does the voice file SAY what the script says?
// Root cause of the gap: whisper ran only to get word timings (transcribe.mjs, build-timeline.mjs). A line the voice
// misread (a swapped word, a dropped number, an English-sounding stress, a skipped clause) got the status
// «approximate» in the timeline and nothing more, so it reached the master. Here every scene's recognised speech is
// compared with the text that was sent to the voice (script.json `tts`, tags removed) and a scene below the
// threshold fails.
//
//   node scripts/vo-check.mjs [--content <dir>] [--threshold 0.9] [--quiet]
//   node scripts/vo-check.mjs --selftest
//
// Input: <content>/script.json (scenes[].fragments[].tts), <content>/transcripts/<scene>.json (transcribe.mjs),
// <content>/timing.json spokenNumbers (digits → spoken form, the same map build-timeline uses).
// A scene may carry `asr: "text"` in script.json when the recogniser always hears a proper name differently; that text
// is then compared instead of `tts`.
// Exit code 0 all scenes pass; 1 a scene differs; 2 the check could not run (no transcripts): not a pass.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const norm = (w) => w.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
const stripTags = (t) => t.replace(/\[[^\]]+\]/g, ' ');
export const wordsOf = (t) => stripTags(t).split(/\s+/).filter((w) => norm(w).length > 0);

/** Recognised tokens (whisper.cpp captions: sub-word pieces, a leading space starts a word) → words. */
export const mergeTokens = (captions) => {
  const words = [];
  for (const c of captions) {
    if (/^\s/.test(c.text) || words.length === 0) words.push(c.text.trim());
    else words[words.length - 1] += c.text;
  }
  return words.filter((w) => norm(w).length > 0);
};

/** Word similarity 0…1: equal after the spoken-number map, else the shared prefix (endings and cases differ). */
const makeSim = (NUM) => (a, b) => {
  a = norm(a);
  b = norm(b);
  a = NUM[a] ?? a;
  b = NUM[b] ?? b;
  if (a === b) return 1;
  let k = 0;
  while (k < Math.min(a.length, b.length) && a[k] === b[k]) k++;
  return k / Math.max(a.length, b.length);
};

/** Compare the script words with the recognised words. Alignment by dynamic programming (insertions, deletions and
 *  substitutions). Returns the share of the longer side that matched, and the words that did not. */
export const compare = (scriptWords, asrWords, NUM = {}, minSim = 0.6) => {
  const sim = makeSim(NUM);
  const n = scriptWords.length;
  const m = asrWords.length;
  const dp = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  const bt = Array.from({length: n + 1}, () => new Array(m + 1).fill(''));
  for (let i = 1; i <= n; i++) bt[i][0] = 'U';
  for (let j = 1; j <= m; j++) bt[0][j] = 'L';
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const s = sim(scriptWords[i - 1], asrWords[j - 1]);
      const diag = dp[i - 1][j - 1] + (s >= minSim ? s : 0);
      const up = dp[i - 1][j];
      const left = dp[i][j - 1];
      const best = Math.max(diag, up, left);
      dp[i][j] = best;
      bt[i][j] = best === diag && s >= minSim ? 'M' : best === up ? 'U' : 'L';
    }
  const missing = []; // in the script, not heard
  const extra = []; // heard, not in the script
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const b = i > 0 && j > 0 ? bt[i][j] : i > 0 ? 'U' : 'L';
    if (b === 'M') {
      i--;
      j--;
    } else if (b === 'U') missing.unshift(scriptWords[--i]);
    else extra.unshift(asrWords[--j]);
  }
  const denom = Math.max(n, m, 1);
  return {score: dp[n][m] / denom, missing, extra};
};

/** Check all scenes. `script` and `transcripts` (scene id → captions) are plain data. Returns rows and problems. */
export const checkVoice = (script, transcripts, NUM = {}, threshold = 0.9) => {
  const rows = [];
  const problems = [];
  for (const scene of script.scenes) {
    const cap = transcripts[scene.id];
    if (!cap) {
      rows.push({id: scene.id, skipped: true});
      continue;
    }
    const spoken = scene.asr ?? scene.fragments.map((f) => f.tts ?? f.display).join(' ');
    const digits = wordsOf(spoken).filter((w) => /\d/.test(w));
    if (digits.length && !digits.every((d) => NUM[norm(d)]))
      problems.push(`${scene.id}: digits in the voice text (${digits.join(', ')}): spell numbers out in tts, or give their spoken form in timing.json spokenNumbers`);
    const r = compare(wordsOf(spoken), mergeTokens(cap), NUM);
    rows.push({id: scene.id, score: r.score, missing: r.missing, extra: r.extra});
    if (r.score < threshold) problems.push(`${scene.id}: the voice matches ${(r.score * 100).toFixed(0)} % of the script (≥ ${threshold * 100} %); not heard: «${r.missing.join(' ')}»; heard instead: «${r.extra.join(' ')}»`);
  }
  return {rows, problems};
};

const selftest = () => {
  const script = {scenes: [{id: 's1', fragments: [{tts: '[curious] Час не ускорился. А десять лет пролетают всё быстрее.'}]}]};
  const cap = (t) => t.split(' ').map((w, i) => ({text: (i ? ' ' : '') + w}));
  const cases = [
    ['exact', 'Час не ускорился А десять лет пролетают всё быстрее', true],
    ['case endings differ', 'Час не ускорился А десять лет пролетают все быстрее', true],
    ['a clause is skipped', 'Час не ускорился А десять лет', false],
    ['a word is swapped', 'Час не ускорился А двадцать лет пролетают всё быстрее', false],
    ['an extra sentence', 'Час не ускорился А десять лет пролетают всё быстрее и ещё быстрее и ещё быстрее', false],
  ];
  let failed = 0;
  for (const [label, heard, shouldPass] of cases) {
    const {problems} = checkVoice(script, {s1: cap(heard)});
    const ok = (problems.length === 0) === shouldPass;
    if (!ok) failed++;
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}: expected ${shouldPass ? 'pass' : 'fail'}; got ${problems.length ? 'fail' : 'pass'}`);
  }
  const digits = checkVoice({scenes: [{id: 's1', fragments: [{tts: 'Это было в 2026 году'}]}]}, {s1: cap('Это было в две тысячи двадцать шестом году')});
  const dOk = digits.problems.some((p) => p.includes('digits'));
  if (!dOk) failed++;
  console.log(`${dOk ? 'ok   ' : 'FAIL '} digits in tts: expected fail; got ${digits.problems.length ? 'fail' : 'pass'}`);
  console.log(failed ? `\nvo-check selftest: ${failed} case(s) FAILED` : '\nvo-check selftest: every defect is caught, clean input passes');
  return failed;
};

const main = () => {
  const argv = process.argv.slice(2);
  const opt = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : def;
  };
  if (argv.includes('--selftest')) return selftest() ? 1 : 0;
  const topic = opt('topic', null);
  const content = opt('content', topic ? path.join('projects', topic, 'content') : null);
  if (!content) {
    console.error('vo-check: pass --topic <slug> (there is no root topic since regulation v3.0)');
    return 2;
  }
  const threshold = Number(opt('threshold', '0.9'));
  const scriptFile = path.join(content, 'script.json');
  if (!fs.existsSync(scriptFile)) {
    console.error(`vo-check: NOT CHECKED: no ${scriptFile}. This is not a pass.`);
    return 2;
  }
  const script = JSON.parse(fs.readFileSync(scriptFile, 'utf8'));
  const timingFile = path.join(content, 'timing.json');
  const NUM = fs.existsSync(timingFile) ? (JSON.parse(fs.readFileSync(timingFile, 'utf8')).spokenNumbers ?? {}) : {};
  const transcripts = {};
  for (const s of script.scenes) {
    const f = path.join(content, 'transcripts', `${s.id}.json`);
    if (fs.existsSync(f)) transcripts[s.id] = JSON.parse(fs.readFileSync(f, 'utf8')).captions;
  }
  if (!Object.keys(transcripts).length) {
    console.error(`vo-check: NOT CHECKED: no transcripts in ${path.join(content, 'transcripts')} (run scripts/transcribe.mjs after the voice). This is not a pass.`);
    return 2;
  }
  const {rows, problems} = checkVoice(script, transcripts, NUM, threshold);
  if (!argv.includes('--quiet'))
    for (const r of rows) console.log(r.skipped ? `--   ${r.id}: no transcript` : `${r.score >= threshold ? 'ok  ' : 'BAD '} ${r.id}: ${(r.score * 100).toFixed(0)} %${r.missing.length || r.extra.length ? `  not heard «${r.missing.join(' ')}»  extra «${r.extra.join(' ')}»` : ''}`);
  for (const p of problems) console.log(`ERROR ${p}`);
  const skipped = rows.filter((r) => r.skipped).length;
  if (skipped) console.log(`vo-check: ${skipped} scene(s) without a transcript were not checked`);
  return problems.length ? 1 : 0;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
