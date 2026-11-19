#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
// Regressions for the P0 text gate and the phone-size preview.
//   «в» on screen for 0.02 s must fail check-text; a correct page must pass.
//   A correct root timeline passes audit --only captions. The same audit with a
//   topic's scenes and a defective --timeline must fail, because audit forwards
//   that path to check-text as an argv array.
//   When ffmpeg is on PATH, a black clip and a flat clip produce open notes.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fails = [];
const fail = (msg) => fails.push(msg);
const run = (args) => {
  try {
    return {code: 0, out: execFileSync(process.execPath, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})};
  } catch (e) {
    return {code: e.status ?? 1, out: `${e.stdout || ''}\n${e.stderr || ''}`};
  }
};
const has = (bin) => {
  try {
    execFileSync('which', [bin], {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
};

// every builder the kit exports is run by a sample (src/samples): code no sample runs is code nobody has seen, and the
// ruler that drew markup without a shape sat in main until the showcase called it (docs/root-causes.md). The mannequin
// (character.ts) has its own guard, scripts/rig-check.mjs.
{
  const kit = JSON.parse(fs.readFileSync('src/lib/catalog.json', 'utf8')).objects;
  const modules = [...new Set(Object.values(kit).filter((e) => e.kind === 'kit' && !e.module.endsWith('character.ts')).map((e) => e.module)), 'src/lib/transitions.ts', 'src/lib/scale.tsx', 'src/theme/materials.ts'];
  const extra = fs.readdirSync('src/lib/primitives').map((f) => `src/lib/primitives/${f}`).concat(fs.readdirSync('src/lib/symbols').filter((f) => f.endsWith('.ts')).map((f) => `src/lib/symbols/${f}`));
  const walk = (d) => fs.readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
  const samples = walk('src/samples').map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const m of [...new Set([...modules, ...extra])]) {
    if (!fs.existsSync(m) || !/\.tsx?$/.test(m) || m.endsWith('index.ts')) continue;
    for (const [, name] of fs.readFileSync(m, 'utf8').matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm))
      if (!new RegExp(`\\b${name}\\b`).test(samples)) fail(`${m}: ${name} is exported but no sample in src/samples runs it; call it in src/samples/UniversalKitSample.tsx`);
  }
}

// every symbol names the state it is shown in (a closed hatch read as plain floor on the showcase)
for (const [id, row] of Object.entries(JSON.parse(fs.readFileSync('src/lib/symbols/catalog.json', 'utf8')).symbols))
  if (typeof row.show !== 'number' || !String(row.showWhy ?? '').trim()) fail(`src/lib/symbols/catalog.json: «${id}» has no show state with showWhy`);

// the gate hook blocks an image the shorts-quality-gate has not passed, and lets it through once stamped
{
  const img = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gate-')), 'frame.png');
  fs.writeFileSync(img, Buffer.from(`not-a-real-png-${Date.now()}`));
  const hook = (env) => spawnSync(process.execPath, ['.claude/hooks/require-gate.mjs'], {input: JSON.stringify({tool_input: {files: [img]}}), encoding: 'utf8', env: {...process.env, ...env}});
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-root-'));
  fs.mkdirSync(path.join(tmpRoot, '.claude'));
  if (hook({CLAUDE_PROJECT_DIR: tmpRoot}).status !== 2) fail('require-gate: an unstamped image was not blocked');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(img)).digest('hex');
  fs.writeFileSync(path.join(tmpRoot, '.claude', 'gate-pass.json'), JSON.stringify({[sha]: {verdict: 'PASS'}}));
  if (hook({CLAUDE_PROJECT_DIR: tmpRoot}).status !== 0) fail('require-gate: a stamped image was blocked');
}

// a script CI runs must not need python3 (the runner has no Pillow; style-check failed only in CI): every
// `node scripts/…` step of the workflow, and the scripts/lib modules it imports, stays plain Node
{
  const wf = fs.readFileSync('.github/workflows/audit.yml', 'utf8');
  const steps = [...new Set([...wf.matchAll(/node (scripts\/[\w./-]+\.mjs)/g)].map((m) => m[1]))];
  const seen = new Set();
  const visit = (f) => {
    if (seen.has(f) || !fs.existsSync(f)) return;
    seen.add(f);
    const code = fs.readFileSync(f, 'utf8');
    if (/['"]python3?['"]/.test(code)) fail(`${f} runs python in CI; use plain Node (scripts/lib/png.mjs for images)`);
    for (const m of code.matchAll(/from '\.\/(lib\/[\w.-]+\.mjs)'/g)) visit(path.join('scripts', m[1]));
  };
  steps.forEach(visit);
}

// one browser lookup (scripts/lib/browser.mjs): a script with its own copy pinned a version path that stopped matching
for (const f of fs.readdirSync('scripts').filter((n) => n.endsWith('.mjs')))
  if (fs.readFileSync(path.join('scripts', f), 'utf8').includes('/opt/pw-' + 'browsers')) fail(`scripts/${f} names the browser directory itself; use findBrowser() from scripts/lib/browser.mjs`);

// the frame checks of style-check / still-check bite on broken frames (a tiny hero, a part outside the safe rect, a
// body cut by the band's fade, two or no coral meanings) and pass a clean one
for (const m of (await import('./lib/frame-checks.mjs')).selftest()) fail(m);
// the audit rule against markup glued to an Assembly picture as a string bites on broken code and passes clean code
for (const m of (await import('./lib/code-rules.mjs')).selftest()) fail(m);
// a nested scale model may stand on a solid of the outer level, never inside one (the bowl stood in a glass)
{
  const {tsImport} = await import('tsx/esm/api');
  const {intrusions} = await tsImport(new URL('../src/lib/scale.tsx', import.meta.url).href, import.meta.url);
  const glass = [[[0, 0, 0], [2, 2, 3]]];
  if (!intrusions([[0.5, 0.5, 1], [1, 1, 1]], glass).length) fail('scale: a model inside a solid was not caught (intrusions)');
  if (intrusions([[0.5, 0.5, 3], [1, 1, 1]], glass).length) fail('scale: a model standing on a solid was refused (intrusions)');
}
// svgFaded: parts of several fade layers each end at their own opacity (later pictures used to wash earlier ones out)
{
  const {tsImport} = await import('tsx/esm/api');
  const {layerAlphas} = await tsImport(new URL('../src/lib/assembly.ts', import.meta.url).href, import.meta.url);
  const o = [0.98, 0.87, 0.6, 0.44];
  const a = layerAlphas(o);
  o.forEach((oj, j) => {
    const shown = 1 - a.slice(j).reduce((p, ak) => p * (1 - ak), 1);
    if (Math.abs(shown - oj) > 1e-9) fail(`assembly: svgFaded layer ${j} ends at ${shown.toFixed(3)}, not its opacity ${oj}`);
  });
}
// a cutaway that would remove most of an object is refused (it left one wall and a hanging bar)
{
  const {tsImport} = await import('tsx/esm/api');
  const {cutaway} = await tsImport(new URL('../src/lib/transitions.ts', import.meta.url).href, import.meta.url);
  const {LAB} = await tsImport(new URL('../src/samples/kit/nature.parts.ts', import.meta.url).href, import.meta.url);
  let refused = false;
  try {
    cutaway(LAB, [1, 0, 0], 0, 0, 1);
  } catch {
    refused = true;
  }
  if (!refused) fail('transitions: a cutaway through the whole object was not refused');
}
// camFitSvg frames by the drawn points only: markup under a transform (a screen interface) is in its own pixel space
{
  const {tsImport} = await import('tsx/esm/api');
  const {svgPoints} = await tsImport(new URL('../src/lib/camera.tsx', import.meta.url).href, import.meta.url);
  const pts = svgPoints('<path d="M0 0L10 10Z"/><g transform="matrix(1,0,0,1,0,0)"><path d="M600 900L700 900"/></g>');
  if (pts.length !== 2) fail(`camera: svgPoints counted markup under a transform (${pts.length} points, expected 2)`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wasat-regress-'));
const bad = path.join(dir, 'bad.json');
const good = path.join(dir, 'good.json');
fs.writeFileSync(bad, JSON.stringify({fps: 50, scenes: [{id: 'scene-1', durationInFrames: 1, pages: [{text: 'смотри в', startFrame: 0}]}]}));
fs.writeFileSync(good, JSON.stringify({fps: 60, scenes: [{id: 'scene-1', durationInFrames: 180, pages: [{text: 'время течёт ровно', startFrame: 0}]}]}));

const badText = run(['scripts/check-text.mjs', '--timeline', bad]);
if (badText.code === 0) fail('check-text: страница «в» на 0,02 с должна завершаться с ненулевым кодом');
if (!/ends with "в"/.test(badText.out) || !/0\.02/.test(badText.out)) fail(`check-text: в выводе нет зависающего «в» или 0.02 с\n${badText.out}`);

const goodText = run(['scripts/check-text.mjs', '--timeline', good]);
if (goodText.code !== 0) fail(`check-text: верный пример должен проходить\n${goodText.out}`);

const missing = run(['scripts/check-text.mjs', '--timeline', path.join(dir, 'no-such.json')]);
if (missing.code === 0) fail('check-text: отсутствующий таймлайн должен завершаться с ошибкой');

const root = run(['scripts/audit.mjs', '--only', 'captions']);
if (root.code !== 0) fail(`audit --only captions: корневой таймлайн должен проходить\n${root.out.slice(-600)}`);

const topicArgs = ['scripts/audit.mjs', '--only', 'captions', '--scenes', 'src/projects/elektromotor/scenes', '--content', 'projects/elektromotor/content'];
const topicBad = run([...topicArgs, '--timeline', bad]);
if (topicBad.code === 0) fail('audit темы с дефектным --timeline должен завершаться с ошибкой');
if (!/ends with "в"/.test(topicBad.out)) fail(`audit не передал дефектный таймлайн в check-text\n${topicBad.out.slice(-800)}`);

const topicGood = run([...topicArgs, '--timeline', 'src/projects/elektromotor/data/timeline.json']);
if (topicGood.code !== 0) fail(`audit темы с её таймлайном должен проходить проверку субтитров\n${topicGood.out.slice(-600)}`);

if (!has('ffmpeg') || !has('ffprobe')) {
  console.log('review-video: ffmpeg не найден, регрессия превью пропущена');
} else {
  const clip = (name, color) => {
    const file = path.join(dir, name);
    execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=64x64:r=10:d=0.3`, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', file], {stdio: 'ignore'});
    return file;
  };
  const blackDir = path.join(dir, 'black-review');
  fs.mkdirSync(blackDir);
  fs.writeFileSync(path.join(blackDir, 'notes.json'), JSON.stringify([{id: 'keep', status: 'verified', text: 'не трогать', severity: 'MINOR', rule: '§15', fix: '-', scene: '-', frame: '-', round: 1}], null, 2));
  const blackRun = run(['scripts/review-video.mjs', clip('black.mp4', 'black'), blackDir]);
  if (blackRun.code !== 0) fail(`review-video на чёрном ролике упал\n${blackRun.out.slice(-800)}`);
  const blackNotes = JSON.parse(fs.readFileSync(path.join(blackDir, 'notes.json'), 'utf8'));
  if (!Array.isArray(blackNotes)) fail('review-video переписал массив notes.json объектом');
  if (!blackNotes.some((n) => n.id === 'keep' && n.status === 'verified')) fail('review-video затёр уже проверенное замечание');
  const opened = blackNotes.filter((n) => String(n.id).startsWith('RV-') && n.status === 'open');
  if (!opened.length) fail('review-video не записал открытое замечание о чёрном кадре');
  if (!opened.every((n) => n.version && n.evidence)) fail('у замечания нет версии файла и ссылки на доказательство');
  const report = JSON.parse(fs.readFileSync(path.join(blackDir, 'video-review.json'), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(report.sha256) || report.checks.nearBlackFrames < 1) fail(`video-review.json без хеша или без чёрных кадров: ${JSON.stringify(report.checks)}`);
  if (!fs.existsSync(path.join(blackDir, 'preview-360x640.mp4'))) fail('превью 360×640 не создано');

  const grayDir = path.join(dir, 'gray-review');
  const grayRun = run(['scripts/review-video.mjs', clip('gray.mp4', '0x808080'), grayDir]);
  if (grayRun.code !== 0) fail(`review-video на пустом сером ролике упал\n${grayRun.out.slice(-800)}`);
  const grayReport = JSON.parse(fs.readFileSync(path.join(grayDir, 'video-review.json'), 'utf8'));
  if (grayReport.checks.nearBlackFrames !== 0 || grayReport.checks.emptyFrames < 1) fail(`серый кадр должен быть пустым, не чёрным: ${JSON.stringify(grayReport.checks)}`);
  const grayNotes = JSON.parse(fs.readFileSync(path.join(grayDir, 'notes.json'), 'utf8'));
  if (!grayNotes.notes?.some((n) => n.status === 'open' && n.id.includes('-e-'))) fail('пустое замечание не записано в объект notes.json');

  const live = path.join(dir, 'live-review');
  const liveSrc = path.join(dir, 'live.mp4');
  execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=s=64x64:r=10:d=0.3', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', liveSrc], {stdio: 'ignore'});
  const liveRun = run(['scripts/review-video.mjs', liveSrc, live]);
  if (liveRun.code !== 0) fail(`review-video на тестовой картинке упал\n${liveRun.out.slice(-800)}`);
  const liveReport = JSON.parse(fs.readFileSync(path.join(live, 'video-review.json'), 'utf8'));
  if (liveReport.checks.nearBlackFrames !== 0 || liveReport.checks.emptyFrames !== 0) fail(`живая картинка не должна давать чёрные или пустые кадры: ${JSON.stringify(liveReport.checks)}`);
  // the test pattern fills the whole frame, so the motion check rightly notes a crop; black or empty notes are the defect here
  const liveNotesFile = path.join(live, 'notes.json');
  const liveNotes = fs.existsSync(liveNotesFile) ? JSON.parse(fs.readFileSync(liveNotesFile, 'utf8')).notes ?? [] : [];
  if (liveNotes.some((n) => /-(b|e)-/.test(n.id))) fail('review-video записал чёрный или пустой кадр на живой картинке');
  if (!liveReport.checks.motion) fail('review-video не записал строку motion в video-review.json');
}

fs.rmSync(dir, {recursive: true, force: true});
if (fails.length) {
  console.log(fails.join('\n\n'));
  console.log(`regress-checks failed: ${fails.length}`);
  process.exitCode = 1;
} else console.log('regress-checks passed: «в» на 0,02 с падает, верный пример проходит, --timeline темы доходит до check-text, превью отмечает чёрные и пустые кадры');
