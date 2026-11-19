import * as K from '../../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from '../assembly';

// A map as a relief model on a table (MASTER_PROMPT_FINAL §24.3): regions are plates of different heights cut from
// their outlines, a route is a tube laid over their surface, a zoom is a camera move to a node (boxCorners). The
// outlines come from a recorded source per topic (for countries: Natural Earth, public domain) and are stored in
// the topic's content with the source; this module never invents borders. Heights mean ONE thing per film
// (an elevation, a value, or just «a separate region» with all plates equal) and the meaning is in the register.

export type LonLat = [number, number];
export type Region = {id: string; ring: LonLat[]; height: number; lit?: boolean};

/** Equirectangular projection of lon/lat into the table plan: `bounds` [[lonMin, latMin], [lonMax, latMax]] fills
 *  the plan `w` × `d` (north towards −y, the back of the table). Longitude is scaled by cos(mid latitude). */
export const planOf = (bounds: [LonLat, LonLat], w: number, d: number) => {
  const [[lo0, la0], [lo1, la1]] = bounds;
  const k = Math.cos((((la0 + la1) / 2) * Math.PI) / 180);
  const sx = w / ((lo1 - lo0) * k);
  const sy = d / (la1 - la0);
  const s = Math.min(sx, sy);
  const ox = (w - (lo1 - lo0) * k * s) / 2;
  const oy = (d - (la1 - la0) * s) / 2;
  return ([lon, lat]: LonLat): K.Plane => [ox + (lon - lo0) * k * s, oy + (la1 - lat) * s];
};

/** Douglas–Peucker on a closed plan ring: keeps the outline readable at phone size and the plate light. */
export const simplify = (ring: K.Plane[], tolerance: number): K.Plane[] => {
  const dp = (pts: K.Plane[]): K.Plane[] => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
    let best = -1;
    let at = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const dist = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L;
      if (dist > best) [best, at] = [dist, i];
    }
    if (best <= tolerance) return [a, b];
    return [...dp(pts.slice(0, at + 1)).slice(0, -1), ...dp(pts.slice(at))];
  };
  const half = Math.floor(ring.length / 2);
  const out = [...dp(ring.slice(0, half + 1)).slice(0, -1), ...dp([...ring.slice(half), ring[0]]).slice(0, -1)];
  return out.length >= 3 ? out : ring;
};

const inside = ([x, y]: K.Plane, ring: K.Plane[]) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

/** A relief table: a tabletop on four legs with an edge rim, a sea plate, and one extruded plate per region. Returns
 *  `surface(x, y)` (the z of the top under a plan point) and `toKit(lon, lat)` for routes, pins and cameras. */
export const mapTable = (
  A: Assembly,
  [x0, y0, z0]: Point3,
  o: {w: number; d: number; bounds: [LonLat, LonLat]; regions: Region[]; legs?: number; tolerance?: number; base?: number},
) => {
  const legs = o.legs ?? 26;
  const top = z0 + legs;
  const base = o.base ?? 1.2; // sea plate thickness
  for (const [lx, ly] of [
    [x0 + 4, y0 + 4],
    [x0 + o.w - 4, y0 + 4],
    [x0 + 4, y0 + o.d - 4],
    [x0 + o.w - 4, y0 + o.d - 4],
  ]) {
    A.cyl(`table.foot${Math.round(lx)}_${Math.round(ly)}`, lx, ly, 2.6, z0, 1, {tone: 'lo', ground: true, bevel: 0.3});
    A.cyl(`table.leg${Math.round(lx)}_${Math.round(ly)}`, lx, ly, 1.8, z0 + 1, legs - 4, {tone: 'mid', bevel: 0.3});
  }
  // stretchers between the legs a hand above the floor
  A.slab('table.stretch.n', {x: x0 + 5.8, y: y0 + 3.4, w: o.w - 11.6, d: 1.2, r: 0.3}, z0 + 6, 1.2, {tone: 'lo', bevel: 0.2});
  A.slab('table.stretch.s', {x: x0 + 5.8, y: y0 + o.d - 4.6, w: o.w - 11.6, d: 1.2, r: 0.3}, z0 + 6, 1.2, {tone: 'lo', bevel: 0.2});
  A.slab('table.stretch.w', {x: x0 + 3.4, y: y0 + 5.8, w: 1.2, d: o.d - 11.6, r: 0.3}, z0 + 6, 1.2, {tone: 'lo', bevel: 0.2});
  A.slab('table.stretch.e', {x: x0 + o.w - 4.6, y: y0 + 5.8, w: 1.2, d: o.d - 11.6, r: 0.3}, z0 + 6, 1.2, {tone: 'lo', bevel: 0.2});
  A.slab('table.apron', {x: x0 + 2, y: y0 + 2, w: o.w - 4, d: o.d - 4, r: 0.6}, top - 3, 1.6, {tone: 'lo', bevel: 0.3});
  A.slab('table', {x: x0 - 2, y: y0 - 2, w: o.w + 4, d: o.d + 4, r: 1.6}, top - 1.4, 1.4, {tone: 'mid', bevel: 0.5, shadow: 'hero'});
  A.slab('table.sea', {x: x0, y: y0, w: o.w, d: o.d, r: 0.8}, top, base, {tone: 'lo', bevel: 0.2});
  // a rim round the sea plate, and corner brackets that hold it
  A.slab('table.rim.n', {x: x0 - 1, y: y0 - 1, w: o.w + 2, d: 1, r: 0.2}, top, base + 0.8, {tone: 'mid', bevel: 0.15});
  A.slab('table.rim.s', {x: x0 - 1, y: y0 + o.d, w: o.w + 2, d: 1, r: 0.2}, top, base + 0.8, {tone: 'mid', bevel: 0.15});
  A.slab('table.rim.w', {x: x0 - 1, y: y0, w: 1, d: o.d, r: 0.2}, top, base + 0.8, {tone: 'mid', bevel: 0.15});
  A.slab('table.rim.e', {x: x0 + o.w, y: y0, w: 1, d: o.d, r: 0.2}, top, base + 0.8, {tone: 'mid', bevel: 0.15});
  for (const [bx, by] of [
    [x0 - 1.6, y0 - 1.6],
    [x0 + o.w - 1.4, y0 - 1.6],
    [x0 - 1.6, y0 + o.d - 1.4],
    [x0 + o.w - 1.4, y0 + o.d - 1.4],
  ])
    A.slab(`table.bracket${Math.round(bx)}_${Math.round(by)}`, {x: bx, y: by, w: 3, d: 3, r: 0.4}, top + base + 0.8, 0.6, {tone: 'hi', bevel: 0.15});
  const seaTop = top + base;
  const toPlan = planOf(o.bounds, o.w, o.d);
  const plans = o.regions.map((r) => ({r, ring: simplify(r.ring.map(toPlan), o.tolerance ?? 0.35).map(([x, y]) => [x0 + x, y0 + y] as K.Plane)}));
  for (const {r, ring} of plans) {
    // the top edge of each plate is traced again so neighbouring plates of equal height stay apart on screen
    A.extruded(`region.${r.id}`, ring, seaTop, r.height, {tone: 'hi', lit: r.lit, over: K.lineSvg(K.onTop(ring, seaTop + r.height, A.P, true), {tone: 'lo'}), meta: {owner: `${A.name}.table.sea`}});
  }
  // a compass in the north-west corner of the sea: north is towards −y (the back of the table)
  const [kx, ky] = [x0 + 6, y0 + 6];
  A.cyl('compass', kx, ky, 3.2, seaTop, 0.6, {tone: 'mid', bevel: 0.15});
  A.prism('compass.needle', {o: [kx, ky, seaTop + 0.6], a: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0]}, [[0, 2.8], [0.7, 0], [0, -2.8], [-0.7, 0]], 0, 0.3, {tone: 'hi', meta: {owner: 'compass'}});
  const surface = (x: number, y: number) => {
    for (const {r, ring} of plans) if (inside([x, y], ring)) return seaTop + r.height;
    return seaTop;
  };
  const toKit = (lon: number, lat: number, lift = 0): Point3 => {
    const [px, py] = toPlan([lon, lat]);
    return [x0 + px, y0 + py, surface(x0 + px, y0 + py) + lift];
  };
  return {surface, toKit, top: seaTop, size: [o.w + 4, o.d + 4, legs + Math.max(...o.regions.map((r) => r.height)) + base] as Point3};
};

/** A route as a cord stretched from pin to pin over the relief: at each stop a pin stands on the surface, and a
 *  straight tube runs from pin head to pin head, above every plate. Root cause of the earlier design: a route laid ON
 *  the relief had to step up and down at every coast, and a step taken along the line of sight folds on screen
 *  whatever its bend; straight spans have no corners. `lit` makes the cord the coral part. Returns the head points
 *  (pin the frontal labels of the stops to them). */
export const route = (
  A: Assembly,
  name: string,
  map: {toKit: (lon: number, lat: number, lift?: number) => Point3; size: Point3; top: number},
  stops: [number, number][],
  o: {r?: number; lit?: boolean; above?: number} = {},
) => {
  const r = o.r ?? 0.6;
  const head = 1.1;
  const highest = Math.max(...stops.map(([lon, lat]) => map.toKit(lon, lat)[2]));
  const z = Math.max(highest, map.top) + (o.above ?? 7);
  const heads: Point3[] = stops.map(([lon, lat], i) => {
    const g = map.toKit(lon, lat);
    A.cyl(`${name}.pin${i}.foot`, g[0], g[1], 1.2, g[2], 0.4, {tone: 'mid', bevel: 0.1});
    A.cyl(`${name}.pin${i}`, g[0], g[1], 0.35, g[2] + 0.4, z - g[2] - 0.4 - head, {tone: 'hi', bevel: 0.05, meta: {owner: `${name}.pin${i}.foot`}});
    const h: Point3 = [g[0], g[1], z];
    A.ball(`${name}.pin${i}.head`, h, head, {tone: 'hi', meta: {owner: `${name}.pin${i}.foot`}});
    return h;
  });
  for (let i = 0; i < heads.length - 1; i++) {
    const d = G.unit3(G.sub3(heads[i + 1], heads[i])) as Point3;
    A.pipe(`${name}.${i}`, [G.add3(heads[i], G.mul3(d, head * 0.8)) as Point3, G.sub3(heads[i + 1], G.mul3(d, head * 0.8)) as Point3], r, {lit: o.lit ?? true, tone: 'hi'});
  }
  return heads;
};
