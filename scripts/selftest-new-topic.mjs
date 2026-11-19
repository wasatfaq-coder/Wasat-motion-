#!/usr/bin/env node
// Self-test of the topic scaffold (root cause of a past miss: scripts/new-topic.mjs lagged behind the cover and
// style rules, so a fresh topic did not even compile). Creates a throw-away topic, then checks that it type-checks,
// lints, passes its own audit and cover-check with ERRORS = 0 (placeholders are warnings), does not report files
// of the root topic, refuses a scene animated the old way (camOn, lerpCam, state outside a *.motion.ts), and removes
// it again; also refuses a review note closed without rootCause and guard.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const slug = 'zz-selftest';
const pascal = 'ZzSelftest';
const root = fs.readFileSync('src/Root.tsx', 'utf8');
const sh = (cmd, args) => execFileSync(cmd, args, {stdio: 'pipe', encoding: 'utf8'});
let failed = null;
try {
  sh('node', ['scripts/new-topic.mjs', slug, 'Самопроверка шаблона']);
  sh('npx', ['tsc', '--noEmit']);
  sh('npx', ['eslint', 'src', '--max-warnings', '0']);
  sh('node', ['scripts/cover-check.mjs', '--quiet', `src/projects/${slug}/covers.ts`]);
  const auditOut = sh('node', ['scripts/audit.mjs', '--scenes', `src/projects/${slug}/scenes`, '--content', `projects/${slug}/content`, '--timeline', `src/projects/${slug}/data/timeline.json`]);
  if (/(?:^|\s)src\/(?:scenes|illustrations)\//.test(auditOut) || /(?:^|\s)src\/(?:Main|Cover)\.tsx/.test(auditOut)) {
    throw new Error(`topic audit reported files of the root topic:\n${auditOut}`);
  }
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
  fs.writeFileSync(`src/projects/${slug}/scenes/Borrowed.ts`, `import {STAND} from '../../elektromotor/stand.parts';\nexport const B = STAND.name;\n`);
  let refused = '';
  try {
    sh('node', ['scripts/audit.mjs', '--only', 'motion', '--scenes', `src/projects/${slug}/scenes`, '--content', `projects/${slug}/content`, '--timeline', `src/projects/${slug}/data/timeline.json`]);
  } catch (e) {
    refused = String(e.stdout || '');
  }
  if (!/motion: .*camOn/.test(refused) || !/motion: .*no state from a \*\.motion\.ts/.test(refused)) throw new Error(`the topic audit did not refuse the old way of animating:\n${refused}`);
  if (!/reuse: .*Borrowed\.ts imports src\/projects\/elektromotor\/stand\.parts/.test(refused)) throw new Error(`the topic audit accepted another topic's object without consent:\n${refused}`);
  if (!/detail: .*RawSolid\.tsx draws kit solids directly/.test(refused)) throw new Error(`the topic audit accepted a solid drawn past Assembly:\n${refused}`);
  // a note closed without its root cause and guard (docs/root-causes.md) must fail the topic audit too
  fs.mkdirSync(`projects/${slug}/content/reviews`, {recursive: true});
  fs.writeFileSync(`projects/${slug}/content/reviews/notes.json`, JSON.stringify([{id: 'T1', status: 'fixed', text: 'arrow in the air', fix: 'moved it'}]));
  let noted = '';
  try {
    sh('node', ['scripts/audit.mjs', '--only', 'motion', '--scenes', `src/projects/${slug}/scenes`, '--content', `projects/${slug}/content`, '--timeline', `src/projects/${slug}/data/timeline.json`]);
  } catch (e) {
    noted = String(e.stdout || '');
  }
  if (!/notes: T1 is fixed without rootCause/.test(noted)) throw new Error(`the topic audit accepted a note closed without its root cause:\n${noted}`);
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
