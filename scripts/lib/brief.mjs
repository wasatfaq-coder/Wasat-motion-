// Brief reader and the duration contract (patch item 11, MASTER_PROMPT_FINAL §23.2).
// The root topic keeps its brief at ./brief.yaml; a topic keeps it at projects/<slug>/content/brief.yaml.
// Only flat `key: value` lines are read (comments after #), which is all brief.yaml uses.
import fs from 'node:fs';
import path from 'node:path';

export const briefPath = (contentDir) => (path.normalize(contentDir) === 'content' ? 'brief.yaml' : path.join(contentDir, 'brief.yaml'));

export const parseBrief = (text) => {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    const m = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^"(.*)"$/, '$1');
    if (v === 'null' || v === '') v = null;
    else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    out[m[1]] = v;
  }
  return out;
};

export const readBrief = (contentDir) => {
  const f = briefPath(contentDir);
  return fs.existsSync(f) ? {file: f, ...parseBrief(fs.readFileSync(f, 'utf8'))} : null;
};

/** Agreed duration range from the brief: duration_sec ± duration_tolerance (a share, e.g. 0.10). */
export const durationRange = (brief) => {
  if (!brief || typeof brief.duration_sec !== 'number') return null;
  const tol = typeof brief.duration_tolerance === 'number' ? brief.duration_tolerance : 0.1;
  return {target: brief.duration_sec, tolerance: tol, min: +(brief.duration_sec * (1 - tol)).toFixed(3), max: +(brief.duration_sec * (1 + tol)).toFixed(3)};
};

/** null when the duration fits, else a message with the actual value and the range. */
export const durationProblem = (seconds, range) => {
  if (!range) return 'brief has no duration_sec: the agreed duration is unknown';
  if (seconds >= range.min && seconds <= range.max) return null;
  return `duration ${seconds.toFixed(2)} s is outside the brief ${range.target} s ± ${Math.round(range.tolerance * 100)} % (${range.min}…${range.max} s); shorten the video or record a new brief decision in decisions.md`;
};

/** Topic stage: `draft` topics are scaffolds; strict stage checks apply from `production` on. Root topic = production. */
export const stageOf = (brief, contentDir) => brief?.stage ?? (path.normalize(contentDir) === 'content' ? 'production' : 'production');
