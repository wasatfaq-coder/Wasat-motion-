// Voice cache: key = sha256 of normalized tts text + voice + model + output params.
// Usage: node scripts/vo-cache.mjs            -> lists scenes whose audio is missing or stale
//        node scripts/vo-cache.mjs record <id> <generationId> -> records a downloaded file
import fs from 'node:fs';
import crypto from 'node:crypto';

const brief = fs.readFileSync('brief.yaml', 'utf8');
const voiceId = brief.match(/^voice_id:\s*(\S+)/m)[1];
const model = brief.match(/^voice_model:\s*(\S+)/m)[1];
const script = JSON.parse(fs.readFileSync('content/script.json', 'utf8'));
const assetsPath = 'content/assets.json';
const assets = fs.existsSync(assetsPath) ? JSON.parse(fs.readFileSync(assetsPath, 'utf8')) : {vo: {}, sfx: {}};

const ttsOf = (s) => s.fragments.map((f) => f.tts).join(' ').replace(/\s+/g, ' ').trim();
const keyOf = (s) => crypto.createHash('sha256')
  .update(JSON.stringify({text: ttsOf(s), voiceId, model, format: 'mp3_44100', takes: 1}))
  .digest('hex');

const [cmd, id, gen] = process.argv.slice(2);
if (cmd === 'record') {
  const s = script.scenes.find((x) => x.id === id);
  const file = `public/audio/vo/${id}.mp3`;
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
