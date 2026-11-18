#!/usr/bin/env node
// Line ends (§22.2: every line ends on an edge, another line or a dot). Same rule as upstream
// scripts/lines.mjs (anatomy 1482e846): each open end of a texture line must land on a stroke,
// a dot, or under a fill painted after it. The kit's own outlines, creases, bevels and tube
// edges are anchors, not subjects. fade / data-free ends are meant to stop. A short straight
// tick needs only one rooted end.
//
// Upstream drives a browser (drive.mjs). This checks the SVG our assemblies already emit, so
// CI stays without a browser. Tolerance is 3px: our contour is 3.5/2.5 (upstream strokes are
// ~0.6px, and their default tolerance is 1).
//
//   node scripts/lines-check.mjs                     every *.parts.ts under src/
//   node scripts/lines-check.mjs --topic <slug>      src/projects/<slug> only
//   node scripts/lines-check.mjs <file.parts.ts>…
//   node scripts/lines-check.mjs --selftest          the checker itself (exit 1 if it is blind)
//   node scripts/lines-check.mjs --strict            floating ends fail the process (default: warn)
// Findings are warnings unless --strict. Exit 0 on warnings so existing scenes do not break CI.
import {readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const selftest = flag('selftest');
const strict = flag('strict');
const quiet = flag('quiet');
const topic = opt('topic', null);
const tolerance = Number(opt('tolerance', 3));
const given = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--topic' && argv[i - 1] !== '--tolerance');

const SKIP = /iso-edge|iso-crease|iso-bevel|tb-edge/;
const TICK = 24; // a short straight mark, in the same px as the path

const nums = (s) => (s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);

/** Open and closed subpaths. The kit emits M/L/Z; extra pairs after M are implicit L. */
const parsePath = (d) => {
  const out = [];
  let cur = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const begin = (px, py) => {
    cur = {pts: [[px, py]], closed: false};
    out.push(cur);
    x = px;
    y = py;
    sx = px;
    sy = py;
  };
  const line = (px, py) => {
    if (!cur) begin(px, py);
    else cur.pts.push([px, py]);
    x = px;
    y = py;
  };
  for (const m of d.matchAll(/([MLZmlz])([^MLZmlz]*)/g)) {
    const op = m[1];
    const v = nums(m[2]);
    if (op === 'M' || op === 'm') {
      for (let i = 0; i + 1 < v.length; i += 2) {
        const px = op === 'm' ? x + v[i] : v[i];
        const py = op === 'm' ? y + v[i + 1] : v[i + 1];
        if (i === 0) begin(px, py);
        else line(px, py);
      }
    } else if (op === 'L' || op === 'l') {
      for (let i = 0; i + 1 < v.length; i += 2) line(op === 'l' ? x + v[i] : v[i], op === 'l' ? y + v[i + 1] : v[i + 1]);
    } else if (op === 'Z' || op === 'z') {
      if (cur && (x !== sx || y !== sy)) cur.pts.push([sx, sy]);
      if (cur) cur.closed = true;
      x = sx;
      y = sy;
      cur = null;
    }
  }
  return out.filter((s) => s.pts.length >= 2);
};

const distPointSeg = (p, a, b) => {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1e-12)));
  return Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + aby * t));
};

const inside = (p, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][1];
    const yj = poly[j][1];
    if (yi > p[1] !== yj > p[1] && p[0] < ((poly[j][0] - poly[i][0]) * (p[1] - yi)) / (yj - yi || 1e-12) + poly[i][0]) c = !c;
  }
  return c;
};

const segsOf = (pts, closed) => {
  const n = pts.length;
  const segs = [];
  for (let i = 1; i < n; i++) segs.push([pts[i - 1], pts[i]]);
  if (closed && n > 2) segs.push([pts[n - 1], pts[0]]);
  return segs;
};

const lengthOf = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/**
 * @param {string} svg
 * @param {{tolerance?: number}} [opt]
 * @returns {{x: number, y: number}[]} floating ends
 */
export const floatingEnds = (svg, opt = {}) => {
  const tol = opt.tolerance ?? tolerance;
  const strokes = [];
  const fills = []; // {pts, at} in document order
  const dots = [];
  let at = 0;
  for (const m of svg.matchAll(/<path\b([^>]*)\/?>/g)) {
    const tag = m[1];
    const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? '';
    const d = /(?:\sd|")d="([^"]*)"/.exec(` ${tag}`)?.[1] ?? /d="([^"]*)"/.exec(tag)?.[1];
    if (!d) continue;
    const free = /data-free="([^"]*)"/.exec(tag)?.[1] ?? (/data-free(?:=|\s|\/|$)/.test(tag) ? '' : null);
    const subs = parsePath(d);
    const order = at++;
    for (const sub of subs) {
      const segs = segsOf(sub.pts, sub.closed);
      strokes.push({cls, segs, sub, free, order});
      if (/iso-fill|iso-shade|iso-top|tb-body|tb-shine|tb-shade/.test(cls) && sub.closed) fills.push({pts: sub.pts, order});
    }
  }
  for (const m of svg.matchAll(/<circle\b([^>]*)\/?>/g)) {
    const tag = m[1];
    const cx = Number(/cx="([^"]*)"/.exec(tag)?.[1] ?? NaN);
    const cy = Number(/cy="([^"]*)"/.exec(tag)?.[1] ?? NaN);
    const r = Number(/r="([^"]*)"/.exec(tag)?.[1] ?? 0);
    if (Number.isFinite(cx) && Number.isFinite(cy)) dots.push({x: cx, y: cy, r, order: at++});
  }
  const floats = [];
  for (const line of strokes) {
    if (!/\biso-line\b/.test(line.cls) || SKIP.test(line.cls)) continue;
    if (line.free === '') continue; // both ends are meant to stop
    if (line.sub.closed) continue;
    const pts = line.sub.pts;
    const len = lengthOf(pts);
    const tick = pts.length === 2 && len <= TICK;
    const ends = [0, pts.length - 1].filter((i) => {
      if (line.free === 'start' && i === 0) return false;
      if (line.free === 'end' && i === pts.length - 1) return false;
      return true;
    });
    const rooted = (i) => {
      const p = pts[i];
      for (const other of strokes) {
        for (const [a, b] of other.segs) {
          const own = other === line && (Math.hypot(a[0] - p[0], a[1] - p[1]) < 0.05 || Math.hypot(b[0] - p[0], b[1] - p[1]) < 0.05);
          if (own) continue;
          if (distPointSeg(p, a, b) <= tol) return true;
        }
      }
      for (const dot of dots) if (Math.hypot(p[0] - dot.x, p[1] - dot.y) <= dot.r + tol) return true;
      for (const fill of fills) if (fill.order > line.order && inside(p, fill.pts)) return true;
      return false;
    };
    const bad = ends.filter((i) => !rooted(i));
    if (tick ? bad.length === ends.length && ends.length > 0 : bad.length) {
      for (const i of tick ? bad.slice(0, 1) : bad) floats.push({x: pts[i][0], y: pts[i][1]});
    }
  }
  return floats;
};

const selfTest = () => {
  const fail = [];
  const one = (name, svg, n) => {
    const got = floatingEnds(svg, {tolerance: 1}).length;
    if (got !== n) fail.push(`${name}: expected ${n}, got ${got}`);
  };
  one('open line', '<path class="iso-line" d="M20 20L180 20"/>', 2);
  one('closed', '<path class="iso-line" d="M20 20L180 20L180 80L20 80Z"/>', 0);
  one('lands on a stroke', '<path class="iso-line" d="M0 0L40 0"/><path class="iso-line" d="M40 0L40 30"/>', 2);
  // the shared vertex roots one end of each line; the two outer ends float → 2, not 4
  one('free end', '<path class="iso-line" data-free="" d="M20 20L180 20"/>', 0);
  one('outline is not a subject', '<path class="iso-line iso-edge" d="M0 0L10 0"/>', 0);
  one('tick rooted once', '<path class="iso-line iso-edge" d="M0 0L0 40"/><path class="iso-line" d="M0 10L12 10"/>', 0);
  if (fail.length) {
    console.error(fail.join('\n'));
    return 1;
  }
  if (!quiet) console.log('lines-check selftest: ok');
  return 0;
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'vendor') return [];
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.parts.ts') ? [p] : [];
  });

const files = given.length ? given.map((f) => resolve(f)) : walk(topic ? join(root, 'src/projects', topic) : join(root, 'src'));

let code = selftest ? selfTest() : 0;
if (!selftest || given.length || topic) {
  if (!selftest && !files.length) console.log('lines-check: no *.parts.ts');
  const {isAssembly} = files.length ? await tsImport(pathToFileURL(join(root, 'src/lib/assembly.ts')).href, import.meta.url) : {isAssembly: () => false};
  let floats = 0;
  for (const file of files) {
    const mod = await tsImport(pathToFileURL(file).href, import.meta.url);
    for (const [name, value] of Object.entries(mod)) {
      if (!isAssembly(value)) continue;
      const found = floatingEnds(value.svg(), {tolerance});
      floats += found.length;
      if (!found.length) {
        if (!quiet) console.log(`ok   ${relative(root, file)} ${name}`);
        continue;
      }
      const where = found
        .slice(0, 6)
        .map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`)
        .join(' ');
      console.log(`WARN ${relative(root, file)} ${name}: ${found.length} line end${found.length === 1 ? '' : 's'} float (${where})`);
    }
  }
  if (floats && strict) code = 1;
  if (!quiet) console.log(`lines-check: ${floats} floating end${floats === 1 ? '' : 's'}${strict ? '' : ' (warning; --strict to fail)'}`);
}
process.exitCode = code;
