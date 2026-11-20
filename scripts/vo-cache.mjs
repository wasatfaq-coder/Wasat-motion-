// Voice cache of one topic: key = sha256 of normalized tts text + voice + model + output params.
// Usage: node scripts/vo-cache.mjs --topic <slug>                        -> scenes whose audio is missing or stale
//        node scripts/vo-cache.mjs --topic <slug> record <id> <generationId> -> records a downloaded file
// Voice settings come from projects/<slug>/content/brief.yaml; the record lives in projects/<slug>/content/assets.json.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {requireTopic} from './lib/topic.mjs';

const T = requireTopic('vo-cache');
const brief = fs.readFileSync(path.join(T.content, 'brief.yaml'), 'utf8');
const field = (k) => (brief.match(new RegExp(`^${k}:\\s*(\\S+)`, 'm')) ?? [])[1];
const voiceId = field('voice_id');
const model = field('voice_model');
const script = JSON.parse(fs.readFileSync(path.join(T.content, 'script.json'), 'utf8'));
const assetsPath = path.join(T.content, 'assets.json');
const assets = fs.existsSync(assetsPath) ? JSON.parse(fs.readFileSync(assetsPath, 'utf8')) : {vo: {}};
assets.vo = assets.vo ?? {};

const ttsOf = (s) => s.fragments.map((f) => f.tts).join(' ').replace(/\s+/g, ' ').trim();
const keyOf = (s) => crypto.createHash('sha256').update(JSON.stringify({text: ttsOf(s), voiceId, model, format: 'mp3_44100', takes: 1})).digest('hex');

const pos = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));
const [cmd, id, gen] = pos;
if (cmd === 'record') {
  const s = script.scenes.find((x) => x.id === id);
  const file = path.join('public', T.prefix, 'audio', 'vo', `${id}.mp3`);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assets.vo[id] = {file, key: keyOf(s), text: ttsOf(s), voiceId, model, generationId: gen, sha256: sha};
  fs.writeFileSync(assetsPath, JSON.stringify(assets, null, 2) + '\n');
  console.log('recorded', id);
} else {
  for (const s of script.scenes) {
    const a = assets.vo[s.id];
    const ok = a && a.key === keyOf(s) && fs.existsSync(a.file);
    console.log(s.id, ok ? 'cached' : 'NEEDS VOICE', ttsOf(s).length, 'chars');
  }
}
