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

  /** pipes with an unchecked end and no `free` reason (lint «loose») */
  private loose: string[] = [];
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

  /** Names in `meta.owner` / `meta.touch` are resolved inside this object, so a builder may write the short name
   *  (`owner: 'core'`) and get `<object>.core`. Root cause of past failures: a short owner matched nothing and the
   *  audit reported sunk or loose parts; a `touch` string instead of a list crashed the audit. A name that already
   *  starts with this object's name, or a pattern that starts with it, is kept. */
  private resolve(n: string) {
    const prefixed = `${this.name}.${n}`;
    // a part already recorded under the prefixed name wins: in object «monitor», owner «monitor.column» is the part
    // «monitor.monitor.column», not a name that is already full
    const known = (x: string) => (this.R.solids as {name: string}[]).some((s) => s.name === x) || (this.R.routes as {name: string}[]).some((r) => r.name === x);
    if (known(prefixed)) return prefixed;
    return n.startsWith(`${this.name}.`) || n === this.name ? n : prefixed;
  }

  private meta(c: Common): Record<string, unknown> {
    const m: Record<string, unknown> = {...(c.meta ?? {})};
    if (typeof m.owner === 'string') m.owner = this.resolve(m.owner);
    if (m.touch !== undefined) m.touch = (Array.isArray(m.touch) ? m.touch : [m.touch]).map((t) => this.resolve(String(t)));
    return m;
  }

  private shape<S extends object>(s: S, c: Common, name: string) {
    return this.R.solid({...s, ...this.meta(c), ...(c.ground ? {ground: true} : {}), name});
  }

  private put(name: string, at: Point3, svg: string, shapes: unknown[], c: Common, extra: Record<string, unknown> = {}): Item {
    const item = this.R.put({name, at, bias: c.bias ?? 0, piece: c.piece ?? '', move: c.move ?? [0, 0, 0], svg: svg + (c.over ?? ''), shapes, ...extra});
    item.baseKey = item.key;
    item.pos = at; // kept for lint (the recorder keeps only the depth key)
    return item as Item;
  }

  /** A ring sector round a vertical axis at centre `c` (a half-shell, an arc magnet, a clamp band) from angle a0 to a1
   *  (radians), radii rIn…rOut, z…z + h. Split at the view's silhouette azimuths (A ± 90°) into `name`, `name.b`, `name.c`
   *  so every piece is wholly in front of or behind what it wraps (lint `arc`). Returns the part names. */
  arc(name: string, c: [number, number], rIn: number, rOut: number, a0: number, a1: number, z: number, h: number, opts: SolidOpts = {}) {
    const az = (((this.P as {azimuth?: number}).azimuth ?? 45) * Math.PI) / 180;
    const cuts: number[] = [];
    for (const s of [az + Math.PI / 2, az - Math.PI / 2])
      for (let k = -2; k <= 2; k++) {
        const a = s + 2 * Math.PI * k;
        if (a > a0 + 0.02 && a < a1 - 0.02) cuts.push(a);
      }
    const edges = [a0, ...cuts.sort((x, y) => x - y), a1];
    const names: string[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const [b0, b1] = [edges[i], edges[i + 1]];
      const steps = Math.max(2, Math.ceil(((b1 - b0) / Math.PI) * 18));
      const ring: K.Plane[] = [];
      for (let k = 0; k <= steps; k++) ring.push([c[0] + rOut * Math.cos(b0 + ((b1 - b0) * k) / steps), c[1] + rOut * Math.sin(b0 + ((b1 - b0) * k) / steps)]);
      for (let k = steps; k >= 0; k--) ring.push([c[0] + rIn * Math.cos(b0 + ((b1 - b0) * k) / steps), c[1] + rIn * Math.sin(b0 + ((b1 - b0) * k) / steps)]);
      const n = i === 0 ? name : `${name}.${String.fromCharCode(97 + i)}`;
      this.extruded(n, ring, z, h, opts);
      names.push(n);
    }
    return names;
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
  prism(name: string, F: Frame, polygon: number[][], s0: number, s1: number, c: SolidOpts & {bevel?: number} = {}) {
    const n = this.full(name);
    const cx = polygon.reduce((t, q) => t + q[0], 0) / polygon.length;
    const cy = polygon.reduce((t, q) => t + q[1], 0) / polygon.length;
    const at = G.add3(G.add3(G.add3(F.o, G.mul3(F.u, cx)), G.mul3(F.v, cy)), G.mul3(F.a, (s0 + s1) / 2)) as Point3;
    const paths = G.prismOf(F, polygon, s0, s1, this.P);
    if (c.bevel) paths.bevel = prismBevel(F, polygon, s0, s1, c.bevel, this.P, this.V);
    // the bevel is recorded with the shape: lint «bevel» refuses a large tilted hero body drawn without one (§22.1)
    return this.put(n, at, K.solidSvg(paths, this.styled(c)), [this.shape(A.prism(F, polygon, s0, s1), {...c, meta: {...(c.meta ?? {}), bevel: c.bevel ?? 0}}, n)], c);
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
   *  arc-length spans hidden by a collar or clamp; `limp` for cables: a limp tube holds NOTHING up in the support check,
   *  so a part that hangs on it (a pan on chains, a tip ball) is loose; use a rigid tube for a hanger. A ring of cord
   *  (a loop, a coil turn, a hoop) is `closed`: an open pipe drawn round a loop has two ends that the audit checks
   *  for mounts. The vendored crowding check still sees the seam of a closed loop as an end: give loops of one
   *  object a `crowd` pair in the Assembly options. The pipe's owner defaults to its own name; a part owned by the pipe is never its mount. Each chunk is painted at
   *  its own depth, so a cable can weave between parts. */
  pipe(
    name: string,
    points: Point3[],
    r: number,
    c: Common & {bend?: number; closed?: boolean; gaps?: [number, number][]; caps?: boolean | [boolean, boolean]; maxLength?: number; tone?: K.Tone; limp?: boolean; lit?: boolean; rings?: Record<string, unknown>; ends?: [boolean, boolean]; free?: string} = {},
  ) {
    const n = this.full(name);
    // an unchecked end (ends false) must say why it is free (a thread tail, a cable that runs out of the frame); a cable
    // that simply stops shows a cut in the air once the frame holds the whole object (lint «loose»)
    if ((c.ends ?? [true, true]).includes(false) && !c.free?.trim()) this.loose.push(n);
    const route = (c.bend ? G.fillet(points, c.bend, 7, {P: this.P, tube: r}) : points) as Point3[];
    const pieces = T.tubePieces(route, r, this.P, {maxLength: c.maxLength ?? 14, closed: c.closed ?? false, gaps: c.gaps ?? [], caps: c.closed ? false : (c.caps ?? true), rings: c.rings ?? null});
    this.R.route(n, route, r, {gaps: c.gaps ?? [], closed: c.closed ?? false, limp: c.limp ?? false, ends: c.ends ?? [true, true], piece: c.piece ?? '', move: c.move ?? [0, 0, 0], ...this.meta(c)});
    const mark = (svg: string) => (c.lit ? svg.replace('<g class="tb">', '<g class="tb" data-lit="">') : svg);
    return pieces.map((piece: {mid: Point3; points: Point3[]; radii: number[]}, i: number) =>
      this.put(`${n}:${i}`, piece.mid, mark(T.tubeSvg(piece, {tone: c.tone ?? 'hi'})), [A.tube(piece.points, piece.radii, {name: n, limp: c.limp ?? false})], {...c, over: i === pieces.length - 1 ? c.over : ''}, {route: n, chunk: i}),
    );
  }

  /** Markup with no body of its own (a label on a face, a seam): give the shape of what it sits on via `shapes`.
   *  Lines that belong to one part (seams, ticks, an outline traced on its top) go in that part's `over` instead:
   *  markup with no shape is an «item with no shape» in the audit, so it is refused here at once. */
  markup(name: string, at: Point3, svg: string, shapes: unknown[], c: Common = {}) {
    if (!shapes.length) throw new Error(`Assembly ${this.name}: markup «${name}» has no shape; draw it with the \`over\` option of the part it sits on`);
    return this.put(this.full(name), at, svg, shapes, c);
  }

  /** Fast checks of mistakes that the full audit finds only after a slow settle (object-audit runs this first and
   *  stops on any finding). Each rule is a root cause seen while building the kit (§22.4, §24.5):
   *  - a lathe body runs THROUGH a coaxial body of larger radius (a collar round a rod, a hub through a gear): no
   *    paint order exists; slice the rod at the collar or seat the hub under the gear;
   *  - a pipe end sits on a part that shares the pipe's owner (or is owned by the pipe): the audit never counts a
   *    part of the same owner as a mount, so the end reads as loose; leave the owner off;
   *  - a ring (a hollow body) round a smaller coaxial body inside its span (soil in a pot rim): same paint cycle;
   *  - an owner that names no part and groups nothing (a typo, or a doubled object name);
   *  - a pipe bend folds back on screen (handles, arches and steps turned in a plane that holds the line of sight). */
  lint(): string[] {
    const out: string[] = [];
    for (const n of this.loose) out.push(`loose: «${n}» has a free end with no reason; end it at a part (a plug, a socket, a clip) or pass free: '<why the end is free>'`);
    type Body = {name: string; F: Frame; poly: number[][]; owner?: string};
    const bodies = (this.R.solids as Body[]).filter((b) => (b as unknown as {kind: string}).kind === 'body');
    const span = (b: Body) => {
      const s = b.poly.map((p) => p[0]);
      return {s0: Math.min(...s), s1: Math.max(...s), r: Math.max(...b.poly.map((p) => p[1]))};
    };
    const cross = (a: Point3, b: Point3) => G.len3(G.cross3(a, b)) as number;
    for (let i = 0; i < bodies.length; i++)
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const [big, small] = [bodies[i], bodies[j]];
        if (cross(big.F.a, small.F.a) > 1e-3) continue; // not parallel
        const d = G.sub3(small.F.o, big.F.o) as Point3;
        if (cross(d, big.F.a) > 1e-3) continue; // not on one line
        const shift = G.dot3(d, big.F.a) * Math.sign(G.dot3(small.F.a, big.F.a));
        const B = span(big);
        const S0 = span(small);
        const S = {s0: S0.s0 + shift, s1: S0.s1 + shift, r: S0.r};
        if (S.r >= B.r - 1e-6) continue;
        const inside = Math.min(B.s1, S.s1) - Math.max(B.s0, S.s0);
        const pokes = S.s0 < B.s0 - 0.05 && S.s1 > B.s1 + 0.05;
        // a hollow body (a ring: every radius of its profile > 0) round a smaller coaxial body: its front arc is in
        // front of that body and its back arc behind, which no single paint key can say
        const hollow = Math.min(...big.poly.map((p) => p[1])) > 1e-3 && S.r < Math.min(...big.poly.map((p) => p[1]));
        if (inside > 0.05 && pokes) out.push(`through: «${small.name}» runs through the coaxial «${big.name}»; slice it at «${big.name}» (no paint order exists for a rod through a collar)`);
        else if (inside > 0.05 && hollow) out.push(`encircled: the ring «${big.name}» goes round the coaxial «${small.name}»; make the ring part of one profile, or keep the inner body out of the ring's span`);
      }
    type Route = {name: string; points: Point3[]; r: number};
    type Tube = {name: string; owner?: string; tips: (Point3 | null)[]};
    for (const t of this.R.tubes as Tube[]) {
      if (!t.owner) continue;
      const route = (this.R.routes as Route[]).find((x) => x.name === t.name);
      for (const tip of t.tips) {
        if (!tip) continue;
        const near = (this.R.solids as (Body & {name: string})[]).filter((sh) => (sh.owner === t.owner || sh.name === t.owner) && (A.sdf(sh, tip) as number) <= (route?.r ?? 0) + 0.3);
        if (near.length)
          out.push(
            t.owner === t.name
              ? `mount: an end of «${t.name}» sits on «${near[0].name}», which is owned by the pipe itself; the audit never counts such a part as a mount; give that part another owner`
              : `mount: an end of «${t.name}» sits on «${near[0].name}», which shares its owner «${t.owner}»; the audit never counts such a part as a mount; drop the owner from the pipe`,
          );
      }
    }
    // an owner that names no part and groups nothing: a typo, or a builder name that already starts with the object's
    // name (part «monitor.column» in object «monitor» is «monitor.monitor.column»; owner «monitor.column» is kept as is)
    const names = new Set<string>([...(this.R.solids as {name: string}[]).map((s) => s.name), ...(this.R.routes as {name: string}[]).map((r) => r.name)]);
    const uses = new Map<string, number>();
    for (const s of [...(this.R.solids as {owner?: string}[]), ...(this.R.tubes as {owner?: string; name: string}[]).filter((t) => t.owner !== t.name)])
      if (s.owner) uses.set(s.owner, (uses.get(s.owner) ?? 0) + 1);
    for (const [owner, n] of uses) if (!names.has(owner) && n < 2) out.push(`owner: «${owner}» names no part and groups nothing; check the name (a part name that starts with the object's own name gets it twice)`);
    // a bend that folds back on screen (a corner turned in a plane that holds the line of sight): cheap to find now
    // a pipe end that does not sit square and flush on its mount: every point of the end's rim must be within ±0.15 of
    // the mount's surface. On a curved mount of radius R a tube of radius r spreads by R − √(R² − r²), so a thick hose
    // on a thin tube never seats; end it on a flat face or a body much larger than the tube
    for (const t of A.terminals(this.R.tubes, this.R.solids) as {tube: string; end: string; d: number; low: number; high: number; nearest: string; at?: number[]}[])
      out.push(
        `terminal: the ${t.end} of «${t.tube}» does not seat on «${t.nearest}» (centre ${t.d.toFixed(2)}, rim ${t.low.toFixed(2)}…${t.high.toFixed(2)}, all must be within ±0.15)${t.at ? ` at [${t.at.map((v) => v.toFixed(1)).join(', ')}]` : ''}; move the end along its axis, square it to the face, or end on a flatter mount`,
      );
    // a long horizontal run of a pipe that goes along the line of sight: on screen it is a vertical stroke, so a cable
    // lying on the floor reads as a stick standing up (the tangle's free end read as a lollipop's stick). Mark a run
    // that is meant to point at the viewer with meta {alongView: true}.
    for (const r of this.R.routes as {name: string; points: Point3[]}[]) {
      const tube = (this.R.tubes as {name: string; alongView?: boolean}[]).find((t) => t.name === r.name);
      if (tube?.alongView) continue;
      for (let i = 0; i < r.points.length - 1; i++) {
        const [p, q] = [r.points[i], r.points[i + 1]];
        const d = G.sub3(q, p) as Point3;
        const len = Math.hypot(d[0], d[1]);
        if (len < 6 || Math.abs(d[2]) > 0.15 * len) continue;
        const [sx, sy] = K.iso(d, {...this.P, origin: [0, 0]});
        if (Math.abs(sx) < Math.tan((8 * Math.PI) / 180) * Math.abs(sy))
          out.push(`view: a ${len.toFixed(1)}-unit level run of «${r.name}» goes along the line of sight and reads as a vertical stroke on screen at [${p.map((v) => v.toFixed(1)).join(', ')}]; turn it sideways on screen (along +x−y or −x+y) or mark meta {alongView: true}`);
      }
    }
    // a tube chunk whose outline crosses itself on screen (a tight corner seen along the line of sight)
    for (const s of A.selfOverlaps(this.R.items, this.P) as {item?: string; name?: string; at?: number[]}[])
      out.push(`self-overlap: «${s.item ?? s.name}» folds over itself on screen${s.at ? ` at [${s.at.map((v) => v.toFixed(1)).join(', ')}]` : ''}; widen the bend or turn the corner across the view`);
    const at = (p?: number[]) => (p ? ` at [${p.map((v) => v.toFixed(1)).join(', ')}]` : '');
    for (const f of A.folds(this.R.routes, this.P, {items: this.R.items}) as {name: string; flatTurn: number; at?: number[]}[])
      out.push(`fold: «${f.name}» turns ${Math.round(f.flatTurn)}° on screen${at(f.at)}; widen the bend (≥ 2.6·r), turn the corner across the view, or use a ramp instead of a vertical step`);
    // piece: a piece that does not move, or an `order` entry no part uses. Every piece multiplies the share states
    // the audit walks; a dead one turned 90 real problems into 3000 repeats (motor 130, 2026-11-19)
    type PItem = {name: string; pos: Point3; piece: string; move: Point3};
    const items = this.R.items as PItem[];
    const pieces = new Map<string, PItem[]>();
    for (const it of items) if (it.piece) pieces.set(it.piece, [...(pieces.get(it.piece) ?? []), it]);
    for (const [piece, list] of pieces) if (list.every((it) => Math.hypot(...it.move) < 1e-6)) out.push(`piece: «${piece}» never moves (move [0, 0, 0]); drop the piece, a part that turns is a dynamicShapes part`);
    for (const name of this.opts.order ?? []) if (!pieces.has(name)) out.push(`piece: the order names «${name}», but no part belongs to it`);
    // arc: a ring sector round a vertical axis (a half-shell, an arc magnet, a clamp band) that runs across the
    // silhouette azimuth (A ± 90°) of a body on that axis: one part of it is in front of the body and another beside or
    // behind it, which no single paint key can say (500 depth cycles in the motor 130 housing, 2026-11-19).
    // Build such parts with Assembly.arc(): it splits them there.
    const az = (((this.P as {azimuth?: number}).azimuth ?? 45) * Math.PI) / 180;
    type Prism = {name: string; kind: string; F: Frame; poly: number[][]; s0: number; s1: number};
    const prisms = (this.R.solids as Prism[]).filter((p) => p.kind === 'prism' && Math.abs(p.F.a[2]) > 0.999);
    const axes = bodies.filter((b) => Math.abs(b.F.a[2]) > 0.999);
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    for (const pr of prisms) {
      for (const ax of axes) {
        const sp = span(ax);
        const z0 = ax.F.o[2] + sp.s0 * ax.F.a[2];
        const z1 = ax.F.o[2] + sp.s1 * ax.F.a[2];
        if (Math.min(z0, z1) >= pr.s1 - 0.05 || Math.max(z0, z1) <= pr.s0 + 0.05) continue;
        const c = [ax.F.o[0], ax.F.o[1]];
        const d = pr.poly.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]));
        const rIn = Math.min(...d);
        if (rIn < sp.r - 0.01 || rIn < 0.3 * Math.max(...d)) continue; // not a sector round this body
        const rOut = Math.max(...d);
        // a true ring sector: its outline lies on two circles round this axis (a box near a bolt is not one)
        const onBand = (v: number) => Math.abs(v - rIn) < 0.04 * rOut || Math.abs(v - rOut) < 0.04 * rOut;
        // the midpoints of its edges lie on those circles too (a long straight wall has corners on two radii, not arcs)
        // (weighted by edge length: a rounded box has many tiny corner edges and four long straight ones)
        let arcLen = 0;
        let perimeter = 0;
        pr.poly.forEach((p, i) => {
          const q = pr.poly[(i + 1) % pr.poly.length];
          const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
          perimeter += l;
          if (onBand(Math.hypot((p[0] + q[0]) / 2 - c[0], (p[1] + q[1]) / 2 - c[1]))) arcLen += l;
        });
        if (pr.poly.length < 8 || d.filter(onBand).length < 0.9 * d.length || arcLen < 0.6 * perimeter) continue;
        const mean = [pr.poly.reduce((a, p) => a + p[0], 0) / pr.poly.length - c[0], pr.poly.reduce((a, p) => a + p[1], 0) / pr.poly.length - c[1]];
        const m = Math.atan2(mean[1], mean[0]);
        const rel = pr.poly.map((p) => wrap(Math.atan2(p[1] - c[1], p[0] - c[0]) - m));
        const lo = Math.min(...rel);
        const hi = Math.max(...rel);
        const cut = [az + Math.PI / 2, az - Math.PI / 2].map((a) => wrap(a - m)).find((a) => a > lo + 0.05 && a < hi - 0.05);
        if (cut !== undefined) {
          out.push(`arc: «${pr.name}» wraps round the axis of «${ax.name}» across the silhouette at ${Math.round((((wrap(cut + m) * 180) / Math.PI + 360) % 360))}°; split it there (build it with Assembly.arc)`);
          break;
        }
      }
    }
    // bevel: a large tilted body of a hero (a phone leaning on a stand, a sloped panel) drawn as a prism with no bevel
    // reads as a flat cut-out: §22.1 wants a bevel (0.4–1.6) on every body, and only slab / cyl had one (the tilted
    // phone of «Как работает Claude», 20.11.2026). Axis-aligned prisms and small parts (buttons, holes) are exempt.
    if (this.role === 'hero')
      for (const pr of this.R.solids as (Prism & {bevel?: number})[]) {
        if (pr.kind !== 'prism' || (pr.bevel ?? 0) > 0) continue;
        if (Math.max(...pr.F.a.map(Math.abs)) > 0.999) continue;
        const xs = pr.poly.map((p) => p[0]);
        const ys = pr.poly.map((p) => p[1]);
        const across = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        if (across >= BEVEL_ACROSS && Math.abs(pr.s1 - pr.s0) >= 0.2) out.push(`bevel: «${pr.name}» is a tilted body ${across.toFixed(1)} units across with no bevel; pass bevel (0.4–1.6, §22.1)`);
      }
    // buried: a block on a screen face (device.ts facePrism / faceDisc, meta {face: true}) whose centre lies inside
    // another solid is not seen at all: built on the inward normal, the interface sat 0.04 inside the glass, far below
    // the audit's 0.5 «sunk» limit, and the screen painted over it (20.11.2026)
    {
      const solids = this.R.solids as {name: string; kind: string; face?: boolean}[];
      for (const it of this.R.items as (Item & {pos: Point3})[]) {
        const own = solids.find((x) => x.name === it.name);
        if (!own?.face) continue;
        const host = solids.find((t) => t !== own && t.kind !== 'tube' && (A.sdf(t, it.pos) as number) < -0.005);
        if (host) out.push(`buried: the face block «${it.name}» has its centre inside «${host.name}»; it is hidden (built on the inward normal?)`);
        // face-order: a face block is thinner than the depth tolerance, so no order rule ranks it against what it sits
        // on: its key must already be in front of its host's (device.ts faceBias)
        const under = (this.R.items as (Item & {pos: Point3})[]).filter((o) => o !== it && !solids.find((x) => x.name === o.name)?.face && o.shapes.length && (o.shapes as unknown[]).some((sh) => Math.abs(A.sdf(sh, it.pos) as number) < 0.12));
        // (plain keys: lint runs before a settle, on keys a stale keys.json may still hold)
        const base = (x: Item) => (x as Item & {baseKey: number}).baseKey;
        for (const u of under) if (base(u) >= base(it)) out.push(`face-order: the face block «${it.name}» is painted before «${u.name}», which it sits on; build it with device.ts facePrism / faceDisc (faceBias)`);
      }
    }
    return [...new Set(out)];
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
    // a moving solid that is fading is always drawn as one layer (svgFaded): faded piece by piece, the overlapping
    // pieces of a tube read as dark joints. Root cause closed here, so no scene can draw it the wrong way.
    const fading = (opts.extra ?? []).some((e) => (e.shapes?.length ?? 0) > 0 && (e.opacity ?? 1) > 0.001 && (e.opacity ?? 1) < 0.999);
    return fading ? this.svgFaded(opts.extra ?? [], shares, {hide: opts.hide}) : this.paintPlan(shares, opts).svg;
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

  /** svg() for a frame where moving parts fade in or out. A part split into pieces (dynTube) must not fade piece by
   *  piece: the pieces overlap at their joints, and two half-transparent pieces over each other read as dark spots.
   *  Parts that share one opacity form a layer. Layers are sorted from the most to the least opaque; picture k holds
   *  the solid parts and layers 1..k at full strength and is drawn over the rest at alpha a_k (layerAlphas), so a part
   *  of layer j ends at exactly its opacity o_j = 1 − Π_{k≥j}(1 − a_k). Root cause (docs/root-causes.md): each layer
   *  used to be drawn as a picture of ONLY its own parts at its own opacity, so every later picture repainted the
   *  object over the earlier layers' parts and washed them out (the burner flames vanished). Depth order inside each
   *  picture stays the ray-tested one.
   *  Parts without shapes (field lines, annotations) keep their own opacity in the base picture. */
  svgFaded(extra: Extra[], shares: Record<string, number> = {}, opts: {hide?: (name: string) => boolean} = {}) {
    const solid = (e: Extra) => (e.shapes?.length ?? 0) > 0;
    const full = extra.filter((e) => !solid(e) || (e.opacity ?? 1) >= 0.999);
    const layers = new Map<number, Extra[]>();
    for (const e of extra)
      if (solid(e) && (e.opacity ?? 1) < 0.999 && (e.opacity ?? 1) > 0.001) {
        const k = Math.round((e.opacity ?? 1) * 1e4) / 1e4;
        layers.set(k, [...(layers.get(k) ?? []), {...e, opacity: undefined}]);
      }
    let svg = this.paintPlan(shares, {...opts, extra: full}).svg;
    const sorted = [...layers].sort((a, b) => b[0] - a[0]);
    const alphas = layerAlphas(sorted.map(([o]) => o));
    const inPicture = [...full.filter(solid)];
    sorted.forEach(([, group], k) => {
      inPicture.push(...group);
      if (alphas[k] > 0.0005) svg += `<g opacity="${alphas[k].toFixed(4)}">${this.paintPlan(shares, {...opts, extra: [...inPicture]}).svg}</g>`;
    });
    return svg;
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

/** Smallest cross-section (kit units) of a tilted hero prism that must carry a bevel (lint «bevel»). */
export const BEVEL_ACROSS = 3;

/** The bevel line of a prism (§22.1), like the slab's: on the end cap that faces the viewer, a line `by` inside the
 *  edges it shares with the visible sides. The core's prismOf has no bevel; this adds the same mark to tilted bodies. */
export const prismBevel = (F: Frame, polygon: number[][], s0: number, s1: number, by: number, P: K.Projection, V: Point3): string => {
  const area = polygon.reduce((t, p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return t + p[0] * q[1] - q[0] * p[1];
  }, 0);
  const ring = area >= 0 ? polygon : [...polygon].reverse();
  const n = ring.length;
  const cap = G.dot3(F.a, V) > 1e-6 ? s1 : G.dot3(F.a, V) < -1e-6 ? s0 : null;
  if (cap === null) return '';
  const at = (x: number, y: number): Point3 => G.add3(G.add3(G.add3(F.o, G.mul3(F.u, x)), G.mul3(F.v, y)), G.mul3(F.a, cap));
  const normals = ring.map((p, j) => {
    const q = ring[(j + 1) % n];
    const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
    const l = Math.hypot(dx, dy) || 1;
    return [dy / l, -dx / l];
  });
  const seen = normals.map(([nx, ny]) => G.dot3(G.add3(G.mul3(F.u, nx), G.mul3(F.v, ny)), V) > 1e-6);
  const inset = ring.map((p, j) => {
    const [a, b] = [normals[(j - 1 + n) % n], normals[j]];
    const m = [a[0] + b[0], a[1] + b[1]];
    const l = Math.hypot(m[0], m[1]) || 1;
    return at(p[0] - (m[0] / l) * by, p[1] - (m[1] / l) * by);
  });
  const corner = ring.map((p) => at(p[0], p[1]));
  if (seen.every(Boolean) || !seen.some(Boolean)) return '';
  // runs of visible edges, cyclic: start after an unseen edge
  const start = seen.findIndex((v, j) => v && !seen[(j - 1 + n) % n]);
  const runs: number[][] = [];
  for (let k = 0; k < n; k++) {
    const j = (start + k) % n;
    if (!seen[j]) continue;
    if (!seen[(j - 1 + n) % n] || !runs.length) runs.push([]);
    runs[runs.length - 1].push(j);
  }
  const d = (pts: Point3[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${K.iso(p, P).map((v: number) => v.toFixed(1)).join(' ')}`).join('');
  return runs.map((run) => d([corner[run[0]], ...run.slice(1).map((j) => inset[j]), corner[(run[run.length - 1] + 1) % n]])).join('');
};

/** A part drawn outside the static assembly (rebuilt every frame) and passed to Assembly.svg({}, {extra}).
 *  With `shapes` it is ordered by the true 3D geometry (src/lib/depth.ts); without, by one depth key at `at`. */
/** Alphas for nested fade pictures: opacities sorted from high to low → the alpha of each picture so a part first
 *  shown in picture j ends at its own opacity (1 − Π_{k≥j}(1 − a_k) = o_j). */
export const layerAlphas = (o: number[]): number[] => o.map((oj, j) => (j === o.length - 1 ? oj : 1 - (1 - oj) / (1 - o[j + 1])));

export type Extra = {at: Point3; svg: string; bias?: number; name?: string; shapes?: unknown[]; opacity?: number; annotation?: boolean};
/** A moving part with its shapes: what the depth order and scripts/motion-check.mjs need. A part with no shapes must
 *  say `annotation: true` (a field line, a marker): motion-check refuses a solid it cannot order. */
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

/** Marks painted over a whole picture ON PURPOSE (force arrows that must never hide behind a part, a lifted lid on a
 *  cover): the one allowed way to put markup after an Assembly's svg(), with the reason written at the call. Anything
 *  that sits on or among the parts (a line on a table top, flow dots, a screen's interface) goes in as `extra` so the
 *  depth order places it; the audit refuses a bare `A.svg() + …` (scripts/lib/code-rules.mjs, docs/root-causes.md). */
export const onTop = (picture: string, marks: string[], why: string): string => {
  if (!why.trim()) throw new Error('onTop: say why these marks are painted over every part');
  return picture + marks.join('');
};
