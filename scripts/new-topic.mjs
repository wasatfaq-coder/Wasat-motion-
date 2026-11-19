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
metaphor_policy: accuracy_first   # §20: literal > schematic > metaphor; a leading metaphor needs a later schematic scene
voice_provider: elevenlabs
voice_id: 3EuKHIEZbSzrHGNmdYsx
voice_model: eleven_v4
voice_budget: null
captions: on
music: forbidden
cover: on
`);
write(path.join(content, 'distinct.json'), json({_why: 'MASTER_PROMPT_FINAL §25.2: after the script, compare this topic with the last finished one on six axes; at least four must differ. Replace status with against + axes.', status: 'pending', against: '', axes: {structure: {this: '', previous: '', differs: null}, opening: {this: '', previous: '', differs: null}, signatureShot: {this: '', previous: '', differs: null}, camera: {this: '', previous: '', differs: null}, soundShape: {this: '', previous: '', differs: null}, ending: {this: '', previous: '', differs: null}}}));
write(path.join(content, 'progress.md'), `# Прогресс: ${title}\n\nСоздано ${today}. Слаг: \`${slug}\`.\n\n## Шаги (§8)\n- [ ] Бриф и источники\n- [ ] analysis.md (topic-analyst): оценка длительности и один выпуск или серия\n- [ ] Сценарий и реестр сцен/метафор (metaphor-auditor, fact-checker)\n- [ ] СТОП 1: сценарий, раскадровка, реестр метафор; для ведущей метафоры — metaphor-prep.md и проверка эскиза\n- [ ] Стайлфреймы локаций и тестовый фрагмент\n- [ ] СТОП 2\n- [ ] Аниматик (стоп-кадры под голос)\n- [ ] Сборка, аудит, gate\n- [ ] СТОП 3: полный черновик\n- [ ] Мастер (scripts/master.mjs)\n- [ ] Превью 360×640 из MP4, просмотр со звуком, зрительский пересказ и независимое подтверждение правок\n`);
write(path.join(content, 'decisions.md'), `# Решения: ${title}\n\n| Дата | Решение | Кто |\n| --- | --- | --- |\n`);
write(path.join(content, 'sources.md'), `# Источники\n\nКаждый факт: S<n>, ссылка, страница/раздел, границы применимости (§7).\n`);
write(path.join(content, 'storyboard.md'), `# Раскадровка: ${title}\n\nДля каждой сцены (§8, §20, §22.5): мысль · режим (literal / schematic / metaphor / symbol) · локация · главный объект · движение · якорное слово · звук · ожидаемый пересказ · ошибочное прочтение · смысловая пауза.\n\n| Сцена | Мысль | Режим | Локация | Главный объект | Метафоры (id) | Якорное слово | Что говорит голос | Что показывает кадр | Звук | Ожидаемый пересказ | Ошибочное прочтение | Смысловая пауза (диапазон и цель) |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\nПеред СТОП 1 сверь каждую строку со списком типовых ошибок §20.5: кадр не противоречит голосу, единицы совпадают, один образ — один смысл, гипотезы помечены в голосе. Ориентир темпа 1,5–3 с (§19.3): длинный план допустим, если действие развивается; паузу без события запиши в последней колонке.\n`);
write(path.join(content, 'metaphor-prep.md'), `# Подготовка визуальной метафоры: ${title}\n\nЗаполни, если метафора ведёт ключевую сцену. До СТОП 1 и до моделирования. Прикрепи результат metaphor-auditor и решение из decisions.md. Если ведущей метафоры нет, так и напиши в первой строке.\n\n| Пункт | Что записать |\n| --- | --- |\n| Мысль и источник | Одна фраза для пересказа, источник и пределы утверждения |\n| Варианты | Два узнаваемых образа и точная схема для сравнения |\n| Соответствия | Что означает каждый предмет, действие и направление |\n| Досье | Как узнать предмет по силуэту, какие детали определяют его функцию, на какие материалы опираемся |\n| Ошибочное прочтение | Что зритель может понять неверно и как это снимает кадр или голос |\n| Кадры | Общий план, крупный план и точная схема. Отметь объект и действие на каждом |\n| Проверка эскиза | На 360×640 без озвучки рецензент называет видимый предмет и действие. Запиши ответ и замечания |\n| Схема следом | Id сцены реестра, где роли и связи показаны буквально или схемой |\n| Решение | Выбранный образ, основание выбора, ссылка на проверку и согласование |\n`);
write(path.join(content, 'series-plan.md'), `# План серии: ${title}\n\nЗаполни, только если тема не помещается в один выпуск (§19.3, дополнение 4.1). Один выпуск эту таблицу не обязан заполнять фактами: напиши «один выпуск» и вопрос, на который он отвечает.\n\n| Вопрос или связь | Выпуск | Сцена | Что зритель уже знает | Законченный ответ |\n| --- | --- | --- | --- | --- |\n`);
write(path.join(content, 'hooks.json'), json({_doc: 'MASTER_PROMPT_FINAL §7: three hook variants; record the chosen one here and in decisions.md; the ending answers its promise.', variants: ['a', 'b', 'c'].map((id) => ({id, firstFrame: '', action: '', firstPhrase: '', promise: '', answerAt: ''})), chosen: null}));
write(path.join(content, 'script.json'), json({scenes: []}));
write(path.join(content, 'sound-map.json'), json({_doc: 'Per scene: [{beat, offset, file, volume, reason}]. Review after every scene change, then node scripts/audit.mjs --stamp-sfx.'}));
write(path.join(content, 'timing.json'), json({firstVoiceStartFrames: 6, lastTailMs: 300, pauses: {}, extraTailFrames: {}, spokenNumbers: {}}));
write(path.join(content, 'visual-register.json'), json({
  _choose: 'Way of showing, per scene, first that carries the idea (§20.1, §24): literal (real objects, interfaces, data) → schematic (structure, steps, scale) → metaphor (a machine for what has no form; approved at STOP 1) → symbol (a person\'s state only: a symbol from src/lib/symbols/catalog.json, with cause, appearsOn and leavesOn beats). Interfaces and data are never metaphor or symbol.',
  _doc: 'MASTER_PROMPT_FINAL §20: every scene declares location and mode; every metaphor is justified and approved at STOP 1; measured data sits on a frontal plate. A leading metaphor sets leadingMetaphor (metaphor id) and schemeScene (a later schematic scene id). interface: real requires literal mode. whyNotLiteral and rationale are the same slot.',
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
r = r.replace("import {Cover, coverSchema} from './Cover';", `import {Cover, coverSchema} from './Cover';\n${imports}`);
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
  ${content}/        brief.yaml, storyboard.md, metaphor-prep.md, series-plan.md, visual-register.json, timing.json, sound-map.json, progress.md, decisions.md
  public/${slug}/audio/vo/
  ${srcDir}/Main.tsx  composition ${pascal}Main registered in src/Root.tsx
  ${srcDir}/scenes.motion.ts  per-frame state of moving scenes (motion-check walks it)
  ${srcDir}/covers.ts, Cover.tsx  composition ${pascal}Cover (variants a/b/c: placeholders to replace)
Next: fill brief.yaml and sources.md, run topic-analyst. Timeline: node scripts/build-timeline.mjs --content ${content} --public-prefix ${slug} --out ${srcDir}/data/timeline.json`);
