#!/usr/bin/env node
// Rig check without rendering (MASTER_PROMPT_FINAL §22, §12): the walk keeps the stance foot fixed in the world
// (no foot sliding), bones keep their lengths in every frame, IK reaches every target of the stock poses, finger
// chains are finite, and every outfit draws at least 40 parts (§22.2). Exit code 1 on any failure.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const load = (f) => tsImport(pathToFileURL(resolve(root, f)).href, import.meta.url);
const R = await load('src/lib/rig.ts');
const C = await load('src/lib/character.ts');
const {anatomyProjection} = await load('src/lib/anatomy.tsx');
const P = anatomyProjection(14);
const fails = [];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const FPS = 60;

// 1) walk: while a foot is on the ground it does not move between frames; bones are rigid; legs reach
for (const yaw of [0, -Math.PI / 3, 2]) {
  let prev = null;
  let slide = 0;
  for (let f = 0; f <= 4 * FPS; f++) {
    const pose = R.walk(f / FPS, {yaw});
    const s = R.solve(pose);
    for (const side of ['L', 'R']) {
      if (Math.abs(dist(s.hip[side], s.knee[side]) - R.DIM.thigh) > 1e-6 || Math.abs(dist(s.knee[side], s.ankle[side]) - R.DIM.shin) > 1e-6) fails.push(`walk yaw ${yaw} frame ${f}: ${side} leg bone length changed`);
      if (!s.reached[`leg${side}`]) fails.push(`walk yaw ${yaw} frame ${f}: ${side} foot out of reach`);
      const foot = side === 'L' ? pose.footL : pose.footR;
      const was = prev && (side === 'L' ? prev.footL : prev.footR);
      if (was && foot[2] <= R.DIM.ankle + 1e-9 && was[2] <= R.DIM.ankle + 1e-9) slide = Math.max(slide, dist(foot, was));
    }
    prev = pose;
  }
  if (slide > 1e-6) fails.push(`walk yaw ${yaw}: stance foot slides ${slide.toFixed(4)} units per frame`);
}

// 2) stock poses: IK reaches, arms rigid, fingers finite
const poses = {
  stand: R.stand([0, 0, 0], 0.4),
  sit: R.sit([0, 0, 21], -0.7),
  reach: R.reach(R.stand([0, 0, 0], 0), 'L', [16, 8, 50], 1, R.HAND_POSES.press, [1, 0, 0]),
};
for (const [name, pose] of Object.entries(poses)) {
  const s = R.solve(pose);
  for (const [k, ok] of Object.entries(s.reached)) if (!ok) fails.push(`${name}: ${k} target out of reach`);
  for (const side of ['L', 'R']) {
    if (Math.abs(dist(s.shoulder[side], s.elbow[side]) - R.DIM.upper) > 1e-6 || Math.abs(dist(s.elbow[side], s.wrist[side]) - R.DIM.fore) > 1e-6) fails.push(`${name}: ${side} arm bone length changed`);
    if (s.hand[side].chain.flat(2).some((v) => !Number.isFinite(v))) fails.push(`${name}: ${side} finger chain not finite`);
  }
  for (const fp of Object.keys(R.HAND_POSES)) {
    const h = R.solve({...pose, fingersL: R.HAND_POSES[fp]}).hand.L;
    if (h.chain.flat(2).some((v) => !Number.isFinite(v))) fails.push(`${name}/${fp}: finger chain not finite`);
  }
}

// 3) detail norm: every outfit draws ≥ 40 parts
for (const [name, outfit] of Object.entries(C.OUTFITS)) {
  const {parts, svg} = C.drawCharacter(R.solve(poses.stand), P, outfit);
  if (parts < 40) fails.push(`outfit ${name}: ${parts} parts < 40 (§22.2)`);
  if (/NaN/.test(svg)) fails.push(`outfit ${name}: NaN in markup`);
  if (!process.argv.includes('--quiet')) console.log(`outfit ${name}: ${parts} parts`);
}

if (fails.length) {
  console.log(fails.slice(0, 40).join('\n'));
  console.log(`rig-check failed: ${fails.length} problem(s)`);
  process.exitCode = 1;
} else console.log('rig-check passed: no foot sliding, rigid bones, targets reached, finite fingers, ≥ 40 parts per outfit');
