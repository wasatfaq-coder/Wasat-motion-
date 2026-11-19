import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import * as TubeKit from '../vendor/anatomy/tube.mjs';
import * as AuditKit from '../vendor/anatomy/audit.mjs';
import {DepthNode, resolveOrder} from './depth';

// The vendored .mjs modules are untyped JS (types inferred from defaults are too narrow); use them loosely here.
/* eslint-disable @typescript-eslint/no-explicit-any */
const G: any = LatheKit;
const T: any = TubeKit;
const A: any = AuditKit;

// Assembly: one object of a scene in the house style (MASTER_PROMPT_FINAL §22). Every helper DRAWS a part with the
// Anatomy core and RECORDS its true 3D shape, so `scripts/object-audit.mjs` can check the object from its geometry
// (pipes through parts, floating parts, wrong paint order, stand-in shapes) and count its parts (§22.2).
// Pure TypeScript, no React: the audit imports the same module the scene draws from, so they cannot drift apart.
//
// Usage (in a `*.parts.ts` file next to the scene; the audit finds every exported Assembly there):
//   export const FAN = new Assembly('fan', P, {role: 'hero'});
//   FAN.slab('base', {x: 0, y: 0, w: 40, d: 40, r: 3}, 0, 4, {ground: true});
//   FAN.turned('hub', [[0, 6], [8, 6], [10, 4, 1], [12, 0]], G.frameAlong([20, 20, 4], [0, 0, 1]), {lit: true});
//   FAN.pipe('cable', [[2, 2, 4], [2, -10, 4], [-10, -10, 0]], 0.8, {bend: 3});
//   // in the scene: <Kit svg={FAN.svg({lid: share})} />

export {G, T, A, K};
export type Point3 = K.Point3;
export type Frame = {o: Point3; a: Point3; u: Point3; v: Point3};
export type Role = 'hero' | 'secondary' | 'environment';
/** How the object is meant to be read. The part-count norm does not change with this flag (§22.2). */
export type Detail = 'complex' | 'simple' | 'schematic';

/** §22.2 detail norm: recorded parts per role. Environment is a warning in object-audit, not an error. */
export const PART_NORM: Record<Role, number> = {hero: 80, secondary: 40, environment: 15};

/** An environment object stays supporting: at most this share of the hero part count in the same file (§22.2). */
export const ENV_HERO_SHARE = 0.4;

type Common = {
  piece?: string; // a sub-assembly that moves as one (lid, door, arm); its share is passed to svg()
  move?: Point3; // where the piece goes at share 1 (kit units)
  bias?: number; // paint-order nudge (prefer fixing geometry; the audit checks the result)
  ground?: boolean; // stands on the floor / is the base everything else rests on
  over?: string; // markup drawn on top of this part (labels, seams, dots on its surface)
  meta?: Record<string, unknown>; // audit meta: owner, touch, seated, cut, limp…
  shadow?: 'hero' | 'part'; // halo blur: hero body 12–16 px, small part 6–8 px (§22.1). Default is the small part.
};
type SolidOpts = Common & K.SolidStyle;

export type Item = {name: string; key: number; svg: string; piece: string; move: Point3; shapes: unknown[]; route?: string; chunk?: number};

export class Assembly {
  readonly R: any;
  readonly V: Point3;

  constructor(
    readonly name: string,
    readonly P: K.Projection,
    readonly opts: {role?: Role; detail?: Detail; order?: string[]; allow?: [string, string][]; crowd?: [string, string][]; cover?: string[]} = {},
  ) {
    this.R = A.recorder(P, {order: opts.order ?? []});
    this.V = A.cameraBasis(P).V as Point3;
  }

  get role(): Role {
    return this.opts.role ?? 'secondary';
  }

  /** Recorded reading of the object. Default complex. Does not lower PART_NORM. */
  get detail(): Detail {
    return this.opts.detail ?? 'complex';
  }

  /** Recorded parts (solids + pipe/cable routes): the §22.2 count. */
  get parts() {
    return this.R.solids.length + this.R.routes.length;
  }

  private full(name: string) {
    return this.R.nameFor(`${this.name}.${name}`);
  }

  /** Hero bodies take the wider contact shadow; the class is read by ANATOMY_CSS (§22.1). */
  private styled(c: SolidOpts): SolidOpts {
    if (c.shadow !== 'hero') return c;
    return {...c, className: [c.className, 'halo-hero'].filter(Boolean).join(' ')};
  }

  private shape<S extends object>(s: S, c: Common, name: string) {
    return this.R.solid({...s, ...(c.meta ?? {}), ...(c.ground ? {ground: true} : {}), name});
  }

  private put(name: string, at: Point3, svg: string, shapes: unknown[], c: Common, extra: Record<string, unknown> = {}): Item {
    const item = this.R.put({name, at, bias: c.bias ?? 0, piece: c.piece ?? '', move: c.move ?? [0, 0, 0], svg: svg + (c.over ?? ''), shapes, ...extra});
    item.baseKey = item.key;
    return item as Item;
  }

  /** A box with rounded plan corners standing at z (plan in kit units). */
  slab(name: string, plan: K.Plan, z: number, h: number, c: SolidOpts & {bevel?: number; steps?: number} = {}) {
    const n = this.full(name);
    const svg = K.solidSvg(K.slabOf(plan, z, h, this.P, c.steps ?? 8, c.bevel ?? 0.6), this.styled(c));
    return this.put(n, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [this.shape(A.slab(plan, z, h, {}, c.steps ?? 8), c, n)], c);
  }

  /** Any polygon (plan ring) extruded up from z: L-brackets, housings, keys. */
  extruded(name: string, ring: K.Plane[], z: number, h: number, c: SolidOpts = {}) {
    const n = this.full(name);
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return this.put(n, [cx, cy, z + h / 2], K.solidSvg(K.extrude(ring, z, h, this.P), this.styled(c)), [this.shape(A.extruded(ring, z, h), c, n)], c);
  }

  /** A prism of a CONVEX polygon in the frame's (u, v) plane, extruded along F.a from s0 to s1 — on ANY axis
   *  (beams, bars, plates that are not upright). A concave outline (a half-ring) must be an upright `extruded`. */
  prism(name: string, F: Frame, polygon: number[][], s0: number, s1: number, c: SolidOpts = {}) {
    const n = this.full(name);
    const cx = polygon.reduce((t, q) => t + q[0], 0) / polygon.length;
    const cy = polygon.reduce((t, q) => t + q[1], 0) / polygon.length;
    const at = G.add3(G.add3(G.add3(F.o, G.mul3(F.u, cx)), G.mul3(F.v, cy)), G.mul3(F.a, (s0 + s1) / 2)) as Point3;
    return this.put(n, at, K.solidSvg(G.prismOf(F, polygon, s0, s1, this.P), this.styled(c)), [this.shape(A.prism(F, polygon, s0, s1), c, n)], c);
  }

  /** Upright cylinder (pins, posts, cans standing on the floor). */
  cyl(name: string, cx: number, cy: number, r: number, z: number, h: number, c: SolidOpts & {bevel?: number} = {}) {
    const n = this.full(name);
    const svg = K.solidSvg(K.cylinder(cx, cy, r, z, h, this.P, 32, c.bevel ?? 0.4), this.styled(c));
    return this.put(n, [cx, cy, z + h / 2], svg, [this.shape(A.cylinder(cx, cy, r, z, h), c, n)], c);
  }

  /** A turned part on ANY axis: profile [[s, r(, 1 = smooth)], …] along frame F (G.frameAlong(origin, axis)).
   *  Bolts, knobs, cans, nozzles, wheels, lenses, bottles. Curved bodies: mark knots smooth or pass lathe.smooth. */
  turned(name: string, profile: number[][], F: Frame, c: SolidOpts & {lathe?: Record<string, unknown>} = {}) {
    const n = this.full(name);
    const paths = G.solidOf(profile, F, this.P, c.lathe ?? {});
    const s = profile.map((p) => p[0]);
    const mid = (Math.min(...s) + Math.max(...s)) / 2;
    const at = G.add3(F.o, G.mul3(F.a, mid)) as Point3;
    return this.put(n, at, K.solidSvg(paths, this.styled(c)), [this.shape(A.solid(F, profile), c, n)], c);
  }

  /** A flat disc / flange / wheel on any axis (s0..s1 along F.a). */
  disc(name: string, s0: number, s1: number, r: number, F: Frame, c: SolidOpts = {}) {
    const n = this.full(name);
    const at = G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)) as Point3;
    return this.put(n, at, K.solidSvg(G.disc(s0, s1, r, F, this.P), this.styled(c)), [this.shape(A.disc(F, s0, s1, r), c, n)], c);
  }

  /** A ring / collar with thickness on any axis (eye bolts, collars, flanges with a bore). */
  ring(name: string, s0: number, s1: number, rIn: number, rOut: number, F: Frame, c: SolidOpts = {}) {
    const n = this.full(name);
    const at = G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)) as Point3;
    return this.put(n, at, K.solidSvg(G.ringBand(s0, s1, rIn, rOut, F, this.P), this.styled(c)), [this.shape(A.ring(F, s0, s1, rIn, rOut), c, n)], c);
  }

  /** A ball (knob, joint, bearing, terminal). */
  ball(name: string, centre: Point3, r: number, c: SolidOpts = {}) {
    const n = this.full(name);
    return this.put(n, centre, K.solidSvg(G.sphereOf(centre, r, this.P), this.styled(c)), [this.shape(A.ball(centre, r), c, n)], c);
  }

  /** A pipe, hose or cable along 3D control points. `bend` fillets the corners (≥ 2.6·r is safe); `gaps` are
   *  arc-length spans hidden by a collar or clamp; `limp` for cables (they hold nothing up). Each chunk is painted at
   *  its own depth, so a cable can weave between parts. */
  pipe(
    name: string,
    points: Point3[],
    r: number,
    c: Common & {bend?: number; gaps?: [number, number][]; caps?: boolean | [boolean, boolean]; maxLength?: number; tone?: K.Tone; limp?: boolean; lit?: boolean; rings?: Record<string, unknown>; ends?: [boolean, boolean]} = {},
  ) {
    const n = this.full(name);
    const route = (c.bend ? G.fillet(points, c.bend, 7, {P: this.P, tube: r}) : points) as Point3[];
    const pieces = T.tubePieces(route, r, this.P, {maxLength: c.maxLength ?? 14, gaps: c.gaps ?? [], caps: c.caps ?? true, rings: c.rings ?? null});
    this.R.route(n, route, r, {gaps: c.gaps ?? [], limp: c.limp ?? false, ends: c.ends ?? [true, true], piece: c.piece ?? '', move: c.move ?? [0, 0, 0], ...(c.meta ?? {})});
    const mark = (svg: string) => (c.lit ? svg.replace('<g class="tb">', '<g class="tb" data-lit="">') : svg);
    return pieces.map((piece: {mid: Point3; points: Point3[]; radii: number[]}, i: number) =>
      this.put(`${n}:${i}`, piece.mid, mark(T.tubeSvg(piece, {tone: c.tone ?? 'hi'})), [A.tube(piece.points, piece.radii, {name: n, limp: c.limp ?? false})], {...c, over: i === pieces.length - 1 ? c.over : ''}, {route: n, chunk: i}),
    );
  }

  /** Markup with no body of its own (a label on a face, a seam): give the shape of what it sits on via `shapes`. */
  markup(name: string, at: Point3, svg: string, shapes: unknown[], c: Common = {}) {
    return this.put(this.full(name), at, svg, shapes, c);
  }

  /** Paint order solved from the recorded geometry (Anatomy orderKeys). Slow, so the audit runs it once
   *  (`node scripts/object-audit.mjs --settle`) and writes `<file>.keys.json`; the parts file applies it with
   *  applyKeys(). Starts from the plain depth keys every time, so repeated runs do not drift. */
  settle() {
    for (const item of this.R.items as (Item & {baseKey: number})[]) item.key = item.baseKey;
    this.R.settled = null;
    A.settle(this.R, this.P);
    return Object.fromEntries((this.R.items as Item[]).map((i) => [i.name, Math.round(i.key * 1000) / 1000]));
  }

  /** Apply keys solved by settle() (from the object's keys.json). Items with no stored key are listed in `unsettled`. */
  applyKeys(keys: Record<string, number> | undefined) {
    this.unsettled = [];
    for (const item of this.R.items as Item[]) {
      if (keys && item.name in keys) item.key = keys[item.name];
      else this.unsettled.push(item.name);
    }
    this.keysApplied = true;
    return this;
  }

  unsettled: string[] = [];
  keysApplied = false;

  /** The object as SVG markup, painted back to front. `shares` moves pieces (0 = home, 1 = at `move`). */
  svg(shares: Record<string, number> = {}, opts: {hide?: (name: string) => boolean; extra?: Extra[]} = {}) {
    return this.paintPlan(shares, opts).svg;
  }

  /** svg() plus the diagnostics the motion check reads: the painted order and any depth conflicts.
   *  Extras that carry `shapes` (moving parts built with dynTube / dynBall / dynSolid) are ordered against the static
   *  parts by ray tests on the true 3D shapes (src/lib/depth.ts), frame by frame; extras without shapes keep the old
   *  single-key placement. */
  paintPlan(shares: Record<string, number> = {}, opts: {hide?: (name: string) => boolean; extra?: Extra[]} = {}) {
    // `hide` leaves parts out of a picture (e.g. a cable that would read as a second shaft on a cover)
    const items = (this.R.items as Item[]).filter((i) => !opts.hide?.(i.name));
    const keyed: {item: Item; index: number; off: Point3; key: number; shapes?: unknown[]; opacity?: number; dynamic?: boolean}[] = items.map((item, index) => {
      const share = shares[item.piece] ?? 0;
      const off = G.mul3(item.move, share) as Point3;
      return {item, index, off, key: item.key + G.dot3(off, this.V)};
    });
    // extra items (parts rebuilt every frame, such as a turning loop) are ordered with the rest. Their depth is on the
    // plain scale (dot(at, V)) while settled keys live on another one, so an extra takes the settled key of the static
    // item just in front of it on the plain scale (plus a hair for its own depth).
    const byBase = [...(this.R.items as (Item & {baseKey: number})[])].sort((a, b) => a.baseKey - b.baseKey);
    const keyFor = (b: number) => {
      let lo = -1;
      for (let i = 0; i < byBase.length && byBase[i].baseKey <= b; i++) lo = i;
      if (lo < 0) return byBase.length ? byBase[0].key - 1e-3 + (b - byBase[0].baseKey) * 1e-3 : b;
      return byBase[lo].key + 1e-3 + (b - byBase[lo].baseKey) * 1e-3;
    };
    const extras = (opts.extra ?? []).filter((e) => (e.opacity ?? 1) > 0.001);
    for (const [i, e] of extras.entries())
      keyed.push({item: {svg: e.svg, move: [0, 0, 0], name: e.name ?? `extra${i}`} as unknown as Item, index: items.length + i, off: [0, 0, 0] as Point3, key: keyFor(G.dot3(e.at, this.V) + (e.bias ?? 0)), shapes: e.shapes, opacity: e.opacity, dynamic: true});
    let sorted: typeof keyed;
    let conflicts: string[] = [];
    if (extras.some((e) => e.shapes?.length)) {
      const nodes: DepthNode[] = keyed.map((k) => ({
        key: k.key,
        name: k.item.name,
        fixed: !k.dynamic,
        shapes: k.dynamic ? (k.shapes ?? []) : (k.item.shapes ?? []).map((s) => A.moved(s, k.off)),
      }));
      const plan = resolveOrder(nodes, this.P);
      sorted = plan.order.map((i) => keyed[i]);
      conflicts = plan.conflicts;
    } else sorted = [...keyed].sort((a, b) => a.key - b.key || a.index - b.index);
    const svg = sorted
      .map(({item, off, opacity}) => {
        const body = opacity !== undefined && opacity < 0.999 ? `<g opacity="${opacity.toFixed(3)}">${item.svg}</g>` : item.svg;
        if (!off[0] && !off[1] && !off[2]) return body;
        const [dx, dy] = K.iso(off, this.P);
        return `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)})">${body}</g>`;
      })
      .join('');
    return {svg, order: sorted.map((k) => k.item.name), conflicts};
  }

  /** The recorded items as moving parts (Dyn), for an assembly rebuilt every frame and drawn inside another one
   *  (a wire that bends, a lid that is a separate object). Each keeps its own shapes for the depth order. */
  dyn(opacity?: number): Dyn[] {
    const centre = (shapes: unknown[]): Point3 => {
      if (!shapes.length) return [0, 0, 0];
      const b = shapes.map((s) => A.boundsOf(s) as {min: Point3; max: Point3});
      return [0, 1, 2].map((k) => (Math.min(...b.map((x) => x.min[k])) + Math.max(...b.map((x) => x.max[k]))) / 2) as Point3;
    };
    return (this.R.items as Item[]).map((i) => ({name: i.name, at: centre(i.shapes), svg: i.svg, shapes: i.shapes, opacity}));
  }

  /** Every geometry check of the Anatomy audit on the order the scene actually paints (no re-keying). */
  audit() {
    const R = this.R;
    if (!R.settled) {
      const states = A.explodeStates(R.order, R.spring).depth;
      const items = R.items.slice();
      const overlaps = A.overlapsOf(items, this.P, {states, skip: A.sameRun});
      R.settled = {items, overlaps, solved: {keys: items.map((i: Item) => i.key), dropped: [], rules: 0}, states};
    }
    const result = A.audit(R, this.P, {allow: this.opts.allow ?? [], crowd: this.opts.crowd ?? [], cover: this.opts.cover ?? []});
    return {result, report: A.report(result) as string, failures: A.failures(result) as number};
  }

}

/** A part drawn outside the static assembly (rebuilt every frame) and passed to Assembly.svg({}, {extra}).
 *  With `shapes` it is ordered by the true 3D geometry (src/lib/depth.ts); without, by one depth key at `at`. */
export type Extra = {at: Point3; svg: string; bias?: number; name?: string; shapes?: unknown[]; opacity?: number};
/** A moving part with its shapes: what the depth order and scripts/motion-check.mjs need. */
export type Dyn = Extra & {name: string; shapes: unknown[]};

/** A moving bar, pipe or wire split into short pieces (≤ maxLength kit units). Each piece gets its own place in the
 *  paint order, so a long part can pass in front of one static part and behind another (§22, depth.ts). */
export const dynTube = (name: string, points: Point3[], r: number, P: K.Projection, o: {lit?: boolean; tone?: K.Tone; maxLength?: number; caps?: boolean; opacity?: number} = {}): Dyn[] =>
  (T.tubePieces(points, r, P, {maxLength: o.maxLength ?? 4, caps: o.caps ?? true}) as {mid: Point3; points: Point3[]; radii: number[]}[]).map((piece, i) => {
    const svg = T.tubeSvg(piece, {tone: o.tone ?? 'hi'}) as string;
    return {
      name: `${name}:${i}`,
      at: piece.mid,
      svg: o.lit ? svg.replace('<g class="tb">', '<g class="tb" data-lit="">') : svg,
      shapes: [A.tube(piece.points, piece.radii, {name: `${name}:${i}`})],
      opacity: o.opacity,
    };
  });

/** A moving ball (a joint, a corner of a loop). */
export const dynBall = (name: string, centre: Point3, r: number, P: K.Projection, style: K.SolidStyle = {}, opacity?: number): Dyn => ({
  name,
  at: centre,
  svg: K.solidSvg(G.sphereOf(centre, r, P), style),
  shapes: [A.ball(centre, r, {name})],
  opacity,
});

/** Any moving solid: its markup and the audit shape of the same body (A.extruded, A.solid, A.prism…). */
export const dynSolid = (name: string, at: Point3, svg: string, shape: unknown, opacity?: number, bias?: number): Dyn => ({name, at, svg, shapes: [shape], opacity, bias});

/** Duck-typed check (the audit may load this module twice). */
export const isAssembly = (x: unknown): x is Assembly => typeof x === 'object' && x !== null && 'R' in x && typeof (x as Assembly).audit === 'function';
