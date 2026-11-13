#!/usr/bin/env node
// Project audit without rendering (MASTER_PROMPT_FINAL §12, §15, §19, §20):
// types, lint, captions, palette, projection, visual register (locations, metaphors, data accuracy),
// on-screen text, timeline, sound map and its freshness.
//
// Usage (root topic):  node scripts/audit.mjs
// Usage (new topic):   node scripts/audit.mjs --scenes src/projects/<slug>/scenes --content projects/<slug>/content --timeline src/projects/<slug>/data/timeline.json
// Mark the sound map as reviewed after re-syncing it: node scripts/audit.mjs --stamp-sfx
// Exit code 1 if any ERROR. Run before the quality gate and before every commit of visual work.
import {execSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const scenesDir = arg('scenes', 'src/scenes');
const contentDir = arg('content', 'content');
const timelineFile = arg('timeline', 'src/data/timeline.json');
const stampSfx = process.argv.includes('--stamp-sfx');
const out = {error: [], warn: [], ok: []};
const add = (lvl, msg) => out[lvl].push(msg);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
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

// 2) palette: only theme tokens in components; no second (pink) accent
const walk = (d) => fs.readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const srcFiles = walk('src').filter((f) => /\.tsx?$/.test(f) && !f.includes(`${path.sep}vendor${path.sep}`)); // vendored code keeps its defaults; our theme overrides them
for (const f of srcFiles.filter((f) => !f.includes(`${path.sep}theme${path.sep}`))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (/^\s*(\/\/|\*)/.test(l)) return;
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(l)) add('error', `palette: ${f}:${i + 1} colour outside tokens (§19.7): ${l.trim().slice(0, 90)}`);
    if (/accentSoft/.test(l)) add('error', `palette: ${f}:${i + 1} accentSoft is a second accent; use the coral accent or a neutral (§19.7)`);
  });
}

// 3) on-screen text: everything except captions, the preview title and labelled plates must be reviewed (§19.1)
const TEXT_OK = /(components[\\/](Captions|Thesis)|Cover\.tsx)$/;
for (const f of srcFiles.filter((f) => f.endsWith('.tsx') && !TEXT_OK.test(f))) {
  const n = (fs.readFileSync(f, 'utf8').match(/<text\b/g) ?? []).length;
  if (n) add('warn', `text in frame: ${f} draws ${n} <text> node(s); allowed only as labels on frontal plates or data values (§19.1, §20.4)`);
}

// 3b) house style for new topics (§22): scenes under src/projects/ use the Anatomy core, not the old line-art kits
const OLD_KITS = /from ['"][./]*illustrations\/(Room|CityKit|Interiors|Archive|CardCatalog|primitives|Props|MemoryCards|Board)['"]/;
for (const f of srcFiles.filter((f) => f.includes(`${path.sep}projects${path.sep}`) && f.endsWith('.tsx'))) {
  const src = fs.readFileSync(f, 'utf8');
  if (OLD_KITS.test(src)) add('error', `style: ${f} uses an old line-art kit; new topics are drawn with the Anatomy core via src/lib/anatomy.tsx (§22)`);
  if (/flow:\s*true|pulse:\s*true/.test(src)) add('error', `determinism: ${f} uses the kit's CSS animation (flow/pulse); animate from the frame number instead (§12, §22)`);
  if (/scenes[\\/]Scene\d+/.test(f) && !/lib\/anatomy['"]/.test(src)) add('warn', `style: ${f} does not use src/lib/anatomy.tsx (AnatomyStage, anatomyProjection) (§22)`);
}

// 4) projection per scene (§19.7)
const sceneFiles = fs.readdirSync(scenesDir).filter((f) => /^Scene\d+.*\.tsx$/.test(f)).sort();
const sceneFileOf = (id) => sceneFiles.find((f) => f.startsWith(`Scene${id.replace('scene-', '')}`));
for (const f of sceneFiles) {
  if (/<FrontalSvg\b|<Cam2D\b/.test(fs.readFileSync(path.join(scenesDir, f), 'utf8'))) add('error', `projection: ${f} is a flat frontal scene; convert to isometry (§19.7)`);
}

// 5) timeline continuity and beats
const tl = readJson(timelineFile);
let cursor = 0;
for (const s of tl.scenes) {
  if (s.from !== cursor) add('error', `timeline: ${s.id} starts at ${s.from}, expected ${cursor}`);
  cursor = s.from + s.durationInFrames;
  for (const b of s.beats ?? []) if (b.frame === null || b.frame < 0 || b.frame >= s.durationInFrames) add('error', `timeline: beat ${s.id}/${b.id} outside the scene or missing`);
  if (!sceneFileOf(s.id)) add('error', `timeline: no scene file for ${s.id} in ${scenesDir}`);
}
if (tl.totalFrames !== undefined && tl.totalFrames !== cursor) add('error', `timeline: totalFrames ${tl.totalFrames} ≠ sum ${cursor}`);

// 6) visual register: locations, scene modes, metaphors, data accuracy (§19.2, §20)
const regFile = path.join(contentDir, 'visual-register.json');
if (!fs.existsSync(regFile)) {
  add('error', `register: ${regFile} not found — every scene needs a declared location and mode (§20.3)`);
} else {
  const reg = readJson(regFile);
  const scenes = reg.scenes ?? {};
  const metaphors = reg.metaphors ?? {};
  const REQUIRED = ['keyIdea', 'sourceClaim', 'mapping', 'whyNotLiteral', 'misreadRisk', 'guard', 'status'];
  for (const [id, m] of Object.entries(metaphors)) {
    const miss = REQUIRED.filter((k) => !m[k] || (Array.isArray(m[k]) && !m[k].length));
    if (miss.length) add('error', `metaphor «${id}»: missing ${miss.join(', ')} (§20.2)`);
    if (m.status === 'rejected' && Object.values(scenes).some((s) => (s.metaphors ?? []).includes(id))) add('error', `metaphor «${id}» was rejected but is still used`);
    else if (m.status !== 'approved' && m.status !== 'rejected') add('warn', `metaphor «${id}»: status «${m.status}», needs the user's approval at STOP 1 (§20.2)`);
  }
  const seen = new Map();
  const allow = reg.locationReuse ?? [];
  tl.scenes.forEach((s, idx) => {
    const n = idx + 1;
    const sc = scenes[s.id];
    if (!sc) return add('error', `register: ${s.id} is not declared in ${regFile}`);
    if (!['literal', 'schematic', 'metaphor'].includes(sc.mode)) add('error', `register: ${s.id} mode must be literal | schematic | metaphor`);
    if (sc.mode === 'metaphor' && !(sc.metaphors ?? []).length) add('error', `register: ${s.id} is a metaphor scene without a registered metaphor`);
    for (const mid of sc.metaphors ?? []) if (!metaphors[mid]) add('error', `register: ${s.id} uses unknown metaphor «${mid}»`);
    if (sc.data && sc.data.plane !== 'frontal') {
      add(sc.data.waiver ? 'warn' : 'error', `data accuracy: ${s.id} shows measured values on a «${sc.data.plane}» plane; compared values must sit on a frontal plate (§20.4)${sc.data.waiver ? ` — waiver: ${sc.data.waiver}` : ''}`);
    }
    const loc = sc.location;
    if (!loc) return add('error', `register: ${s.id} has no location`);
    const hub = allow.find((a) => a.location === loc);
    if (hub && !hub.scenes.includes(n)) add('error', `location: «${loc}» is used in scene ${n}, which is not in its allowed list — design a new location`);
    const prev = seen.get(loc);
    if (prev !== undefined && n - prev > 1 && !allow.some((a) => a.location === loc && a.scenes.includes(prev) && a.scenes.includes(n)))
      add('error', `location: «${loc}» reused in scene ${n} after scene ${prev} — design a new location or record consent in locationReuse`);
    seen.set(loc, n);
  });
}

// 7) sound map: files exist, beats exist, events inside their scene, reviewed after the last scene change
const smFile = path.join(contentDir, 'sound-map.json');
const hashOf = (id) => {
  const f = sceneFileOf(id);
  return f ? crypto.createHash('sha256').update(fs.readFileSync(path.join(scenesDir, f))).digest('hex').slice(0, 16) : null;
};
if (fs.existsSync(smFile)) {
  const sm = readJson(smFile);
  sm._reviewed = sm._reviewed ?? {};
  for (const s of tl.scenes) {
    for (const e of sm[s.id] ?? []) {
      if (!fs.existsSync(path.join('public', e.file))) add('error', `sound: ${s.id} missing file ${e.file}`);
      const b = (s.beats ?? []).find((x) => x.id === e.beat);
      if (!b) add('error', `sound: ${s.id} unknown beat «${e.beat}»`);
      else if (b.frame + e.offset < 0 || b.frame + e.offset >= s.durationInFrames) add('warn', `sound: ${s.id} ${e.file} at ${b.frame + e.offset} is outside the scene`);
    }
    if (stampSfx) sm._reviewed[s.id] = hashOf(s.id);
    else if (sm._reviewed[s.id] !== hashOf(s.id)) add('warn', `sound: ${s.id} scene code changed after the sound map was reviewed — re-check sfx reasons and offsets, then run with --stamp-sfx (§11)`);
  }
  if (stampSfx) {
    fs.writeFileSync(smFile, JSON.stringify(sm, null, 2) + '\n');
    add('ok', 'sound map stamped as reviewed');
  }
} else add('warn', `sound: ${smFile} not found`);

for (const lvl of ['error', 'warn']) for (const m of out[lvl]) console.log(`${lvl.toUpperCase()} ${m}`);
console.log(`\n${out.error.length} errors, ${out.warn.length} warnings, ${out.ok.length} ok`);
process.exit(out.error.length ? 1 : 0);
