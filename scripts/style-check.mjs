#!/usr/bin/env node
// Style test of the house style (MASTER_PROMPT_FINAL §22, §24.4): renders the showcase composition AnatomyUniversal
// (one kit object per frame, src/samples/UniversalKitSample.tsx) and checks every frame twice:
//   drift    against the reference still in styles/anatomy/refs/<comp>-<frame>.png (phone scale 270×480): a change of
//            palette, stroke weight, tone or framing in shared code shows up as changed pixels. Expected changes are
//            accepted with --update (the new stills become the references, reviewed in the PR diff).
//   palette  no saturated colour except the one coral accent: a pixel with saturation > 0.35 must have the coral hue.
//   frame    scripts/lib/frame-checks.mjs on the full frame: the drawn content fills the safe rect, nothing outside it
//            (unless the page declares `bleed`), exactly one visible coral region (unless `coral: 'none: …'`). The
//            references were taken from frames with exactly these defects, so drift alone passed them (gate round 1).
// Root cause it guards (docs/root-causes.md): a change in src/lib or src/theme altered the look of every object, and
// nothing compared pictures, so it was found by eye one topic later.
//   node scripts/style-check.mjs [--comp AnatomyUniversal] [--frames 15] [--update] [--keep <dir>]
// Exit code 1 on drift or a foreign colour. Needs only a browser for Remotion stills (PNG work is plain Node).
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';
import {findBrowser} from './lib/browser.mjs';
import {readPng, shrink, writePng} from './lib/png.mjs';
import {checkFrame} from './lib/frame-checks.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const comp = arg('comp', 'AnatomyUniversal');
// the page count comes from the showcase itself (a hard-coded count missed every page added later)
const KIT = comp === 'AnatomyUniversal' ? (await tsImport(pathToFileURL(path.resolve('src/samples/UniversalKitSample.tsx')).href, import.meta.url)).KIT_PAGES : null;
const pages = KIT ? KIT.length : 1;
const frames = Number(arg('frames', String(pages)));
const update = args.includes('--update');
const keep = arg('keep', null);
const refs = path.join('styles', 'anatomy', 'refs');
const dir = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), 'style-check-'));
fs.mkdirSync(dir, {recursive: true});
fs.mkdirSync(refs, {recursive: true});
const browser = findBrowser();

// hue of a pixel in degrees and its saturation/value (HSV), for the foreign-colour test
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return {h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx / 255};
};
const measure = (png, refFile, smallFile) => {
  const img = readPng(png);
  const small = shrink(img, 4);
  writePng(smallFile, small);
  let n = 0;
  let bad = 0;
  for (let y = 0; y < img.height; y += 3)
    for (let x = 0; x < img.width; x += 3) {
      const i = (y * img.width + x) * 3;
      const c = hsv(img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]);
      n++;
      // saturated pixels must be coral (hue ~7°); anti-aliased edges are light or grey, not saturated
      if (c.s > 0.35 && c.v > 0.25 && !(c.h < 22 || c.h > 350)) bad++;
    }
  const out = {foreign: bad / n, changed: null};
  if (refFile) {
    const ref = readPng(refFile);
    if (ref.width !== small.width || ref.height !== small.height) return {...out, changed: 1};
    let diff = 0;
    for (let i = 0; i < small.width * small.height; i++) {
      const d = Math.abs(small.rgb[i * 3] - ref.rgb[i * 3]) + Math.abs(small.rgb[i * 3 + 1] - ref.rgb[i * 3 + 1]) + Math.abs(small.rgb[i * 3 + 2] - ref.rgb[i * 3 + 2]);
      if (d > 60) diff++;
    }
    out.changed = diff / (small.width * small.height);
  }
  return out;
};

let errors = 0;
for (let f = 0; f < frames; f++) {
  const png = path.join(dir, `f${f}.png`);
  const cli = ['remotion', 'still', 'src/index.ts', comp, png, `--frame=${f}`, '--log=error'];
  if (browser) cli.push(`--browser-executable=${browser}`);
  execFileSync('npx', cli, {stdio: 'pipe'});
  const ref = path.join(refs, `${comp}-${f}.png`);
  const small = path.join(dir, `s${f}.png`);
  const r = measure(png, !update && fs.existsSync(ref) ? ref : null, small);
  const notes = [];
  const page = KIT?.[f];
  const fc = checkFrame(readPng(png), {coral: page?.coral?.startsWith('none') ? page.coral : true, bleed: page?.bleed ?? null});
  for (const e of fc.errors) (errors++, notes.push(`ERROR ${page ? page.id + ': ' : ''}${e}`));
  if (r.foreign > 0.0005) (errors++, notes.push(`ERROR ${(r.foreign * 100).toFixed(2)} % saturated pixels that are not coral: a colour outside the palette (§22.1)`));
  if (update || !fs.existsSync(ref)) {
    fs.copyFileSync(small, ref);
    notes.push(`reference ${update ? 'updated' : 'created'}: ${ref}`);
  } else if (r.changed > 0.004) (errors++, notes.push(`ERROR ${(r.changed * 100).toFixed(2)} % of the phone-size frame changed against ${ref}: if the change is intended, run with --update and review the stills in the PR`));
  console.log(`${comp} frame ${f}: foreign ${(r.foreign * 100).toFixed(3)} %${r.changed === null ? '' : `, changed ${(r.changed * 100).toFixed(2)} %`}${notes.length ? '\n  ' + notes.join('\n  ') : ' — ok'}`);
}
if (!keep) fs.rmSync(dir, {recursive: true, force: true});
process.exitCode = errors ? 1 : 0;
