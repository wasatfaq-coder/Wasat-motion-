#!/usr/bin/env node
// Project audit without rendering (MASTER_PROMPT_FINAL v3.0, «Проверки»): types, lint, palette, on-screen text,
// geometry of house-style objects, motion, covers, rig; for a topic also captions, voice, timeline, the visual register
// (modes, mechanism cards, chapters and their light/dark field, coral meaning, data plates), the image journal, sensitive
// topics, claims and their trust, review notes and the sound map.
//
// Usage (core):   node scripts/audit.mjs            the shared core: src/lib, src/components, src/theme, src/samples
// Usage (topic):  node scripts/audit.mjs --topic <slug>
//   That topic (src/projects/<slug>/, projects/<slug>/content/, public/<slug>/ via its sound map) plus the shared core.
//   --content / --scenes / --timeline override one path.
// --quick          the fast level after an edit: skips the slow geometry checks (object-audit, lines, motion, rig,
//                  covers); the full level runs at a STOP, in pregate and in CI (decision 7).
// Mark the sound map as reviewed after re-syncing it: node scripts/audit.mjs --topic <slug> --stamp-sfx
// --only captions  run just one step (regression slice; a release audit does not pass --only)
// Exit code 1 if any ERROR.
import {execFileSync, execSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {markPassed, passedBefore} from './lib-cache.mjs';
import {topicFrom} from './lib/topic.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const TOPIC = topicFrom();
const scenesDir = TOPIC?.scenes ?? null;
const contentDir = TOPIC?.content ?? null;
const timelineFile = TOPIC?.timeline ?? null;
const quick = process.argv.includes('--quick');
const stampSfx = process.argv.includes('--stamp-sfx');
const only = new Set(
  (arg('only', '') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
const step = (name) => only.size === 0 || only.has(name);
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
// A topic run checks src/projects/<slug>; a core run checks the shared core only.
const topicDir = TOPIC ? path.join('src', 'projects', TOPIC.slug) : null;
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
// --timeline is forwarded as an argv element, so a defective topic timeline fails even when the root one is fine.
if (step('tsc')) runTsc();
const eslintRoots = topicDir ? [topicDir, ...SHARED_DIRS, ...SHARED_FILES].filter((r) => fs.existsSync(r)) : ['src'];
if (step('eslint')) run('eslint', `npx eslint ${eslintRoots.map(q).join(' ')} --max-warnings 0`);
if (TOPIC && step('captions')) {
  if (fs.existsSync(timelineFile)) runFile('captions', process.execPath, ['scripts/check-text.mjs', '--timeline', timelineFile]);
  else add('warn', `captions: no ${timelineFile} yet (build it after the voice: node scripts/build-timeline.mjs --topic ${TOPIC.slug})`);
}
// the voice says what the script says (§9.5): scripts/vo-check.mjs over the recognised speech; a topic without
// transcripts yet (voice not generated) gets a warning, not an error, and a passed check is never faked
if (TOPIC && step('voice')) {
  const trDir = path.join(contentDir, 'transcripts');
  if (fs.existsSync(trDir) && fs.readdirSync(trDir).some((f) => f.endsWith('.json'))) runFile('voice', process.execPath, ['scripts/vo-check.mjs', '--content', contentDir, '--quiet']);
  else add('warn', `voice: no transcripts in ${trDir}; run scripts/transcribe.mjs after the voice so scripts/vo-check.mjs can compare it with the script`);
}
if (only.size && [...only].every((name) => name === 'tsc' || name === 'eslint' || name === 'captions' || name === 'voice')) finish();

// 2) palette: only theme tokens in components; no second (pink) accent.
// A topic run reads its own code and the shared core; a core run reads all of src/.
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
const TEXT_OK = /(components[\\/](Captions|Thesis|Frontal|Atlas)\.tsx|Cover\.tsx)$/;
for (const f of srcFiles.filter((f) => f.endsWith('.tsx') && !TEXT_OK.test(f))) {
  const n = (fs.readFileSync(f, 'utf8').match(/<text\b/g) ?? []).length;
  if (n) add('warn', `text in frame: ${f} draws ${n} <text> node(s); allowed only as labels on frontal plates or data values (§19.1, §20.4)`);
}

// 2b) house-style objects (§22): geometry audit of every Assembly in *.parts.ts (collisions, floating parts, paint
// order, stand-in shapes) and the §22.2 part count. A topic run audits its own src/projects/<slug>/; the root run
// audits the rest of src/.
if (!quick) {
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

// 2e) motion (§19.3, §22): every *.motion.ts walks its reel/scene frame by frame without rendering — paint-order
// cycles, moving parts through static ones, arrows off their owners, the hero out of the safe rect or off centre,
// jumps, jolts, pops and a broken loop. scripts/motion-check.mjs; cached by input hash like object-audit.
if (!quick) {
  const motions = srcFiles.filter((f) => f.endsWith('.motion.ts') && (topicDir ? under(f, topicDir) : !f.includes(`${path.sep}projects${path.sep}`)));
  if (motions.length) {
    const dirs = [...new Set(motions.map((f) => path.dirname(f)))];
    runCached(`motion-check (${motions.length} file${motions.length === 1 ? '' : 's'})`, `node scripts/motion-check.mjs --quiet ${motions.map((f) => JSON.stringify(f)).join(' ')}`, [...dirs, 'src/lib', 'src/theme', 'src/vendor/anatomy', 'scripts/motion-check.mjs']);
  }
}

// 2f) motion architecture (root cause of the motor-stand reel defects, closed for every topic): a topic file that
// animates house-style objects keeps its state in a *.motion.ts (so motion-check sees every frame), frames with camFit
// (hero + labels inside the safe rect) and moves with beatClock/blendCam. The old hand-tuned helpers are not allowed in
// src/projects: camOn/camOnBox (zoom numbers that crop the hero), lerpCam between pictures (a cross-fade, not a move).
{
  const topicCode = srcFiles.filter((f) => f.includes(`${path.sep}projects${path.sep}`) && (topicDir ? under(f, topicDir) : true) && /\.tsx?$/.test(f) && !f.endsWith('.motion.ts'));
  for (const f of topicCode) {
    const text = fs.readFileSync(f, 'utf8');
    const code = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const old = [...new Set(code.match(/\b(camOn|camOnBox|lerpCam)\(/g) ?? [])];
    if (old.length) add('error', `motion: ${f} uses ${old.map((x) => x.slice(0, -1)).join(', ')}; frame with camFit(hero corners, {rect: safeRect(), pins}) and move with beatClock/blendCam (src/lib/motion.ts)`);
    const animates = /useCurrentFrame\(/.test(code) && /(\.parts['"]|lib\/assembly['"]|<Kit\b)/.test(code);
    if (f.endsWith('.tsx') && animates && !/from '\.\/[^']+\.motion'/.test(code)) add('error', `motion: ${f} animates house-style objects but takes no state from a *.motion.ts; put the per-frame state (camera, angles, opacities, arrows) in a *.motion.ts exporting MOTION so motion-check walks every frame`);
  }
}

// 2h) detail norm everywhere (§22.2, §24): object-audit counts parts only of objects built with Assembly in *.parts.ts.
// Root cause of the gap: a scene could draw a solid straight from the kit (solidSvg, slabOf, cylinder…) and the object
// was never counted or checked, so a topic could look detailed in one place and bare in another. In topic code every
// solid goes through an Assembly; moving parts live in *.motion.ts (dynSolid), covers in covers.ts.
{
  const raw = /\b(solidSvg|slabOf|sphereOf|prismOf|solidOf|extrude|cylinder|tubePieces)\(/g;
  const topicCode = srcFiles.filter((f) => f.includes(`${path.sep}projects${path.sep}`) && (topicDir ? under(f, topicDir) : true) && /\.tsx?$/.test(f) && !/\.(parts|motion)\.ts$/.test(f) && !f.endsWith('covers.ts'));
  for (const f of topicCode) {
    const code = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const hits = [...new Set(code.match(raw) ?? [])];
    if (hits.length) add('error', `detail: ${f} draws kit solids directly (${hits.map((x) => x.slice(0, -1)).join(', ')}); build the object with Assembly in a *.parts.ts so object-audit counts and checks it (§22.2), moving parts with dynSolid in a *.motion.ts`);
  }
}

// 2j) no markup glued to an Assembly's picture as a string (scripts/lib/code-rules.mjs rawOverlay): it is painted
// outside the object's depth order. Topic code and the samples (the showcase is the model topics copy).
{
  const {rawOverlay} = await import('./lib/code-rules.mjs');
  const code = srcFiles.filter((f) => (f.includes(`${path.sep}projects${path.sep}`) ? (topicDir ? under(f, topicDir) : true) : f.includes(`${path.sep}samples${path.sep}`)) && /\.tsx?$/.test(f));
  for (const f of code) {
    const hits = rawOverlay(fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
    if (hits.length) add('error', `depth: ${f} glues markup to an Assembly picture as a string (${hits.map((h) => `«${h}»`).join(', ')}); pass it as \`extra\` so it is ordered by depth, or put text on a frontal layer`);
  }
}

// 2i) reuse with consent (§4, §24): a topic builds its own objects from the kit builders in src/lib. Importing another
// topic's code (src/projects/<other>) or the demo samples (src/samples) is allowed only for a catalog entry
// (src/lib/catalog.json) whose `consent` lists this topic. Root cause: nothing stopped a topic from quietly reusing a
// finished object or location of another topic.
{
  const catalog = readJson('src/lib/catalog.json').objects;
  const topicFiles = srcFiles.filter((f) => f.includes(`${path.sep}projects${path.sep}`) && (topicDir ? under(f, topicDir) : true) && /\.tsx?$/.test(f));
  for (const f of topicFiles) {
    const slug = f.split(`${path.sep}projects${path.sep}`)[1].split(path.sep)[0];
    const code = fs.readFileSync(f, 'utf8');
    for (const m of code.matchAll(/from ['"]([^'"]+)['"]/g)) {
      const target = path.normalize(path.join(path.dirname(f), m[1]));
      const rel = path.relative(process.cwd(), target).split(path.sep).join('/');
      const other = rel.match(/^src\/projects\/([^/]+)\//);
      const sample = rel.startsWith('src/samples/');
      if (!(other && other[1] !== slug) && !sample) continue;
      const entry = Object.values(catalog).find((e) => rel.startsWith(String(e.module).replace(/\.tsx?$/, '')));
      if (!entry || !(entry.consent ?? []).includes(slug))
        add('error', `reuse: ${f} imports ${rel}; build the object from the kit (src/lib) or record the user's consent for «${slug}» in src/lib/catalog.json (§4)`);
    }
  }
}

// 2g) review notes (regulation v3.0, decision 15): statuses open | fixed | user. A guard in shared code is owed only
// when a defect came back (`repeat: true`) or blocks the release (BLOCKER): then the note names its root cause and an
// existing scripts/… or src/… path that now catches it (decision 4).
if (TOPIC) {
  const notesFile = path.join(contentDir, 'reviews', 'notes.json');
  if (fs.existsSync(notesFile)) {
    let raw = null;
    try {
      raw = readJson(notesFile);
    } catch (e) {
      add('error', `notes: ${notesFile} is not valid JSON (${e.message})`);
    }
    const notes = Array.isArray(raw) ? raw : (raw?.notes ?? []);
    for (const n of notes) {
      if (!n) continue;
      if (!['open', 'fixed', 'user'].includes(n.status)) add('error', `notes: ${n.id} has status «${n.status}»; use open | fixed | user (decision 15)`);
      if (n.status !== 'fixed' || !(n.repeat || n.severity === 'BLOCKER')) continue;
      const missing = [];
      if (!String(n.rootCause ?? '').trim()) missing.push('rootCause');
      const guards = String(n.guard ?? '').match(/(?:scripts|src)\/[\w./-]+/g) ?? [];
      if (!guards.length) missing.push('guard (a scripts/… or src/… path)');
      for (const g of guards) if (!fs.existsSync(g.replace(/[.,;:)]+$/, ''))) missing.push(`guard path ${g} does not exist`);
      if (missing.length) add('error', `notes: ${n.id} is a ${n.repeat ? 'repeated' : 'BLOCKER'} defect fixed without ${missing.join(', ')}: fix it in shared code and name the check that now catches it (decision 4, docs/root-causes.md)`);
    }
  }
}

// 2d) covers: every covers.ts — title words and size, image share, safe column, 4:5 crop, techniques, one coral spot.
// A topic run checks its own covers.ts; a core run checks the style samples.
if (!quick) {
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

// 2c) character rig: no foot sliding, rigid bones, IK reaches, part norm per outfit
if (!quick) runCached('rig-check', 'node scripts/rig-check.mjs --quiet', ['src/lib/rig.ts', 'src/lib/character.ts', 'src/lib/anatomy.tsx', 'src/vendor/anatomy', 'scripts/rig-check.mjs']);

// 3b) determinism of topic code: no CSS animation of the kit (flow/pulse); scenes use the Anatomy stage
for (const f of srcFiles.filter((f) => f.includes(`${path.sep}projects${path.sep}`) && f.endsWith('.tsx') && (!topicDir || under(f, topicDir)))) {
  const src = fs.readFileSync(f, 'utf8');
  if (/flow:\s*true|pulse:\s*true/.test(src)) add('error', `determinism: ${f} uses the kit's CSS animation (flow/pulse); animate from the frame number instead`);
  if (/scenes[\\/]Scene\d+/.test(f) && !/lib\/anatomy['"]/.test(src)) add('warn', `style: ${f} does not use src/lib/anatomy.tsx (AnatomyStage, anatomyProjection)`);
}

// the image journal (decision 14): docs/style/images-log.json lists the mechanisms, heroes and locations of finished
// topics and demos; a core run checks that it is well formed
const LOG = 'docs/style/images-log.json';
const journal = fs.existsSync(LOG) ? readJson(LOG) : null;
if (!journal) add('error', `journal: ${LOG} is missing (the image journal, decision 14)`);
else if (!Array.isArray(journal.entries) || journal.entries.some((e) => !e.topic || !e.kind || !e.name)) add('error', `journal: ${LOG} needs entries [{topic, kind: mechanism | hero | location, name, verb?, series?}]`);
else add('ok', `journal: ${journal.entries.length} entr${journal.entries.length === 1 ? 'y' : 'ies'}`);

if (!TOPIC) finish();

// ── topic only from here ────────────────────────────────────────────────────────────────────────────────────────
const norm = (x) => String(x ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
const briefFile = path.join(contentDir, 'brief.yaml');
const brief = fs.existsSync(briefFile) ? fs.readFileSync(briefFile, 'utf8') : '';
const briefField = (k) => (brief.match(new RegExp(`^${k}:\\s*([^#\\n]*)`, 'm')) ?? [])[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
const FORMATS = ['how', 'why', 'history', 'numbers', 'faith'];
if (!brief) add('error', `brief: ${briefFile} not found`);
else {
  if (!FORMATS.includes(briefField('format'))) add('error', `brief: format «${briefField('format')}» must be one of ${FORMATS.join(' | ')} (decision 9)`);
  if (!['none', 'religion', 'politics', 'health'].includes(briefField('sensitive'))) add('error', `brief: sensitive must be none | religion | politics | health (decision 16)`);
}

// 4) projection per scene: no flat frontal scene
const sceneFiles = fs.existsSync(scenesDir) ? fs.readdirSync(scenesDir).filter((f) => /^Scene\d+.*\.tsx$/.test(f)).sort() : [];
const sceneFileOf = (id) => sceneFiles.find((f) => f.startsWith(`Scene${id.replace('scene-', '')}`));
for (const f of sceneFiles) {
  if (/<FrontalSvg\b|<Cam2D\b/.test(fs.readFileSync(path.join(scenesDir, f), 'utf8'))) add('error', `projection: ${f} is a flat frontal scene; keep the isometric world, data on frontal plates`);
}

// 5) timeline continuity and beats
const tl = fs.existsSync(timelineFile) ? readJson(timelineFile) : {scenes: []};
let cursor = 0;
for (const s of tl.scenes) {
  if (s.from !== cursor) add('error', `timeline: ${s.id} starts at ${s.from}, expected ${cursor}`);
  cursor = s.from + s.durationInFrames;
  for (const b of s.beats ?? []) if (b.frame === null || b.frame < 0 || b.frame >= s.durationInFrames) add('error', `timeline: beat ${s.id}/${b.id} outside the scene or missing`);
  if (!sceneFileOf(s.id)) add('error', `timeline: no scene file for ${s.id} in ${scenesDir}`);
}
if (tl.totalFrames !== undefined && tl.totalFrames !== cursor) add('error', `timeline: totalFrames ${tl.totalFrames} ≠ sum ${cursor}`);

// 5c) claims: every script scene cites claims of the dossier; a claim's trust (review > replicated > single > opinion,
// decision 43) is said in the voice: a single study or an opinion needs the scene's `hedge`; the main idea never rests on
// an opinion
{
  const df = path.join(contentDir, 'dossier.json');
  const sf = path.join(contentDir, 'script.json');
  if (fs.existsSync(df) && fs.existsSync(sf)) {
    const dossier = readJson(df);
    const claims = Object.fromEntries((dossier.verification ?? []).map((v) => [v.id, v]));
    const TRUST = ['review', 'replicated', 'single', 'opinion'];
    for (const c of Object.values(claims)) if (c.trust && !TRUST.includes(c.trust)) add('error', `claims: ${c.id} trust «${c.trust}» must be ${TRUST.join(' | ')}`);
    const script = readJson(sf);
    for (const sc of script.scenes ?? []) {
      for (const id of sc.source ?? []) {
        const c = claims[id];
        if (!c) add('error', `claims: ${sc.id} cites ${id}, which is not in dossier.json verification (add the claim or fix the id)`);
        else if (/не подтверждено/.test(c.status ?? '')) add('error', `claims: ${sc.id} relies on ${id}, which the dossier marks «${c.status}»: confirm it or rephrase the voice`);
        else if (/упрощено|частично/.test(c.status ?? '') && !(sc.simplified ?? []).includes(id)) add('warn', `claims: ${sc.id} relies on ${id} («${c.status}»); say so in the voice and list it in the scene's \`simplified\``);
        if (c && ['single', 'opinion'].includes(c.trust) && !String(sc.hedge ?? '').trim()) add('error', `claims: ${sc.id} relies on ${id} (trust «${c.trust}») without a \`hedge\` said in the voice («в одном исследовании», «считается»), decision 43`);
      }
      if (!(sc.source ?? []).length) add('warn', `claims: ${sc.id} cites no source`);
    }
    const main = script.mainClaim ? claims[script.mainClaim] : null;
    if (main?.trust === 'opinion') add('error', `claims: the main idea rests on ${script.mainClaim}, an opinion (decision 43)`);
  }
}

// 6) visual register: chapters, modes, mechanism cards, symbols, coral meaning, the dark scene, data plates, locations,
// sensitive topics (decisions 10, 13, 16, 21, 34–40)
const regFile = path.join(contentDir, 'visual-register.json');
const reg = fs.existsSync(regFile) ? readJson(regFile) : null;
if (!reg) add('error', `register: ${regFile} not found — every scene needs a chapter, a mode and a location`);
else {
  const scenes = reg.scenes ?? {};
  const mechs = reg.mechanisms ?? {};
  const CARD = ['idea', 'parts', 'laws', 'verb', 'simplifies', 'misread', 'truth', 'status'];
  for (const [id, m] of Object.entries(mechs)) {
    const miss = CARD.filter((k) => !m[k] || (Array.isArray(m[k]) && !m[k].length));
    if (miss.length) add('error', `mechanism «${id}»: card misses ${miss.join(', ')} (decision 40)`);
    for (const p of m.parts ?? []) if (!p.part || !p.claim || !p.source) add('error', `mechanism «${id}»: every part names {part, claim, source} — a part without a claim is decor (decision 19)`);
    if (m.inside && /head|body|brain|голов|тел|мозг/i.test(m.inside)) add('error', `mechanism «${id}» sits inside «${m.inside}»: a mechanism stands apart, never inside a head or a body (decision 19)`);
    if (m.status === 'rejected' && Object.values(scenes).some((s) => s.mechanism === id)) add('error', `mechanism «${id}» was rejected but is still used`);
    else if (!['approved', 'rejected'].includes(m.status)) add('warn', `mechanism «${id}»: status «${m.status}», needs the user's approval at STOP 1`);
  }
  if (Object.keys(reg.metaphors ?? {}).length) add('error', 'register: `metaphors` is the old registry; describe each invented image as a mechanism card in `mechanisms` (decision 40)');
  const chapters = new Map((reg.chapters ?? []).map((c) => [c.n, c]));
  const mechOfChapter = new Map();
  const darks = [];
  const order = tl.scenes.length ? tl.scenes.map((s) => s.id) : Object.keys(scenes);
  const seen = new Map();
  const allow = reg.locationReuse ?? [];
  order.forEach((id, idx) => {
    const n = idx + 1;
    const sc = scenes[id];
    if (!sc) return add('error', `register: ${id} is not declared in ${regFile}`);
    if (!['literal', 'schematic', 'mechanism', 'symbol'].includes(sc.mode)) add('error', `register: ${id} mode must be literal | schematic | mechanism | symbol (decision 19)`);
    if (sc.chapter !== undefined && !chapters.has(sc.chapter) && sc.chapter !== 0) add('error', `register: ${id} chapter ${sc.chapter} is not in \`chapters\` (0 = hook or finale)`);
    if (sc.dark) darks.push(id);
    if (sc.mode === 'mechanism') {
      if (!mechs[sc.mechanism]) add('error', `register: ${id} is a mechanism scene without a registered mechanism card («${sc.mechanism ?? '?'}»)`);
      const prev = mechOfChapter.get(sc.chapter);
      if (prev && prev !== sc.mechanism) add('error', `register: chapter ${sc.chapter} shows two mechanisms («${prev}», «${sc.mechanism}»): one mechanism per chapter (decision 36)`);
      mechOfChapter.set(sc.chapter, sc.mechanism);
      if (sc.interface === 'real' || sc.data) add('error', `register: ${id} shows an interface or data as a mechanism: visible things stay literal (decision 34)`);
    }
    if (sc.mode === 'symbol') {
      const catalog = readJson('src/lib/symbols/catalog.json').symbols;
      const beats = new Set((tl.scenes.find((s) => s.id === id)?.beats ?? []).map((b) => b.id));
      if (!(sc.symbols ?? []).length) add('error', `register: ${id} is a symbol scene without symbols [{id, state, cause, appearsOn, leavesOn}]`);
      for (const y of sc.symbols ?? []) {
        if (!catalog[y.id]) add('error', `register: ${id} symbol «${y.id}» is not in src/lib/symbols/catalog.json; a new symbol needs the user's choice (decision 39)`);
        const miss = ['state', 'cause', 'appearsOn', 'leavesOn'].filter((k) => !String(y[k] ?? '').trim());
        if (miss.length) add('error', `register: ${id} symbol «${y.id}» misses ${miss.join(', ')} (a symbol shows a cause)`);
        for (const k of ['appearsOn', 'leavesOn']) if (y[k] && beats.size && !beats.has(y[k]) && y[k] !== 'after') add('error', `register: ${id} symbol «${y.id}» ${k} «${y[k]}» is not a beat of this scene (or «after»)`);
      }
      if (sc.interface === 'real' || sc.data) add('error', `register: ${id} shows an interface or data: these stay literal, never symbolic`);
    }
    if (sc.interface === 'real' && sc.mode !== 'literal') add('error', `register: ${id} real interface requires literal mode`);
    if (sc.data && sc.data.plane !== 'frontal') add(sc.data.waiver ? 'warn' : 'error', `data accuracy: ${id} shows measured values on a «${sc.data.plane}» plane; compared values sit on a frontal plate${sc.data.waiver ? ` — waiver: ${sc.data.waiver}` : ''}`);
    if (sc.data?.plane === 'frontal' && !String(sc.data.source ?? '').trim()) add('warn', `data: ${id} plate names no source and date (decision 19)`);
    const loc = sc.location;
    if (!loc) return add('error', `register: ${id} has no location (a real location in every scene, decision 26)`);
    const hub = allow.find((a) => a.location === loc);
    if (hub && !hub.scenes.includes(n)) add('error', `location: «${loc}» is used in scene ${n}, which is not in its allowed list — design a new location`);
    const prev = seen.get(loc);
    if (prev !== undefined && n - prev > 1 && !allow.some((a) => a.location === loc && a.scenes.includes(prev) && a.scenes.includes(n)))
      add('error', `location: «${loc}» reused in scene ${n} after scene ${prev} — design a new location or record the return in locationReuse`);
    seen.set(loc, n);
  });
  // transitions (section 9): six kinds inside a chapter, never twice in a row; a hard cut only between chapters
  {
    const {tsImport} = await import('tsx/esm/api');
    const {transitionProblems} = await tsImport(new URL('../src/lib/transitions.ts', import.meta.url).href, import.meta.url);
    // scene i (from the second) declares `transition`: how the picture arrives from scene i − 1
    const idx = order.map((id, i) => i).filter((i) => i > 0 && scenes[order[i]]?.transition);
    const seq = idx.map((i) => scenes[order[i]].transition);
    const chapters = idx.length ? [scenes[order[idx[0] - 1]]?.chapter ?? 0, ...idx.map((i) => scenes[order[i]]?.chapter ?? 0)] : [];
    for (const p of transitionProblems(seq, chapters)) add('error', `transitions: ${p} (section 9)`);
  }
  // the field (light or dark) belongs to a chapter and changes only on a chapter boundary (decision of 20.11.2026)
  {
    const fieldOf = new Map((reg.chapters ?? []).filter((c) => c.field).map((c) => [c.n, c.field]));
    for (const [n, f] of fieldOf) if (!['light', 'dark'].includes(f)) add('error', `register: chapter ${n} field «${f}» must be light | dark`);
    const seenField = new Map();
    for (const id of order) {
      const sc = scenes[id];
      if (!sc || sc.chapter === undefined) continue;
      const f = sc.dark ? 'dark' : 'light';
      const want = fieldOf.get(sc.chapter) ?? seenField.get(sc.chapter);
      if (want && want !== f) {
        if (fieldOf.has(sc.chapter)) add('error', `register: ${id} is ${f} but chapter ${sc.chapter} is a ${want} chapter: the field changes only between chapters`);
        else add('error', `register: chapter ${sc.chapter} mixes light and dark scenes (${id}); declare \`chapters[].field\` and keep one field per chapter`);
      }
      if (!seenField.has(sc.chapter)) seenField.set(sc.chapter, f);
    }
    const first = order.map((id) => scenes[id]).find((s) => s?.chapter !== undefined);
    const last = [...order].reverse().map((id) => scenes[id]).find((s) => s?.chapter !== undefined);
    if (first && last && !!first.dark !== !!last.dark) add('warn', 'register: the first and the last scene have different fields; the finale returns to the opening field (section 5)');
  }
  // coral: one meaning per topic, any number of coral parts (decision 21)
  const withCoral = Object.entries(scenes).filter(([, v]) => v.coral);
  // the image journal: a mechanism, hero or location of another topic is not used again, unless both are one series
  if (journal) {
    const own = [
      ...Object.entries(mechs).map(([id, m]) => ({kind: 'mechanism', name: m.name ?? id})),
      ...(reg.heroes ?? []).map((h) => ({kind: 'hero', name: h})),
      ...[...new Set(Object.values(scenes).map((v) => v.location).filter(Boolean))].map((l) => ({kind: 'location', name: l})),
    ];
    for (const o of own) {
      const clash = journal.entries.find((e) => e.topic !== TOPIC.slug && e.kind === o.kind && norm(e.name) === norm(o.name) && !(reg.series && e.series === reg.series));
      if (clash) add('error', `journal: ${o.kind} «${o.name}» was already used by «${clash.topic}»; design a new one (or declare the same \`series\`, decision 14)`);
    }
  }
  // sensitive topics (decision 16): the register confirms each rule the gate will check
  const sens = briefField('sensitive');
  if (sens === 'religion') {
    const need = ['noDepiction', 'worshipNotMechanism', 'quotesWithReference', 'opinionsAsOpinions', 'exactArabic', 'restrainedSound', 'noCoralOnHoly'];
    const miss = need.filter((k) => reg.sensitive?.[k] !== true);
    if (miss.length) add('error', `sensitive: religion topic; confirm in the register \`sensitive\`: ${miss.join(', ')} (decision 16)`);
    for (const [id, sc] of Object.entries(scenes)) if (sc.mode === 'mechanism' && sc.about === 'worship') add('error', `sensitive: ${id} turns worship into a mechanism (decision 16)`);
  } else if (sens === 'politics' || sens === 'health') {
    if (reg.sensitive?.sourcesOnScreen !== true) add('error', `sensitive: ${sens} topic; confirm \`sensitive.sourcesOnScreen\` in the register (sources and hedges on screen, decision 16)`);
  }
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
    else if (sm._reviewed[s.id] !== hashOf(s.id)) add('warn', `sound: ${s.id} scene code changed after the sound map was reviewed — re-check sfx reasons and offsets, then run with --stamp-sfx`);
  }
  if (stampSfx) {
    fs.writeFileSync(smFile, JSON.stringify(sm, null, 2) + '\n');
    add('ok', 'sound map stamped as reviewed');
  }
} else add('warn', `sound: ${smFile} not found`);

finish();
