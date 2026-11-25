#!/usr/bin/env node
// The reference check (CLAUDE.md «Before drawing any real object»; upstream src/vendor/anatomy/references/verify.md):
// put the drawing next to photos of the real object and next to the upstream examples, in one sheet, then look at it
// and compare part by part (silhouette, where each part sits, how it joins the body). A drawing that does not read as
// the real object at a glance goes back, it is not sent.
//   node scripts/ref-compare.mjs <drawing.png> [photo …] [--out out/sketch/compare-<name>.png] [--no-upstream]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

// Playwright is pre-installed globally in the session container (not a project dependency)
const {chromium} = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
if (!files.length) {
  console.error('usage: node scripts/ref-compare.mjs <drawing.png> [photo …] [--out file.png] [--no-upstream]');
  process.exit(2);
}
for (const f of files) if (!fs.existsSync(f)) (console.error(`ref-compare: no file ${f}`), process.exit(2));
const [drawing, ...photos] = files;
const UP = 'styles/anatomy/refs/upstream';
const upstream = flag('no-upstream') ? [] : ['dial-indicator.webp', 'raptor-engine-firing.webp'].map((f) => path.join(UP, f)).filter((f) => fs.existsSync(f));
const out = opt('out') ?? path.join('out/sketch', `compare-${path.basename(drawing, path.extname(drawing))}.png`);
if (!photos.length) console.warn('ref-compare: no photo of the real object given — the sheet compares with the upstream examples only');

const uri = (f) => `data:image/${path.extname(f).slice(1).replace('jpg', 'jpeg')};base64,${fs.readFileSync(f).toString('base64')}`;
const cell = (f, label) => `<figure><img src="${uri(f)}"><figcaption>${label}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#f3efe8;font:600 22px sans-serif;color:#2b2622}
.row{display:flex;gap:16px;padding:16px;align-items:flex-start}
figure{margin:0;display:flex;flex-direction:column;gap:8px}
img{height:820px;width:auto;max-width:900px;object-fit:contain;background:#fff;border:2px solid #2b2622}
.small img{height:400px}
</style><div class="row">${cell(drawing, 'рисунок')}${photos.map((p, i) => cell(p, `фото ${i + 1}`)).join('')}</div>${
  upstream.length ? `<div class="row small">${upstream.map((u) => cell(u, `эталон: ${path.basename(u, '.webp')}`)).join('')}</div>` : ''
}`;

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1200, height: 900}, deviceScaleFactor: 1});
await page.setContent(html);
await page.waitForFunction(() => [...document.images].every((i) => i.complete));
const size = await page.evaluate(() => ({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight}));
await page.setViewportSize({width: Math.min(size.w, 4000), height: size.h});
fs.mkdirSync(path.dirname(out), {recursive: true});
await page.screenshot({path: out, fullPage: true});
await browser.close();
console.log(`ref-compare: ${out}`);
