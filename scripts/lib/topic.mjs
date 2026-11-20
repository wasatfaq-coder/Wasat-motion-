// Paths of one topic (CLAUDE.md: one topic = one folder). Every topic script takes `--topic <slug>`; an explicit
// --content / --scenes / --timeline / --public-prefix / --comp still overrides one path. There is no root topic any
// more (regulation v3.0): a script that needs a topic and gets none stops with this message.
import fs from 'node:fs';
import path from 'node:path';

export const pascalOf = (slug) =>
  slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');

export const argOf = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

/** The topic paths from argv, or null when neither --topic nor --content is given. */
export const topicFrom = (argv = process.argv) => {
  const slug = argOf(argv, 'topic', null);
  const content = argOf(argv, 'content', slug ? path.join('projects', slug, 'content') : null);
  if (!slug && !content) return null;
  const s = slug ?? content.split(path.sep).filter(Boolean).at(-2) ?? content.split('/').filter(Boolean).at(-2);
  return {
    slug: s,
    content,
    scenes: argOf(argv, 'scenes', path.join('src', 'projects', s, 'scenes')),
    timeline: argOf(argv, 'timeline', path.join('src', 'projects', s, 'data', 'timeline.json')),
    prefix: argOf(argv, 'public-prefix', s),
    comp: argOf(argv, 'comp', `${pascalOf(s)}Main`),
    cover: argOf(argv, 'cover', `${pascalOf(s)}Cover`),
  };
};

/** topicFrom(), or exit with a usage line. */
export const requireTopic = (script, argv = process.argv) => {
  const t = topicFrom(argv);
  if (!t) {
    console.error(`${script}: pass --topic <slug> (projects/<slug>); there is no root topic since regulation v3.0`);
    process.exit(2);
  }
  if (!fs.existsSync(t.content)) {
    console.error(`${script}: ${t.content} does not exist (create the topic with node scripts/new-topic.mjs <slug> "<Тема>")`);
    process.exit(2);
  }
  return t;
};
