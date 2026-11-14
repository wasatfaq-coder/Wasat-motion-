#!/usr/bin/env node
// Usage: node scripts/review-video.mjs <master.mp4> <review-directory>
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';

const [source, out] = process.argv.slice(2);
if (!source || !out) throw new Error('Usage: node scripts/review-video.mjs <master.mp4> <review-directory>');

const input = resolve(source);
const preview = join(resolve(out), 'preview-360x640.mp4');
if (input === preview) throw new Error('The source must be the exported master MP4');
await mkdir(out, {recursive: true});

const hash = createHash('sha256');
for await (const chunk of createReadStream(input)) hash.update(chunk);
const frameCount = (file) => Number(execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames',
  '-of', 'default=noprint_wrappers=1:nokey=1', file,
], {encoding: 'utf8'}).trim());

const findings = join(resolve(out), 'frame-findings.txt');
execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-xerror', '-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0?',
  '-vf', 'scale=360:640:flags=lanczos,blackframe=amount=98:threshold=24,metadata=mode=print:key=lavfi.blackframe.pblack:file=frame-findings.txt',
  '-fps_mode', 'passthrough', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', preview], {cwd: resolve(out), stdio: 'inherit'});
const frames = frameCount(input);
if (!Number.isSafeInteger(frames) || frames < 1 || frameCount(preview) !== frames) {
  throw new Error('Preview frame count differs from the source');
}
await writeFile(join(out, 'video-review.json'), JSON.stringify({
  source: input, sha256: hash.digest('hex'), preview, frames,
  checks: {decode: 'passed', nearBlackFrames: findings},
  visualReview: 'pending', viewerReview: 'pending', independentReview: 'pending',
}, null, 2) + '\n');
