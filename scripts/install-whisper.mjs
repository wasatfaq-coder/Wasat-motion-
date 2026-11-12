// Installs whisper.cpp and the large-v3 model into ./whisper.cpp (git-ignored). Idempotent.
import path from 'node:path';
import {installWhisperCpp, downloadWhisperModel} from '@remotion/install-whisper-cpp';

const to = path.join(process.cwd(), 'whisper.cpp');
await installWhisperCpp({to, version: '1.5.5'});
await downloadWhisperModel({model: 'large-v3', folder: to});
console.log('whisper ready in', to);
