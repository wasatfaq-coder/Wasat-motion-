#!/usr/bin/env node
// Motion check for every topic (MASTER_PROMPT_FINAL §19.3, §20.4, §22): the defects of the motor-stand test reel,
// caught by a machine before a person or a gate agent sees the video. Two layers:
//
// 1) GEOMETRY, no rendering (audit, CI, pregate): every `*.motion.ts` under src/ exports MOTION: MotionSpec[]
//    (src/lib/motion.ts). The check walks EVERY frame of every spec and reports
//      depth      a moving part that must be both in front of and behind another (paint-order conflict, depth.ts)
//      through    a moving part sinking into a static part in an in-between pose (not only at the beats)
//      air        an arrow whose tail is not on the part it belongs to
//      crop       a hero point or a plate (label, inset) outside the safe rect of the vertical frame
//      layout     the hero filling too little of the rect, or sitting in its top or bottom part (an empty half)
//      jerk       a point that jumps or changes speed abruptly between two frames (not on a declared cut)
//      pop        a part, arrow or plate that appears or vanishes within a frame or two instead of fading
//      read       a plate with text that is fully visible for less than the time to read it (chars ÷ readCps + readPad)
//      seam       a looping reel whose last frame does not lead into the first
//    node scripts/motion-check.mjs [files…]            (default: every src/**/*.motion.ts)
//
// 2) PIXELS of a rendered video (review-video, the quality gate): any mp4 of any topic.
//      crop (ink on the left/right frame edge inside the graphics band), layout (the picture fills too little of the
//      band or sits in its top/bottom part), pop/jerk (a tile of the frame changes in one frame while it is still
//      before and after), seam (with --loop).
//    node scripts/motion-check.mjs --video <file.mp4> [--loop] [--cuts 120,240] [--captions]
//
// --selftest runs both layers on deliberately broken inputs (scripts/fixtures/motion-broken.motion.ts and synthetic
// frames) and fails unless EVERY defect kind is caught and the clean inputs pass. Exit code 1 on any problem.
import {execFileSync} from 'node:child_process';
import {readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--video', '--cuts'].includes(argv[i - 1]));
const quiet = flag('quiet');

// ── thresholds (screen px at 1080×1920; kit units for geometry)
export const LIMITS = {
  sink: 0.6, // kit units a moving part may press into a static one
  air: 0.35, // room units between an arrow tail and its owner's surface
  fillMin: 0.55, // the hero spans at least this share of the rect's width or height
  tallMin: 0.75, // a vertical frame: the hero and its plates span at least this share of the rect's HEIGHT (a wide, low
  // picture fitted by width leaves empty bands above and below, R1 2026-11-19)
  offCentre: 0.18, // the hero centre may sit this share of the rect height off its centre
  jump: 40, // px a point may move in one frame
  accel: 8, // px/frame² a point may change speed by
  fade: 0.34, // opacity a part may gain or lose in one frame
  outline: 2.5, // px of dark outline a LIGHT-filled arrow head needs to read on the light solids of the house style (R7)
  still: 1, // px/frame below which a settling part reads as stopped
  late: 8, // frames an arrow may stay hidden after its owner has stopped (it annotates the pose it stops in, R6)
  tipOn: 14, // px from an arrow tip to the axis of a moving body that is not its owner (the head lands on it, R4)
  readCps: 13, // characters per second a viewer reads a label at (Cyrillic and Latin alike; spaces do not count)
  readPad: 1.2, // seconds to find the label and its leader before reading starts
  readMin: 1.5, // seconds any label stays, however short (a single letter still has to be found)
  tips: 40, // px between the tips of two visible arrows (closer, two arrows read as one bar, R4 2026-11-19)
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'vendor') return [];
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.motion.ts') ? [p] : [];
  });

// ───────────────────────────── geometry layer ─────────────────────────────
let kit;
const loadKit = async () => {
  kit ??= {
    ...(await tsImport(pathToFileURL(join(root, 'src/lib/assembly.ts')).href, import.meta.url)),
    camera: await tsImport(pathToFileURL(join(root, 'src/lib/camera.tsx')).href, import.meta.url),
  };
  return kit;
};

/** points inside a shape: along a tube's axis, a ball's centre, a grid of a solid's bounds kept where sdf < 0 */
const insidePoints = (A, shape) => {
  if (shape.kind === 'tube') {
    const out = [];
    for (let i = 1; i < shape.points.length; i++) {
      const a = shape.points[i - 1];
      const b = shape.points[i];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.8));
      for (let k = 0; k <= n; k++) out.push(a.map((v, j) => v + ((b[j] - v) * k) / n));
    }
    return out;
  }
  if (shape.kind === 'ball') return [shape.o];
  const {min, max} = A.boundsOf(shape);
  const out = [];
  const n = 5;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++) {
        const p = [min[0] + ((max[0] - min[0]) * (i + 0.5)) / n, min[1] + ((max[1] - min[1]) * (j + 0.5)) / n, min[2] + ((max[2] - min[2]) * (k + 0.5)) / n];
        if (A.sdf(shape, p) < -0.15) out.push(p);
      }
  return out;
};
const boxesMeet = (a, b) => a.min.every((v, i) => v <= b.max[i]) && b.min.every((v, i) => v <= a.max[i]);
const nameOf = (s) => `${s.name ?? ''} ${s.owner ?? ''}`;

/** Check one MotionSpec frame by frame. Returns problems [{kind, frame, text}]. */
export const checkSpec = async (spec) => {
  const {A, camera} = await loadKit();
  const problems = [];
  const add = (kind, frame, text) => problems.push({kind, frame, text});
  const once = new Set();
  const addOnce = (kind, key, frame, text) => {
    if (once.has(`${kind}|${key}`)) return;
    once.add(`${kind}|${key}`);
    add(kind, frame, text);
  };
  const cuts = new Set(spec.cuts ?? []);
  const tracks = []; // per frame: Map name → {x, y, o}
  for (let f = 0; f < spec.frames; f++) {
    const pose = spec.pose(f);
    const room = (p) => [p[0] / pose.unit, p[1] / pose.unit, p[2] / pose.unit];
    const scr = (p) => camera.screenOf(pose.cam, room(p));
    const live = pose.extra.filter((d) => (d.opacity ?? 1) > 0.05);
    // depth: the order the scene paints, with its conflicts
    const plan = pose.assembly.paintPlan({}, {extra: pose.extra});
    // a cycle is allowed only where every link is a joint by design (parts of one body, or a declared touch pair)
    const groupOf = (n) => n.replace(/^[^.]+\.(?=brush|bearing|axis|wire)/, '').split(/[.:#]/)[0];
    const touchPairs = pose.touch ?? [];
    const joined = (a, b) => groupOf(a) === groupOf(b) || touchPairs.some(([x, y]) => (a.startsWith(x) && b.includes(y)) || (b.startsWith(x) && a.includes(y)));
    for (const c of plan.conflicts) {
      const ring = c.split(' → ');
      const open = ring.map((a, i) => [a, ring[(i + 1) % ring.length]]).filter(([a, b]) => !joined(a, b));
      if (open.length) addOnce('depth', ring.slice().sort().join('|'), f, `paint-order cycle ${c} at frame ${f} (${open.map(([a, b]) => `${a} / ${b}`).join(', ')} are not joined): split the moving part into shorter pieces (dynTube maxLength)`);
    }
    // a moving part without shapes cannot be ordered by depth: only annotations may go without
    for (const d of pose.extra) if (!d.shapes?.length && !d.annotation) addOnce('depth', `noshape|${d.name}`, f, `${d.name} has no shapes and is not marked annotation: build it with dynTube / dynBall / dynSolid so its depth can be solved`);
    // through: moving parts against static solids, in this very pose
    const touch = pose.touch ?? [];
    for (const d of live) {
      for (const shape of d.shapes) {
        const bd = A.boundsOf(shape);
        let pts = null;
        for (const s of pose.assembly.R.solids) {
          if (touch.some(([a, b]) => d.name.startsWith(a) && nameOf(s).includes(b))) continue;
          if (!boxesMeet(bd, A.boundsOf(s))) continue;
          pts ??= insidePoints(A, shape);
          const deepest = Math.min(...pts.map((p) => A.sdf(s, p)));
          if (deepest < -LIMITS.sink) addOnce('through', `${d.name.split(':')[0]}|${s.name}`, f, `${d.name} sinks ${(-deepest).toFixed(1)} units into ${s.name} at frame ${f}`);
        }
      }
    }
    // heads: two visible arrows whose heads meet read as one bar; an arrow head on a field-line head reads as one
    // figure. A head is sampled from its tip back along the shaft (HEAD_LEN kit units), not by its tip alone (R5).
    const tipped = pose.arrows.filter((x) => x.opacity > 0.05 && x.tip);
    const headPts = (tip, tail) => {
      const v = tail.map((c, k) => c - tip[k]);
      const l = Math.hypot(...v) || 1;
      return [0, 0.5, 1].map((s) => tip.map((c, k) => c + (v[k] / l) * Math.min(l, HEAD_LEN) * s));
    };
    const near = (pa, pb) => Math.min(...pa.flatMap((a) => pb.map((b) => Math.hypot(scr(a)[0] - scr(b)[0], scr(a)[1] - scr(b)[1]))));
    for (let i = 0; i < tipped.length; i++)
      for (let j = i + 1; j < tipped.length; j++) {
        const d = near(headPts(tipped[i].tip, tipped[i].tail), headPts(tipped[j].tip, tipped[j].tail));
        if (d < LIMITS.tips) addOnce('arrows', `${tipped[i].name}|${tipped[j].name}`, f, `the heads of ${tipped[i].name} and ${tipped[j].name} are ${d.toFixed(0)} px apart at frame ${f} (≥ ${LIMITS.tips}); shorten them so they do not read as one bar`);
      }
    for (const a of tipped)
      for (const h of (pose.heads ?? []).filter((x) => x.opacity > 0.05)) {
        const d = near(headPts(a.tip, a.tail), h.base ? headPts(h.at, h.base) : [h.at]);
        if (d < LIMITS.tips) addOnce('arrows', `${a.name}|${h.name}`, f, `the head of ${a.name} is ${d.toFixed(0)} px from the head of ${h.name} at frame ${f} (≥ ${LIMITS.tips}); the two heads read as one figure`);
      }
    // a light-filled head (paper, shade, top) must carry a dark outline, or it vanishes on a cream body (R7)
    for (const a of tipped) {
      for (const m of String(a.svg ?? '').matchAll(/fill:var\(--anatomy-(shade-\d|paper|top)\);stroke:([^;]+);stroke-width:([\d.]+)px/g))
        if (Number(m[3]) < LIMITS.outline || !/anatomy-(hi|lit|lo)/.test(m[2])) addOnce('arrows', `${a.name}|outline`, f, `${a.name}: a light head (${m[1]}) with a ${m[3]} px ${m[2]} outline at frame ${f}; give it a dark outline ≥ ${LIMITS.outline} px so it reads on light solids`);
    }
    // a head that lands on another moving body (a bar, a wire that is not its owner) reads as touching it
    for (const a of tipped) {
      const [tx, ty] = scr(a.tip);
      for (const d of pose.extra) {
        if (d.annotation || (d.opacity ?? 1) <= 0.05 || d.name.startsWith(a.owner) || (a.along ?? []).some((x) => d.name.startsWith(x)) || !d.shapes?.length) continue;
        const hit = d.shapes.flatMap((sh) => insidePoints(A, sh)).some((p) => Math.hypot(scr(p)[0] - tx, scr(p)[1] - ty) < LIMITS.tipOn);
        if (hit) addOnce('arrows', `${a.name}|${d.name.split(':')[0]}`, f, `the head of ${a.name} lands on ${d.name.split(':')[0]} at frame ${f} (< ${LIMITS.tipOn} px); move or shorten the arrow`);
      }
    }
    // air: arrow tails on their owners
    for (const a of pose.arrows.filter((x) => x.opacity > 0.05)) {
      const own = [...pose.extra.filter((d) => d.name.startsWith(a.owner)).flatMap((d) => d.shapes), ...pose.assembly.R.solids.filter((s) => nameOf(s).includes(a.owner))];
      if (!own.length) {
        addOnce('air', a.name, f, `${a.name}: owner «${a.owner}» is not in the frame ${f}`);
        continue;
      }
      const gap = Math.min(...own.map((s) => A.sdf(s, a.tail))) / pose.unit;
      if (gap > LIMITS.air) addOnce('air', a.name, f, `${a.name}: tail ${gap.toFixed(2)} room units off «${a.owner}» at frame ${f} (≤ ${LIMITS.air})`);
    }
    // crop: hero points and plates inside the rect
    const r = pose.rect;
    const xy = pose.keep.map((k) => scr(k.at));
    const out = pose.keep.filter((_, i) => xy[i][0] < r.x0 - 1 || xy[i][0] > r.x1 + 1 || xy[i][1] < r.y0 - 1 || xy[i][1] > r.y1 + 1);
    if (out.length) addOnce('crop', 'keep', f, `${out.length} hero point(s) outside the safe rect at frame ${f} (${out.map((k) => k.name).slice(0, 4).join(', ')})`);
    for (const p of pose.plates.filter((x) => x.opacity > 0.05))
      if (p.x < r.x0 - 1 || p.y < r.y0 - 1 || p.x + p.w > r.x1 + 1 || p.y + p.h > r.y1 + 1) addOnce('crop', p.name, f, `plate ${p.name} leaves the safe rect at frame ${f}`);
    // layout: the hero fills the rect and sits in its middle
    if (xy.length) {
      const xs = xy.map((p) => p[0]);
      const ys = xy.map((p) => p[1]);
      const fill = Math.max((Math.max(...xs) - Math.min(...xs)) / (r.x1 - r.x0), (Math.max(...ys) - Math.min(...ys)) / (r.y1 - r.y0));
      const plateYs = pose.plates.filter((x) => x.opacity > 0.05).flatMap((p) => [p.y, p.y + p.h]);
      const top = Math.min(...ys, ...plateYs);
      const bottom = Math.max(...ys, ...plateYs);
      const off = ((top + bottom) / 2 - (r.y0 + r.y1) / 2) / (r.y1 - r.y0);
      if (fill < LIMITS.fillMin) addOnce('layout', 'fill', f, `the hero spans ${(fill * 100).toFixed(0)} % of the safe rect at frame ${f} (≥ ${LIMITS.fillMin * 100} %)`);
      const tall = (bottom - top) / (r.y1 - r.y0);
      if (r.y1 - r.y0 > r.x1 - r.x0 && tall < LIMITS.tallMin)
        addOnce('layout', 'tall', f, `the picture spans ${(tall * 100).toFixed(0)} % of the safe rect's height at frame ${f} (≥ ${LIMITS.tallMin * 100} %): a wide, low composition leaves empty bands above and below; frame closer on the hero (camFit on its core) and let the environment run past the sides`);
      if (Math.abs(off) > LIMITS.offCentre) addOnce('layout', 'centre', f, `the picture sits in the ${off < 0 ? 'top' : 'bottom'} part of the frame at frame ${f} (centre ${(off * 100).toFixed(0)} % off; the other part is empty)`);
    }
    // tracks for jerk / pop / seam
    const t = new Map();
    pose.keep.forEach((k, i) => t.set(`keep:${k.name}`, {x: xy[i][0], y: xy[i][1], o: 1}));
    for (const d of pose.extra) {
      const [x, y] = scr(d.at);
      t.set(`part:${d.name}`, {x, y, o: d.opacity ?? 1});
    }
    for (const a of pose.arrows) {
      const [x, y] = scr(a.tail);
      t.set(`arrow:${a.name}`, {x, y, o: a.opacity});
    }
    for (const p of pose.plates) t.set(`plate:${p.name}`, {x: p.x, y: p.y, o: p.opacity});
    tracks.push(t);
  }
  // read: a plate with text must stay fully visible (opacity ≥ 0.95) for long enough to be read, counted from the
  // first frame it is fully visible; in a looping reel a plate that is still up at the last frame goes on from frame 0.
  // Root cause: only caption pages had a hold rule (check-text); a label could flash for a few frames and pass.
  if (!spec.stills) {
    const texts = new Map();
    for (let f = 0; f < spec.frames; f++) for (const p of spec.pose(f).plates) if (p.text) texts.set(p.name, p.text);
    for (const [name, text] of texts) {
      const full = (f) => (tracks[f].get(`plate:${name}`)?.o ?? 0) >= 0.95;
      const start = Array.from({length: spec.frames}, (_, f) => f).find(full);
      if (start === undefined) continue; // never fully visible: the crop and pop checks speak for it
      let end = start;
      while (end < spec.frames && full(end)) end++;
      let run = end - start;
      if (spec.loop && end >= spec.frames) for (let f = 0; f < start && full(f); f++) run++;
      const need = Math.max(LIMITS.readMin, [...text].filter((c) => !/\s/.test(c)).length / LIMITS.readCps + LIMITS.readPad);
      if (run / spec.fps < need - 1e-6) add('read', start, `plate ${name} «${text}» is fully visible for ${(run / spec.fps).toFixed(2)} s from frame ${start}; reading it needs ${need.toFixed(2)} s`);
    }
  }
  // late: an arrow that comes back after its owner stopped leaves the pose bare (the owner settles, the note lags)
  const owners = new Map();
  for (let f = 0; f < spec.frames; f++) for (const a of spec.pose(f).arrows) owners.set(a.name, a.owner);
  const ownerMove = (f, owner) => {
    let m = 0;
    for (const [k, q] of tracks[f]) {
      if (!k.startsWith(`part:${owner}`)) continue;
      const p = tracks[f - 1].get(k);
      if (p && p.x !== undefined) m = Math.max(m, Math.hypot(q.x - p.x, q.y - p.y));
    }
    return m;
  };
  for (const [name, owner] of owners) {
    let run = 0;
    let afterMove = false;
    let prevMoved = false;
    for (let f = 1; f < tracks.length; f++) {
      const o = tracks[f].get(`arrow:${name}`)?.o ?? 0;
      const moved = ownerMove(f, owner) >= LIMITS.still;
      if (o >= 0.5) {
        if (run > LIMITS.late && afterMove) addOnce('late', name, f, `${name} comes back ${run} frames after «${owner}» stopped (frame ${f}; ≤ ${LIMITS.late}): fade it in on the owner's eased motion, not on the linear share of the move`);
        run = 0;
      } else if (!moved) {
        if (run === 0) afterMove = prevMoved;
        run++;
      } else run = 0;
      prevMoved = moved;
    }
  }
  // continuity between consecutive frames (and last → first for a loop)
  const pairs = [];
  for (let f = 1; f < tracks.length; f++) if (!cuts.has(f)) pairs.push([f - 1, f]);
  if (spec.loop && tracks.length > 1) pairs.push([tracks.length - 1, 0]);
  const speed = new Map(); // name → last velocity, for the acceleration test
  let last = -1;
  for (const [a, b] of pairs) {
    if (a !== last) speed.clear(); // a declared cut: speeds start afresh
    last = b;
    const A0 = tracks[a];
    const B0 = tracks[b];
    const seam = b === 0;
    for (const name of new Set([...A0.keys(), ...B0.keys()])) {
      const p = A0.get(name) ?? {o: 0};
      const q = B0.get(name) ?? {o: 0};
      const kind = seam ? 'seam' : 'pop';
      if (Math.abs(q.o - p.o) > LIMITS.fade) addOnce(kind, name, b, `${name} ${q.o > p.o ? 'appears' : 'vanishes'} between frames ${a} and ${b} (opacity ${p.o.toFixed(2)} → ${q.o.toFixed(2)}); fade it over ≥ 3 frames`);
      if (p.x === undefined || q.x === undefined || Math.min(p.o, q.o) <= 0.05) {
        speed.delete(name);
        continue;
      }
      const v = [q.x - p.x, q.y - p.y];
      const step = Math.hypot(v[0], v[1]);
      if (step > LIMITS.jump) addOnce(seam ? 'seam' : 'jerk', name, b, `${name} jumps ${step.toFixed(0)} px between frames ${a} and ${b}`);
      const prev = speed.get(name);
      if (prev && !seam) {
        const acc = Math.hypot(v[0] - prev[0], v[1] - prev[1]);
        if (acc > LIMITS.accel && step <= LIMITS.jump) addOnce('jerk', name, b, `${name} changes speed by ${acc.toFixed(1)} px/frame at frame ${b} (a jolt; ≤ ${LIMITS.accel})`);
      }
      speed.set(name, v);
    }
  }
  return problems;
};

const geometry = async (files) => {
  let bad = 0;
  let specs = 0;
  for (const file of files) {
    const mod = await tsImport(pathToFileURL(file).href, import.meta.url);
    for (const spec of mod.MOTION ?? []) {
      specs++;
      const t0 = Date.now();
      const problems = await checkSpec(spec);
      const head = `${problems.length ? 'ERROR' : 'ok   '} ${relative(root, file)} ${spec.id}: ${spec.frames} frame(s), ${problems.length} problem(s), ${((Date.now() - t0) / 1000).toFixed(1)} s`;
      console.log(head);
      if (!quiet || problems.length) for (const p of problems.slice(0, 12)) console.log(`    ${p.kind.padEnd(7)} ${p.text}`);
      if (problems.length > 12) console.log(`    … ${problems.length - 12} more`);
      if (problems.length) bad++;
    }
  }
  if (!specs) console.log('motion-check: no MOTION specs found (*.motion.ts)');
  return bad;
};

// ───────────────────────────── pixel layer ─────────────────────────────
const HEAD_LEN = 3.5; // kit units of an arrow head, sampled from its tip back along the shaft
const W = 270;
const H = 480;
const BAND = {top: 290 / 1920, captions: 1170 / 1920, full: 1430 / 1920};

/** Decode a video to gray frames W×H (Uint8Array each). */
export const decode = (file) => {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], {maxBuffer: 2 ** 31});
  const n = Math.floor(buf.length / (W * H));
  return Array.from({length: n}, (_, i) => buf.subarray(i * W * H, (i + 1) * W * H));
};

/** Pixel checks on gray frames. Returns problems [{kind, frame, text}]. */
export const checkFrames = (frames, {loop = false, cuts = [], captions = false} = {}) => {
  const problems = [];
  const add = (kind, frame, text) => problems.push({kind, frame, text});
  if (!frames.length) return [{kind: 'decode', frame: 0, text: 'no frames'}];
  // background: the most common value of the frame border
  const hist = new Array(256).fill(0);
  for (const fr of frames.slice(0, 10)) for (let x = 0; x < W; x++) hist[fr[x]]++, hist[fr[(H - 1) * W + x]]++;
  const bg = hist.indexOf(Math.max(...hist));
  const ink = (v) => Math.abs(v - bg) > 14;
  const y0 = Math.round(BAND.top * H);
  const y1 = Math.round((captions ? BAND.captions : BAND.full) * H);
  const cropFrames = [];
  const hcutFrames = [];
  const layoutBad = [];
  frames.forEach((fr, i) => {
    // crop: ink on the outer 2 columns, in rows of the band
    let rows = 0;
    for (let y = y0; y < y1; y++) if (ink(fr[y * W]) || ink(fr[y * W + 1]) || ink(fr[y * W + W - 1]) || ink(fr[y * W + W - 2])) rows++;
    if (rows > 0.03 * (y1 - y0)) cropFrames.push(i);
    // layout: rows that hold ink
    let top = -1;
    let bottom = -1;
    const width = new Array(H).fill(0);
    for (let y = 0; y < H; y++) {
      let c = 0;
      for (let x = 0; x < W; x++) if (ink(fr[y * W + x])) c++;
      width[y] = c;
      if (c >= 3) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    if (top < 0) return layoutBad.push([i, 'empty']);
    // a horizontal cut: the picture ends in a wide flat edge (the graphics band or the frame cut through it), not in
    // the corner of an object. A plate's outline is one thin line: two rows inside it the ink is narrow again.
    const flat = (a, b) => a >= 0.14 * W && b >= 0.14 * W;
    // a soft edge is not a cut: environment that runs past the band and FADES out (RoomSvg fade ≥ 80 px) keeps its
    // its full contrast FADE_ROWS and more from its last ink row and almost none in the last rows; a hard cut keeps it
    // to the edge
    const peak = (y) => {
      let sum = 0;
      let n = 0;
      for (let x = 0; x < W; x++) {
        const d = Math.abs(fr[y * W + x] - bg);
        if (d > 14) (sum += d), n++;
      }
      return n ? sum / n : 0;
    };
    const FADE_ROWS = Math.round((80 / 1920) * H);
    const hard = (edge, dir) => {
      const full = Math.max(...Array.from({length: 2 * FADE_ROWS}, (_, k) => peak(Math.min(H - 1, Math.max(0, edge + dir * (FADE_ROWS + k))))));
      const near = Math.max(...Array.from({length: 3}, (_, k) => peak(Math.min(H - 1, Math.max(0, edge + dir * (1 + k))))));
      return near > 0.6 * full;
    };
    if ((flat(width[bottom - 1] ?? 0, width[bottom - 3] ?? 0) && hard(bottom, -1)) || (flat(width[top + 1] ?? 0, width[top + 3] ?? 0) && hard(top, 1))) hcutFrames.push(i);
    const span = (bottom - top) / (y1 - y0);
    const off = ((top + bottom) / 2 - (y0 + y1) / 2) / (y1 - y0);
    if (span < 0.45) layoutBad.push([i, `the picture spans ${(span * 100).toFixed(0)} % of the band height`]);
    else if (Math.abs(off) > 0.2) layoutBad.push([i, `the picture sits in the ${off < 0 ? 'top' : 'bottom'} part of the band (centre ${(off * 100).toFixed(0)} % off)`]);
  });
  if (cropFrames.length) add('crop', cropFrames[0], `${cropFrames.length} frame(s) with the picture cut by the left/right frame edge (first ${cropFrames[0]})`);
  if (hcutFrames.length > frames.length * 0.1) add('crop', hcutFrames[0], `${hcutFrames.length} frame(s) where the picture is cut by a horizontal edge (the end of the graphics band or of the frame; first ${hcutFrames[0]})`);
  if (layoutBad.length > frames.length * 0.25) add('layout', layoutBad[0][0], `${layoutBad.length} of ${frames.length} frames: ${layoutBad[0][1]} (first ${layoutBad[0][0]})`);
  // pop / jerk: per tile, a one-frame change between still neighbours
  const TX = 6;
  const TY = 10;
  const tw = Math.floor(W / TX);
  const th = Math.floor(H / TY);
  const diff = (a, b) => {
    const out = new Float64Array(TX * TY);
    for (let ty = 0; ty < TY; ty++)
      for (let tx = 0; tx < TX; tx++) {
        let s = 0;
        for (let y = ty * th; y < (ty + 1) * th; y++) for (let x = tx * tw; x < (tx + 1) * tw; x++) s += Math.abs(a[y * W + x] - b[y * W + x]);
        out[ty * TX + tx] = s / (th * tw);
      }
    return out;
  };
  const d = [null];
  for (let i = 1; i < frames.length; i++) d.push(diff(frames[i - 1], frames[i]));
  const cut = new Set(cuts);
  const pops = [];
  for (let i = 1; i < frames.length; i++) {
    if (cut.has(i)) continue;
    for (let k = 0; k < TX * TY; k++) {
      const here = d[i][k];
      const before = i > 1 ? d[i - 1][k] : 0;
      const after = i + 1 < frames.length ? d[i + 1][k] : 0;
      if (here > 6 && here > 4 * Math.max(before, after, 0.5)) {
        pops.push([i, k]);
        break;
      }
    }
  }
  if (pops.length) add('pop', pops[0][0], `${pops.length} frame(s) where part of the picture changes in one frame between still frames (a pop or a jump; first ${pops[0][0]}, tile ${pops[0][1]})`);
  if (loop && frames.length > 2) {
    const seam = diff(frames[frames.length - 1], frames[0]);
    const typical = [];
    for (let i = 1; i < frames.length; i++) typical.push(Math.max(...d[i]));
    typical.sort((a, b) => a - b);
    const p90 = typical[Math.floor(typical.length * 0.9)];
    if (Math.max(...seam) > Math.max(6, 3 * p90)) add('seam', frames.length - 1, `the last frame does not lead into the first (max tile change ${Math.max(...seam).toFixed(1)}, typical ${p90.toFixed(1)})`);
  }
  return problems;
};

const video = (file, opts) => {
  const frames = decode(file);
  const problems = checkFrames(frames, opts);
  console.log(`${problems.length ? 'ERROR' : 'ok   '} ${relative(process.cwd(), file)}: ${frames.length} frame(s), ${problems.length} problem(s)`);
  for (const p of problems) console.log(`    ${p.kind.padEnd(7)} ${p.text}`);
  return problems.length ? 1 : 0;
};

// ───────────────────────────── selftest ─────────────────────────────
const selftest = async () => {
  let failed = 0;
  const expect = (label, problems, kinds) => {
    const got = new Set(problems.map((p) => p.kind));
    const missing = kinds.filter((k) => !got.has(k));
    const extra = kinds.length === 0 ? [...got] : [];
    const ok = !missing.length && !extra.length;
    if (!ok) failed++;
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}: expected ${kinds.length ? kinds.join(', ') : 'clean'}; got ${got.size ? [...got].join(', ') : 'clean'}`);
    if (!ok && !quiet) for (const p of problems.slice(0, 6)) console.log(`      ${p.kind} ${p.text}`);
  };
  const fixture = await tsImport(pathToFileURL(join(root, 'scripts/fixtures/motion-broken.motion.ts')).href, import.meta.url);
  for (const [label, spec, kinds] of fixture.CASES) expect(`geometry ${label}`, await checkSpec(spec), kinds);
  // synthetic frames: a solid block on the background
  const bg = 240;
  // the main body is a hexagon like an isometric box (pointed top and bottom); extras are plain rects
  const frame = (bx, by, bw, bh, extra = []) => {
    const f = new Uint8Array(W * H).fill(bg);
    for (let y = Math.max(0, by); y < Math.min(H, by + bh); y++) {
      const k = Math.min(1, (y - by) / (bh * 0.25), (by + bh - y) / (bh * 0.25));
      const half = (bw / 2) * Math.max(0.04, k);
      for (let x = Math.max(0, Math.round(bx + bw / 2 - half)); x < Math.min(W, Math.round(bx + bw / 2 + half)); x++) f[y * W + x] = 90;
    }
    for (const [x0, y0, w, h, v] of extra) for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) f[y * W + x] = v;
    return f;
  };
  const N = 240;
  const smooth = (i) => 60 + Math.round(30 * Math.sin((2 * Math.PI * i) / N));
  const clean = Array.from({length: N}, (_, i) => frame(smooth(i), 130, 150, 260));
  expect('pixels clean loop', checkFrames(clean, {loop: true}), []);
  expect('pixels crop', checkFrames(Array.from({length: N}, (_, i) => frame(smooth(i) - 80, 130, 200, 260)), {}), ['crop']);
  expect('pixels empty bottom', checkFrames(Array.from({length: N}, (_, i) => frame(smooth(i), 150, 150, 110)), {}), ['layout']);
  expect('pixels cut by the band', checkFrames(Array.from({length: N}, (_, i) => frame(smooth(i), 200, 150, 400)), {}), ['crop']);
  // the same block, but the band FADES it out over 30 rows (≈ 120 px): environment running past the band is allowed
  const faded = (f) => {
    const yb = Math.round(BAND.full * H);
    for (let y = yb - 30; y < H; y++) for (let x = 0; x < W; x++) f[y * W + x] = Math.round(bg + (f[y * W + x] - bg) * Math.max(0, (yb - y) / 30));
    return f;
  };
  expect('pixels soft fade at the band', checkFrames(Array.from({length: N}, (_, i) => faded(frame(smooth(i), 130, 150, 400))), {}), []);
  expect('pixels pop', checkFrames(Array.from({length: N}, (_, i) => frame(smooth(i), 130, 150, 260, i < 60 ? [[20, 300, 40, 40, 30]] : [])), {}), ['pop']);
  expect('pixels jump', checkFrames(Array.from({length: N}, (_, i) => frame(i < 60 ? 40 : 80, 130, 150, 260)), {}), ['pop']);
  expect('pixels declared cut', checkFrames(Array.from({length: N}, (_, i) => frame(i < 60 ? 40 : 80, 130, 150, 260)), {cuts: [60]}), []);
  expect('pixels seam', checkFrames(Array.from({length: N}, (_, i) => frame(40 + Math.round((i / N) * 40), 130, 150, 260)), {loop: true}), ['seam']);
  console.log(failed ? `\nmotion-check selftest: ${failed} case(s) FAILED` : '\nmotion-check selftest: every defect kind is caught, clean inputs pass');
  return failed;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let bad;
  if (flag('selftest')) bad = await selftest();
  else if (opt('video')) bad = video(resolve(opt('video')), {loop: flag('loop'), captions: flag('captions'), cuts: (opt('cuts', '') ?? '').split(',').filter(Boolean).map(Number)});
  else bad = await geometry(positional.length ? positional.map((f) => resolve(f)) : walk(join(root, 'src')));
  process.exitCode = bad ? 1 : 0;
}
