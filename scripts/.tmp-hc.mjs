import {decode, checkFrames} from './motion-check.mjs';
const fr = decode(process.argv[2]);
const bad = [];
fr.forEach((f, i) => { if (checkFrames([f], {captions: true}).some((p) => p.kind === 'crop')) bad.push(i); });
const runs = []; for (const i of bad) { const r = runs[runs.length - 1]; if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]); }
console.log(runs.map((r) => r.join('-')).join(' '));
for (const i of [436, 437, 438]) {}
