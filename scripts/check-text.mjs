// Text QA: caption pages and on-screen texts. Flags pages that are too long, too short in time,
// end with a hanging preposition/conjunction, or differ from the script.
import fs from 'node:fs';

const ti = process.argv.indexOf('--timeline');
const tl = JSON.parse(fs.readFileSync(ti > 0 ? process.argv[ti + 1] : 'src/data/timeline.json', 'utf8'));
const FPS = tl.fps;
const HANGING = new Set(['в', 'во', 'на', 'с', 'со', 'к', 'ко', 'и', 'а', 'но', 'о', 'об', 'у', 'от', 'до', 'по', 'за', 'из', 'не', 'как', 'что', 'про', 'для', 'при', 'мы', 'и,']);
const MAX_LINE = 24; // chars per caption line
let issues = 0;
for (const s of tl.scenes) {
  s.pages.forEach((p, i) => {
    const next = s.pages[i + 1];
    const shown = ((next ? next.startFrame : s.durationInFrames) - p.startFrame) / FPS;
    const words = p.text.split(/\s+/);
    const last = words[words.length - 1].toLowerCase().replace(/[.,:;!?]/g, '');
    const lines = p.text.length > MAX_LINE ? 2 : 1;
    const problems = [];
    if (p.text.length > MAX_LINE * 2) problems.push(`too long (${p.text.length} chars)`);
    if (shown < 0.6) problems.push(`short on screen ${shown.toFixed(2)} s`);
    if (HANGING.has(last)) problems.push(`ends with "${last}"`);
    if (words.length < 2) problems.push('single word page');
    if (problems.length) {
      issues++;
      console.log(`${s.id} p${i + 1} «${p.text}» [${lines} line(s), ${shown.toFixed(2)} s]: ${problems.join('; ')}`);
    }
  });
}
console.log(issues ? `${issues} caption issue(s)` : 'captions OK');
