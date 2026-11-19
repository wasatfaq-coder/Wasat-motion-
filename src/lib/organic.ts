import {Assembly, G, Point3} from './assembly';

// Organic bodies in the house style (MASTER_PROMPT_FINAL §22, §24.4): rounded solids for plants, animals, organs,
// cells and molecules. Each helper draws through Assembly with a shape the Anatomy audit already knows (turned
// solid, ball, convex prism), so object-audit checks supports, overlaps and paint order the same way it does for a
// machine part. No new geometry kernel: a smooth lathe profile is the loft, a cluster of balls is the blob.

type Opts = Parameters<Assembly['turned']>[3];
type BallOpts = Parameters<Assembly['ball']>[3];

const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Point3) => Math.hypot(a[0], a[1], a[2]);

/** A capsule (a rod with round ends) from `from` to `to`: limbs, stems, bacteria, bones. */
export const capsule = (A: Assembly, name: string, from: Point3, to: Point3, r: number, c: Opts = {}) => {
  const L = len(sub(to, from));
  if (L < 2 * r) return A.ball(name, G.lerp3(from, to, 0.5) as Point3, r, c as BallOpts);
  const F = G.frameAlong(from, sub(to, from));
  // quarter circles at both ends sampled as smooth knots; the straight middle is plain
  const arc = [0.25, 0.5, 0.75].map((k) => [r - r * Math.cos((k * Math.PI) / 2), r * Math.sin((k * Math.PI) / 2)]);
  const profile = [[0, 0.0001], ...arc.map(([s, rr]) => [s, rr, 1]), [r, r], [L - r, r], ...arc.reverse().map(([s, rr]) => [L - s, rr, 1]), [L, 0.0001]];
  return A.turned(name, profile, F, c);
};

/** A body of revolution through radii at stations along an axis: eggs, fruit, torsos, vases, cells, seeds.
 *  `sections` are [s, r] from one tip to the other; every knot is smooth, so the body has no hard rims. */
export const loft = (A: Assembly, name: string, origin: Point3, axis: Point3, sections: [number, number][], c: Opts = {}) => {
  const F = G.frameAlong(origin, axis);
  const profile = sections.map(([s, r], i) => (i === 0 || i === sections.length - 1 ? [s, Math.max(r, 0.0001)] : [s, r, 1]));
  return A.turned(name, profile, F, c);
};

/** A lumpy body made of overlapping balls (cloud puffs, foam, a cell cluster, a molecule surface). All balls share
 *  one owner (the blob's own name unless `meta.owner` names its host), so the audit treats their overlaps as one body. Returns the ball centres. */
export const blob = (A: Assembly, name: string, lumps: {at: Point3; r: number}[], c: BallOpts = {}) => {
  const meta = {owner: `${A.name}.${name}`, ...(c.meta ?? {})};
  lumps.forEach((l, i) => A.ball(`${name}.${i}`, l.at, l.r, {...c, meta}));
  return lumps.map((l) => l.at);
};

/** A thin leaf-shaped plate (petal, leaf, fin, feather vane) in the frame's (u, v) plane, `thick` along F.a.
 *  The outline is a convex lens: base at v = 0, tip at v = length. */
export const petal = (A: Assembly, name: string, F: {o: Point3; a: Point3; u: Point3; v: Point3}, length: number, width: number, thick: number, c: Opts = {}) => {
  const n = 9;
  const half = Array.from({length: n}, (_, i) => {
    const t = i / (n - 1);
    return [(width / 2) * Math.sin(Math.PI * t) ** 0.8, length * t];
  });
  const ring = [...half.map(([u, v]) => [u, v]), ...half.slice(1, -1).reverse().map(([u, v]) => [-u, v])];
  return A.prism(name, F, ring, -thick / 2, thick / 2, c);
};

/** A frame whose plane (u, v) holds `toward` as v and whose normal is roughly `normal`. */
export const planeFrame = (o: Point3, toward: Point3, normal: Point3) => {
  const v = G.unit3(toward) as Point3;
  let a = G.unit3(G.sub3(normal, G.mul3(v, G.dot3(normal, v)))) as Point3;
  if (!Number.isFinite(a[0])) a = [0, 0, 1];
  const u = G.cross3(v, a) as Point3;
  return {o, a, u, v};
};
