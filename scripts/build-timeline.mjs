// Builds src/data/timeline.json from content/script.json, public/audio/vo/*.mp3 and content/transcripts/*.json.
// Alignment: dynamic programming over normalized words (tolerates insertions, deletions, substitutions).
// Each word gets a status: verified (matched Whisper word), approximate (interpolated), missing.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const FPS = 60;
const toFrames = (ms) => Math.ceil((ms / 1000) * FPS); // round up so clips are never cut
const FIRST_VOICE_START = 6; // frame 0 is the cover pose; voice starts 0.1 s later
const LAST_TAIL_MS = 500; // ≤ 0.8 s after the last word

const script = JSON.parse(fs.readFileSync('content/script.json', 'utf8'));
const soundMap = fs.existsSync('content/sound-map.json') ? JSON.parse(fs.readFileSync('content/sound-map.json', 'utf8')) : {};

const norm = (w) => w.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
const stripTags = (t) => t.replace(/\[[^\]]+\]/g, ' ');
const wordsOf = (t) => stripTags(t).split(/\s+/).filter((w) => norm(w).length > 0);

const NUM = {'499': 'четыресталевяносто', '10': 'десять', '50': 'пятьдесят'};

const durationMs = (file) =>
  Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString()) * 1000);

const speechSpans = (file) => {
  // non-silent spans from ffmpeg silencedetect
  const log = execFileSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=n=-40dB:d=0.12', '-f', 'null', '-'], {stdio: ['ignore', 'pipe', 'pipe']}).toString() +
    '';
  return log;
};

const mergeTokens = (captions) => {
  const words = [];
  for (const c of captions) {
    const t = c.text;
    if (/^\s/.test(t) || words.length === 0) {
      words.push({text: t.trim(), startMs: c.startMs, endMs: c.endMs});
    } else {
      const last = words[words.length - 1];
      last.text += t;
      last.endMs = c.endMs;
    }
  }
  return words.filter((w) => norm(w.text).length > 0);
};

const sim = (a, b) => {
  a = NUM[a] ?? a;
  b = NUM[b] ?? b;
  if (a === b) return 1;
  // prefix similarity tolerates endings ("всё/все", case endings)
  let k = 0;
  while (k < Math.min(a.length, b.length) && a[k] === b[k]) k++;
  return k / Math.max(a.length, b.length);
};

const align = (scriptWords, asrWords) => {
  const n = scriptWords.length;
  const m = asrWords.length;
  const S = scriptWords.map(norm);
  const A = asrWords.map((w) => norm(w.text));
  const dp = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  const bt = Array.from({length: n + 1}, () => new Array(m + 1).fill(''));
  for (let i = 1; i <= n; i++) {
    dp[i][0] = -i;
    bt[i][0] = 'U';
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = -j;
    bt[0][j] = 'L';
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = sim(S[i - 1], A[j - 1]);
      const diag = dp[i - 1][j - 1] + (s >= 0.6 ? 2 * s : -1);
      const up = dp[i - 1][j] - 1;
      const left = dp[i][j - 1] - 1;
      const best = Math.max(diag, up, left);
      dp[i][j] = best;
      bt[i][j] = best === diag ? (s >= 0.6 ? 'M' : 'X') : best === up ? 'U' : 'L';
    }
  }
  const out = new Array(n).fill(null);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const b = bt[i][j];
    if (b === 'M') {
      out[i - 1] = {...asrWords[j - 1], status: 'verified'};
      i--;
      j--;
    } else if (b === 'X') {
      out[i - 1] = {startMs: asrWords[j - 1].startMs, endMs: asrWords[j - 1].endMs, status: 'approximate'};
      i--;
      j--;
    } else if (b === 'U') {
      i--;
    } else {
      j--;
    }
  }
  return out;
};

const timeline = {fps: FPS, scenes: [], totalFrames: 0};
let cursor = 0;
const report = [];
script.scenes.forEach((scene, si) => {
  const audio = `public/audio/vo/${scene.id}.mp3`;
  const audioMs = durationMs(audio);
  const tr = JSON.parse(fs.readFileSync(`content/transcripts/${scene.id}.json`, 'utf8'));
  const asr = mergeTokens(tr.captions);
  // flatten script words with fragment index
  const words = [];
  scene.fragments.forEach((f, fi) => wordsOf(f.display).forEach((w) => words.push({text: w, fragment: fi})));
  const al = align(words.map((w) => w.text), asr);
  // interpolate unmatched words between matched neighbours; tail words after the last match are spread to audio end
  const lastSpeechMs = audioMs - 150;
  for (let k = 0; k < words.length; k++) {
    if (al[k]) {
      words[k] = {...words[k], ...al[k]};
      continue;
    }
    let p = k - 1;
    while (p >= 0 && !al[p]) p--;
    let q = k + 1;
    while (q < words.length && !al[q]) q++;
    const a = p >= 0 ? al[p].endMs : 0;
    const b = q < words.length ? al[q].startMs : lastSpeechMs;
    const span = q - p;
    const s0 = a + ((b - a) * (k - p - 1)) / (span - 1 || 1);
    const s1 = a + ((b - a) * (k - p)) / (span - 1 || 1);
    words[k] = {...words[k], startMs: Math.round(s0), endMs: Math.round(Math.max(s1, s0 + 120)), status: 'approximate'};
  }
  const voiceStart = si === 0 ? FIRST_VOICE_START : 0;
  const tail = si === script.scenes.length - 1 ? LAST_TAIL_MS : 0;
  const dur = voiceStart + toFrames(audioMs + tail);
  const wf = (ms) => voiceStart + Math.round((ms / 1000) * FPS);
  const used = {};
  const beats = scene.beats.map((b) => {
    const target = norm(b.word);
    used[target] = used[target] ?? 0;
    const idx = words.findIndex((w, k) => norm(w.text) === target && k >= (used[target] || 0));
    const w = words[idx];
    used[target] = idx + 1;
    return {id: b.id, word: b.word, wordIndex: idx, frame: w ? wf(w.startMs) : null, status: w ? w.status : 'missing'};
  });
  const pages = scene.fragments.map((f, fi) => {
    const ws = words.filter((w) => w.fragment === fi);
    return {
      text: f.display,
      startFrame: wf(ws[0].startMs),
      endFrame: wf(ws[ws.length - 1].endMs),
      words: ws.map((w) => ({text: w.text, startFrame: wf(w.startMs), endFrame: wf(w.endMs), status: w.status})),
    };
  });
  const verified = words.filter((w) => w.status === 'verified').length;
  report.push(`${scene.id}: ${verified}/${words.length} verified, beats ${beats.map((b) => `${b.id}:${b.status}`).join(' ')}`);
  timeline.scenes.push({
    id: scene.id,
    from: cursor,
    durationInFrames: dur,
    audio: `audio/vo/${scene.id}.mp3`,
    audioDurationInFrames: toFrames(audioMs),
    voiceStartFrame: voiceStart,
    beats,
    pages,
    sfx: soundMap[scene.id] ?? [],
  });
  cursor += dur;
});
timeline.totalFrames = cursor;
fs.writeFileSync('src/data/timeline.json', JSON.stringify(timeline, null, 1) + '\n');
console.log(report.join('\n'));
console.log('total', cursor, 'frames =', (cursor / FPS).toFixed(2), 's');
