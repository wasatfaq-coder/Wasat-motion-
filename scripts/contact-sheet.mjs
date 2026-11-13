#!/usr/bin/env node
// Review stills without rendering video (MASTER_PROMPT_FINAL §15, §19.6). Bundles once, then:
//  - <out>/scene-NN.png       2 fps contact sheet per scene (structure, pacing), tiles at --scale (default 0.25)
//  - <out>/key/scene-NN-<beat>.png  one frame per beat at --key-scale (default 0.5): details, faces, labels, colour
// The gate must judge details on key frames, not on the small tiles.
//   node scripts/contact-sheet.mjs <outDir> [--comp Main] [--timeline src/data/timeline.json] [--fps 2] [--scale 0.25] [--key-scale 0.5]
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'out/sheets';
const compId = arg('comp', 'Main');
const timelineFile = arg('timeline', 'src/data/timeline.json');
const perSec = Number(arg('fps', '2'));
const scale = Number(arg('scale', '0.25'));
const keyScale = Number(arg('key-scale', '0.5'));
fs.mkdirSync(path.join(outDir, 'key'), {recursive: true});
const shell = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(shell) ? shell : null;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comp = await selectComposition({serveUrl, id: compId, browserExecutable});
const timeline = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
const step = Math.round(comp.fps / perSec);
const still = (frame, file, s) => renderStill({composition: comp, serveUrl, output: file, frame, scale: s, browserExecutable});
for (const sc of timeline.scenes) {
  const files = [];
  for (let f = sc.from; f < sc.from + sc.durationInFrames; f += step) {
    const file = path.join(outDir, `${sc.id}-f${String(f).padStart(5, '0')}.png`);
    await still(f, file, scale);
    files.push(file);
  }
  for (const b of sc.beats ?? []) if (b.frame !== null) await still(sc.from + b.frame, path.join(outDir, 'key', `${sc.id}-${b.id}.png`), keyScale);
  // tile with python/PIL (6 columns), label each tile with its global frame number
  execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[2:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; c=6; r=(len(ims)+c-1)//c
s=Image.new('RGB',(w*c,h*r),'white'); d=ImageDraw.Draw(s)
for i,(f,im) in enumerate(zip(fs,ims)):
  x,y=(i%c)*w,(i//c)*h; s.paste(im,(x,y)); d.text((x+6,y+6),f.split('-f')[-1][:-4],fill='black')
s.save(sys.argv[1])`, path.join(outDir, `${sc.id}.png`), ...files]);
  console.log(`${sc.id}: ${files.length} frames, ${(sc.beats ?? []).length} key frames`);
}
