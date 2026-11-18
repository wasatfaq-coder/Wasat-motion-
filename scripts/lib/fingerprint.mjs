// Input fingerprint of a render (patch item 15, MASTER_PROMPT_FINAL §23.9).
// Covers everything that can change the picture or the sound of one topic: sources (src/, except other topics),
// shared components, configuration, lockfile, the topic's content (script, timeline inputs, sound map, register,
// brief, timing — reviews and release records excluded), voice, sfx, fonts and other public assets (except other
// topics' folders). Rendered outputs and reports are never inputs, so a report never hashes itself.
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const CONFIG = ['package.json', 'package-lock.json', 'tsconfig.json', 'remotion.config.ts', 'scripts/sfx-lead.json'];
// content files that are review evidence or release bookkeeping, not inputs
const NOT_INPUT = /(^|\/)(reviews|transcripts)\/|(^|\/)(release\.json|analytics\.md|progress\.md|decisions\.md)$/;

const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.name === 'node_modules' || e.name === '.DS_Store') return [];
        return e.isDirectory() ? walk(p) : [p];
      })
    : [];

export const sha256File = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/** Topic of a timeline path: slug for src/projects/<slug>/…, null for the root topic. */
export const topicOf = (timelineFile) => (String(timelineFile).split(path.sep).join('/').match(/src\/projects\/([^/]+)\//) ?? [])[1] ?? null;

const topics = () => (fs.existsSync('src/projects') ? fs.readdirSync('src/projects') : []);

/** The input files of a topic (repo-relative, sorted). */
export const inputFiles = (slug) => {
  const others = topics().filter((t) => t !== slug);
  const files = [
    ...walk('src').filter((f) => {
      const rel = f.split(path.sep).join('/');
      const m = rel.match(/^src\/projects\/([^/]+)\//);
      return m ? m[1] === slug : true;
    }),
    ...walk('public').filter((f) => {
      const top = f.split(path.sep)[1];
      return !others.includes(top) && !(slug === null && topics().includes(top));
    }),
    ...walk(slug ? path.join('projects', slug, 'content') : 'content').filter((f) => !NOT_INPUT.test(f.split(path.sep).join('/'))),
    ...(slug ? [] : ['brief.yaml']),
    ...CONFIG,
  ].filter((f) => fs.existsSync(f));
  return [...new Set(files.map((f) => f.split(path.sep).join('/')))].sort();
};

/** {hash, files: {path: sha256}} — the hash covers paths and contents in a stable order. */
export const fingerprint = (slug) => {
  const files = Object.fromEntries(inputFiles(slug).map((f) => [f, sha256File(f)]));
  const h = crypto.createHash('sha256');
  for (const [f, d] of Object.entries(files)) h.update(`${f}\0${d}\n`);
  return {hash: h.digest('hex'), files};
};

/** Which inputs changed between two fingerprints (added, removed, modified). */
export const diffInputs = (before, after) => {
  const a = before?.files ?? {};
  const b = after?.files ?? {};
  return {
    added: Object.keys(b).filter((f) => !(f in a)),
    removed: Object.keys(a).filter((f) => !(f in b)),
    changed: Object.keys(b).filter((f) => f in a && a[f] !== b[f]),
  };
};

/** Commit for navigation only (the fingerprint, not the commit, identifies the working tree). */
export const commitOf = () => {
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim().length > 0;
    return {head, dirty};
  } catch {
    return {head: null, dirty: null};
  }
};
