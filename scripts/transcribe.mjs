// Transcribes public/audio/vo/<scene>.mp3 with whisper.cpp; writes content/transcripts/<scene>.json
// Usage: node scripts/transcribe.mjs scene-01 [scene-02 ...]   (no args = all voiced scenes)
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {transcribe, toCaptions} from '@remotion/install-whisper-cpp';

const whisperPath = path.join(process.cwd(), 'whisper.cpp');
const outDir = 'content/transcripts';
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync('out/wav', {recursive: true});
let ids = process.argv.slice(2);
if (!ids.length) ids = fs.readdirSync('public/audio/vo').filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4));
for (const id of ids) {
  const wav = path.resolve(`out/wav/${id}.wav`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `public/audio/vo/${id}.mp3`, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const res = await transcribe({
    inputPath: wav, whisperPath, whisperCppVersion: '1.5.5', model: 'large-v3',
    tokenLevelTimestamps: true, language: 'ru', printOutput: false,
    // whisper.cpp 1.5.5 does not accept a value after --split-on-word, so it is not passed.
  });
  const {captions} = toCaptions({whisperCppOutput: res});
  fs.writeFileSync(`${outDir}/${id}.json`, JSON.stringify({id, captions}, null, 2) + '\n');
  console.log(id, captions.map((c) => c.text).join('').trim());
}
