#!/usr/bin/env node
// Measures style frames BEFORE the quality gate (stills only, no video render). Everything the gate used to find by eye
// and that a number can find first:
//   hero      the coral part (the conductor with current) bounding box: ≥ `heroMinWidth` of the frame width (§19.2)
//   band      content cut by the graphics band's fade (rows 240–290 and 1160–1215): no bright content there
//   empty     the share of the working band that holds nothing (a lost, tiny object)
//   coral     coral area share of the band (the one meaning must be visible)
//   text      type size is not measured here. Floors live in the components: captions TYPE.caption (rule 64–72 px,
//             §19.1), plate labels TYPE.label (rule 40–56 px, §5), chart figures TYPE_FLOOR.figure (32 px) and
//             auxiliary axis labels at least TYPE_FLOOR.auxiliary (26 px) in Frontal.tsx.
// Spec: projects/<slug>/content/stills.json  {"comp": "...", "frames": [0, 1], "coral": true, "heroMinWidth": 0.3}
//   node scripts/still-check.mjs projects/<slug>/content/stills.json [--keep <dir>]
// Exit code 1 on any ERROR; WARN lines are advice.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findBrowser} from './lib/browser.mjs';

const spec = JSON.parse(fs.readFileSync(process.argv[2] ?? '', 'utf8'));
const keep = process.argv.includes('--keep') ? process.argv[process.argv.indexOf('--keep') + 1] : null;
const dir = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), 'still-check-'));
fs.mkdirSync(dir, {recursive: true});
const browser = findBrowser();

const analyse = `
import json, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
W, H = im.size
px = im.load()
BG = (245, 240, 232)
def content(c): return sum(abs(c[i]-BG[i]) for i in range(3)) > 26
def coral(c): return c[0] > 190 and 60 < c[1] < 130 and 40 < c[2] < 110
top, bot = 240, 1170
n = band = cor = 0
xs = []
cx0 = cx1 = cy0 = cy1 = None
fade = 0
for y in range(0, H, 2):
    for x in range(0, W, 2):
        c = px[x, y]
        if top <= y < bot:
            band += 1
            if content(c): n += 1
            if coral(c):
                cor += 1
                cx0 = x if cx0 is None else min(cx0, x); cx1 = x if cx1 is None else max(cx1, x)
                cy0 = y if cy0 is None else min(cy0, y); cy1 = y if cy1 is None else max(cy1, y)
        if (top <= y < top + 50 or bot - 10 <= y < bot + 45) and content(c): fade += 1
print(json.dumps({'content': n / band, 'coral': cor / band, 'coralW': ((cx1 - cx0) / W) if cx0 is not None else 0,
                  'coralH': ((cy1 - cy0) / (bot - top)) if cy0 is not None else 0, 'fade': fade / ((50 + 55) * (W // 2) / 2 * 2 / 2) if True else 0}))
`;

let errors = 0;
for (const f of spec.frames) {
  const png = path.join(dir, `f${f}.png`);
  const args = ['remotion', 'still', 'src/index.ts', spec.comp, png, `--frame=${f}`, '--log=error'];
  if (spec.props) args.push(`--props=${JSON.stringify(spec.props)}`);
  if (browser) args.push(`--browser-executable=${browser}`);
  execFileSync('npx', args, {stdio: 'pipe'});
  const r = JSON.parse(execFileSync('python3', ['-I', '-c', analyse, png], {encoding: 'utf8'}));
  const out = [];
  const err = (m) => (errors++, out.push(`ERROR ${m}`));
  if (spec.coral !== false && r.coral < 0.004) err(`no visible coral part (${(r.coral * 100).toFixed(2)} % of the band): the one meaning is missing or tiny`);
  // a tall hero (a loop seen edge-on, a bottle) counts by its height in the working band
  if (spec.coral !== false && r.coralW > 0 && r.coralW < (spec.heroMinWidth ?? 0.3) * 0.9 && r.coralH < (spec.heroMinHeight ?? 0.5)) out.push(`WARN  the coral hero is ${(r.coralW * 100).toFixed(0)} % of the frame width and ${(r.coralH * 100).toFixed(0)} % of the band height; aim ≥ ${(spec.heroMinWidth ?? 0.3) * 100} % wide or ≥ ${(spec.heroMinHeight ?? 0.5) * 100} % tall (§19.2)`);
  if (r.fade > 0.25) out.push(`WARN  content runs into the graphics band's fade (${(r.fade * 100).toFixed(0)} % of the edge rows): the picture is cut at y ≈ 240 or 1200`);
  if (r.content < 0.18) err(`the working band is ${((1 - r.content) * 100).toFixed(0)} % empty: the object is lost or too small`);
  console.log(`frame ${f}: content ${(r.content * 100).toFixed(0)} %, coral ${(r.coral * 100).toFixed(1)} % (width ${(r.coralW * 100).toFixed(0)} %, height ${(r.coralH * 100).toFixed(0)} %)${out.length ? '\n  ' + out.join('\n  ') : ' — ok'}`);
}
if (!keep) fs.rmSync(dir, {recursive: true, force: true});
process.exitCode = errors ? 1 : 0;
