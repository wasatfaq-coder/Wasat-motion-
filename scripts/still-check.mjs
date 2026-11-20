#!/usr/bin/env node
// Measures style frames BEFORE the quality gate (stills only, no video render). Everything the gate used to find by eye
// and that a number can find first:
//   hero      the coral part (the conductor with current) bounding box: ≥ `heroMinWidth` of the frame width (§19.2)
//   band      content cut by the graphics band's fade (rows 240–290 and 1160–1215): no bright content there
//   empty     the share of the working band that holds nothing (a lost, tiny object)
//   coral     coral area share of the band (the one meaning must be visible) and the size of its box in pixels
//   text      type size is not measured here. Floors live in the components: captions TYPE.caption (rule 64–72 px,
//             §19.1), plate labels TYPE.label (rule 40–56 px, §5), chart figures TYPE_FLOOR.figure (32 px) and
//             auxiliary axis labels at least TYPE_FLOOR.auxiliary (26 px) in Frontal.tsx.
// Spec: projects/<slug>/content/stills.json, ONE file per topic with every composition that has style frames:
//   {"specs": [{"comp": "...", "frames": [0, 1], "coral": true, "heroMinWidth": 0.3}, …]}   (a single spec object or
//   an array of specs is read too). Per spec:
//   coral        false: no frame is measured for coral (needs `coralNote`); default true
//   coralFrames  the frames that must carry the coral (default: every frame); the others are frames without coral by
//                design (scene before the answer, an inset), listed in `coralNote`
//   coralMin     the coral share of the band a frame needs (default CORAL.share, 0.4 %). A small coral part (one word
//                tile, a chip) may set it lower, never below CORAL.floor, and only with `coralNote` saying why.
//                Whatever the share, the coral box must be at least CORAL.boxW × CORAL.boxH px: a hairline is no coral.
// Root cause (R4, docs/root-causes.md): the share was hard-coded, a small but legitimate coral word tile could only
// pass with coral switched off for the whole composition, so the check measured nothing at all.
//   node scripts/still-check.mjs projects/<slug>/content/stills.json [--comp <id>] [--keep <dir>]
//   node scripts/still-check.mjs --selftest
// Exit code 1 on any ERROR; WARN lines are advice.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findBrowser} from './lib/browser.mjs';

export const CORAL = {share: 0.004, floor: 0.0012, boxW: 60, boxH: 24};

/** The spec list of a stills file (one spec, an array, or {specs}); problems of the spec itself. */
export const specsOf = (raw) => {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.specs) ? raw.specs : [raw];
  const problems = [];
  for (const s of list) {
    if (!s.comp || !Array.isArray(s.frames)) problems.push(`spec without comp or frames: ${JSON.stringify(s).slice(0, 80)}`);
    if (s.coralMin !== undefined && s.coralMin < CORAL.floor) problems.push(`${s.comp}: coralMin ${s.coralMin} is below the floor ${CORAL.floor}`);
    if (s.coralMin !== undefined && s.coralMin < CORAL.share && !s.coralNote) problems.push(`${s.comp}: coralMin below ${CORAL.share} needs a coralNote (why the coral part is small by nature)`);
    if ((s.coral === false || s.coralFrames) && !s.coralNote) problems.push(`${s.comp}: frames without coral need a coralNote`);
    for (const f of s.coralFrames ?? []) if (!s.frames.includes(f)) problems.push(`${s.comp}: coral frame ${f} is not among its frames`);
  }
  return {list, problems};
};

/** ERROR and WARN lines for one measured frame `r` of spec `s`. */
export const judge = (s, f, r) => {
  const errors = [];
  const warns = [];
  const wantCoral = s.coral !== false && (s.coralFrames ?? s.frames).includes(f);
  const min = s.coralMin ?? CORAL.share;
  if (wantCoral && r.coral < min) errors.push(`no visible coral part (${(r.coral * 100).toFixed(2)} % of the band, needs ${(min * 100).toFixed(2)} %): the one meaning is missing or tiny`);
  else if (wantCoral && (r.coralPxW < CORAL.boxW || r.coralPxH < CORAL.boxH)) errors.push(`the coral part is ${r.coralPxW} × ${r.coralPxH} px (≥ ${CORAL.boxW} × ${CORAL.boxH}): a sliver or a hairline, not a part`);
  // a tall hero (a loop seen edge-on, a bottle) counts by its height in the working band
  if (wantCoral && r.coralW > 0 && r.coralW < (s.heroMinWidth ?? 0.3) * 0.9 && r.coralH < (s.heroMinHeight ?? 0.5)) warns.push(`the coral hero is ${(r.coralW * 100).toFixed(0)} % of the frame width and ${(r.coralH * 100).toFixed(0)} % of the band height; aim ≥ ${(s.heroMinWidth ?? 0.3) * 100} % wide or ≥ ${(s.heroMinHeight ?? 0.5) * 100} % tall (§19.2)`);
  if (r.fade > 0.25) warns.push(`content runs into the graphics band's fade (${(r.fade * 100).toFixed(0)} % of the edge rows): the picture is cut at y ≈ 240 or 1200`);
  if (r.content < 0.18) errors.push(`the working band is ${((1 - r.content) * 100).toFixed(0)} % empty: the object is lost or too small`);
  return {errors, warns};
};

const selftest = () => {
  let bad = 0;
  const expect = (label, got, want) => {
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}: expected ${want}, got ${got}`);
  };
  const frame = (coral, w, h) => ({content: 0.5, coral, coralW: w / 1080, coralH: h / 930, coralPxW: w, coralPxH: h, fade: 0});
  const tile = frame(0.002, 100, 34); // one coral word tile, 0.2 % of the band
  expect('a small coral tile with the default share', judge({comp: 'x', frames: [0]}, 0, tile).errors.length, 1);
  expect('a small coral tile with coralMin 0.0015', judge({comp: 'x', frames: [0], coralMin: 0.0015, coralNote: 'one tile'}, 0, tile).errors.length, 0);
  expect('a coral hairline with a low coralMin', judge({comp: 'x', frames: [0], coralMin: 0.0015, coralNote: 'one tile'}, 0, frame(0.002, 400, 4)).errors.length, 1);
  expect('no coral at all with a low coralMin', judge({comp: 'x', frames: [0], coralMin: 0.0015, coralNote: 'one tile'}, 0, frame(0, 0, 0)).errors.length, 1);
  expect('a frame without coral by design', judge({comp: 'x', frames: [0, 1], coralFrames: [1], coralNote: 'frame 0 is before the answer'}, 0, frame(0, 0, 0)).errors.length, 0);
  expect('coralMin below the floor is refused', specsOf({comp: 'x', frames: [0], coralMin: 0.0005, coralNote: 'n'}).problems.length, 1);
  expect('a low coralMin without a note is refused', specsOf({comp: 'x', frames: [0], coralMin: 0.002}).problems.length, 1);
  expect('several compositions in one file', specsOf({specs: [{comp: 'a', frames: [0]}, {comp: 'b', frames: [1]}]}).list.length, 2);
  console.log(bad ? `still-check selftest: ${bad} case(s) FAILED` : 'still-check selftest: ok');
  return bad;
};

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
                  'coralH': ((cy1 - cy0) / (bot - top)) if cy0 is not None else 0,
                  'coralPxW': (cx1 - cx0 + 2) if cx0 is not None else 0, 'coralPxH': (cy1 - cy0 + 2) if cy0 is not None else 0,
                  'fade': fade / ((50 + 55) * (W // 2) / 2 * 2 / 2)}))
`;

const main = () => {
  const raw = JSON.parse(fs.readFileSync(process.argv[2] ?? '', 'utf8'));
  const only = process.argv.includes('--comp') ? process.argv[process.argv.indexOf('--comp') + 1] : null;
  const keep = process.argv.includes('--keep') ? process.argv[process.argv.indexOf('--keep') + 1] : null;
  const dir = keep ?? fs.mkdtempSync(path.join(os.tmpdir(), 'still-check-'));
  fs.mkdirSync(dir, {recursive: true});
  const browser = findBrowser();
  const {list, problems} = specsOf(raw);
  let errors = 0;
  for (const p of problems) (errors++, console.log(`ERROR spec: ${p}`));
  for (const spec of list.filter((s) => !only || s.comp === only)) {
    for (const f of spec.frames) {
      const png = path.join(dir, `${spec.comp}-f${f}.png`);
      const args = ['remotion', 'still', 'src/index.ts', spec.comp, png, `--frame=${f}`, '--log=error'];
      if (spec.props) args.push(`--props=${JSON.stringify(spec.props)}`);
      if (browser) args.push(`--browser-executable=${browser}`);
      execFileSync('npx', args, {stdio: 'pipe'});
      const r = JSON.parse(execFileSync('python3', ['-I', '-c', analyse, png], {encoding: 'utf8'}));
      const {errors: e, warns} = judge(spec, f, r);
      errors += e.length;
      const out = [...e.map((m) => `ERROR ${m}`), ...warns.map((m) => `WARN  ${m}`)];
      console.log(`${spec.comp} frame ${f}: content ${(r.content * 100).toFixed(0)} %, coral ${(r.coral * 100).toFixed(2)} % (${r.coralPxW} × ${r.coralPxH} px)${out.length ? '\n  ' + out.join('\n  ') : ' — ok'}`);
    }
  }
  if (!keep) fs.rmSync(dir, {recursive: true, force: true});
  process.exitCode = errors ? 1 : 0;
};

if (process.argv.includes('--selftest')) process.exitCode = selftest() ? 1 : 0;
else main();
