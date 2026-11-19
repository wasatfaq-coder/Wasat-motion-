#!/usr/bin/env node
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

// one browser lookup (scripts/lib/browser.mjs): a script with its own copy pinned a version path that stopped matching
for (const f of fs.readdirSync('scripts').filter((n) => n.endsWith('.mjs')))
  if (fs.readFileSync(path.join('scripts', f), 'utf8').includes('/opt/pw-' + 'browsers')) fail(`scripts/${f} names the browser directory itself; use findBrowser() from scripts/lib/browser.mjs`);

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
