#!/usr/bin/env node
// Scaffold a new topic (CLAUDE.md «one folder per topic», MASTER_PROMPT_FINAL §13, §20):
//   node scripts/new-topic.mjs <slug> "<Тема>"
// Creates projects/<slug>/content (brief, register, templates), public/<slug>/audio/vo, src/projects/<slug> (Main, data)
// and registers the compositions <Pascal>Main and <Pascal>Cover (three cover variants, §19.5) in src/Root.tsx.
// Refuses to overwrite an existing topic.
import fs from 'node:fs';
import path from 'node:path';

const [slug, title = ''] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('usage: new-topic.mjs <slug: lowercase-latin-with-dashes> "<Тема>"');
const pascal = slug.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const content = path.join('projects', slug, 'content');
const srcDir = path.join('src', 'projects', slug);
if (fs.existsSync(path.join('projects', slug)) || fs.existsSync(srcDir)) throw new Error(`topic ${slug} already exists`);
const today = new Date().toISOString().slice(0, 10);
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, text);
};
const json = (o) => JSON.stringify(o, null, 2) + '\n';

write(path.join(content, 'brief.yaml'), `# MASTER_PROMPT_FINAL §3. Fill before the analysis; defaults are named, not assumed.
topic: "${title}"
source: null                # file, text or URL
research_mode: supplied     # supplied | web
audience: general_adults
goal: understand_main_idea
duration_sec: 60
duration_tolerance: 0.10
language: ru
style: anatomy_toned_solids    # §22: toned solids in our palette, thick contour, one coral part
accent_colors: 1            # coral; a second accent only by the user's decision
metaphor_policy: accuracy_first   # §20: leading metaphor with a source-backed schematic payoff
voice_provider: elevenlabs
voice_id: 3EuKHIEZbSzrHGNmdYsx
voice_model: eleven_v4
voice_budget: null
captions: on
music: forbidden
cover: on
`);
write(path.join(content, 'progress.md'), `# Прогресс: ${title}\n\nСоздано ${today}. Слаг: \`${slug}\`.\n\n## Шаги (§8)\n- [ ] Бриф и источники\n- [ ] analysis.md (topic-analyst)\n- [ ] Сценарий и реестр сцен/метафор (metaphor-auditor, fact-checker)\n- [ ] СТОП 1: сценарий, раскадровка, реестр метафор, досье и проверка эскиза\n- [ ] Стайлфреймы локаций и тестовый фрагмент\n- [ ] СТОП 2\n- [ ] Аниматик (стоп-кадры под голос)\n- [ ] Сборка, аудит, gate\n- [ ] СТОП 3: полный черновик\n- [ ] Мастер (scripts/master.mjs)\n- [ ] Превью 360×640 из MP4, просмотр со звуком, зрительский пересказ и независимое подтверждение правок\n`);
write(path.join(content, 'decisions.md'), `# Решения: ${title}\n\n| Дата | Решение | Кто |\n| --- | --- | --- |\n`);
write(path.join(content, 'sources.md'), `# Источники\n\nКаждый факт: S<n>, ссылка, страница/раздел, границы применимости (§7).\n`);
write(path.join(content, 'storyboard.md'), `# Раскадровка: ${title}\n\nДля каждой сцены (§8, §20): мысль · режим (literal / schematic / metaphor) · локация · главный объект · движение · якорное слово · звук.\n\n| Сцена | Мысль | Режим | Локация | Главный объект | Метафоры (id) | Якорное слово | Что говорит голос | Что показывает кадр | Звук | Ожидаемый пересказ | Ошибочное прочтение | Смысловая пауза (диапазон и цель) |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\nПеред СТОП 1 сверь каждую строку со списком типовых ошибок §20.5: кадр не противоречит голосу, единицы совпадают, один образ — один смысл, гипотезы помечены в голосе.\n`);
write(path.join(content, 'metaphor-prep.md'), `# Подготовка визуальной метафоры

Заполни для ведущей метафоры до СТОП 1 и до моделирования. Прикрепи результат проверки metaphor-auditor и решение из decisions.md.

| Пункт | Что записать |
| --- | --- |
| Мысль и источник | Одна фраза для пересказа, источник и пределы утверждения |
| Варианты | Два узнаваемых образа и точная схема для сравнения |
| Соответствия | Что означает каждый предмет, действие и направление |
| Досье | Как узнать предмет по силуэту, какие детали определяют его функцию, на какие материалы опираемся |
| Ошибочное прочтение | Что зритель может понять неверно, как это устраняет кадр или голос |
| Кадры | Общий план, крупный план и точная схема. Отметь объект и действие на каждом |
| Проверка эскиза | На 360×640 без озвучки рецензент называет видимый предмет и действие. Запиши ответ и замечания |
| Решение | Выбранный образ, основание выбора, ссылка на проверку и согласование |
`);
write(path.join(content, 'script.json'), json({scenes: []}));
write(path.join(content, 'sound-map.json'), json({_doc: 'Per scene: [{beat, offset, file, volume, reason}]. Review after every scene change, then node scripts/audit.mjs --stamp-sfx.'}));
write(path.join(content, 'timing.json'), json({firstVoiceStartFrames: 6, lastTailMs: 300, pauses: {}, extraTailFrames: {}, spokenNumbers: {}}));
write(path.join(content, 'visual-register.json'), json({
  _doc: 'MASTER_PROMPT_FINAL §20: every scene declares location and mode; every metaphor is justified and approved at STOP 1; measured data sits on a frontal plate. Set interface: real for a literal interface close-up. Link leadingMetaphor (metaphor id) to schemeScene (schematic scene id).',
  scenes: {},
  locationReuse: [],
  metaphors: {},
}));
write(path.join(content, 'reviews', '.gitkeep'), '');
write(path.join('public', slug, 'audio', 'vo', '.gitkeep'), '');
write(path.join(srcDir, 'data', 'timeline.json'), json({fps: 60, scenes: [], totalFrames: 0}));
write(path.join(srcDir, 'scenes', '.gitkeep'), '');
// covers (§19.5, §22): three variants with different techniques; placeholders until the topic's image and titles
write(path.join(content, 'cover.json'), json({variant: 'a', chosen: false, _doc: 'The variant the user chose at the cover stop; master.mjs renders it to out/<slug>/cover.png.'}));
write(path.join(srcDir, 'covers.ts'), `import * as K from '../../vendor/anatomy/iso-kit';
import {anatomyProjection} from '../../lib/anatomy';
import {CoverSpec} from '../../lib/coverLayout';
import {P3} from '../../lib/iso';

// Covers of «${title}» (MASTER_PROMPT_FINAL §19.5): three variants, each with a different technique
// (gap, violation, incomplete, contrast, specific); title 2–4 words with one coral word; the image is the topic's
// hero object drawn in the house style (§22), framed by \`frame\` (room points). Checked by scripts/cover-check.mjs.
// PLACEHOLDERS: replace \`art\`, \`frame\` and \`lines\` and drop \`placeholder\` before the gate.
const U = 10;
const P = anatomyProjection(U);
const PLACEHOLDER = K.solidSvg(K.slabOf({x: 0, y: 0, w: 40, d: 40, r: 3}, 0, 40, P, 8, 1), {tone: 'hi', lit: true});
const FRAME: P3[] = [[0, 0, 0], [4, 0, 0], [0, 4, 0], [4, 4, 0], [0, 0, 4], [4, 4, 4]];

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {technique: 'gap', lines: ['Вопрос', 'темы?'], accent: [1, 0], layout: 'top', art: PLACEHOLDER, frame: FRAME, hero: FRAME, hook: "Эскиз обложки", placeholder: true},
  b: {technique: 'contrast', lines: ['Было', 'и стало'], accent: [1, 1], layout: 'bottom', art: PLACEHOLDER, frame: FRAME, hero: FRAME, hook: "Эскиз обложки", placeholder: true},
  c: {technique: 'incomplete', lines: ['Что', 'внутри?'], accent: [1, 0], layout: 'top', art: PLACEHOLDER, frame: FRAME, hero: FRAME, hook: "Эскиз обложки", placeholder: true},
};
`);
write(path.join(srcDir, 'Cover.tsx'), `import React from 'react';
import {AnatomyCover, AnatomyCoverProps} from '../../components/AnatomyCover';
import {COVERS} from './covers';

export const ${pascal}Cover: React.FC<AnatomyCoverProps> = ({variant}) => <AnatomyCover spec={COVERS[variant]} />;
`);
write(path.join(srcDir, 'Main.tsx'), `import React from 'react';
import timelineJson from './data/timeline.json';
import {Timeline} from '../../lib/timeline';
import {Episode, EpisodeProps, SceneMap, selectScenes} from '../../components/Episode';
// Scenes of this topic are drawn with the Anatomy core: AnatomyStage + anatomyProjection from '../../lib/anatomy' (MASTER_PROMPT_FINAL §22).

// Topic «${title}». Add scenes to SCENES as they are built (scene ids from the timeline).
export const ${pascal}Timeline = timelineJson as Timeline;
const SCENES: SceneMap = {};

export const ${pascal}Selected = (only: string[]) => selectScenes(${pascal}Timeline, SCENES, only);
export const ${pascal}Main: React.FC<EpisodeProps> = (props) => <Episode {...props} timeline={${pascal}Timeline} scenes={SCENES} />;
`);

const root = 'src/Root.tsx';
let r = fs.readFileSync(root, 'utf8');
const marker = '  {/* topic compositions: scripts/new-topic.mjs inserts new topics above this line */}';
if (!r.includes(marker)) throw new Error('Root.tsx marker not found');
// import the topic's Main once; episodeSchema only if Root does not import it yet (a second topic used to duplicate it)
let imports = `import {${pascal}Main, ${pascal}Selected} from './projects/${slug}/Main';\nimport {${pascal}Cover} from './projects/${slug}/Cover';`;
if (!/import \{episodeSchema\} from '\.\/components\/Episode';/.test(r)) imports += "\nimport {episodeSchema} from './components/Episode';";
if (!/import \{anatomyCoverSchema\} from '\.\/components\/AnatomyCover';/.test(r)) imports += "\nimport {anatomyCoverSchema} from './components/AnatomyCover';";
if (!/import \{totalFrames\} from '\.\/lib\/sceneSet';/.test(r)) imports += "\nimport {totalFrames} from './lib/sceneSet';";
r = r.replace("import {Cover, coverSchema} from './Cover';",`import {Cover, coverSchema} from './Cover';\n${imports}`);
r = r.replace(marker, `  <Composition
    id="${pascal}Main"
    component={${pascal}Main}
    schema={episodeSchema}
    width={FORMAT.width}
    height={FORMAT.height}
    fps={FORMAT.fps}
    durationInFrames={1}
    defaultProps={{muteVoice: false, hideCaptions: false, onlyScenes: []}}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, totalFrames(${pascal}Selected(props.onlyScenes)))})}
  />
  <Composition id="${pascal}Cover" component={${pascal}Cover} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
${marker}`);
fs.writeFileSync(root, r);

console.log(`Topic ${slug} created:
  ${content}/        brief.yaml, storyboard.md, visual-register.json, timing.json, sound-map.json, progress.md, decisions.md
  public/${slug}/audio/vo/
  ${srcDir}/Main.tsx  composition ${pascal}Main registered in src/Root.tsx
  ${srcDir}/covers.ts, Cover.tsx  composition ${pascal}Cover (variants a/b/c: placeholders to replace)
Next: fill brief.yaml and sources.md, run topic-analyst. Timeline: node scripts/build-timeline.mjs --content ${content} --public-prefix ${slug} --out ${srcDir}/data/timeline.json`);
