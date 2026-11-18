#!/usr/bin/env node
// Project audit without rendering (MASTER_PROMPT_FINAL §12, §15, §19, §20):
// types, lint, captions, palette, projection, visual register (locations, metaphors, data accuracy),
// on-screen text, timeline, sound map and its freshness.
//
// Usage (shared core): node scripts/audit.mjs
//   No topic. Types, lint, palette, sample parts and covers, the rig, and the house-style check of every
//   topic under src/projects/. There is no root topic.
// Usage (one topic):   node scripts/audit.mjs --scenes src/projects/<slug>/scenes --content projects/<slug>/content --timeline src/projects/<slug>/data/timeline.json
//   That topic only (src/projects/<slug>/, projects/<slug>/content/, and public/<slug>/ via its sound map)
//   plus the shared core every topic is built on (src/lib, src/components, src/theme, src/samples, src/Root.tsx,
//   src/index.ts). Not other topics (§13: one topic = one folder).
// Mark the sound map as reviewed after re-syncing it: node scripts/audit.mjs --stamp-sfx
// --only captions   run just the caption step (regression slice; a release audit does not pass --only)
// Exit code 1 if any ERROR. Run before the quality gate and before every commit of visual work.
import {execFileSync, execSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {markPassed, passedBefore} from './lib-cache.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const explicitTopic = process.argv.includes('--scenes') || process.argv.includes('--content') || process.argv.includes('--timeline');
// A run without flags checks the shared core. A topic run names its own scenes, content and timeline.
const scenesDir = arg('scenes', '');
const contentDir = arg('content', '');
const timelineFile = arg('timeline', '');
const stampSfx = process.argv.includes('--stamp-sfx');
const only = new Set(
  (arg('only', '') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
const step = (name) => only.size === 0 || only.has(name);
const captionsSlice = only.size > 0 && [...only].every((name) => name === 'tsc' || name === 'eslint' || name === 'captions');
if (!captionsSlice && explicitTopic && (!scenesDir || !contentDir || !timelineFile)) {
  console.error('audit: a topic run needs --scenes, --content and --timeline');
  process.exit(1);
}
if (only.has('captions') && !timelineFile) {
  console.error('audit: --only captions needs --timeline <timeline.json>');
  process.exit(1);
}
if (stampSfx && !explicitTopic) {
  console.error('audit: --stamp-sfx needs --scenes, --content and --timeline of a topic');
  process.exit(1);
}
const out = {error: [], warn: [], ok: []};
const add = (lvl, msg) => out[lvl].push(msg);
const finish = () => {
  for (const lvl of ['error', 'warn']) for (const m of out[lvl]) console.log(`${lvl.toUpperCase()} ${m}`);
  console.log(`\n${out.error.length} errors, ${out.warn.length} warnings, ${out.ok.length} ok`);
  process.exit(out.error.length ? 1 : 0);
};
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const q = (s) => JSON.stringify(s);
const under = (file, dir) => file === dir || file.startsWith(dir + path.sep);
// A topic run is recognised by its scenes living in src/projects/<slug>/scenes (the same signal object-audit uses).
const topicDir =
  scenesDir.includes(`${path.sep}projects${path.sep}`) || scenesDir.includes('projects/') ? path.dirname(scenesDir) : null;
// Shared core checked together with every topic. Other topics are not part of it.
const SHARED_DIRS = ['src/lib', 'src/components', 'src/theme', 'src/samples'];
const SHARED_FILES = ['src/Root.tsx', 'src/index.ts'];
const run = (name, cmd) => {
  try {
    execSync(cmd, {stdio: 'pipe'});
    add('ok', name);
  } catch (e) {
    add('error', `${name}: ${String(e.stdout || '') + String(e.stderr || '')}`.trim().slice(0, 800));
  }
};
/** Same as run(), but argv is an array: the timeline path is not passed through a shell. */
const runFile = (name, file, args) => {
  try {
    execFileSync(file, args, {stdio: 'pipe', encoding: 'utf8'});
    add('ok', name);
  } catch (e) {
    add('error', `${name}: ${String(e.stdout || '') + String(e.stderr || '')}`.trim().slice(0, 800));
  }
};
// tsc is one program (tsconfig include: src). A topic run still typechecks that program, then reports only
// diagnostics in this topic, the shared core, or src/vendor. Diagnostics of another topic are left to that
// topic's audit and to the root run, which keeps the unfiltered tsc. An unparsed failure is never dropped.
const relOf = (file) => (path.isAbsolute(file) ? path.relative(process.cwd(), file) : path.normalize(file));
const inTscScope = (file) => {
  const rel = relOf(file);
  if (under(rel, path.join('src', 'vendor'))) return true;
  if (topicDir && under(rel, topicDir)) return true;
  if (SHARED_DIRS.some((d) => under(rel, d))) return true;
  return SHARED_FILES.includes(rel);
};
const runTsc = () => {
  if (!topicDir) return run('tsc', 'npx tsc --noEmit');
  let text = '';
  try {
    execSync('npx tsc --noEmit --pretty false', {stdio: 'pipe', encoding: 'utf8'});
    return add('ok', 'tsc');
  } catch (e) {
    text = String(e.stdout || '') + String(e.stderr || '');
  }
  const kept = [];
  let located = 0;
  for (const line of text.split('\n')) {
    const m = /^(.+?)\(\d+,\d+\):/.exec(line);
    if (!m) continue;
    located++;
    if (inTscScope(m[1])) kept.push(line);
  }
  if (!located || kept.length) add('error', `tsc: ${(kept.length ? kept.join('\n') : text).trim().slice(0, 800)}`);
  else add('ok', 'tsc');
};

/** run(), but skipped when the inputs are unchanged since the last pass (slow geometry checks; CI has no cache) */
const runCached = (name, cmd, inputs) => {
  if (passedBefore(name, inputs)) return add('ok', `${name} (unchanged since the last pass)`);
  const before = out.error.length;
  run(name, cmd);
  if (out.error.length === before) markPassed(name, inputs);
};

// 1) types, lint (warnings are errors too), captions of THIS topic's timeline.
// --timeline is forwarded as an argv element. A run without --timeline does not read a timeline.
if (step('tsc')) runTsc();
const eslintRoots = topicDir ? [topicDir, ...SHARED_DIRS, ...SHARED_FILES].filter((r) => fs.existsSync(r)) : ['src'];
if (step('eslint')) run('eslint', `npx eslint ${eslintRoots.map(q).join(' ')} --max-warnings 0`);
if (step('captions') && timelineFile) runFile('captions', process.execPath, ['scripts/check-text.mjs', '--timeline', timelineFile]);
if (captionsSlice) finish();

// 2) palette: only theme tokens in components; no second (pink) accent.
// A topic run reads its own code and the shared core. A run without flags reads every file still under src/.
const walk = (d) => fs.readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const walkRoots = (roots) => roots.filter((r) => fs.existsSync(r)).flatMap((r) => (fs.statSync(r).isDirectory() ? walk(r) : [r]));
const srcFiles = walkRoots(topicDir ? [topicDir, ...SHARED_DIRS, ...SHARED_FILES] : ['src']).filter((f) => /\.tsx?$/.test(f) && !f.includes(`${path.sep}vendor${path.sep}`)); // vendored code keeps its defaults; our theme overrides them
for (const f of srcFiles.filter((f) => !f.includes(`${path.sep}theme${path.sep}`))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (/^\s*(\/\/|\*)/.test(l)) return;
    if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(l)) add('error', `palette: ${f}:${i + 1} colour outside tokens (§19.7): ${l.trim().slice(0, 90)}`);
    if (/accentSoft/.test(l)) add('error', `palette: ${f}:${i + 1} accentSoft is a second accent; use the coral accent or a neutral (§19.7)`);
  });
}

// 3) on-screen text: everything except captions, the preview title and labelled plates must be reviewed (§19.1)
const TEXT_OK = /(components[\\/](Captions|Frontal)\.tsx|Cover\.tsx)$/;
for (const f of srcFiles.filter((f) => f.endsWith('.tsx') && !TEXT_OK.test(f))) {
  const n = (fs.readFileSync(f, 'utf8').match(/<text\b/g) ?? []).length;
  if (n) add('warn', `text in frame: ${f} draws ${n} <text> node(s); allowed only as labels on frontal plates or data values (§19.1, §20.4)`);
}

// 2b) house-style objects (§22): geometry audit of every Assembly in *.parts.ts (collisions, floating parts, paint
// order, stand-in shapes) and the §22.2 part count. A topic run audits its own src/projects/<slug>/; the root run
// audits the rest of src/.
{
  const parts = srcFiles.filter((f) => f.endsWith('.parts.ts') && (topicDir ? under(f, topicDir) : !f.includes(`${path.sep}projects${path.sep}`)));
  if (parts.length) runCached(`object-audit (${parts.length} file${parts.length === 1 ? '' : 's'})`, `node scripts/object-audit.mjs --quiet ${parts.map((f) => JSON.stringify(f)).join(' ')}`, [...parts, ...parts.map((f) => f.replace(/\.ts$/, '.keys.json')), 'src/lib/assembly.ts', 'src/lib/anatomy.tsx', 'src/vendor/anatomy', 'scripts/object-audit.mjs']);
  // §22.2 line ends. Warnings only: existing scenes must not fail CI. --strict on the script itself fails.
  if (parts.length) {
    let buf = '';
    const cmd = `node scripts/lines-check.mjs --quiet ${parts.map((f) => JSON.stringify(f)).join(' ')}`;
    try {
      buf = execSync(cmd, {encoding: 'utf8'});
      add('ok', `lines-check (${parts.length} file${parts.length === 1 ? '' : 's'})`);
    } catch (e) {
      buf = `${e.stdout || ''}${e.stderr || ''}`;
      add('error', `lines-check: ${buf}`.trim().slice(0, 800));
    }
    for (const l of buf.split('\n')) if (l.startsWith('WARN ')) add('warn', `lines: ${l.slice(5)}`);
  }
}

// 2d) covers (§19.5): every covers.ts — title words and size, image share, safe column, 4:5 crop, techniques.
// A topic run checks its own covers.ts; the root run checks covers outside src/projects (the style samples).
{
  const covers = srcFiles.filter((f) => path.basename(f) === 'covers.ts' && (topicDir ? under(f, topicDir) : !f.includes(`${path.sep}projects${path.sep}`)));
  if (covers.length) {
    run(`cover-check (${covers.length})`, `node scripts/cover-check.mjs --quiet ${covers.map((f) => JSON.stringify(f)).join(' ')}`);
    try {
      const outp = execSync(`node scripts/cover-check.mjs --quiet ${covers.map((f) => JSON.stringify(f)).join(' ')}`, {encoding: 'utf8'});
      for (const l of outp.split('\n').filter((l) => l.startsWith('WARN'))) add('warn', `cover: ${l.slice(6)}`);
    } catch {
      /* errors are reported by run() above */
    }
  }
}

// 2c) character rig (§22): no foot sliding, rigid bones, IK reaches, ≥ 40 parts per outfit
runCached('rig-check', 'node scripts/rig-check.mjs --quiet', ['src/lib/rig.ts', 'src/lib/character.ts', 'src/lib/anatomy.tsx', 'src/vendor/anatomy', 'scripts/rig-check.mjs']);

// 3b) house style (§22): scenes under src/projects/ use the Anatomy core, not the old line-art kits.
// A run without flags checks every topic. A topic run checks that topic only.
const OLD_KITS = /from ['"][./]*illustrations\/(Room|CityKit|Interiors|Archive|CardCatalog|primitives|Props|MemoryCards|Board)['"]/;
for (const f of srcFiles.filter((f) => f.includes(`${path.sep}projects${path.sep}`) && f.endsWith('.tsx') && (!topicDir || under(f, topicDir)))) {
  const src = fs.readFileSync(f, 'utf8');
  if (OLD_KITS.test(src)) add('error', `style: ${f} uses an old line-art kit; new topics are drawn with the Anatomy core via src/lib/anatomy.tsx (§22)`);
  if (/flow:\s*true|pulse:\s*true/.test(src)) add('error', `determinism: ${f} uses the kit's CSS animation (flow/pulse); animate from the frame number instead (§12, §22)`);
  if (/scenes[\\/]Scene\d+/.test(f) && !/lib\/anatomy['"]/.test(src)) add('warn', `style: ${f} does not use src/lib/anatomy.tsx (AnatomyStage, anatomyProjection) (§22)`);
}

// 4–7) this topic's scenes, timeline, register and sound map. Skipped when the run has no topic flags.
const sceneFiles = scenesDir && fs.existsSync(scenesDir) ? fs.readdirSync(scenesDir).filter((f) => /^Scene\d+.*\.tsx$/.test(f)).sort() : [];
if (scenesDir && timelineFile && contentDir) {
// 4) projection per scene (§19.7)
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

// 5b) one coral meaning per topic (§20.5 «один образ — два смысла»; the pilot's coral meant three things until the audit
// of metaphors): the register declares `coralMeaning`, every scene that has a coral part states the SAME meaning
{
  const rf = path.join(contentDir, 'visual-register.json');
  if (fs.existsSync(rf) && contentDir.startsWith('projects')) {
    const reg = readJson(rf);
    const withCoral = Object.entries(reg.scenes ?? {}).filter(([, v]) => v.coral);
    if (withCoral.length && !reg.coralMeaning) add('error', 'register: scenes declare `coral` but the register has no `coralMeaning` (one coral part = one meaning, §20.5)');
    for (const [id, v] of withCoral) if (reg.coralMeaning && v.coral !== reg.coralMeaning) add('error', `register: ${id} gives coral the meaning «${v.coral}», the topic's is «${reg.coralMeaning}»: one image, one meaning (§20.5)`);
    if (!withCoral.length && Object.keys(reg.scenes ?? {}).length) add('warn', 'register: no scene declares its `coral` part (§22.1: exactly one coral part per frame)');
  }
}

// 5c) every script scene cites sources that exist in the dossier (and says when it relies on a simplification)
{
  const df = path.join(contentDir, 'dossier.json');
  const sf = path.join(contentDir, 'script.json');
  if (fs.existsSync(df) && fs.existsSync(sf)) {
    const dossier = readJson(df);
    const status = Object.fromEntries((dossier.verification ?? []).map((v) => [v.id, v.status]));
    for (const sc of readJson(sf).scenes ?? []) {
      for (const id of sc.source ?? []) {
        if (!(id in status)) add('error', `claims: ${sc.id} cites ${id}, which is not in dossier.json verification (add the claim or fix the id)`);
        else if (/не подтверждено/.test(status[id])) add('error', `claims: ${sc.id} relies on ${id}, which the dossier marks «${status[id]}»: confirm it or rephrase the voice (§7)`);
        else if (/упрощено|частично/.test(status[id]) && !(sc.simplified ?? []).includes(id)) add('warn', `claims: ${sc.id} relies on ${id} («${status[id]}»); say so in the voice («в простейшем моторе») and list it in the scene's \`simplified\``);
      }
      if (!(sc.source ?? []).length) add('warn', `claims: ${sc.id} cites no source (§7)`);
    }
  }
}

// 6) visual register: locations, scene modes, metaphors, data accuracy (§19.2, §20)
const regFile = path.join(contentDir, 'visual-register.json');
if (!fs.existsSync(regFile)) {
  add('error', `register: ${regFile} not found — every scene needs a declared location and mode (§20.3)`);
} else {
  const reg = readJson(regFile);
  const scenes = reg.scenes ?? {};
  const metaphors = reg.metaphors ?? {};
  const REQUIRED = ['keyIdea', 'sourceClaim', 'mapping', 'misreadRisk', 'guard', 'status'];
  for (const [id, m] of Object.entries(metaphors)) {
    const miss = REQUIRED.filter((k) => !m[k] || (Array.isArray(m[k]) && !m[k].length));
    // whyNotLiteral stays the field existing registers use. rationale is the same slot for a leading metaphor.
    if (!String(m.whyNotLiteral ?? '').trim() && !String(m.rationale ?? '').trim()) miss.push('whyNotLiteral');
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
    if (sc.interface === 'real' && sc.mode !== 'literal') add('error', `register: ${s.id} real interface requires literal mode (§20.1)`);
    if (sc.leadingMetaphor) {
      const later = tl.scenes.slice(idx + 1).some((entry) => entry.id === sc.schemeScene);
      const scheme = scenes[sc.schemeScene];
      const linked = (sc.metaphors ?? []).includes(sc.leadingMetaphor) && metaphors[sc.leadingMetaphor];
      if (sc.mode !== 'metaphor' || !linked || !later || scheme?.mode !== 'schematic') {
        add('error', `register: ${s.id} leading metaphor «${sc.leadingMetaphor}» needs mode metaphor, the metaphor registered on this scene, and a later schematic scene «${sc.schemeScene ?? '?'}» (§20.1)`);
      }
      const prep = path.join(contentDir, 'metaphor-prep.md');
      if (!fs.existsSync(prep)) add('error', `register: ${s.id} leading metaphor has no ${prep} (§22.5)`);
    }
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

// 7) sound map of this topic: files exist (public/<slug>/ for its voice, public/audio for shared sfx), beats exist,
// events inside their scene, reviewed after the last scene change
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
}

finish();
