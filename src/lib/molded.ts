import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';

// A molded body (a kettle jug with its pouring lip, a handle that grows out of a body, a bottle shoulder): the forms the
// lathe, the pipe and the slab cannot make. The body is a stack of closed rings, bottom to top, each with the same
// number of points, counter-clockwise seen from above (outward normals). Faces are quads between neighbouring rings;
// each visible face is shaded by its own normal into the kit's four bands, the outline is the silhouette (edges
// between a visible and a hidden face) plus the visible rims, and the top ring may be capped. The result is the kit's
// SolidPaths, so it is drawn by K.solidSvg like every other solid.

type P3 = K.Point3;
const G = LatheKit as unknown as {
  viewOf: (P: K.Projection) => P3;
  toneOf: (n: P3, P: K.Projection) => number;
};
const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export type MoldedOpts = {cap?: 'top' | 'none'; smooth?: boolean};

export const moldedOf = (rings: P3[][], P: K.Projection, o: MoldedOpts = {}): K.SolidPaths => {
  const m = rings.length;
  const n = rings[0].length;
  if (m < 2 || rings.some((r) => r.length !== n)) throw new Error('moldedOf: at least two rings, all with the same number of points');
  const V = G.viewOf(P);
  const fl = (p: P3) => K.iso(p, P);
  // face (i, j) between ring i and i + 1, points j and j + 1
  // the normal of a quad from its diagonals: (d − a) × (c − b) = 2 · tangent × up, outward for counter-clockwise rings
  const normal = (i: number, j: number) => {
    const a = rings[i][j];
    const b = rings[i][(j + 1) % n];
    const c = rings[i + 1][j];
    const d = rings[i + 1][(j + 1) % n];
    return cross(sub(d, a), sub(c, b));
  };
  const N: P3[][] = [];
  const vis: boolean[][] = [];
  for (let i = 0; i < m - 1; i++) {
    N.push([]);
    vis.push([]);
    for (let j = 0; j < n; j++) {
      const nn = normal(i, j);
      N[i].push(nn);
      vis[i].push(dot(nn, V) > 1e-9);
    }
  }
  // smooth shading: a face takes the mean of its own and its neighbours' normals
  const shadeNormal = (i: number, j: number): P3 => {
    if (!o.smooth) return N[i][j];
    const acc: P3 = [0, 0, 0];
    for (const [di, dj] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const ii = i + di;
      if (ii < 0 || ii >= m - 1) continue;
      const v = N[ii][(j + dj + n) % n];
      const l = Math.hypot(...v) || 1;
      for (let k = 0; k < 3; k++) acc[k] += v[k] / l;
    }
    return acc;
  };
  const quad = (i: number, j: number) => [rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j]].map(fl);
  const buckets: string[][] = [[], [], [], [], []];
  const fill: string[] = [];
  for (let i = 0; i < m - 1; i++)
    for (let j = 0; j < n; j++) {
      if (!vis[i][j]) continue;
      const d = K.pathOf(quad(i, j), true);
      fill.push(d);
      buckets[Math.min(3, G.toneOf(shadeNormal(i, j), P))].push(d);
    }
  // the cap on the top ring: a flat-ish polygon facing up
  const top = rings[m - 1];
  const capVisible = o.cap === 'top' && V[2] > 0;
  if (capVisible) {
    const d = K.pathOf(top.map(fl), true);
    fill.push(d);
    buckets[4].push(d);
  }
  const outline: string[] = [];
  const crease: string[] = [];
  const seg = (a: P3, b: P3) => K.pathOf([fl(a), fl(b)]);
  // silhouette along the meridians: a vertical edge between a visible and a hidden face
  for (let i = 0; i < m - 1; i++)
    for (let j = 0; j < n; j++) {
      const left = vis[i][(j - 1 + n) % n];
      if (left !== vis[i][j]) outline.push(seg(rings[i][j], rings[i + 1][j]));
    }
  // silhouette across the rings: between faces of rows i - 1 and i
  for (let i = 1; i < m - 1; i++)
    for (let j = 0; j < n; j++) if (vis[i - 1][j] !== vis[i][j]) outline.push(seg(rings[i][j], rings[i][(j + 1) % n]));
  // the bottom rim: under visible faces
  for (let j = 0; j < n; j++) if (vis[0][j]) outline.push(seg(rings[0][j], rings[0][(j + 1) % n]));
  // the top rim: an outline where the cap meets a hidden face (the far lip), a crease where both show (the near lip)
  for (let j = 0; j < n; j++) {
    const s = seg(top[j], top[(j + 1) % n]);
    if (vis[m - 2][j] && !capVisible) outline.push(s);
    else if (vis[m - 2][j] && capVisible) crease.push(s);
    else if (capVisible) outline.push(s);
  }
  return {
    fill: fill.join(''),
    outline: outline.join(''),
    crease: crease.join(''),
    top: buckets[4].join(''),
    shades: buckets.slice(0, 4).map((l) => l.join('')),
    seamless: Boolean(o.smooth),
  } as K.SolidPaths;
};
