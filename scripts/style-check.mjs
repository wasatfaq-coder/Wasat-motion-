#!/usr/bin/env node
// Style test of the house style (MASTER_PROMPT_FINAL §22, §24.4): renders the showcase composition AnatomyUniversal
// (one kit object per frame, src/samples/UniversalKitSample.tsx) and checks every frame twice:
//   drift    against the reference still in styles/anatomy/refs/<comp>-<frame>.png (phone scale 270×480): a change of
//            palette, stroke weight, tone or framing in shared code shows up as changed pixels. Expected changes are
//            accepted with --update (the new stills become the references, reviewed in the PR diff).
//   palette  no saturated colour except the one coral accent: a pixel with saturation > 0.35 must have the coral hue.
// Root cause it guards (docs/root-causes.md): a change in src/lib or src/theme altered the look of every object, and
// nothing compared pictures, so it was found by eye one topic later.
//   node scripts/style-check.mjs [--comp AnatomyUniversal] [--frames 15] [--update] [--keep <dir>]
// Exit code 1 on drift or a foreign colour. Needs a browser (Remotion still) and python3 with Pillow.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findBrowser} from './lib/browser.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const comp = arg('comp', 'AnatomyUniversal');
const frames = Number(arg('frames', '15'));
const update = args.includes('--update');
const keep = arg('keep', null);
const refs = path.join('styles', 'anatomy', 'refs');
const dir = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), 'style-check-'));
fs.mkdirSync(dir, {recursive: true});
fs.mkdirSync(refs, {recursive: true});
const browser = findBrowser();

const compare = `
import json, sys, colorsys
from PIL import Image
new = Image.open(sys.argv[1]).convert('RGB')
small = new.resize((270, 480), Image.LANCZOS)
small.save(sys.argv[3])
out = {'foreign': 0.0, 'changed': None}
# palette: saturated pixels must be coral (hue ~ 7 deg); anti-aliased edges are light or grey, not saturated
W, H = new.size
px = new.load()
n = bad = 0
for y in range(0, H, 3):
    for x in range(0, W, 3):
        r, g, b = [v / 255 for v in px[x, y]]
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        n += 1
        if s > 0.35 and v > 0.25:
            hue = h * 360
            if not (hue < 22 or hue > 350): bad += 1
out['foreign'] = bad / n
if sys.argv[2] != '-':
    ref = Image.open(sys.argv[2]).convert('RGB')
    a, b = small.load(), ref.load()
    diff = 0
    for y in range(480):
        for x in range(270):
            if sum(abs(a[x, y][i] - b[x, y][i]) for i in range(3)) > 60: diff += 1
    out['changed'] = diff / (270 * 480)
print(json.dumps(out))
`;

let errors = 0;
for (let f = 0; f < frames; f++) {
  const png = path.join(dir, `f${f}.png`);
  const cli = ['remotion', 'still', 'src/index.ts', comp, png, `--frame=${f}`, '--log=error'];
  if (browser) cli.push(`--browser-executable=${browser}`);
  execFileSync('npx', cli, {stdio: 'pipe'});
  const ref = path.join(refs, `${comp}-${f}.png`);
  const small = path.join(dir, `s${f}.png`);
  const r = JSON.parse(execFileSync('python3', ['-I', '-c', compare, png, !update && fs.existsSync(ref) ? ref : '-', small], {encoding: 'utf8'}));
  const notes = [];
  if (r.foreign > 0.0005) (errors++, notes.push(`ERROR ${(r.foreign * 100).toFixed(2)} % saturated pixels that are not coral: a colour outside the palette (§22.1)`));
  if (update || !fs.existsSync(ref)) {
    fs.copyFileSync(small, ref);
    notes.push(`reference ${update ? 'updated' : 'created'}: ${ref}`);
  } else if (r.changed > 0.004) (errors++, notes.push(`ERROR ${(r.changed * 100).toFixed(2)} % of the phone-size frame changed against ${ref}: if the change is intended, run with --update and review the stills in the PR`));
  console.log(`${comp} frame ${f}: foreign ${(r.foreign * 100).toFixed(3)} %${r.changed === null ? '' : `, changed ${(r.changed * 100).toFixed(2)} %`}${notes.length ? '\n  ' + notes.join('\n  ') : ' — ok'}`);
}
if (!keep) fs.rmSync(dir, {recursive: true, force: true});
process.exitCode = errors ? 1 : 0;
