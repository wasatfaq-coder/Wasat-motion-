// usage (cwd = repo): node stills.mjs <outDir> <Comp:f,f,f> [<Comp:f>...] [--scale 0.5]
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {findBrowser} from '/home/user/Wasat-motion-/scripts/lib/browser.mjs';
const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args[si + 1]) : 0.5;
const rest = si >= 0 ? args.filter((a, i) => i !== si && i !== si + 1) : args;
const out = rest[0];
fs.mkdirSync(out, {recursive: true});
const browserExecutable = findBrowser();
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
for (const spec of rest.slice(1)) {
  const [id, fr] = spec.split(':');
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  for (const f of fr.split(',').map(Number)) {
    const file = path.join(out, `${id}-${String(f).padStart(4, '0')}.png`);
    await renderStill({composition, serveUrl, output: file, frame: f, scale, browserExecutable});
    console.log(file);
  }
}
