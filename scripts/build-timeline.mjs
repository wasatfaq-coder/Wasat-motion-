// Builds the timeline JSON from <content>/script.json, public/<prefix>/audio/vo/*.mp3 and <content>/transcripts/*.json.
// Alignment: dynamic programming over normalized words (tolerates insertions, deletions, substitutions).
// Each word gets a status: verified (matched Whisper word), approximate (interpolated), missing.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Topic-agnostic: paths come from flags, topic-specific timing from <content>/timing.json.
//   node scripts/build-timeline.mjs                       (root topic: content/, public/, src/data/timeline.json)
//   node scripts/build-timeline.mjs --content projects/<slug>/content --public-prefix <slug> --out src/projects/<slug>/data/timeline.json
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const CONTENT = arg('content', 'content');
const PREFIX = arg('public-prefix', ''); // sub-folder of public/ that holds audio/vo for this topic
const OUT = arg('out', 'src/data/timeline.json');
const pub = (rel) => (PREFIX ? `${PREFIX}/${rel}` : rel); // path as Remotion staticFile() sees it

const FPS = 60;
const toFrames = (ms) => Math.ceil((ms / 1000) * FPS); // round up so clips are never cut
const timingFile = path.join(CONTENT, 'timing.json');
const timing = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : {};
const FIRST_VOICE_START = timing.firstVoiceStartFrames ?? 6; // frame 0 is the cover pose; voice starts a little later
const LAST_TAIL_MS = timing.lastTailMs ?? 300; // ≤ 0.8 s after the last word
// Silence inserted inside a voice file after a given word (the audio is split into two segments, nothing is regenerated).
const PAUSES = timing.pauses ?? {};
// Extra hold after the voice (frames), e.g. to let the main transformation settle.
const EXTRA_TAIL = timing.extraTailFrames ?? {};
// Spoken forms of digits used in the script, for alignment with the recognised speech.
const NUM = timing.spokenNumbers ?? {};

const script = JSON.parse(fs.readFileSync(path.join(CONTENT, 'script.json'), 'utf8'));
const smFile = path.join(CONTENT, 'sound-map.json');
const soundMap = fs.existsSync(smFile) ? JSON.parse(fs.readFileSync(smFile, 'utf8')) : {};
// Leading silence of each shared sfx file in frames (a property of the file, shared by all topics).
const LEAD = JSON.parse(fs.readFileSync('scripts/sfx-lead.json', 'utf8'));

const norm = (w) => w.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
const stripTags = (t) => t.replace(/\[[^\]]+\]/g, ' ');
const wordsOf = (t) => stripTags(t).split(/\s+/).filter((w) => norm(w).length > 0);


const durationMs = (file) =>
  Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString()) * 1000);

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
  const audio = path.join('public', pub(`audio/vo/${scene.id}.mp3`));
  const audioMs = durationMs(audio);
  const trPath = path.join(CONTENT, 'transcripts', `${scene.id}.json`);
  const asr = fs.existsSync(trPath) ? mergeTokens(JSON.parse(fs.readFileSync(trPath, 'utf8')).captions) : [];
  // flatten script words with fragment index
  const words = [];
  scene.fragments.forEach((f, fi) => wordsOf(f.display).forEach((w) => words.push({text: w, fragment: fi})));
  const al = align(words.map((w) => w.text), asr);
  // interpolate unmatched words between matched neighbours; tail words after the last match are spread to audio end
  const lastSpeechMs = audioMs - 150;
  for (let k = 0; k < words.length; k++) {
    if (al[k]) {
      words[k] = {...words[k], startMs: al[k].startMs, endMs: al[k].endMs, status: al[k].status};
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
  const pause = PAUSES[scene.id];
  let cutMs = null;
  if (pause) {
    const wi = words.findIndex((x) => x.text === pause.afterWord);
    if (wi < 0 || wi + 1 >= words.length) throw new Error(`pause word ${pause.afterWord} not found in ${scene.id}`);
    // cut in the gap between the words: at the start of the next word minus 30 ms (never inside a word)
    cutMs = Math.max(words[wi].endMs, words[wi + 1].startMs - 30);
  }
  const pauseFrames = pause ? pause.frames : 0;
  const dur = voiceStart + toFrames(audioMs + tail) + pauseFrames + (EXTRA_TAIL[scene.id] ?? 0);
  const wf = (ms) => voiceStart + Math.round((ms / 1000) * FPS) + (cutMs !== null && ms >= cutMs ? pauseFrames : 0);
  const audioSegments = cutMs === null
    ? [{trimBefore: 0, trimAfter: null, startFrame: voiceStart}]
    : [
        {trimBefore: 0, trimAfter: Math.round((cutMs / 1000) * FPS), startFrame: voiceStart},
        {trimBefore: Math.round((cutMs / 1000) * FPS), trimAfter: null, startFrame: voiceStart + Math.round((cutMs / 1000) * FPS) + pauseFrames},
      ];
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
    audio: pub(`audio/vo/${scene.id}.mp3`),
    audioDurationInFrames: toFrames(audioMs),
    voiceStartFrame: voiceStart,
    audioSegments,
    beats,
    pages,
    sfx: (soundMap[scene.id] ?? []).map((e) => {
      const b = beats.find((x) => x.id === e.beat);
      if (!b) throw new Error(`sound-map: ${scene.id} refers to unknown beat «${e.beat}»`);
      return {file: e.file, frame: Math.max(0, b.frame + e.offset - (LEAD[e.file] ?? 0)), volume: e.volume, reason: e.reason};
    }),
  });
  cursor += dur;
});
timeline.totalFrames = cursor;
fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, JSON.stringify(timeline, null, 1) + '\n');
console.log(report.join('\n'));
console.log('total', cursor, 'frames =', (cursor / FPS).toFixed(2), 's');
