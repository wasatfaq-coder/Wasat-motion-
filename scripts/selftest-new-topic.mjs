#!/usr/bin/env node
// Self-test of the topic scaffold (root cause of a past miss: scripts/new-topic.mjs lagged behind the cover and
// style rules, so a fresh topic did not even compile). Creates a throw-away topic, then checks that it type-checks,
// lints, passes its own audit and cover-check with ERRORS = 0 (placeholders are warnings), refuses a scene animated
// the old way (camOn, lerpCam, state outside a *.motion.ts), a solid past Assembly, a sample imported without consent,
// a repeated defect fixed without a guard, the rules of the visual register (mechanism cards, one mechanism per
// chapter, one dark scene, the image journal, sensitive topics) and removes it again.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const slug = 'zz-selftest';
const pascal = 'ZzSelftest';
const root = fs.readFileSync('src/Root.tsx', 'utf8');
const sh = (cmd, args) => execFileSync(cmd, args, {stdio: 'pipe', encoding: 'utf8'});
let failed = null;
try {
  sh('node', ['scripts/new-topic.mjs', slug, 'Самопроверка шаблона', '--format', 'why']);
  sh('npx', ['tsc', '--noEmit']);
  sh('npx', ['eslint', 'src', '--max-warnings', '0']);
  sh('node', ['scripts/cover-check.mjs', '--quiet', `src/projects/${slug}/covers.ts`]);
  sh('node', ['scripts/audit.mjs', '--topic', slug]);
  if (!fs.readFileSync('src/Root.tsx', 'utf8').includes(`id="${pascal}Cover"`)) throw new Error('the scaffold did not register the cover composition');
  if (!fs.existsSync(`src/projects/${slug}/scenes.motion.ts`)) throw new Error('the scaffold did not create scenes.motion.ts');
  // the old way of animating (root cause of the motor-stand reel defects) must fail the topic audit
  fs.writeFileSync(
    `src/projects/${slug}/scenes/OldWay.tsx`,
    `import React from 'react';\nimport {useCurrentFrame} from 'remotion';\nimport {Kit} from '../../../lib/anatomy';\nimport {camOn, lerpCam} from '../../../lib/camera';\nexport const OldWay: React.FC = () => {\n  const f = useCurrentFrame();\n  const a = camOn([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]);\n  const c = lerpCam(a, a, f / 10);\n  return <Kit svg={String(c.zoom)} />;\n};\n`,
  );
  // a solid drawn straight from the kit, past Assembly, escapes the detail norm (§22.2): it must fail the topic audit
  fs.writeFileSync(
    `src/projects/${slug}/scenes/RawSolid.tsx`,
    `import * as K from '../../../vendor/anatomy/iso-kit';\nimport {anatomyProjection} from '../../../lib/anatomy';\nexport const RAW = K.solidSvg(K.slabOf({x: 0, y: 0, w: 4, d: 4, r: 1}, 0, 4, anatomyProjection(10)));\n`,
  );
  // a finished object of another topic imported without consent (§4) must fail the topic audit
  fs.writeFileSync(`src/projects/${slug}/scenes/Borrowed.ts`, `import {KIT_PAGES} from '../../../samples/UniversalKitSample';\nexport const B = KIT_PAGES.length;\n`);
  let refused = '';
  try {
    sh('node', ['scripts/audit.mjs', '--only', 'motion', '--quick', '--topic', slug]);
  } catch (e) {
    refused = String(e.stdout || '');
  }
  if (!/motion: .*camOn/.test(refused) || !/motion: .*no state from a \*\.motion\.ts/.test(refused)) throw new Error(`the topic audit did not refuse the old way of animating:\n${refused}`);
  if (!/reuse: .*Borrowed\.ts imports src\/samples\/UniversalKitSample/.test(refused)) throw new Error(`the topic audit accepted another topic's object without consent:\n${refused}`);
  if (!/detail: .*RawSolid\.tsx draws kit solids directly/.test(refused)) throw new Error(`the topic audit accepted a solid drawn past Assembly:\n${refused}`);
  for (const f of ['OldWay.tsx', 'RawSolid.tsx', 'Borrowed.ts']) fs.rmSync(`src/projects/${slug}/scenes/${f}`);
  const audit = () => {
    try {
      return {code: 0, out: sh('node', ['scripts/audit.mjs', '--quick', '--topic', slug])};
    } catch (e) {
      return {code: e.status ?? 1, out: String(e.stdout || '')};
    }
  };
  const expectError = (what, re) => {
    const r = audit();
    if (r.code === 0 || !re.test(r.out)) throw new Error(`the topic audit accepted ${what}:\n${r.out}`);
  };
  // a repeated defect fixed without its root cause and guard (decision 4); an old status (decision 15)
  const notes = `projects/${slug}/content/reviews/notes.json`;
  fs.writeFileSync(notes, JSON.stringify([{id: 'T1', status: 'fixed', repeat: true, text: 'arrow in the air', fix: 'moved it'}]));
  expectError('a repeated defect fixed without a guard', /notes: T1 is a repeated defect fixed without rootCause/);
  fs.writeFileSync(notes, JSON.stringify([{id: 'T2', status: 'verified', text: 'x'}]));
  expectError('the old status «verified»', /notes: T2 has status «verified»/);
  fs.writeFileSync(notes, JSON.stringify([{id: 'T3', status: 'fixed', text: 'first time', fix: 'done'}]));
  if (audit().code !== 0) throw new Error('the topic audit refused a first-time defect fixed in the topic (decision 4)');
  // the visual register: mechanism card, one mechanism per chapter, one dark scene, the old metaphor registry
  const regFile = `projects/${slug}/content/visual-register.json`;
  const base = JSON.parse(fs.readFileSync(regFile, 'utf8'));
  const card = {name: 'весы привычки', idea: 'x', parts: [{part: 'чаша', claim: 'C1', source: 'S1'}], laws: 'x', verb: 'перевешивает', simplifies: 'x', misread: 'x', truth: 'x', status: 'approved'};
  const put = (r) => fs.writeFileSync(regFile, JSON.stringify({...base, ...r}));
  put({mechanisms: {m1: {name: 'насос'}}, scenes: {'scene-01': {chapter: 1, mode: 'mechanism', mechanism: 'm1', location: 'кухня'}}});
  expectError('a mechanism without its card', /mechanism «m1»: card misses/);
  put({mechanisms: {m1: card, m2: {...card, name: 'насос'}}, scenes: {'scene-01': {chapter: 1, mode: 'mechanism', mechanism: 'm1', location: 'кухня'}, 'scene-02': {chapter: 1, mode: 'mechanism', mechanism: 'm2', location: 'кухня'}}});
  expectError('two mechanisms in one chapter', /one mechanism per chapter/);
  put({scenes: {'scene-01': {chapter: 1, mode: 'literal', location: 'а', dark: true}, 'scene-02': {chapter: 2, mode: 'literal', location: 'б', dark: true}}});
  expectError('two dark scenes', /dark scene is used once/);
  put({metaphors: {x: {}}, scenes: {}});
  expectError('the old metaphor registry', /`metaphors` is the old registry/);
  // the image journal: another topic's mechanism is refused, the same series is allowed
  const LOG = 'docs/style/images-log.json';
  const log = fs.readFileSync(LOG, 'utf8');
  try {
    fs.writeFileSync(LOG, JSON.stringify({entries: [{topic: 'other', kind: 'mechanism', name: 'Весы привычки', series: 'привычки'}]}));
    put({mechanisms: {m1: card}, scenes: {'scene-01': {chapter: 1, mode: 'mechanism', mechanism: 'm1', location: 'кухня'}}});
    expectError('a mechanism of another topic', /journal: mechanism «весы привычки» was already used by «other»/);
    put({series: 'привычки', mechanisms: {m1: card}, scenes: {'scene-01': {chapter: 1, mode: 'mechanism', mechanism: 'm1', location: 'кухня'}}});
    if (audit().code !== 0) throw new Error('the topic audit refused a mechanism repeated inside its series (decision 14)');
  } finally {
    fs.writeFileSync(LOG, log);
  }
  // a religion topic must confirm the sensitive rules (decision 16)
  put({scenes: {}});
  const briefFile = `projects/${slug}/content/brief.yaml`;
  fs.writeFileSync(briefFile, fs.readFileSync(briefFile, 'utf8').replace(/^sensitive: .*$/m, 'sensitive: religion'));
  expectError('a religion topic without the sensitive checklist', /sensitive: religion topic; confirm/);
} catch (e) {
  failed = String(e.stdout || '') + String(e.stderr || '') + String(e.message || '');
} finally {
  for (const d of [`projects/${slug}`, `src/projects/${slug}`, `public/${slug}`]) fs.rmSync(d, {recursive: true, force: true});
  fs.writeFileSync('src/Root.tsx', root);
}
if (failed) {
  console.log(`selftest-new-topic FAILED:\n${failed.slice(-1500)}`);
  process.exitCode = 1;
} else console.log('selftest-new-topic ok: a fresh topic compiles, lints, audits and checks its covers with 0 errors');
