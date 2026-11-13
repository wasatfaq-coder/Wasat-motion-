#!/usr/bin/env node
// Contact sheets for the quality gate without rendering video: bundles once, renders stills at N fps
// and tiles them per scene. Usage: node scripts/contact-sheet.mjs <outDir> [composition=Main] [fps=2] [scale=0.25]
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const [outDir = 'out/sheets', compId = 'Main', perSec = '2', scaleArg = '0.25'] = process.argv.slice(2);
const scale = Number(scaleArg);
fs.mkdirSync(outDir, {recursive: true});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comp = await selectComposition({serveUrl, id: compId, browserExecutable: fs.existsSync(browserExecutable) ? browserExecutable : null});
const timeline = JSON.parse(fs.readFileSync('src/data/timeline.json', 'utf8'));
const step = Math.round(comp.fps / Number(perSec));
for (const sc of timeline.scenes) {
  const files = [];
  for (let f = sc.from; f < sc.from + sc.durationInFrames; f += step) {
    const file = path.join(outDir, `${sc.id}-f${String(f).padStart(5, '0')}.png`);
    await renderStill({composition: comp, serveUrl, output: file, frame: f, scale, browserExecutable: fs.existsSync(browserExecutable) ? browserExecutable : null});
    files.push(file);
  }
  // tile with python/PIL (6 columns), label each tile with its frame number
  execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[2:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; c=6; r=(len(ims)+c-1)//c
s=Image.new('RGB',(w*c,h*r),'white'); d=ImageDraw.Draw(s)
for i,(f,im) in enumerate(zip(fs,ims)):
  x,y=(i%c)*w,(i//c)*h; s.paste(im,(x,y)); d.text((x+6,y+6),f.split('-f')[-1][:-4],fill='black')
s.save(sys.argv[1])`, path.join(outDir, `${sc.id}.png`), ...files]);
  console.log(`${sc.id}: ${files.length} frames`);
}
