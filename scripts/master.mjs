#!/usr/bin/env node
// Master pipeline (MASTER_PROMPT_FINAL §14, §16): render video and audio, two-pass loudnorm to −14 LUFS with a
// true-peak check on the ENCODED AAC (retries with more headroom), format checks, faststart, cover, JSON report.
//
//   node scripts/master.mjs                                   # root topic: Main + Cover, src/data/timeline.json
//   node scripts/master.mjs --comp <Slug>Main --cover <Slug>Cover --timeline src/projects/<slug>/data/timeline.json --out out/<slug>
//   node scripts/master.mjs --skip-render                     # reuse out/master_video.mp4 and out/master_audio.wav
//
// Writes <out>/final.mp4, <out>/cover.png, <out>/master-report.json. Exit code 1 if any check fails.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const COMP = arg('comp', 'Main');
// a topic's cover is <Slug>Cover next to <Slug>Main; its variant is the one the user chose (projects/<slug>/content/cover.json)
const COVER = arg('cover', COMP === 'Main' ? 'Cover' : COMP.replace(/Main$/, 'Cover'));
const TIMELINE = arg('timeline', 'src/data/timeline.json');
const topicSlug = (TIMELINE.match(/src\/projects\/([^/]+)\//) ?? [])[1];
const coverFile = topicSlug ? path.join('projects', topicSlug, 'content', 'cover.json') : null;
const coverChoice = coverFile && fs.existsSync(coverFile) ? JSON.parse(fs.readFileSync(coverFile, 'utf8')) : null;
const COVER_PROPS = arg('cover-props', JSON.stringify({variant: coverChoice?.variant ?? 'a'}));
const OUT = arg('out', 'out');
const CONC = arg('concurrency', String(Math.max(1, os.cpus().length - 1)));
const SKIP = process.argv.includes('--skip-render');
const TARGET = {I: -14, I_TOL: 0.5, TP_MAX: -1.5, LRA: 11};

fs.mkdirSync(OUT, {recursive: true});
const video = path.join(OUT, 'master_video.mp4');
const audio = path.join(OUT, 'master_audio.wav');
const final = path.join(OUT, 'final.mp4');
const cover = path.join(OUT, 'cover.png');
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 26, ...opts});
// ffmpeg prints the loudnorm JSON on stderr
const loudnorm = (input, filter) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', input, '-vn', '-af', filter, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${input}: ${r.stderr.slice(-800)}`);
  const m = r.stderr.match(/\{[^{}]*"target_offset"[^{}]*\}/);
  if (!m) throw new Error(`loudnorm JSON not found for ${input}`);
  return JSON.parse(m[0]);
};

const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const report = {composition: COMP, timeline: TIMELINE, checks: {}, loudness: {}, files: {}};
const check = (name, ok, detail) => {
  report.checks[name] = {ok, detail};
  log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
};

// 1) render
if (!SKIP) {
  log(`render video (${COMP}, concurrency ${CONC})`);
  sh('npx', ['remotion', 'render', 'src/index.ts', COMP, video, '--muted', '--codec=h264', '--crf=16', '--pixel-format=yuv420p', '--color-space=bt709', '--image-format=png', `--concurrency=${CONC}`, '--log=error'], {stdio: 'inherit'});
  log('render audio');
  sh('npx', ['remotion', 'render', 'src/index.ts', COMP, audio, '--codec=wav', `--concurrency=${CONC}`, '--log=error'], {stdio: 'inherit'});
}
for (const f of [video, audio]) if (!fs.existsSync(f)) throw new Error(`missing ${f} (render first or drop --skip-render)`);

// 2) loudness: measure the mix, then encode AAC and re-measure the delivered file; lower the TP target until it passes
const m1 = loudnorm(audio, `loudnorm=I=${TARGET.I}:TP=${TARGET.TP_MAX}:LRA=${TARGET.LRA}:print_format=json`);
report.loudness.mix = {I: +m1.input_i, TP: +m1.input_tp, LRA: +m1.input_lra};
let tp = TARGET.TP_MAX;
let measured = null;
for (let attempt = 1; attempt <= 4; attempt++) {
  const filter = `loudnorm=I=${TARGET.I}:TP=${tp}:LRA=${TARGET.LRA}:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true`;
  sh('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', filter, '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final]);
  const m = loudnorm(final, `loudnorm=I=${TARGET.I}:TP=${TARGET.TP_MAX}:LRA=${TARGET.LRA}:print_format=json`);
  measured = {I: +m.input_i, TP: +m.input_tp, LRA: +m.input_lra, tpTarget: tp, attempt};
  log(`AAC attempt ${attempt}: ${measured.I} LUFS, TP ${measured.TP} dBTP (target TP ${tp})`);
  if (measured.TP <= TARGET.TP_MAX && Math.abs(measured.I - TARGET.I) <= TARGET.I_TOL) break;
  tp = +(tp - 0.4).toFixed(1);
}
report.loudness.final = measured;
check('loudness', Math.abs(measured.I - TARGET.I) <= TARGET.I_TOL, `${measured.I} LUFS (target ${TARGET.I} ± ${TARGET.I_TOL})`);
check('true peak', measured.TP <= TARGET.TP_MAX, `${measured.TP} dBTP (max ${TARGET.TP_MAX}), measured on the AAC`);

// 3) format
const probe = JSON.parse(sh('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', final]));
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const tl = JSON.parse(fs.readFileSync(TIMELINE, 'utf8'));
const expected = tl.totalFrames;
check('video stream', v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.width === 1080 && v.height === 1920, `${v.codec_name} ${v.width}×${v.height} ${v.pix_fmt} ${v.color_space}`);
check('frame rate', v.r_frame_rate === '60/1' && v.avg_frame_rate === '60/1', `r ${v.r_frame_rate}, avg ${v.avg_frame_rate}`);
check('frame count', +v.nb_read_frames === expected, `${v.nb_read_frames} frames (timeline ${expected})`);
check('audio stream', a && a.codec_name === 'aac' && a.sample_rate === '48000' && a.channels === 2, a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : 'missing');
const head = fs.readFileSync(final).subarray(0, 1 << 20);
const moov = head.indexOf('moov');
const mdat = head.indexOf('mdat');
check('faststart', moov >= 0 && (mdat < 0 || moov < mdat), 'moov before mdat');
report.files.final = {path: final, bytes: fs.statSync(final).size, seconds: +probe.format.duration};

// 4) cover
log('render cover');
sh('npx', ['remotion', 'still', 'src/index.ts', COVER, cover, `--props=${COVER_PROPS}`, '--image-format=png', '--log=error']);
report.files.cover = {path: cover, bytes: fs.statSync(cover).size};
check('cover', fs.existsSync(cover), cover);
if (coverChoice && !coverChoice.chosen) {
  report.warnings = [...(report.warnings ?? []), `cover variant ${coverChoice.variant} rendered, but ${coverFile} says the user has not chosen it yet (§19.5)`];
  log(`WARN cover: the user has not chosen a variant yet (${coverFile})`);
}

fs.writeFileSync(path.join(OUT, 'master-report.json'), JSON.stringify(report, null, 2) + '\n');
const failed = Object.entries(report.checks).filter(([, c]) => !c.ok).map(([k]) => k);
log(failed.length ? `FAILED: ${failed.join(', ')}` : `OK: ${final} (${(report.files.final.bytes / 1e6).toFixed(1)} MB, ${report.files.final.seconds} s)`);
process.exit(failed.length ? 1 : 0);
