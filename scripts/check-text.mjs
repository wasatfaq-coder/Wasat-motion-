// Text QA (patch items 2 and 13, MASTER_PROMPT_FINAL §10, §19.1): caption pages of the timeline.
// Flags pages that are too long, too short in time, end with a hanging preposition/conjunction, are single words,
// and — when the script is available — pages that differ from the script (omission, extra words, reordering) after
// text normalisation. Rendered layout (real font, real DOM size, protected zones) is measured by
// scripts/caption-layout.mjs.
//
//   node scripts/check-text.mjs [--timeline <timeline.json>] [--script <script.json>]
// Exit code 1 on any caption defect or on an input error (missing or broken file); every defect names scene and page.
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const fail = (msg) => {
  console.error(`check-text: ${msg}`);
  process.exit(1);
};
const timelineFile = arg('timeline', 'src/data/timeline.json');
const readJson = (f, what) => {
  if (!fs.existsSync(f)) fail(`${what} not found: ${f}`);
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    fail(`${what} is not valid JSON: ${f}: ${e.message}`);
  }
};
const tl = readJson(timelineFile, 'timeline');
if (!Number.isFinite(tl.fps) || tl.fps <= 0 || !Array.isArray(tl.scenes)) fail(`${timelineFile}: expected {fps, scenes[]}`);
// the script that belongs to this timeline: --script, else <content>/script.json of the same topic
const slug = (timelineFile.split(path.sep).join('/').match(/src\/projects\/([^/]+)\//) ?? [])[1];
const scriptFile = arg('script', slug ? `projects/${slug}/content/script.json` : 'content/script.json');
const script = fs.existsSync(scriptFile) ? readJson(scriptFile, 'script') : null;

const FPS = tl.fps;
const HANGING = new Set(['в', 'во', 'на', 'с', 'со', 'к', 'ко', 'и', 'а', 'но', 'о', 'об', 'у', 'от', 'до', 'по', 'за', 'из', 'не', 'как', 'что', 'про', 'для', 'при', 'мы', 'и,']);
const MAX_LINE = 24; // chars per caption line (estimate; the real wrap is measured by caption-layout.mjs)
const norm = (t) => t.toLowerCase().replace(/ё/g, 'е').replace(/\[[^\]]+\]/g, ' ').replace(/[^a-zа-я0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);

let issues = 0;
const report = (where, text, problems) => {
  issues++;
  console.log(`${where} «${text}»: ${problems.join('; ')}`);
};
for (const s of tl.scenes) {
  if (!Array.isArray(s.pages)) {
    report(`${s.id}`, '', ['scene has no pages array']);
    continue;
  }
  s.pages.forEach((p, i) => {
    const next = s.pages[i + 1];
    const shown = ((next ? next.startFrame : s.durationInFrames) - p.startFrame) / FPS;
    const words = String(p.text ?? '').split(/\s+/).filter(Boolean);
    const last = (words[words.length - 1] ?? '').toLowerCase().replace(/[.,:;!?]/g, '');
    const problems = [];
    if (!words.length) problems.push('empty page');
    if (String(p.text).length > MAX_LINE * 2) problems.push(`too long (${p.text.length} chars)`);
    if (!Number.isFinite(shown) || shown < 0.6) problems.push(`short on screen ${Number.isFinite(shown) ? shown.toFixed(2) : '?'} s`);
    if (HANGING.has(last)) problems.push(`ends with "${last}"`);
    if (words.length === 1) problems.push('single word page');
    if (problems.length) report(`${s.id} p${i + 1}`, p.text, problems);
  });
  // script vs captions: the same words in the same order after normalisation
  const sc = script?.scenes?.find((x) => x.id === s.id);
  if (script && !sc) report(`${s.id}`, '', [`scene is not in ${scriptFile}`]);
  if (sc) {
    const want = (sc.fragments ?? []).flatMap((f) => norm(f.display ?? ''));
    const got = s.pages.flatMap((p) => norm(p.text ?? ''));
    if (want.join(' ') !== got.join(' ')) {
      const missing = want.filter((w) => !got.includes(w));
      const extra = got.filter((w) => !want.includes(w));
      const kind = missing.length || extra.length ? `missing [${missing.join(' ')}] extra [${extra.join(' ')}]` : 'same words in a different order';
      report(`${s.id}`, got.join(' '), [`captions differ from the script: ${kind}`]);
    }
  }
}
console.log(issues ? `${issues} caption issue(s)` : 'captions OK');
process.exitCode = issues ? 1 : 0;
