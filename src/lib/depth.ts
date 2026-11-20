import * as AuditKit from '../vendor/anatomy/audit.mjs';
import type {Point3, Projection} from '../vendor/anatomy/iso-kit';

// Paint order for parts that MOVE (MASTER_PROMPT_FINAL §22): a turning loop, a sliding lid, a cable that swings.
// Root cause of a past defect (the coral loop of the motor stand passed through the arch and the brush): a moving
// part was sorted against the static object by ONE depth number for its whole body. A long bar spans in front of one
// static part and behind another, and one number cannot say both, so it was drawn wholly in front of or wholly behind.
// Here the order comes from the 3D shapes themselves, for every frame: wherever two parts cover the same screen
// point, a ray from the viewer finds which surface it hits first. Static parts keep their settled order
// (object-audit --settle); moving parts are put in between by those ray tests. Long moving parts must be split into
// short pieces (assembly.ts: dynTube) so that each piece has one answer.
// Pure TypeScript, no React: the scene draws with it and scripts/motion-check.mjs checks the same result.

/* eslint-disable @typescript-eslint/no-explicit-any */
const A: any = AuditKit;

export type DepthNode = {
  /** plain painter's key: smaller is painted first (further back) */
  key: number;
  /** audit shapes of the part (src/vendor/anatomy/audit.mjs); none = ordered by key only */
  shapes: unknown[];
  /** static parts keep their settled order among themselves; only pairs with a moving part are ray-tested */
  fixed: boolean;
  name?: string;
};

type Box = {u0: number; u1: number; v0: number; v1: number; w0: number; w1: number};
type Basis = {R: Point3; D: Point3; V: Point3};

const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const boxOf = (shapes: unknown[], B: Basis): Box | null => {
  if (!shapes.length) return null;
  const box: Box = {u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity, w0: Infinity, w1: -Infinity};
  for (const s of shapes) {
    const {min, max} = A.boundsOf(s) as {min: Point3; max: Point3};
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]]) {
          const p: Point3 = [x, y, z];
          const u = dot(p, B.R);
          const v = dot(p, B.D);
          const w = dot(p, B.V);
          box.u0 = Math.min(box.u0, u);
          box.u1 = Math.max(box.u1, u);
          box.v0 = Math.min(box.v0, v);
          box.v1 = Math.max(box.v1, v);
          box.w0 = Math.min(box.w0, w);
          box.w1 = Math.max(box.w1, w);
        }
  }
  return box;
};

const sdfOf = (shapes: unknown[], p: Point3) => {
  let d = Infinity;
  for (const s of shapes) d = Math.min(d, A.sdf(s, p) as number);
  return d;
};

/** Depth (along V, toward the viewer) where the ray through screen point (u, v) first meets the shapes, or null. */
const hit = (shapes: unknown[], box: Box, u: number, v: number, B: Basis): number | null => {
  let t = box.w1 + 0.5;
  const base: Point3 = [u * B.R[0] + v * B.D[0], u * B.R[1] + v * B.D[1], u * B.R[2] + v * B.D[2]];
  for (let i = 0; i < 160 && t > box.w0 - 0.5; i++) {
    const p: Point3 = [base[0] + t * B.V[0], base[1] + t * B.V[1], base[2] + t * B.V[2]];
    const d = sdfOf(shapes, p);
    if (d < 0.02) return t;
    t -= Math.max(d, 0.03);
  }
  return null;
};

/** points on the axis of every tube among the shapes (about one per unit) */
const axisPoints = (shapes: unknown[]): Point3[] => {
  const out: Point3[] = [];
  for (const s of shapes as {kind: string; points?: Point3[]}[]) {
    if (s.kind !== 'tube' || !s.points) continue;
    for (let i = 1; i < s.points.length; i++) {
      const a = s.points[i - 1];
      const b = s.points[i];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
      for (let k = 0; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
    }
  }
  return out;
};

/** +1 when a covers b on screen (a nearer the viewer), −1 when b covers a, 0 when they never cover the same point. */
export const coverOrder = (a: unknown[], b: unknown[], B: Basis, samples = 5): number => {
  const ba = boxOf(a, B);
  const bb = boxOf(b, B);
  if (!ba || !bb) return 0;
  const u0 = Math.max(ba.u0, bb.u0);
  const u1 = Math.min(ba.u1, bb.u1);
  const v0 = Math.max(ba.v0, bb.v0);
  const v1 = Math.min(ba.v1, bb.v1);
  if (u0 >= u1 || v0 >= v1) return 0;
  // depth ranges that do not overlap answer at once (the common case for far-apart parts)
  if (ba.w0 > bb.w1) return 1;
  if (bb.w0 > ba.w1) return -1;
  // where to look: a grid over the shared screen area, plus points along the axes of tubes (thin parts are easily
  // missed by a grid: two crossing wires share only a few pixels)
  const at: [number, number][] = [];
  for (let i = 0; i < samples; i++) for (let j = 0; j < samples; j++) at.push([u0 + ((i + 0.5) / samples) * (u1 - u0), v0 + ((j + 0.5) / samples) * (v1 - v0)]);
  for (const p of [...axisPoints(a), ...axisPoints(b)]) {
    const u = dot(p, B.R);
    const v = dot(p, B.D);
    if (u > u0 && u < u1 && v > v0 && v < v1) at.push([u, v]);
  }
  const vote = (pts: [number, number][]) => {
    let sum = 0;
    let both = 0;
    for (const [u, v] of pts) {
      const ta = hit(a, ba, u, v, B);
      if (ta === null) continue;
      const tb = hit(b, bb, u, v, B);
      if (tb === null) continue;
      both++;
      if (Math.abs(ta - tb) > 0.02) sum += ta > tb ? 1 : -1;
    }
    return {sum, both};
  };
  const first = vote(at);
  if (first.sum !== 0 || first.both > 0) return Math.sign(first.sum);
  // R5 (docs/root-causes.md): the grid spans the screen box of the parts' WORLD bounds. For a thin part turned in the
  // world (a tile on a leaned, turned panel) that box is many times the part, the 5 × 5 grid misses the thin strip
  // where the part really covers its neighbour (a tile standing on its rail), the pair gets no order and the painter's
  // key paints the rail's top face over the tile's foot. When no ray met both parts, look again through points INSIDE
  // each part: a ray through them is sure to meet that part.
  const inner: [number, number][] = [];
  for (const p of [...innerPoints(a), ...innerPoints(b)]) {
    const u = dot(p, B.R);
    const v = dot(p, B.D);
    if (u > u0 && u < u1 && v > v0 && v < v1) inner.push([u, v]);
  }
  return Math.sign(vote(inner).sum);
};

/** points inside the solid shapes (a 6 × 6 × 6 grid of each shape's bounds kept where it is inside); tubes give their axis */
const innerPoints = (shapes: unknown[]): Point3[] => {
  const out: Point3[] = [];
  const n = 6;
  for (const s of shapes as {kind: string}[]) {
    if (s.kind === 'tube') continue; // axisPoints already sampled it
    const {min, max} = A.boundsOf(s) as {min: Point3; max: Point3};
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const p: Point3 = [min[0] + ((max[0] - min[0]) * (i + 0.5)) / n, min[1] + ((max[1] - min[1]) * (j + 0.5)) / n, min[2] + ((max[2] - min[2]) * (k + 0.5)) / n];
          if ((A.sdf(s, p) as number) < -0.01) out.push(p);
        }
  }
  return out;
};

// static shapes do not change between frames: whether two of them cover each other is computed once
const staticMemo = new WeakMap<object, WeakMap<object, boolean>>();
const staticCover = (a: unknown[], b: unknown[], B: Basis) => {
  const ka = a[0] as object;
  const kb = b[0] as object;
  if (a.length !== 1 || b.length !== 1 || typeof ka !== 'object' || typeof kb !== 'object') return coverOrder(a, b, B) !== 0;
  let row = staticMemo.get(ka);
  if (!row) staticMemo.set(ka, (row = new WeakMap()));
  let v = row.get(kb);
  if (v === undefined) row.set(kb, (v = coverOrder(a, b, B) !== 0));
  return v;
};

export const basisOf = (P: Projection): Basis => {
  const c = A.cameraBasis(P) as Basis;
  return {R: c.R, D: c.D, V: c.V};
};

/** Paint order for static + moving parts. Returns node indices back to front and the number of order conflicts
 *  (a cycle: a part that must be both in front of and behind another). Conflicts are a defect the motion check
 *  reports; split the moving part into shorter pieces to remove them. */
export const resolveOrder = (nodes: DepthNode[], P: Projection): {order: number[]; conflicts: string[]} => {
  const B = basisOf(P);
  const n = nodes.length;
  const after: number[][] = nodes.map(() => []); // after[i]: nodes that must be painted after i
  const need = new Array<number>(n).fill(0);
  const before: number[][] = nodes.map(() => []); // before[i]: nodes that must be painted before i
  const edge = (from: number, to: number) => {
    after[from].push(to);
    before[to].push(from);
    need[to]++;
  };
  const boxes = nodes.map((node) => boxOf(node.shapes, B));
  const meet = (a: Box, b: Box) => a.u0 < b.u1 && b.u0 < a.u1 && a.v0 < b.v1 && b.v0 < a.v1;
  // static parts that really cover each other on screen keep their settled order (a moving part cannot reshuffle
  // them). Whether two static parts cover each other is a ray test too, cached per pair of shapes: their bounding
  // boxes alone would tie together parts that never touch on screen and invent cycles.
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (!nodes[i].fixed || !nodes[j].fixed) continue;
      const bi = boxes[i];
      const bj = boxes[j];
      if (!bi || !bj || !meet(bi, bj) || !staticCover(nodes[i].shapes, nodes[j].shapes, B)) continue;
      if (nodes[i].key < nodes[j].key) edge(i, j);
      else if (nodes[j].key < nodes[i].key) edge(j, i);
    }
  for (let i = 0; i < n; i++) {
    if (nodes[i].fixed || !boxes[i]) continue;
    for (let j = 0; j < n; j++) {
      if (i === j || !boxes[j]) continue;
      if (!nodes[j].fixed && j < i) continue; // each moving pair once
      if (!meet(boxes[i]!, boxes[j]!)) continue;
      const r = coverOrder(nodes[i].shapes, nodes[j].shapes, B);
      if (r > 0) edge(j, i);
      else if (r < 0) edge(i, j);
    }
  }
  // Kahn's algorithm; among the ready nodes the smallest key goes first, so unconstrained parts keep their order
  const done = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  const conflicts: string[] = [];
  const byKey = nodes.map((_, i) => i).sort((a, b) => nodes[a].key - nodes[b].key || a - b);
  while (order.length < n) {
    let pick = byKey.find((i) => !done[i] && need[i] === 0);
    if (pick === undefined) {
      // a cycle: release the part with the fewest unmet constraints (ties: the furthest back)
      let least = Infinity;
      for (const i of byKey)
        if (!done[i] && need[i] < least) {
          least = need[i];
          pick = i;
        }
      pick = pick!;
      // name the cycle: walk back through unmet predecessors until a node repeats
      const seen: number[] = [];
      let at = pick;
      while (!seen.includes(at)) {
        seen.push(at);
        const prev = before[at].find((k) => !done[k]);
        if (prev === undefined) break;
        at = prev;
      }
      const cycle = seen.includes(at) ? seen.slice(seen.indexOf(at)) : seen;
      conflicts.push(cycle.map((k) => nodes[k].name ?? `#${k}`).reverse().join(' → '));
    }
    done[pick] = true;
    order.push(pick);
    for (const k of after[pick]) need[k]--;
  }
  return {order, conflicts};
};
