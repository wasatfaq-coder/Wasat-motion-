import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import * as TubeKit from '../vendor/anatomy/tube.mjs';
import * as AuditKit from '../vendor/anatomy/audit.mjs';

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

/** §22.2 detail norm: recorded parts per role. */
export const PART_NORM: Record<Role, number> = {hero: 80, secondary: 40, environment: 0};

type Common = {
  piece?: string; // a sub-assembly that moves as one (lid, door, arm); its share is passed to svg()
  move?: Point3; // where the piece goes at share 1 (kit units)
  bias?: number; // paint-order nudge (prefer fixing geometry; the audit checks the result)
  ground?: boolean; // stands on the floor / is the base everything else rests on
  over?: string; // markup drawn on top of this part (labels, seams, dots on its surface)
  meta?: Record<string, unknown>; // audit meta: owner, touch, seated, cut, limp…
};
type SolidOpts = Common & K.SolidStyle;

export type Item = {name: string; key: number; svg: string; piece: string; move: Point3; shapes: unknown[]; route?: string; chunk?: number};

export class Assembly {
  readonly R: any;
  readonly V: Point3;

  constructor(
    readonly name: string,
    readonly P: K.Projection,
    readonly opts: {role?: Role; order?: string[]; allow?: [string, string][]; crowd?: [string, string][]; cover?: string[]} = {},
  ) {
    this.R = A.recorder(P, {order: opts.order ?? []});
    this.V = A.cameraBasis(P).V as Point3;
  }

  get role(): Role {
    return this.opts.role ?? 'secondary';
  }

  /** Recorded parts (solids + pipe/cable routes): the §22.2 count. */
  get parts() {
    return this.R.solids.length + this.R.routes.length;
  }

  private full(name: string) {
    return this.R.nameFor(`${this.name}.${name}`);
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
    const svg = K.solidSvg(K.slabOf(plan, z, h, this.P, c.steps ?? 8, c.bevel ?? 0.6), c);
    return this.put(n, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, [this.shape(A.slab(plan, z, h, {}, c.steps ?? 8), c, n)], c);
  }

  /** Any polygon (plan ring) extruded up from z: L-brackets, housings, keys. */
  extruded(name: string, ring: K.Plane[], z: number, h: number, c: SolidOpts = {}) {
    const n = this.full(name);
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return this.put(n, [cx, cy, z + h / 2], K.solidSvg(K.extrude(ring, z, h, this.P), c), [this.shape(A.extruded(ring, z, h), c, n)], c);
  }

  /** Upright cylinder (pins, posts, cans standing on the floor). */
  cyl(name: string, cx: number, cy: number, r: number, z: number, h: number, c: SolidOpts & {bevel?: number} = {}) {
    const n = this.full(name);
    const svg = K.solidSvg(K.cylinder(cx, cy, r, z, h, this.P, 32, c.bevel ?? 0.4), c);
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
    return this.put(n, at, K.solidSvg(paths, c), [this.shape(A.solid(F, profile), c, n)], c);
  }

  /** A flat disc / flange / wheel on any axis (s0..s1 along F.a). */
  disc(name: string, s0: number, s1: number, r: number, F: Frame, c: SolidOpts = {}) {
    const n = this.full(name);
    const at = G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)) as Point3;
    return this.put(n, at, K.solidSvg(G.disc(s0, s1, r, F, this.P), c), [this.shape(A.disc(F, s0, s1, r), c, n)], c);
  }

  /** A ring / collar with thickness on any axis (eye bolts, collars, flanges with a bore). */
  ring(name: string, s0: number, s1: number, rIn: number, rOut: number, F: Frame, c: SolidOpts = {}) {
    const n = this.full(name);
    const at = G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)) as Point3;
    return this.put(n, at, K.solidSvg(G.ringBand(s0, s1, rIn, rOut, F, this.P), c), [this.shape(A.ring(F, s0, s1, rIn, rOut), c, n)], c);
  }

  /** A ball (knob, joint, bearing, terminal). */
  ball(name: string, centre: Point3, r: number, c: SolidOpts = {}) {
    const n = this.full(name);
    return this.put(n, centre, K.solidSvg(G.sphereOf(centre, r, this.P), c), [this.shape(A.ball(centre, r), c, n)], c);
  }

  /** A pipe, hose or cable along 3D control points. `bend` fillets the corners (≥ 2.6·r is safe); `gaps` are
   *  arc-length spans hidden by a collar or clamp; `limp` for cables (they hold nothing up). Each chunk is painted at
   *  its own depth, so a cable can weave between parts. */
  pipe(
    name: string,
    points: Point3[],
    r: number,
    c: Common & {bend?: number; gaps?: [number, number][]; caps?: boolean | [boolean, boolean]; maxLength?: number; tone?: K.Tone; limp?: boolean; rings?: Record<string, unknown>; ends?: [boolean, boolean]} = {},
  ) {
    const n = this.full(name);
    const route = (c.bend ? G.fillet(points, c.bend, 7, {P: this.P, tube: r}) : points) as Point3[];
    const pieces = T.tubePieces(route, r, this.P, {maxLength: c.maxLength ?? 14, gaps: c.gaps ?? [], caps: c.caps ?? true, rings: c.rings ?? null});
    this.R.route(n, route, r, {gaps: c.gaps ?? [], limp: c.limp ?? false, ends: c.ends ?? [true, true], piece: c.piece ?? '', move: c.move ?? [0, 0, 0], ...(c.meta ?? {})});
    return pieces.map((piece: {mid: Point3; points: Point3[]; radii: number[]}, i: number) =>
      this.put(`${n}:${i}`, piece.mid, T.tubeSvg(piece, {tone: c.tone ?? 'hi'}), [A.tube(piece.points, piece.radii, {name: n, limp: c.limp ?? false})], {...c, over: i === pieces.length - 1 ? c.over : ''}, {route: n, chunk: i}),
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
  svg(shares: Record<string, number> = {}) {
    const items = this.R.items as Item[];
    const keyed = items.map((item, index) => {
      const share = shares[item.piece] ?? 0;
      const off = G.mul3(item.move, share) as Point3;
      return {item, index, off, key: item.key + G.dot3(off, this.V)};
    });
    keyed.sort((a, b) => a.key - b.key || a.index - b.index);
    return keyed
      .map(({item, off}) => {
        if (!off[0] && !off[1] && !off[2]) return item.svg;
        const [dx, dy] = K.iso(off, this.P);
        return `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)})">${item.svg}</g>`;
      })
      .join('');
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

/** Duck-typed check (the audit may load this module twice). */
export const isAssembly = (x: unknown): x is Assembly => typeof x === 'object' && x !== null && 'R' in x && typeof (x as Assembly).audit === 'function';
