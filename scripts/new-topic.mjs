#!/usr/bin/env node
// Scaffold a new topic (CLAUDE.md «one folder per topic», MASTER_PROMPT_FINAL v3.0):
//   node scripts/new-topic.mjs <slug> "<Тема>" --format how|why|history|numbers|faith [--sensitive none|religion|politics|health]
// Creates projects/<slug>/content (brief, concept, register with the format's chapter skeleton, templates),
// public/<slug>/audio/vo, src/projects/<slug> (Main, covers, motion, data) and registers <Pascal>Main and <Pascal>Cover in
// src/Root.tsx. Refuses to overwrite an existing topic.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const [slug, title = ''] = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] ?? '').startsWith('--'));
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('usage: new-topic.mjs <slug: lowercase-latin-with-dashes> "<Тема>" --format how|why|history|numbers|faith');

// The five formats (decision 9): a chapter skeleton, the usual modes and the kit bricks to start from. Images and
// mechanisms are invented anew for every topic; the skeleton is only where the chapters stand.
const FORMATS = {
  how: {name: 'Как работает', chapters: ['Целое и загадка', 'Что внутри', 'Как движется', 'Деталь, на которой всё держится'], modes: 'literal (вскрытие: разрез, разбор), schematic', kit: 'assembly (lathe, tube), transitions (cutaway, peel, zoomInto), techniques (dye, section, pullOut), Frontal'},
  why: {name: 'Почему мы…', chapters: ['Знакомая ситуация', 'Механизм причины', 'Что его запускает', 'Что с этим делать'], modes: 'mechanism (выдуманный механизм, карточка), symbol (состояние человека), literal (люди, место)', kit: 'character / crowd, symbols, assembly для механизма, Frontal (момент правды)'},
  history: {name: 'История', chapters: ['Событие и вопрос', 'Где и когда', 'Как развивалось', 'Что изменилось'], modes: 'literal (эпоха, место, люди), schematic (карта, хроника)', kit: 'mapTable + route (границы на год события), timeline (rail, stations), character (эпохи), document'},
  numbers: {name: 'В цифрах', chapters: ['Неожиданное число', 'Из чего оно складывается', 'С чем сравнить', 'Что из этого следует'], modes: 'literal (предметы счёта), schematic (плашки, шкала от нуля)', kit: 'data (bars, ruler, balance), money, scale, Frontal (счётчик, источник и дата)'},
  faith: {name: 'Понятие и вера', chapters: ['Вопрос о понятии', 'Источник: текст и ссылка', 'Как устроено понятие', 'Разные мнения и итог'], modes: 'literal (места, предметы, тексты, карты), schematic (понятие: календарь, расчёт); вера и поклонение — не механизм', kit: 'document, mapTable, timeline, Frontal (цитата с сурой и аятом, перевод)'},
};
const format = opt('format', null);
if (!FORMATS[format]) throw new Error(`new-topic: pass --format ${Object.keys(FORMATS).join('|')} (decision 9)`);
const F = FORMATS[format];
const sensitive = opt('sensitive', format === 'faith' ? 'religion' : 'none');
if (!['none', 'religion', 'politics', 'health'].includes(sensitive)) throw new Error('new-topic: --sensitive none|religion|politics|health');
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

write(path.join(content, 'brief.yaml'), `# MASTER_PROMPT_FINAL v3.0, «Бриф». Defaults are named, not assumed.
topic: "${title}"
format: ${format}                # how | why | history | numbers | faith (${F.name})
sensitive: ${sensitive}               # none | religion | politics | health
source: null                # file, text or URL
research_mode: web          # supplied | web
audience: general_adults
duration_sec: 60            # Shorts 9:16 only
series: null                # a series name lets a mechanism repeat inside it (decision 14)
language: ru
voice_provider: elevenlabs
voice_id: 3EuKHIEZbSzrHGNmdYsx   # the narrator: «спокойный инженер»
voice_model: eleven_v4
arabic_voice_id: null       # the second voice for ayat and Arabic phrases (the user names it, decision 42)
voice_budget: null
music: forbidden
cta: null
`);
write(path.join(content, 'concept.md'), `# Концепт: ${title}

Формат: **${F.name}**. Один файл до СТОП 1 (решение 8): структура, хук, главы, образы и механизмы.

## Три структуры
| # | Форма | Открытие | Концовка |
| --- | --- | --- | --- |
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |

Выбрана: … потому что …

## Хук (0–2 с)
Что с предметом не так; вопрос со словом-интригой. Движение с первого кадра.

## Главы («Табл. NN / NN»)
${F.chapters.map((c, i) => `${i + 1}. ${c} — шаг: утверждение → как работает → пример`).join('\n')}

Режимы формата: ${F.modes}.
Кирпичи набора: ${F.kit}.

## Образы и механизмы
Для каждого механизма — карточка в visual-register.json (\`mechanisms\`): что объясняет; деталь → утверждение → источник; законы и глагол движения; где упрощает и как можно понять неверно; момент правды. Три кандидата образа из словаря темы, сверка с docs/style/images-log.json.

## Финал
Тот же предмет, что в первом кадре, собран; коралловая метка ответа. Честно: чего не знаем, и один сильный факт.
`);
write(path.join(content, 'progress.md'), `# Прогресс: ${title}\n\nСоздано ${today}. Слаг: \`${slug}\`. Формат: ${F.name}.\n\n## Шаги\n- [ ] Бриф и источники\n- [ ] Анализ и досье (исследователь): утверждения с уровнем доверия\n- [ ] Концепт, сценарий, раскадровка, карточки механизмов (fact-checker, metaphor-auditor)\n- [ ] Эскиз ключевого образа 360×640 (out/sketch/eskiz-*)\n- [ ] СТОП 1: сценарий, раскадровка, карточки, эскиз\n- [ ] Голос, таймлайн, сборка, быстрые проверки после правок\n- [ ] pregate (полный уровень) и общий гейт\n- [ ] СТОП 2: полный черновик\n- [ ] Мастер (node scripts/master.mjs --topic ${slug}), запись образов в docs/style/images-log.json\n`);
write(path.join(content, 'decisions.md'), `# Решения: ${title}\n\n| Дата | Решение | Кто |\n| --- | --- | --- |\n`);
write(path.join(content, 'sources.md'), `# Источники\n\nКаждый факт: S<n>, ссылка, страница/раздел, границы применимости, уровень доверия (обзор/метаанализ > повторённое исследование > одно исследование > мнение).\n`);
write(path.join(content, 'storyboard.md'), `# Раскадровка: ${title}\n\n| Сцена | Глава | Мысль | Режим | Локация | Главный объект | Механизм | Якорное слово | Что говорит голос | Что показывает кадр | Три слоя движения (событие · отклик · жизнь) | Переход | Звук | Ожидаемый пересказ | Ошибочное прочтение |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\nКадр не противоречит голосу; единица образа = единица утверждения; один образ — один смысл; гипотезы и уровень доверия сказаны в голосе. Событие каждые 1,5–2,5 с, микроинтрига каждые 5–8 с, повторный хук на 40–50 %.\n`);
write(path.join(content, 'script.json'), json({mainClaim: null, scenes: []}));
write(path.join(content, 'sound-map.json'), json({_doc: 'Per scene: [{beat, offset, file, volume, reason, layer: event | response | life}]. Review after every scene change, then node scripts/audit.mjs --topic <slug> --stamp-sfx.'}));
write(path.join(content, 'timing.json'), json({firstVoiceStartFrames: 6, lastTailMs: 300, pauses: {}, extraTailFrames: {}, spokenNumbers: {}}));
write(path.join(content, 'visual-register.json'), json({
  _choose: 'Per scene, the first mode that carries the idea: literal (real objects, places, interfaces, data; the cut for real devices) → schematic (structure, steps, scale, frontal plates) → mechanism (an invented mechanism for what has no visible form: feelings, decisions, society, concepts) → symbol (a person\'s state, src/lib/symbols/catalog.json). Interfaces and data are never mechanism or symbol.',
  _doc: 'MASTER_PROMPT_FINAL v3.0. chapters: [{n, title}] («Табл. NN / NN»; chapter 0 = hook or finale). scenes: {id: {chapter, mode, location, mechanism?, symbols?, data?: {plane: frontal, source}, interface?, coral?: true, dark?: true}}. One mechanism per chapter; one dark scene per video; coral means coralMeaning only. mechanisms: {id: {name, idea, parts: [{part, claim, source}], laws, verb, simplifies, misread, truth, status: proposed|approved|rejected}}. heroes: names of hero objects (for the image journal). series: a series name lets a mechanism repeat inside it.',
  coralMeaning: '',
  chapters: F.chapters.map((t, i) => ({n: i + 1, title: t})),
  scenes: {},
  mechanisms: {},
  heroes: [],
  locationReuse: [],
  ...(sensitive === 'religion' ? {sensitive: {noDepiction: false, worshipNotMechanism: false, quotesWithReference: false, opinionsAsOpinions: false, exactArabic: false, restrainedSound: false, noCoralOnHoly: false}} : {}),
  ...(sensitive === 'politics' || sensitive === 'health' ? {sensitive: {sourcesOnScreen: false}} : {}),
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

// Covers of «${title}» (MASTER_PROMPT_FINAL v3.0, «Обложка»): three variants, each with a different technique
// (gap, violation, incomplete, contrast, specific); title 2–4 words with one coral word; the image is the topic's
// hero object drawn in the house style (§22), framed by \`frame\` (room points). Checked by scripts/cover-check.mjs.
// PLACEHOLDERS: replace \`art\`, \`frame\` and \`lines\` and drop \`placeholder\` before the gate.
const U = 10;
const P = anatomyProjection(U);
const PLACEHOLDER = K.solidSvg(K.slabOf({x: 0, y: 0, w: 40, d: 40, r: 3}, 0, 40, P, 8, 1), {tone: 'hi', lit: true});
const FRAME: P3[] = [[0, 0, 0], [4, 0, 0], [0, 4, 0], [4, 4, 0], [0, 0, 4], [4, 4, 4]];
const FLOOR = {x: -2, y: -2, w: 8, d: 8};
const HERO: P3[] = [[1, 1, 0], [3, 3, 3]]; // the hook detail, inside the frame

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {technique: 'gap', hook: 'ЗАМЕНИТЬ: что в картинке не так с героем', lines: ['Вопрос', 'темы?'], layout: 'top', art: PLACEHOLDER, frame: FRAME, hero: HERO, floor: FLOOR, crop: 1, placeholder: true},
  b: {technique: 'contrast', hook: 'ЗАМЕНИТЬ: что в картинке не так с героем', lines: ['Было', 'и стало'], accent: [1, 1], layout: 'top', art: PLACEHOLDER.replace(' data-lit=""', ''), frame: FRAME, hero: HERO, floor: FLOOR, crop: 1, placeholder: true},
  c: {technique: 'incomplete', hook: 'ЗАМЕНИТЬ: что в картинке не так с героем', lines: ['Что', 'внутри?'], layout: 'top', art: PLACEHOLDER, frame: FRAME, hero: HERO, floor: FLOOR, crop: 1, placeholder: true},
};
`);
write(path.join(srcDir, 'Cover.tsx'), `import React from 'react';
import {AnatomyCover, AnatomyCoverProps} from '../../components/AnatomyCover';
import {COVERS} from './covers';

export const ${pascal}Cover: React.FC<AnatomyCoverProps> = ({variant}) => <AnatomyCover spec={COVERS[variant]} />;
`);
write(path.join(srcDir, 'scenes.motion.ts'), `import {MotionSpec} from '../../lib/motion';

// Per-frame state of every moving scene of «${title}» (CLAUDE.md «Motion», src/lib/motion.ts). For each scene or reel:
// - beats are STATES (angles, shares, opacities, a camera), moves between them with beatClock + settle, never a
//   cross-fade of two pictures; a part that turns is rebuilt at its angle every frame;
// - moving parts are dynTube / dynBall / dynSolid (src/lib/assembly.ts) with shapes, drawn with Assembly.svgFaded:
//   the depth order against the static object is ray-tested every frame (src/lib/depth.ts);
// - the camera is camFit(hero box corners, {rect: safeRect({captions}), pins: labels}), not zoom numbers;
// - arrows carry tail + owner, labels and insets carry screen rects.
// The scene .tsx only draws pose(frame). scripts/motion-check.mjs (audit, CI, pregate) walks every frame of MOTION.
export const MOTION: MotionSpec[] = [];
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
r = r.replace("import {FORMAT} from './theme/format';", `import {FORMAT} from './theme/format';\n${imports}`);
r = r.replace(marker, `  <Composition
    id="${pascal}Main"
    component={${pascal}Main}
    schema={episodeSchema}
    width={FORMAT.width}
    height={FORMAT.height}
    fps={FORMAT.fps}
    durationInFrames={1}
    defaultProps={{muteVoice: false, hideCaptions: false, onlyScenes: []}}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, ${pascal}Selected(props.onlyScenes).reduce((a, s) => a + s.durationInFrames, 0))})}
  />
  <Composition id="${pascal}Cover" component={${pascal}Cover} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
${marker}`);
fs.writeFileSync(root, r);

console.log(`Topic ${slug} created:
  ${content}/        brief.yaml (format ${format}, sensitive ${sensitive}), concept.md, storyboard.md, visual-register.json (chapters of «${F.name}»), timing.json, sound-map.json, progress.md, decisions.md
  public/${slug}/audio/vo/
  ${srcDir}/Main.tsx  composition ${pascal}Main registered in src/Root.tsx
  ${srcDir}/scenes.motion.ts  per-frame state of moving scenes (motion-check walks it)
  ${srcDir}/covers.ts, Cover.tsx  composition ${pascal}Cover (variants a/b/c: placeholders to replace)
Next: fill brief.yaml and sources.md, run the researcher. Checks: node scripts/audit.mjs --topic ${slug} [--quick]. Timeline after the voice: node scripts/build-timeline.mjs --topic ${slug}`);
