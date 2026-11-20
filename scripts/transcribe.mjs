// Transcribes the voice files of a topic with whisper.cpp; writes <content>/transcripts/<scene>.json
// Usage: node scripts/transcribe.mjs [scene-01 ...] --topic <slug>   (no scene ids = all voiced scenes)
// Root cause of a dropped last phrase («Как так?» of scene 07, found by scripts/vo-check.mjs): whisper loses the words
// at the very end of a file that stops right after the last sound. Each file gets PAD_MS of silence appended before
// recognition. Nothing is added at the start (a leading pad moved the first word's timestamps), so all times still
// belong to the original file.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {transcribe, toCaptions} from '@remotion/install-whisper-cpp';
import {requireTopic} from './lib/topic.mjs';

const PAD_MS = 600;
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const TOPIC = requireTopic('transcribe');
const content = TOPIC.content;
const prefix = TOPIC.prefix;
const voDir = path.join('public', prefix, 'audio/vo');
const whisperPath = path.join(process.cwd(), 'whisper.cpp');
const outDir = path.join(content, 'transcripts');
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync('out/wav', {recursive: true});
const flagValues = new Set(['--topic', '--content', '--public-prefix']);
let ids = argv.filter((a, i) => !a.startsWith('--') && !flagValues.has(argv[i - 1]));
if (!ids.length) ids = fs.readdirSync(voDir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4));
for (const id of ids) {
  const wav = path.resolve(`out/wav/${id}.wav`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(voDir, `${id}.mp3`), '-af', `apad=pad_dur=${PAD_MS / 1000}`, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const res = await transcribe({
    inputPath: wav, whisperPath, whisperCppVersion: '1.5.5', model: 'large-v3',
    tokenLevelTimestamps: true, language: 'ru', printOutput: false,
    // whisper.cpp 1.5.5 does not accept a value after --split-on-word, so it is not passed.
  });
  const {captions} = toCaptions({whisperCppOutput: res});
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify({id, captions}, null, 2) + '\n');
  console.log(id, captions.map((c) => c.text).join('').trim());
}
