#!/usr/bin/env node
// Every frame of a range as one strip (MASTER_PROMPT_FINAL §6 ±3 frames, §15 motion): anchors, landings,
// squash/bounce, cuts. 2 fps sheets cannot show these.
//   node scripts/frame-strip.mjs <fromFrame> <toFrame> [out.png] [--comp Main] [--scale 0.3] [--cols 10]
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const [fromArg, toArg, outArg] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));
const from = Number(fromArg);
const to = Number(toArg);
if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) throw new Error('usage: frame-strip.mjs <from> <to> [out.png]');
if (to - from > 180) throw new Error('range too long: use ≤ 180 frames (3 s) per strip');
const out = outArg ?? `out/strips/strip-${from}-${to}.png`;
const scale = Number(arg('scale', '0.3'));
const cols = Number(arg('cols', '10'));
fs.mkdirSync(path.dirname(out), {recursive: true});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-'));
const shell = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(shell) ? shell : null;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comp = await selectComposition({serveUrl, id: arg('comp', 'Main'), browserExecutable});
const files = [];
for (let f = from; f <= to; f++) {
  const file = path.join(tmp, `f${String(f).padStart(5, '0')}.png`);
  await renderStill({composition: comp, serveUrl, output: file, frame: f, scale, browserExecutable});
  files.push(file);
}
execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
c=int(sys.argv[2]); fs=sys.argv[3:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; r=(len(ims)+c-1)//c
s=Image.new('RGB',(w*c,h*r),'white'); d=ImageDraw.Draw(s)
for i,(f,im) in enumerate(zip(fs,ims)):
  x,y=(i%c)*w,(i//c)*h; s.paste(im,(x,y)); d.text((x+6,y+6),f.split('/f')[-1][:-4],fill='black')
s.save(sys.argv[1])`, out, String(cols), ...files]);
fs.rmSync(tmp, {recursive: true, force: true});
console.log(`${out}: frames ${from}–${to} (${files.length})`);
