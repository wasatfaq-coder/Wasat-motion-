#!/usr/bin/env node
// Phone-size review of an exported master (MASTER_PROMPT_FINAL §22.5).
//   node scripts/review-video.mjs <master.mp4> <review-directory>
// Writes preview-360x640.mp4, video-review.json (SHA-256 of the source, frame count)
// and frame-findings.txt. Near-black frames (blackframe ≥ 98 % at threshold 24) and
// flat empty frames (luma range ≤ 2, and not already near-black) become notes in
// <review-directory>/notes.json. Existing notes are kept. Status stays in
// open | fixed | verified | wontfix | escalate. A verified or wontfix note with the
// same id is not reopened. fixed means the fix is waiting for another check.
// Decode or frame-count failure exits 1. Found frames are recorded and do not by
// themselves fail the process: the note stays open for a person to judge.
// Motion (scripts/motion-check.mjs, pixel layer): the picture cut by a frame edge or by the end of the graphics band,
// the picture filling too little of the band or sitting in its top/bottom part, pops and jumps, and with --loop a
// last frame that does not lead into the first. Scene cuts are not pops: pass --timeline <timeline.json> (scene
// starts become cuts) or --cuts a,b. A reel without captions passes --no-captions.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

const NOTE_DOC =
  'Review notes tracker (shorts-quality-gate): {id, round, scene, frame, severity, rule, text, fix, status}. Status: open | fixed | verified | wontfix | escalate. verified stores evidence and the checked file version (sha256). fixed waits for a re-check.';
const MAX_NOTES = 8;

const argv = process.argv.slice(2).filter((a) => a !== '--');
const optOf = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const [source, out] = argv.filter((a, i) => !a.startsWith('--') && !['--timeline', '--cuts'].includes(argv[i - 1]));
if (!source || !out) {
  console.error('Usage: node scripts/review-video.mjs <master.mp4> <review-directory>');
  process.exit(1);
}

const input = resolve(source);
const outDir = resolve(out);
const preview = join(outDir, 'preview-360x640.mp4');
if (!existsSync(input)) {
  console.error(`review-video: source not found: ${input}`);
  process.exit(1);
}
if (input === preview) {
  console.error('review-video: the source must be the exported master MP4');
  process.exit(1);
}
await mkdir(outDir, {recursive: true});

const hash = createHash('sha256');
for await (const chunk of createReadStream(input)) hash.update(chunk);
const sha256 = hash.digest('hex');

const frameCount = (file) => {
  const text = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'default=noprint_wrappers=1:nokey=1', file],
    {encoding: 'utf8'},
  ).trim();
  return Number(text);
};

const findingsName = 'frame-findings.txt';
try {
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-v', 'error', '-xerror', '-y', '-i', input,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', `scale=360:640:flags=lanczos,blackframe=amount=98:threshold=24,signalstats,metadata=mode=print:file=${findingsName}`,
      '-fps_mode', 'passthrough', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy',
      'preview-360x640.mp4',
    ],
    {cwd: outDir, stdio: ['ignore', 'ignore', 'pipe']},
  );
} catch (e) {
  console.error(String(e.stderr || e.message || e).slice(-1200));
  process.exit(1);
}

let frames;
let previewFrames;
try {
  frames = frameCount(input);
  previewFrames = frameCount(preview);
} catch (e) {
  console.error(`review-video: ffprobe failed: ${e.message}`);
  process.exit(1);
}
if (!Number.isSafeInteger(frames) || frames < 1 || previewFrames !== frames) {
  console.error(`review-video: preview frame count ${previewFrames} differs from the source ${frames}`);
  process.exit(1);
}

const parsed = [];
let cur = null;
const findingsText = await readFile(join(outDir, findingsName), 'utf8').catch(() => '');
for (const line of findingsText.split('\n')) {
  const fr = /^frame:(\d+)\b/.exec(line);
  if (fr) {
    cur = {frame: Number(fr[1]), pblack: null, ymin: null, ymax: null};
    parsed.push(cur);
    continue;
  }
  if (!cur) continue;
  const pb = /lavfi\.blackframe\.pblack=([\d.]+)/.exec(line);
  if (pb) cur.pblack = Number(pb[1]);
  const ymin = /lavfi\.signalstats\.YMIN=([\d.]+)/.exec(line);
  if (ymin) cur.ymin = Number(ymin[1]);
  const ymax = /lavfi\.signalstats\.YMAX=([\d.]+)/.exec(line);
  if (ymax) cur.ymax = Number(ymax[1]);
}
const black = parsed.filter((f) => f.pblack !== null && f.pblack >= 98);
const empty = parsed.filter((f) => f.ymin !== null && f.ymax !== null && f.ymax - f.ymin <= 2 && !(f.pblack >= 98));

const noteFor = (kind, frame, extra) => ({
  id: `RV-${sha256.slice(0, 8)}-${kind}-${frame}`,
  round: 1,
  scene: 'master',
  frame,
  severity: 'BLOCKER',
  rule: '§22.5',
  text:
    kind === 'b'
      ? `Кадр ${frame} почти чёрный${extra}. Это кадр экспортированного файла, не смысловая пауза, пока раскадровка не говорит иное.`
      : `Кадр ${frame} пустой: яркость почти не меняется по кадру${extra}.`,
  fix: 'Открыть этот кадр в превью 360×640 и в мастере. Если это не записанная смысловая пауза, исправить сцену и прогнать review-video ещё раз.',
  status: 'open',
  evidence: findingsName,
  version: sha256,
});

const picked = (list, kind) => {
  const notes = list.slice(0, MAX_NOTES).map((f) => noteFor(kind, f.frame, kind === 'b' ? ` (${f.pblack} % чёрных пикселей)` : ''));
  if (list.length > MAX_NOTES) {
    notes.push({
      id: `RV-${sha256.slice(0, 8)}-${kind}-more`,
      round: 1,
      scene: 'master',
      frame: list[MAX_NOTES].frame,
      severity: 'BLOCKER',
      rule: '§22.5',
      text: `Ещё ${list.length - MAX_NOTES} кадр(ов) того же вида, начиная с ${list[MAX_NOTES].frame}. Всего ${list.length}. Полный список — в ${findingsName}.`,
      fix: 'Разобрать участок в мастере. Одно замечание закрывает весь хвост, когда участок исправлен.',
      status: 'open',
      evidence: findingsName,
      version: sha256,
    });
  }
  return notes;
};
// motion: the same pixel checks the CI selftest proves on broken inputs
const {decode, checkFrames} = await import('./motion-check.mjs');
let cuts = (optOf('cuts') ?? '').split(',').filter(Boolean).map(Number);
if (optOf('timeline')) {
  const tl = JSON.parse(await readFile(resolve(optOf('timeline')), 'utf8'));
  let at = 0;
  cuts = [];
  for (const sc of tl.scenes ?? []) {
    if (at > 0) cuts.push(at);
    at += sc.durationInFrames - (sc.transitionInFrames ?? 0);
  }
}
const motion = checkFrames(decode(input), {loop: argv.includes('--loop'), captions: !argv.includes('--no-captions'), cuts});
const motionNotes = motion.map((m, i) => ({
  id: `RV-${sha256.slice(0, 8)}-m-${m.kind}-${i}`,
  round: 1,
  scene: 'master',
  frame: m.frame,
  severity: 'BLOCKER',
  rule: '§19.3, §22',
  text: `motion-check (${m.kind}): ${m.text}`,
  fix: 'Найти причину в общем коде (camera camFit, depth, motion beatClock), исправить и прогнать node scripts/motion-check.mjs и review-video ещё раз.',
  status: 'open',
  evidence: 'scripts/motion-check.mjs',
  version: sha256,
}));
const fresh = [...picked(black, 'b'), ...picked(empty, 'e'), ...motionNotes];

const notesPath = join(outDir, 'notes.json');
if (fresh.length) {
  let shape = 'object';
  let doc = NOTE_DOC;
  let store = {};
  let notes = [];
  if (existsSync(notesPath)) {
    let raw;
    try {
      raw = JSON.parse(await readFile(notesPath, 'utf8'));
    } catch (e) {
      console.error(`review-video: ${notesPath} is not valid JSON (${e.message}); notes were not overwritten`);
      process.exit(1);
    }
    if (Array.isArray(raw)) {
      shape = 'array';
      notes = raw;
    } else if (raw && typeof raw === 'object') {
      store = raw;
      doc = raw._doc || NOTE_DOC;
      notes = Array.isArray(raw.notes) ? raw.notes : [];
    } else {
      console.error(`review-video: ${notesPath} is not a notes list`);
      process.exit(1);
    }
  }
  for (const note of fresh) {
    const prev = notes.find((n) => n && n.id === note.id);
    if (!prev) {
      notes.push(note);
      continue;
    }
    // fixed waits for a person. verified and wontfix stay closed for this same file hash.
    if (prev.status === 'fixed' || prev.status === 'verified' || prev.status === 'wontfix' || prev.status === 'escalate') continue;
    notes[notes.indexOf(prev)] = {...prev, ...note, status: 'open', round: prev.round ?? 1};
  }
  const body = shape === 'array' ? notes : {...store, _doc: doc, notes};
  await writeFile(notesPath, JSON.stringify(body, null, 2) + '\n');
}

await writeFile(
  join(outDir, 'video-review.json'),
  JSON.stringify(
    {
      source: input,
      sha256,
      preview,
      frames,
      checks: {decode: 'passed', nearBlackFrames: black.length, emptyFrames: empty.length, motion: motion.map((m) => `${m.kind}: ${m.text}`), findings: findingsName},
      visualReview: 'pending',
      viewerReview: 'pending',
      independentReview: 'pending',
    },
    null,
    2,
  ) + '\n',
);
console.log(`review-video: ${frames} frames, sha256 ${sha256.slice(0, 12)}…, near-black ${black.length}, empty ${empty.length}, motion ${motion.length ? motion.map((m) => m.kind).join(', ') : 'clean'}`);
for (const m of motion) console.log(`  motion ${m.kind}: ${m.text}`);
console.log(`preview ${preview}`);
