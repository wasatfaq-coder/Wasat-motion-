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
//   or several heroes: {"sets": [{"comp": "...", "frames": [...], ...}, ...], "skip": {"<Comp>": "why it is not a still"}}
//   cover     every composition of the topic in src/Root.tsx (its component imported from ./projects/<slug>/) other
//             than <Slug>Main and <Slug>Cover is a set or a `skip` entry with a reason. A second hero's frames that
//             no spec lists pass pregate unmeasured (root-causes.md, «stills cover»).
//   node scripts/still-check.mjs projects/<slug>/content/stills.json [--keep <dir>]
//   node scripts/still-check.mjs --selftest
// Exit code 1 on any ERROR; WARN lines are advice.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findBrowser} from './lib/browser.mjs';

/** Compositions of topic `slug` in Root.tsx that the spec neither measures nor skips. */
export const uncovered = (rootText, slug, spec) => {
  const names = new Set();
  for (const m of rootText.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/projects\/([^/']+)\//g)) if (m[2] === slug) m[1].split(',').forEach((n) => names.add(n.trim()));
  const ids = [...rootText.matchAll(/<Composition[^>]*?id="([^"]+)"[^>]*?component=\{(\w+)\}/gs)].filter((m) => names.has(m[2])).map((m) => m[1]);
  const listed = new Set([...(spec.sets ?? [spec]).map((s) => s.comp), ...Object.keys(spec.skip ?? {})]);
  return ids.filter((id) => !/(Main|Cover)$/.test(id) && !listed.has(id));
};

if (process.argv.includes('--selftest')) {
  const root = `import {AMain} from './projects/a/Main';\nimport {AStand, AReel} from './projects/a/StandFrames';\nimport {AMotor} from './projects/a/MotorFrames';\nimport {BX} from './projects/b/X';
  <Composition id="AMain" component={AMain} /><Composition id="AStand" component={AStand} /><Composition id="AReel" component={AReel} />
  <Composition id="AMotor" component={AMotor} /><Composition id="BX" component={BX} />`;
  const bad = uncovered(root, 'a', {comp: 'AStand', frames: [0]});
  const good = uncovered(root, 'a', {sets: [{comp: 'AStand'}, {comp: 'AMotor'}], skip: {AReel: 'a reel'}});
  const ok = bad.join() === 'AReel,AMotor' && good.length === 0;
  console.log(ok ? 'selftest ok: an unlisted second hero (AMotor) and reel are caught, a full spec passes' : `selftest FAILED: ${bad} / ${good}`);
  process.exit(ok ? 0 : 1);
}

const specPath = process.argv[2] ?? '';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const slug = specPath.match(/projects\/([^/]+)\/content\//)?.[1];
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
if (slug) {
  const missing = uncovered(fs.readFileSync('src/Root.tsx', 'utf8'), slug, spec);
  for (const id of missing) console.log(`ERROR composition ${id} of topic ${slug} is not measured: add it to ${specPath} as a set (or to "skip" with a reason)`);
  errors += missing.length;
}
for (const set of spec.sets ?? [spec]) for (const f of set.frames) {
  const png = path.join(dir, `${set.comp}-f${f}.png`);
  const args = ['remotion', 'still', 'src/index.ts', set.comp, png, `--frame=${f}`, '--log=error'];
  if (set.props) args.push(`--props=${JSON.stringify(set.props)}`);
  if (browser) args.push(`--browser-executable=${browser}`);
  execFileSync('npx', args, {stdio: 'pipe'});
  const r = JSON.parse(execFileSync('python3', ['-I', '-c', analyse, png], {encoding: 'utf8'}));
  const out = [];
  const err = (m) => (errors++, out.push(`ERROR ${m}`));
  if (set.coral !== false && r.coral < 0.004) err(`no visible coral part (${(r.coral * 100).toFixed(2)} % of the band): the one meaning is missing or tiny`);
  // a tall hero (a loop seen edge-on, a bottle) counts by its height in the working band
  if (set.coral !== false && r.coralW > 0 && r.coralW < (set.heroMinWidth ?? 0.3) * 0.9 && r.coralH < (set.heroMinHeight ?? 0.5)) out.push(`WARN  the coral hero is ${(r.coralW * 100).toFixed(0)} % of the frame width and ${(r.coralH * 100).toFixed(0)} % of the band height; aim ≥ ${(set.heroMinWidth ?? 0.3) * 100} % wide or ≥ ${(set.heroMinHeight ?? 0.5) * 100} % tall (§19.2)`);
  if (r.fade > 0.25) out.push(`WARN  content runs into the graphics band's fade (${(r.fade * 100).toFixed(0)} % of the edge rows): the picture is cut at y ≈ 240 or 1200`);
  if (r.content < 0.18) err(`the working band is ${((1 - r.content) * 100).toFixed(0)} % empty: the object is lost or too small`);
  console.log(`${set.comp} frame ${f}: content ${(r.content * 100).toFixed(0)} %, coral ${(r.coral * 100).toFixed(1)} % (width ${(r.coralW * 100).toFixed(0)} %, height ${(r.coralH * 100).toFixed(0)} %)${out.length ? '\n  ' + out.join('\n  ') : ' — ok'}`);
}
if (!keep) fs.rmSync(dir, {recursive: true, force: true});
process.exitCode = errors ? 1 : 0;
