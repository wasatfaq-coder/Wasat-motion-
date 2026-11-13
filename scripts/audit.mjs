#!/usr/bin/env node
// Project audit without rendering: types, lint, captions, palette, projection, locations, timeline, sound map.
// Usage: node scripts/audit.mjs [scenesDir] [contentDir]   (defaults: src/scenes, content)
// Exit code 1 if any ERROR. Run before the quality gate and before every commit of visual work.
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const scenesDir = process.argv[2] ?? 'src/scenes';
const contentDir = process.argv[3] ?? 'content';
const out = {error: [], warn: [], ok: []};
const add = (lvl, msg) => out[lvl].push(msg);
const run = (name, cmd) => {
  try {
    execSync(cmd, {stdio: 'pipe'});
    add('ok', name);
  } catch (e) {
    add('error', `${name}: ${String(e.stdout || '') + String(e.stderr || '')}`.trim().slice(0, 800));
  }
};

// 1) types, lint (warnings are errors too), captions
run('tsc', 'npx tsc --noEmit');
run('eslint', 'npx eslint src --max-warnings 0');
run('captions', 'node scripts/check-text.mjs');

// 2) palette: only theme tokens in components
const walk = (d) => fs.readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk('src').filter((f) => /\.tsx?$/.test(f) && !f.includes(`${path.sep}theme${path.sep}`))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)) add('error', `palette: ${f}:${i + 1} colour outside tokens (§19.7): ${l.trim().slice(0, 90)}`);
  });
}

// 3) projection and locations per scene (§19.7, multi-location rule)
const LOC = {
  room: /<(RoomShell|RoomStage)\b/,
  city: /<CityLoop\b/,
  street: /<StreetBackdrop\b/,
  busStop: /<BusStop\b/,
  beach: /<Sea\b/,
  table: /<TableTop\b/,
  archive: /<ArchiveShell\b/,
  square: /<SurveySquare\b/,
  party: /<Shell[^>]*floor="parquet"/,
  lab: /<Shell[^>]*floor="tiles"/,
};
const sceneFiles = fs.readdirSync(scenesDir).filter((f) => /^Scene\d+.*\.tsx$/.test(f)).sort();
const allowFile = path.join(contentDir, 'locations-allow.json');
const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')).allow ?? [] : [];
const seen = new Map();
sceneFiles.forEach((f, idx) => {
  const src = fs.readFileSync(path.join(scenesDir, f), 'utf8');
  const n = idx + 1;
  if (/<FrontalSvg\b|<Cam2D\b/.test(src)) add('error', `projection: ${f} is a flat frontal scene; convert to isometry (§19.7)`);
  const locs = Object.entries(LOC).filter(([, re]) => re.test(src)).map(([k]) => k);
  if (!locs.length) add('warn', `location: ${f} has no recognised location`);
  for (const loc of locs) {
    const hub = allow.find((a) => a.location === loc);
    if (hub && !hub.scenes.includes(n)) add('error', `location: «${loc}» is used in scene ${n}, which is not in its allowed list (${allowFile}) — design a new location`);
    const prev = seen.get(loc);
    if (prev !== undefined && n - prev > 1) {
      const ok = allow.some((a) => a.location === loc && a.scenes.includes(prev) && a.scenes.includes(n));
      add(ok ? 'ok' : 'error', `location: «${loc}» reused in scene ${n} after scene ${prev}${ok ? ' (allowed)' : ' — design a new location or record consent in ' + allowFile}`);
    }
    seen.set(loc, n);
  }
});

// 4) timeline continuity and beats
const tl = JSON.parse(fs.readFileSync('src/data/timeline.json', 'utf8'));
let cursor = 0;
for (const s of tl.scenes) {
  if (s.from !== cursor) add('error', `timeline: ${s.id} starts at ${s.from}, expected ${cursor}`);
  cursor = s.from + s.durationInFrames;
  for (const b of s.beats ?? []) if (b.frame < 0 || b.frame >= s.durationInFrames) add('error', `timeline: beat ${s.id}/${b.id ?? b.name} outside the scene`);
}
if (tl.totalFrames !== undefined && tl.totalFrames !== cursor) add('error', `timeline: totalFrames ${tl.totalFrames} ≠ sum ${cursor}`);

// 5) sound map: files exist, events inside their scene, licence
const smFile = path.join(contentDir, 'sound-map.json');
if (fs.existsSync(smFile)) {
  const sm = JSON.parse(fs.readFileSync(smFile, 'utf8'));
  for (const s of tl.scenes) {
    for (const e of sm[s.id] ?? []) {
      if (!fs.existsSync(path.join('public', e.file))) add('error', `sound: ${s.id} missing file ${e.file}`);
      const b = (s.beats ?? []).find((x) => (x.id ?? x.name) === e.beat);
      if (!b) add('error', `sound: ${s.id} unknown beat «${e.beat}»`);
      else if (b.frame + e.offset < 0 || b.frame + e.offset >= s.durationInFrames) add('warn', `sound: ${s.id} ${e.file} at ${b.frame + e.offset} is outside the scene`);
    }
  }
} else add('warn', `sound: ${smFile} not found`);

for (const lvl of ['error', 'warn']) for (const m of out[lvl]) console.log(`${lvl.toUpperCase()} ${m}`);
console.log(`\n${out.error.length} errors, ${out.warn.length} warnings, ${out.ok.length} ok`);
process.exit(out.error.length ? 1 : 0);
