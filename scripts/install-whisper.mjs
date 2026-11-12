// Installs whisper.cpp and the large-v3 model into ./whisper.cpp (git-ignored). Idempotent.
// Node fetch ignores the sandbox HTTPS proxy, so the model is fetched with curl.
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {installWhisperCpp} from '@remotion/install-whisper-cpp';

const to = path.join(process.cwd(), 'whisper.cpp');
await installWhisperCpp({to, version: '1.5.5'});
const model = path.join(to, 'ggml-large-v3.bin');
if (!fs.existsSync(model) || fs.statSync(model).size < 1e9) {
  execFileSync('curl', ['-sSL', '--retry', '4', '-o', model,
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin'], {stdio: 'inherit'});
}
console.log('whisper ready in', to);
