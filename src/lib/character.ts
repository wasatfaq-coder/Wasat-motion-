import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import * as AuditKit from '../vendor/anatomy/audit.mjs';
import {add, cross, DIM, FOOT, HandSkel, len, mul, Side, Skel, sub, unit, V3} from './rig';

// Faceless mannequin in the house style (MASTER_PROMPT_FINAL §22): toned solids, no face; the role reads through
// clothing details and props. ~80 parts: hair, ears, neck, collar, shirt (chest and hips on a bending spine),
// buttons, pocket, belt and buckle, sleeves with cuffs, watch, hands with 3-segment fingers, trousers with cuffs,
// shoes with soles, heels, laces and a toe that bends at the ball; optional hat, tie, apron and a tool.
// Every part also records its true 3D shape (for the paint-order check in scripts/rig-check.mjs).

/* eslint-disable @typescript-eslint/no-explicit-any */
const G: any = LatheKit;
const A: any = AuditKit;

export type Outfit = {
  hat?: 'none' | 'hardhat' | 'cap';
  tie?: boolean;
  apron?: boolean; // shop / lab / kitchen: a front panel
  tool?: 'none' | 'wrench' | 'pen' | 'tablet';
  accent?: 'none' | 'hat' | 'tie' | 'tool' | 'shirt' | 'watch'; // the ONE coral part (§22)
};
export const OUTFITS = {
  clerk: {tie: true, tool: 'pen', accent: 'tie'},
  worker: {hat: 'hardhat', tool: 'wrench', accent: 'hat'},
  lab: {apron: true, tool: 'tablet', accent: 'tool'},
  plain: {accent: 'none'},
} satisfies Record<string, Outfit>;

export type DrawnItem = {at: V3; svg: string; shapes: unknown[]; name: string; seg: [V3, V3]; r: number; layer?: number};
type Cloth = 'skin' | 'shirt' | 'dark' | 'lit';
const cls = (c: Cloth): K.SolidStyle => (c === 'lit' ? {lit: true} : c === 'skin' ? {} : {className: c === 'dark' ? 'cl-dark' : 'cl-mid'});
type Put = (at: V3, svg: string, shapes?: unknown[], name?: string, seg?: [V3, V3], r?: number) => void;
type Solid = (paths: unknown, c: Cloth, extra?: K.SolidStyle) => string;
const Z: V3 = [0, 0, 1];

/** Draws the character; `P` is the scene projection (anatomyProjection). Wrap in <g class="ns"> for close-ups.
 *  Returns the markup, the part count and the painter items (with recorded shapes). */
export const drawCharacter = (s: Skel, P: K.Projection, outfit: Outfit = {}) => {
  const items: DrawnItem[] = [];
  let parts = 0;
  let sink: DrawnItem[] | null = null; // while grouping, parts go into one painter item
  const put: Put = (at, svg, shapes = [], name = 'part', seg = [at, at], r = 0) => {
    parts++;
    (sink ?? items).push({at, svg, shapes, name, seg, r});
  };
  /** Compound parts (a shoe, the torso with what is sewn on it, a hand) paint as one item: inside, in the order
   *  drawn (or by depth with `sort`), so a neighbour can't slip between a part and what is attached to it. */
  /** Mark the part just put to be drawn after the others of its group (a hat over the ears, a watch face). */
  const layerLast = (layer = 1) => {
    const list = sink ?? items;
    list[list.length - 1].layer = layer;
  };
  const group = (name: string, at: V3, draw: () => void, sort = false, seg: [V3, V3] = [at, at], r = 3) => {
    const inner: DrawnItem[] = [];
    sink = inner;
    draw();
    sink = null;
    if (sort) inner.sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0) || K.depthOf(a.at, P) - K.depthOf(b.at, P));
    items.push({at, svg: inner.map((i) => i.svg).join(''), shapes: inner.flatMap((i) => i.shapes), name, seg, r});
  };
  const lit = (part: Outfit['accent'], base: Cloth): Cloth => (outfit.accent === part ? 'lit' : base);
  const solid: Solid = (paths, c, extra = {}) => K.solidSvg(paths as K.SolidPaths, {tone: 'hi', ...cls(c), ...extra});
  const turned = (name: string, at: V3, prof: number[][], F: any, c: Cloth) => {
    const ss = prof.map((q) => q[0]);
    const seg: [V3, V3] = [add(F.o, mul(F.a, Math.min(...ss))), add(F.o, mul(F.a, Math.max(...ss)))];
    put(at, solid(G.solidOf(prof, F, P), c), [A.solid(F, prof)], name, seg, Math.max(...prof.map((q) => q[1])));
  };
  /** tapered limb between two points with rounded ends */
  const limb = (name: string, a: V3, b: V3, r0: number, r1: number, c: Cloth, round = true) => {
    const L = len(sub(b, a));
    if (L < 1e-3) return;
    const F = G.frameAlong(a, unit(sub(b, a)));
    const prof = round
      ? [[0, r0 * 0.6], [r0 * 0.25, r0 * 0.92, 1], [r0 * 0.5, r0, 1], [L - r1 * 0.5, r1, 1], [L - r1 * 0.25, r1 * 0.92, 1], [L, r1 * 0.6]]
      : [[0, r0], [L, r1]];
    put(mul(add(a, b), 0.5), solid(G.solidOf(prof, F, P), c), [A.tube([a, b], [r0, r1])], name, [a, b], Math.max(r0, r1));
  };
  const ball = (name: string, c0: V3, r: number, c: Cloth, bias: V3 = [0, 0, 0]) => put(add(c0, bias), solid(G.sphereOf(c0, r, P), c), [A.ball(c0, r)], name, [add(c0, bias), add(c0, bias)], r);
  const disc = (name: string, o: V3, axis: V3, s0: number, s1: number, r: number, c: Cloth) => {
    const F = G.frameAlong(o, unit(axis));
    put(add(o, mul(unit(axis), (s0 + s1) / 2)), solid(G.disc(s0, s1, r, F, P), c), [A.disc(F, s0, s1, r)], name, [add(o, mul(unit(axis), s0)), add(o, mul(unit(axis), s1))], r);
  };
  const prism = (name: string, o: V3, a: V3, u: V3, v: V3, poly: number[][], s0: number, s1: number, c: Cloth) => {
    const F = G.frameOf(o, a, u, v);
    const cx = poly.reduce((t, p) => t + p[0], 0) / poly.length;
    const cy = poly.reduce((t, p) => t + p[1], 0) / poly.length;
    const centre = add(add(add(o, mul(u, cx)), mul(v, cy)), mul(a, (s0 + s1) / 2));
    const reach = Math.max(...poly.map((q) => Math.hypot(q[0] - cx, q[1] - cy)));
    put(centre, solid(G.prismOf(F, poly, s0, s1, P), c), [A.prism(F, poly, s0, s1)], name, [centre, centre], reach);
  };

  // ── legs and shoes (the toe bends at the ball, so it stays flat while the heel lifts)
  for (const side of ['L', 'R'] as Side[]) {
    const {hip, knee, ankle} = {hip: s.hip[side], knee: s.knee[side], ankle: s.ankle[side]};
    limb(`thigh${side}`, hip, knee, 3.7, 3.1, 'dark');
    ball(`knee${side}`, knee, 3.05, 'dark');
    limb(`shin${side}`, knee, add(ankle, mul(unit(sub(knee, ankle)), 1.6)), 3.0, 2.6, 'dark');
    disc(`cuff${side}`, ankle, sub(knee, ankle), 1.2, 2.6, 2.75, 'dark');
    const {yaw, pitch, toe} = s.foot[side];
    const h: V3 = [Math.cos(yaw), Math.sin(yaw), 0];
    const lat: V3 = [-h[1], h[0], 0];
    const tilt = (p: number) => ({fw: add(mul(h, Math.cos(p)), mul(Z, Math.sin(p))), up: add(mul(h, -Math.sin(p)), mul(Z, Math.cos(p)))});
    const R = tilt(pitch);
    const T = tilt(pitch + toe);
    const heel = add(add(ankle, mul(R.up, -DIM.ankle)), mul(R.fw, -FOOT.heel));
    const ballPt = add(heel, mul(R.fw, FOOT.heel + FOOT.ball));
    const toeLen = FOOT.tip - FOOT.ball + 3;
    const tipPt = add(ballPt, mul(T.fw, toeLen));
    group(`shoe${side}`, add(add(heel, mul(R.fw, 6)), mul(R.up, 2)), () => {
      prism('heel', heel, R.up, R.fw, lat, [[0, -2.2], [0, 2.2], [1.6, 2.4], [1.6, -2.4]], 0, 1.4, 'dark');
      prism('sole', heel, R.up, R.fw, lat, [[0, -2.4], [0, 2.4], [8, 2.9], [9, 2.85], [9, -2.85], [8, -2.9]], 0.9, 1.9, 'shirt');
      prism('toe.sole', ballPt, T.up, T.fw, lat, [[0, -2.85], [0, 2.85], [toeLen - 0.7, 1.8], [toeLen, 0], [toeLen - 0.7, -1.8]], 0.9, 1.9, 'shirt');
      prism('upper', heel, R.up, R.fw, lat, [[0.5, -2.1], [0.5, 2.1], [7.5, 2.5], [9.2, 2.45], [9.2, -2.45], [7.5, -2.5]], 1.9, 4.4, 'dark');
      prism('toe.cap', ballPt, T.up, T.fw, lat, [[0, -2.45], [0, 2.45], [toeLen - 1.2, 1.5], [toeLen - 0.6, 0], [toeLen - 1.2, -1.5]], 1.9, 3.5, 'dark');
      const laces = [5.4, 6.6, 7.8].map((x) => K.iso(add(add(heel, mul(R.fw, x)), mul(R.up, 4.5 - (x - 5.4) * 0.35)), P));
      put(add(add(heel, mul(R.fw, 6.6)), mul(R.up, 4.6)), K.dotsSvg(laces, {size: 0.55, tone: 'faint'}), [], 'laces');
    }, false, [add(heel, mul(R.up, 2)), add(tipPt, mul(T.up, 2))], 2.6);
  }
  limb('seat', s.hip.L, s.hip.R, 4.8, 4.8, 'dark');

  // ── torso on a two-link spine: hips and belt along the pelvis axis, the chest along the chest axis
  const lowAx = s.axisLow;
  const ax = s.axis;
  const TL = G.frameAlong(add(s.pelvis, mul(lowAx, -1.5)), lowAx);
  const TU = G.frameAlong(s.waist, ax);
  const lowAt = (h: number) => add(s.pelvis, mul(lowAx, h));
  const upAt = (h: number) => add(s.waist, mul(ax, h - DIM.waist)); // h measured from the pelvis, as before
  const perp = (v: V3, a: V3) => unit(sub(v, mul(a, v[0] * a[0] + v[1] * a[1] + v[2] * a[2])));
  const front = perp(s.f, ax);
  const frontLow = perp(s.f, lowAx);
  const sideL = cross(ax, front);
  group('torso', upAt(12), () => {
    // hips, belt, chest in that order: the chest's lower cap hides the belt's top face, so the belt reads as a band
    turned('hips', lowAt(1), [[0, 5.6], [2.2, 6.05]], TL, lit('shirt', 'shirt'));
    put(lowAt(1.8), solid(G.disc(2.2, 4.4, 6.3, TL, P), 'dark'), [A.disc(TL, 2.2, 4.4, 6.3)], 'belt');
    turned('chest', upAt(14), [[0, 6.22], [1.6, 6.3, 1], [7.6, 6.6, 1], [15.6, 7.4, 1], [19, 6.6, 1], [20.8, 3.6]], TU, lit('shirt', 'shirt'));
    prism('buckle', add(lowAt(1.8), mul(frontLow, 6.2)), frontLow, lowAx, cross(lowAx, frontLow), [[-1.1, -1.4], [-1.1, 1.4], [1.1, 1.4], [1.1, -1.4]], 0, 0.7, 'skin');
    put(upAt(24.6), solid(G.disc(20, 21.8, 3.6, TU, P), 'shirt'), [A.disc(TU, 20, 21.8, 3.6)], 'collar');
    for (const hh of [9, 13.5, 18]) ball('button', add(upAt(hh), mul(front, hh < 15 ? 6.55 : 7.2)), 0.55, 'skin', mul(front, 0.4));
    prism('pocket', add(add(upAt(17.5), mul(front, 7.1)), mul(sideL, 3.2)), front, ax, sideL, [[-1.8, -1.6], [-1.8, 1.6], [1.6, 1.6], [1.6, -1.6]], 0, 0.5, 'shirt');
    if (outfit.tie) prism('tie', add(upAt(15), mul(front, 7.2)), front, ax, sideL, [[-7, 0], [-6, -1.3], [7.5, -0.8], [8.6, 0], [7.5, 0.8], [-6, 1.3]], 0, 0.6, lit('tie', 'dark'));
    if (outfit.apron) prism('apron', add(upAt(10), mul(front, 7.4)), front, ax, sideL, [[-9, -5.8], [-9, 5.8], [9, 4.6], [9, -4.6]], 0, 0.5, 'shirt');
    limb('neck', s.neck, add(s.head, mul(s.headUp, -DIM.head * 0.6)), 2.0, 2.0, 'skin', false); // on top of the collar
  }, false, [s.pelvis, s.chest], 7.2);

  // ── arms: the shoulder ball on its own (it sorts against the torso); upper arm to fingertips as one group, sorted
  //    inside by depth, so the joined links of one arm can't interleave with each other wrongly
  for (const side of ['L', 'R'] as Side[]) {
    const sh = s.shoulder[side];
    const el = s.elbow[side];
    const wr = s.wrist[side];
    const h = s.hand[side];
    ball(`shoulder${side}`, sh, 3.15, lit('shirt', 'shirt'));
    const held = side === 'R' && outfit.tool && outfit.tool !== 'none' ? outfit.tool : null;
    group(
      `arm${side}`,
      add(wr, mul(unit(sub(el, wr)), 4)),
      () => {
        limb(`upper${side}`, sh, el, 2.8, 2.4, lit('shirt', 'shirt'));
        ball(`elbow${side}`, el, 2.35, lit('shirt', 'shirt'));
        const cuffAt = add(wr, mul(unit(sub(el, wr)), 1.8));
        limb(`fore${side}`, el, cuffAt, 2.35, 2.1, lit('shirt', 'shirt'));
        disc(`sleeve.cuff${side}`, cuffAt, sub(wr, el), -0.9, 0.2, 2.25, 'shirt');
        limb(`wrist${side}`, cuffAt, wr, 1.5, 1.4, 'skin', false);
        if (side === 'L') {
          disc('watch.strap', wr, sub(wr, el), -1.3, -0.3, 1.65, 'dark');
          // the face sits on the back of the wrist: drawn last in the arm, and only when it faces the viewer
          if (K.depthOf(add(wr, mul(h.n, -1)), P) > K.depthOf(wr, P)) {
            disc('watch.face', add(wr, mul(unit(sub(el, wr)), 0.8)), mul(h.n, -1), 1.3, 1.9, 1.05, lit('watch', 'shirt'));
            layerLast();
          }
        }
      },
      true,
      [el, wr],
      2.6,
    );
    // the hand (and a held tool) is its own item: resting on a thigh or a table it may lie partly in front of
    // and partly behind what it touches, independently of the forearm
    group(
      `hand${side}`,
      add(wr, mul(h.fwd, 4)),
      () => {
        drawHand(h, P, put, solid);
        if (held) drawTool(s.hand.R, P, held, put, solid, lit('tool', held === 'tablet' ? 'dark' : 'shirt'));
      },
      true,
      [wr, add(wr, mul(h.fwd, 8))],
      3,
    );
  }

  // ── head (no face), ears, hair; a hat over them (drawn last in the head group)
  group(
    'head',
    s.head,
    () => {
      ball('head', s.head, DIM.head, 'skin');
      const earAx = unit(cross(s.headUp, s.headFwd));
      for (const k of [1, -1]) ball('ear', add(add(s.head, mul(earAx, k * DIM.head * 0.97)), mul(s.headFwd, -0.4)), 1.15, 'skin');
      // hair: a cap over the crown and the back of the head; the face side stays skin
      ball('hair', add(add(s.head, mul(s.headUp, 1.5)), mul(s.headFwd, -1.4)), DIM.head * 0.86, 'dark', mul(s.headFwd, -0.05));
      if (outfit.hat === 'hardhat' || outfit.hat === 'cap') {
        const H = G.frameAlong(add(s.head, mul(s.headUp, 2.2)), s.headUp);
        const brim = outfit.hat === 'hardhat' ? 7.4 : 6.2;
        put(add(s.head, mul(s.headUp, 3)), solid(G.disc(0, 0.6, brim, H, P), lit('hat', 'shirt')), [A.disc(H, 0, 0.6, brim)], 'hat.brim', [add(s.head, mul(s.headUp, 2.2)), add(s.head, mul(s.headUp, 2.8))], brim);
        layerLast();
        turned('hat.dome', add(s.head, mul(s.headUp, 4.5)), [[0.6, 5.9], [2.6, 5.6, 1], [4.6, 4.3, 1], [5.8, 2.4, 1], [6.3, 0]], H, lit('hat', 'shirt'));
        layerLast(2);
      }
    },
    true,
    [add(s.head, mul(s.headUp, -DIM.head)), add(s.head, mul(s.headUp, DIM.head))],
    DIM.head + 0.5,
  );

  const sorted = paintOrder(items, P);
  return {svg: sorted.map((i) => i.svg).join(''), parts, items: sorted};
};

/** A hand: palm block, thumb pad, three segments per finger (also used alone for close-ups). */
export const drawHand = (h: HandSkel, P: K.Projection, put: Put, solid: Solid, c: Cloth = 'skin') => {
  const F = G.frameOf(add(h.wrist, mul(h.n, -1.1)), h.n, h.fwd, h.side);
  const palm = [[0, -2.5], [0, 2.5], [5.2, 3.3], [6.7, 2.6], [6.7, -2.6], [5.2, -3.3]];
  put(add(h.wrist, mul(h.fwd, 3.3)), solid(G.prismOf(F, palm, 0, 2.2, P), c), [A.prism(F, palm, 0, 2.2)], 'palm');
  const pad = add(h.knuckle[0], mul(h.fwd, -0.6));
  put(h.knuckle[0], solid(G.sphereOf(pad, 1.45, P), c), [A.ball(pad, 1.45)], 'thumb.pad');
  h.chain.forEach((pts, i) => {
    for (let j = 0; j < 3; j++) {
      const a = pts[j];
      const b = pts[j + 1];
      const r0 = h.radii[i] * (1 - j * 0.1);
      const r1 = h.radii[i] * (0.92 - j * 0.1);
      const L = len(sub(b, a));
      const Fj = G.frameAlong(a, unit(sub(b, a)));
      const prof = [[-r0 * 0.35, r0 * 0.7], [0, r0, 1], [L, r1, 1], [L + r1 * 0.45, r1 * 0.6]];
      put(mul(add(a, b), 0.5), solid(G.solidOf(prof, Fj, P), c), [A.tube([a, b], [r0, r1])], `finger${i}.${j}`);
    }
  });
};

const drawTool = (h: HandSkel, P: K.Projection, tool: NonNullable<Outfit['tool']>, put: Put, solid: Solid, c: Cloth) => {
  // the grip axis runs across the palm through the curled fingers (HAND_POSES.hold); the part inside the fist is not
  // drawn, the two ends that stick out are separate parts so each sorts against the fingers by its own depth
  const grip = add(add(h.wrist, mul(h.fwd, 7.2)), mul(h.n, 1.5));
  const along = h.side;
  const HIDE = 3.4; // half the width of the fist
  const rod = (name: string, s0: number, s1: number, r: number, tip = 0) => {
    const F = G.frameAlong(add(grip, mul(along, s0)), along);
    const L = s1 - s0;
    const prof = tip > 0 ? [[0, r], [L - tip, r], [L, r * 0.25]] : tip < 0 ? [[0, r * 0.25], [-tip, r], [L, r]] : [[0, r], [L, r]];
    put(add(grip, mul(along, (s0 + s1) / 2)), solid(G.solidOf(prof, F, P), c), [A.solid(F, prof)], name);
  };
  if (tool === 'pen') {
    rod('pen.cap', -7, -HIDE, 0.75, -1.4);
    rod('pen.tip', HIDE, 7.5, 0.75, 1.6);
  } else if (tool === 'wrench') {
    const F = G.frameOf(grip, h.n, along, h.fwd);
    const plate = (name: string, x0: number, x1: number, w0: number, w1: number) => {
      const poly = [[x0, -w0], [x0, w0], [x1, w1], [x1, -w1]];
      put(add(grip, mul(along, (x0 + x1) / 2)), solid(G.prismOf(F, poly, -0.45, 0.45, P), c), [A.prism(F, poly, -0.45, 0.45)], name);
    };
    plate('wrench.tail', -6, -HIDE, 0.8, 0.85);
    plate('wrench.handle', HIDE, 10.5, 0.85, 0.95);
    plate('wrench.jaw', 10.5, 13.6, 2.6, 2.4);
  } else if (tool === 'tablet') {
    const F = G.frameOf(add(grip, mul(h.fwd, -2)), h.n, h.fwd, along);
    const poly = [[-6, -4.5], [-6, 4.5], [7, 4.5], [7, -4.5]];
    put(grip, solid(G.prismOf(F, poly, 0, 0.9, P), c), [A.prism(F, poly, 0, 0.9)], 'tablet');
  }
};

// ───────────────────────────── paint order ─────────────────────────────

const iso2 = (p: V3, P: K.Projection) => K.iso(p, P) as [number, number];
/** Closest points of two 2D segments: parameters s on ab and t on cd. */
const closest2 = (a: number[], b: number[], c: number[], d: number[]) => {
  const d1 = [b[0] - a[0], b[1] - a[1]];
  const d2 = [d[0] - c[0], d[1] - c[1]];
  const r = [a[0] - c[0], a[1] - c[1]];
  const A11 = d1[0] * d1[0] + d1[1] * d1[1];
  const A22 = d2[0] * d2[0] + d2[1] * d2[1];
  const f = d2[0] * r[0] + d2[1] * r[1];
  const cl = (x: number) => Math.max(0, Math.min(1, x));
  let s = 0;
  let t = 0;
  if (A11 < 1e-9 && A22 < 1e-9) return {s, t, dist: Math.hypot(r[0], r[1])};
  if (A11 < 1e-9) t = cl(f / A22);
  else {
    const c1 = d1[0] * r[0] + d1[1] * r[1];
    if (A22 < 1e-9) s = cl(-c1 / A11);
    else {
      const b12 = d1[0] * d2[0] + d1[1] * d2[1];
      const den = A11 * A22 - b12 * b12;
      s = den > 1e-9 ? cl((b12 * f - c1 * A22) / den) : 0;
      t = (b12 * s + f) / A22;
      if (t < 0) {
        t = 0;
        s = cl(-c1 / A11);
      } else if (t > 1) {
        t = 1;
        s = cl((b12 - c1) / A11);
      }
    }
  }
  const p = [a[0] + d1[0] * s - (c[0] + d2[0] * t), a[1] + d1[1] * s - (c[1] + d2[1] * t)];
  return {s, t, dist: Math.hypot(p[0], p[1])};
};

/** Paint order for a character: every pair of parts that overlaps on screen is ordered by the depth of their axes at
 *  the place where they overlap (not by their centres, which fails for a hand beside a thigh or a forearm across
 *  the chest); then a topological sort, nearest-centre-last among free parts; a cycle falls back to centre depth. */
export const paintOrder = (items: DrawnItem[], P: K.Projection) => {
  const n = items.length;
  const k = (P.scale ?? 1) * 1.2247; // screen units per kit unit (see anatomyProjection)
  const scr = items.map((i) => [iso2(i.seg[0], P), iso2(i.seg[1], P)]);
  const depth = (p: V3) => K.depthOf(p, P);
  const key = items.map((i) => depth(i.at));
  const cam = A.cameraBasis(P);
  const V: V3 = cam.V;
  const bounds = items.map((it) => {
    if (!it.shapes.length) return null;
    const bs = it.shapes.map((sh) => A.boundsOf(sh));
    return {min: [0, 1, 2].map((a) => Math.min(...bs.map((b: any) => b.min[a]))), max: [0, 1, 2].map((a) => Math.max(...bs.map((b: any) => b.max[a])))};
  });
  /** Distance along V (towards the viewer) of the first surface of item `idx` on the view ray through p0. */
  const hitDepth = (idx: number, p0: V3): number | null => {
    const b = bounds[idx];
    if (!b) return null;
    // the ray p0 + V·t against the item's box
    let t0 = -Infinity;
    let t1 = Infinity;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(V[a]) < 1e-9) {
        if (p0[a] < b.min[a] || p0[a] > b.max[a]) return null;
        continue;
      }
      const ta = (b.min[a] - p0[a]) / V[a];
      const tb = (b.max[a] - p0[a]) / V[a];
      t0 = Math.max(t0, Math.min(ta, tb));
      t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 > t1) return null;
    const inside = (t: number) => items[idx].shapes.some((sh) => A.sdf(sh, add(p0, mul(V, t))) <= 0);
    const step = 0.5;
    for (let t = t1; t >= t0; t -= step)
      if (inside(t)) {
        let lo = t;
        let hi = Math.min(t1, t + step);
        for (let k2 = 0; k2 < 6; k2++) {
          const mid = (lo + hi) / 2;
          if (inside(mid)) lo = mid;
          else hi = mid;
        }
        return lo + dot3(p0, V);
      }
    return null;
  };
  const after: number[][] = items.map(() => []); // after[a] = parts that must be drawn after a
  const indeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const c = closest2(scr[i][0], scr[i][1], scr[j][0], scr[j][1]);
      if (c.dist > (items[i].r + items[j].r) * k) continue; // no overlap on screen
      // which one is in front where they overlap: cast view rays through a few screen points between the two axes
      // and compare where each part's TRUE recorded shape is first hit (falls back to axis depth if no ray hits both)
      const pi = lerp3v(items[i].seg[0], items[i].seg[1], c.s);
      const pj = lerp3v(items[j].seg[0], items[j].seg[1], c.t);
      let vote = 0;
      for (const w of [0.5, 0.25, 0.75, 0, 1]) {
        const p0 = lerp3v(pi, pj, w);
        const hi = hitDepth(i, p0);
        const hj = hitDepth(j, p0);
        if (hi !== null && hj !== null) vote += hi - hj;
      }
      const di = vote !== 0 ? vote : depth(pi);
      const dj = vote !== 0 ? 0 : depth(pj);
      if (Math.abs(di - dj) < 1e-6) continue;
      const [back, front] = di < dj ? [i, j] : [j, i];
      after[back].push(front);
      indeg[front]++;
    }
  const out: DrawnItem[] = [];
  const done = new Array(n).fill(false);
  for (let step = 0; step < n; step++) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (pick < 0 || key[i] < key[pick])) pick = i;
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || key[i] < key[pick])) pick = i; // cycle
    done[pick] = true;
    out.push(items[pick]);
    for (const f of after[pick]) indeg[f]--;
  }
  return out;
};
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3v = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
