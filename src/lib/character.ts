import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import {add, cross, DIM, HandSkel, len, mul, Side, Skel, sub, unit, V3} from './rig';

// Faceless mannequin in the house style (MASTER_PROMPT_FINAL §22): toned solids, no face; the role reads through
// clothing details and props. 70+ parts: hair, ears, neck, collar, shirt, buttons, pocket, belt and buckle, sleeves
// with cuffs, watch, hands with 3-segment fingers, trousers with cuffs, shoes with soles, heels and laces, optional
// hat, tie, apron and a tool. Draw from a solved skeleton (src/lib/rig.ts); returns the markup and the part count.

/* eslint-disable @typescript-eslint/no-explicit-any */
const G: any = LatheKit;

export type Outfit = {
  hat?: 'none' | 'hardhat' | 'cap';
  tie?: boolean;
  apron?: boolean; // shop / lab / kitchen: a front panel with a pocket
  tool?: 'none' | 'wrench' | 'pen' | 'tablet';
  accent?: 'none' | 'hat' | 'tie' | 'tool' | 'shirt' | 'watch'; // the ONE coral part (§22)
};
export const OUTFITS = {
  clerk: {tie: true, tool: 'pen', accent: 'tie'},
  worker: {hat: 'hardhat', tool: 'wrench', accent: 'hat'},
  lab: {apron: true, tool: 'tablet', accent: 'tool'},
  plain: {accent: 'none'},
} satisfies Record<string, Outfit>;

type Item = {at: V3; svg: string};
type Cloth = 'skin' | 'shirt' | 'dark' | 'lit';
const cls = (c: Cloth): K.SolidStyle => (c === 'lit' ? {lit: true} : c === 'skin' ? {} : {className: c === 'dark' ? 'cl-dark' : 'cl-mid'});

/** Draws the character; `P` is the scene projection (anatomyProjection). Wrap in <g class="ns"> for close-ups. */
export const drawCharacter = (s: Skel, P: K.Projection, outfit: Outfit = {}) => {
  const items: Item[] = [];
  let parts = 0;
  let sink: Item[] | null = null; // while grouping, parts go into one painter item
  const put = (at: V3, svg: string) => {
    parts++;
    (sink ?? items).push({at, svg});
  };
  /** Compound parts (a shoe, the torso with its belt and collar, a hand) paint as one item: inside, in the order
   *  drawn (or by depth with `sort`), so a neighbour can't slip between a part and what is sewn onto it. */
  const group = (at: V3, draw: () => void, sort = false) => {
    const inner: Item[] = [];
    sink = inner;
    draw();
    sink = null;
    if (sort) inner.sort((a, b) => K.depthOf(a.at, P) - K.depthOf(b.at, P));
    items.push({at, svg: inner.map((i) => i.svg).join('')});
  };
  const lit = (part: Outfit['accent'], base: Cloth): Cloth => (outfit.accent === part ? 'lit' : base);
  const solid = (paths: unknown, c: Cloth, extra: K.SolidStyle = {}) => K.solidSvg(paths as K.SolidPaths, {tone: 'hi', ...cls(c), ...extra});
  /** tapered capsule-ish limb between two points */
  const limb = (a: V3, b: V3, r0: number, r1: number, c: Cloth, round = true) => {
    const L = len(sub(b, a));
    if (L < 1e-3) return;
    const F = G.frameAlong(a, unit(sub(b, a)));
    const prof = round
      ? [
          [0, r0 * 0.6],
          [r0 * 0.25, r0 * 0.92, 1],
          [r0 * 0.5, r0, 1],
          [L - r1 * 0.5, r1, 1],
          [L - r1 * 0.25, r1 * 0.92, 1],
          [L, r1 * 0.6],
        ]
      : [
          [0, r0],
          [L, r1],
        ];
    put(mul(add(a, b), 0.5), solid(G.solidOf(prof, F, P), c));
  };
  const ball = (c0: V3, r: number, c: Cloth, bias: V3 = [0, 0, 0]) => put(add(c0, bias), solid(G.sphereOf(c0, r, P), c));
  const disc = (o: V3, axis: V3, s0: number, s1: number, r: number, c: Cloth) =>
    put(add(o, mul(unit(axis), (s0 + s1) / 2)), solid(G.disc(s0, s1, r, G.frameAlong(o, unit(axis)), P), c));
  const prism = (o: V3, a: V3, u: V3, v: V3, poly: number[][], s0: number, s1: number, c: Cloth, at?: V3) => {
    const F = G.frameOf(o, a, u, v);
    const cx = poly.reduce((t, p) => t + p[0], 0) / poly.length;
    const cy = poly.reduce((t, p) => t + p[1], 0) / poly.length;
    put(at ?? add(add(add(o, mul(u, cx)), mul(v, cy)), mul(a, (s0 + s1) / 2)), solid(G.prismOf(F, poly, s0, s1, P), c));
  };
  const Z: V3 = [0, 0, 1];

  // ── legs and shoes
  for (const side of ['L', 'R'] as Side[]) {
    const hip = s.hip[side];
    const knee = s.knee[side];
    const ankle = s.ankle[side];
    limb(hip, knee, 3.7, 3.1, 'dark');
    ball(knee, 3.05, 'dark');
    limb(knee, add(ankle, mul(unit(sub(knee, ankle)), 1.6)), 3.0, 2.6, 'dark');
    disc(ankle, sub(knee, ankle), 1.2, 2.6, 2.75, 'dark'); // trouser cuff
    const pitch = side === 'L' ? s.pose.pitchL : s.pose.pitchR;
    const fw = unit(add(mul(s.f, Math.cos(pitch)), mul(Z, Math.sin(pitch))));
    const up = unit(cross(s.l, fw)) as V3; // l × fw = up when pitch = 0
    const lat = s.l;
    const heel = add(add(ankle, mul(up, -DIM.ankle)), mul(fw, -3));
    group(add(add(heel, mul(fw, 6)), mul(up, 2)), () => {
      prism(
        heel,
        up,
        fw,
        lat,
        [
          [0, -2.2],
          [0, 2.2],
          [1.6, 2.4],
          [1.6, -2.4],
        ],
        0,
        1.4,
        'dark',
      ); // heel block
      prism(
        heel,
        up,
        fw,
        lat,
        [
          [0, -2.4],
          [0, 2.4],
          [8, 2.9],
          [11.5, 1.8],
          [12.2, 0],
          [11.5, -1.8],
          [8, -2.9],
        ],
        0.9,
        1.9,
        'shirt',
      ); // sole
      prism(
        heel,
        up,
        fw,
        lat,
        [
          [0.5, -2.1],
          [0.5, 2.1],
          [7.5, 2.5],
          [10.8, 1.5],
          [11.4, 0],
          [10.8, -1.5],
          [7.5, -2.5],
        ],
        1.9,
        4.4,
        'dark',
      ); // upper
      const laces = [5.4, 6.6, 7.8].map((x) => K.iso(add(add(heel, mul(fw, x)), mul(up, 4.5 - (x - 5.4) * 0.35)), P));
      put(add(add(heel, mul(fw, 6.6)), mul(up, 4.6)), K.dotsSvg(laces, {size: 0.55, tone: 'faint'}));
    });
  }
  limb(s.hip.L, s.hip.R, 4.8, 4.8, 'dark'); // seat of the trousers

  // ── torso: shirt (or apron over it), belt and buckle, collar, buttons, pocket, tie
  const ax = s.axis;
  const T = G.frameAlong(add(s.pelvis, mul(ax, -1.5)), ax);
  const torsoAt = (h: number) => add(s.pelvis, mul(ax, h));
  const front = unit(sub(s.f, mul(ax, s.f[0] * ax[0] + s.f[1] * ax[1] + s.f[2] * ax[2])));
  group(torsoAt(12), () => {
    // hips, belt, chest in that order: the chest's lower cap hides the belt's top face, so the belt reads as a band
    put(torsoAt(1), solid(G.solidOf([[0, 5.6], [2.2, 6.05]], T, P), lit('shirt', 'shirt')));
    put(torsoAt(3.3), solid(G.disc(2.2, 4.4, 6.3, T, P), 'dark')); // belt
    put(torsoAt(14), solid(G.solidOf([[4.4, 6.22], [6, 6.3, 1], [12, 6.6, 1], [20, 7.4, 1], [23.4, 6.6, 1], [25.2, 3.6]], T, P), lit('shirt', 'shirt')));
    prism(
      add(torsoAt(3.3), mul(front, 6.2)),
      front,
      ax,
      cross(ax, front),
      [
        [-1.1, -1.4],
        [-1.1, 1.4],
        [1.1, 1.4],
        [1.1, -1.4],
      ],
      0,
      0.7,
      'skin',
    ); // buckle
    put(torsoAt(24.6), solid(G.disc(24.4, 26.2, 3.6, T, P), 'shirt')); // collar
    for (const h of [9, 13.5, 18]) ball(add(torsoAt(h), mul(front, h < 15 ? 6.55 : 7.2)), 0.55, 'skin', mul(front, 0.4)); // buttons
    const sideL = cross(ax, front);
    prism(
      add(add(torsoAt(17.5), mul(front, 7.1)), mul(sideL, 3.2)),
      front,
      ax,
      sideL,
      [
        [-1.8, -1.6],
        [-1.8, 1.6],
        [1.6, 1.6],
        [1.6, -1.6],
      ],
      0,
      0.5,
      'shirt',
    ); // pocket
    if (outfit.tie)
      prism(
        add(torsoAt(15), mul(front, 7.2)),
        front,
        ax,
        sideL,
        [
          [-7, 0],
          [-6, -1.3],
          [7.5, -0.8],
          [8.6, 0],
          [7.5, 0.8],
          [-6, 1.3],
        ],
        0,
        0.6,
        lit('tie', 'dark'),
      );
    if (outfit.apron)
      prism(
        add(torsoAt(8), mul(front, 7.4)),
        front,
        ax,
        sideL,
        [
          [-9, -5.8],
          [-9, 5.8],
          [9, 4.6],
          [9, -4.6],
        ],
        0,
        0.5,
        'shirt',
      );
  });

  // ── arms, watch, hands
  for (const side of ['L', 'R'] as Side[]) {
    const sh = s.shoulder[side];
    const el = s.elbow[side];
    const wr = s.wrist[side];
    ball(sh, 3.15, lit('shirt', 'shirt'));
    limb(sh, el, 2.8, 2.4, lit('shirt', 'shirt'));
    ball(el, 2.35, lit('shirt', 'shirt'));
    const cuffAt = add(wr, mul(unit(sub(el, wr)), 1.8));
    limb(el, cuffAt, 2.35, 2.1, lit('shirt', 'shirt'));
    disc(cuffAt, sub(wr, el), -0.9, 0.2, 2.25, 'shirt'); // cuff
    limb(cuffAt, wr, 1.5, 1.4, 'skin', false);
    if (side === 'L') {
      disc(wr, sub(wr, el), -1.3, -0.3, 1.65, 'dark'); // watch strap
      const n = s.hand.L.n;
      disc(add(wr, mul(unit(sub(el, wr)), 0.8)), mul(n, -1), 1.3, 1.9, 1.05, lit('watch', 'shirt')); // watch face on the back of the wrist
    }
    const held = side === 'R' && outfit.tool && outfit.tool !== 'none' ? outfit.tool : null;
    group(
      add(s.wrist[side], mul(s.hand[side].fwd, 4)),
      () => {
        drawHand(s.hand[side], P, put, solid);
        if (held) drawTool(s.hand.R, P, held, put, solid, lit('tool', held === 'tablet' ? 'dark' : 'shirt'));
      },
      true,
    );
  }

  // ── neck, head (no face), ears, hair, hat
  limb(s.neck, add(s.head, mul(s.headUp, -DIM.head * 0.6)), 2.0, 2.0, 'skin', false);
  ball(s.head, DIM.head, 'skin');
  const earAx = unit(cross(s.headUp, s.headFwd));
  for (const k of [1, -1]) ball(add(add(s.head, mul(earAx, k * DIM.head * 0.97)), mul(s.headFwd, -0.4)), 1.15, 'skin');
  // hair: a cap over the crown and the back of the head, painted in front of the head at its own depth
  ball(add(add(s.head, mul(s.headUp, 1.5)), mul(s.headFwd, -1.4)), DIM.head * 0.86, 'dark', mul(s.headFwd, -0.05)); // crown and back only: the face side stays skin
  if (outfit.hat === 'hardhat' || outfit.hat === 'cap') {
    const H = G.frameAlong(add(s.head, mul(s.headUp, 2.2)), s.headUp);
    put(add(s.head, mul(s.headUp, 3)), solid(G.disc(0, 0.6, outfit.hat === 'hardhat' ? 7.4 : 6.2, H, P), lit('hat', 'shirt')));
    put(
      add(s.head, mul(s.headUp, 4.5)),
      solid(
        G.solidOf(
          [
            [0.6, 5.9],
            [2.6, 5.6, 1],
            [4.6, 4.3, 1],
            [5.8, 2.4, 1],
            [6.3, 0],
          ],
          H,
          P,
        ),
        lit('hat', 'shirt'),
      ),
    );
  }

  // painter's order by depth (nearer drawn later)
  const sorted = [...items].sort((a, b) => K.depthOf(a.at, P) - K.depthOf(b.at, P));
  return {svg: sorted.map((i) => i.svg).join(''), parts};
};

type Put = (at: V3, svg: string) => void;
type Solid = (paths: unknown, c: Cloth, extra?: K.SolidStyle) => string;

/** A hand: palm block, thumb pad, three segments per finger (also used alone for close-ups). */
export const drawHand = (h: HandSkel, P: K.Projection, put: Put, solid: Solid, c: Cloth = 'skin') => {
  const lat = h.side;
  const F = G.frameOf(add(h.wrist, mul(h.n, -1.1)), h.n, h.fwd, lat);
  put(
    add(h.wrist, mul(h.fwd, 3.3)),
    solid(
      G.prismOf(
        F,
        [
          [0, -2.5],
          [0, 2.5],
          [5.2, 3.3],
          [6.7, 2.6],
          [6.7, -2.6],
          [5.2, -3.3],
        ],
        0,
        2.2,
        P,
      ),
      c,
    ),
  );
  put(h.knuckle[0], solid(G.sphereOf(add(h.knuckle[0], mul(h.fwd, -0.6)), 1.45, P), c));
  h.chain.forEach((pts, i) => {
    for (let j = 0; j < 3; j++) {
      const a = pts[j];
      const b = pts[j + 1];
      const r0 = h.radii[i] * (1 - j * 0.1);
      const r1 = h.radii[i] * (0.92 - j * 0.1);
      const L = len(sub(b, a));
      const Fj = G.frameAlong(a, unit(sub(b, a)));
      const prof = [
        [-r0 * 0.35, r0 * 0.7],
        [0, r0, 1],
        [L, r1, 1],
        [L + r1 * 0.45, r1 * 0.6],
      ];
      put(mul(add(a, b), 0.5), solid(G.solidOf(prof, Fj, P), c));
    }
  });
};

const drawTool = (h: HandSkel, P: K.Projection, tool: NonNullable<Outfit['tool']>, put: Put, solid: Solid, c: Cloth) => {
  // the grip axis runs across the palm through the curled fingers (HAND_POSES.hold); the part inside the fist is not
  // drawn, the two ends that stick out are separate parts so each sorts against the fingers by its own depth
  const grip = add(add(h.wrist, mul(h.fwd, 7.2)), mul(h.n, 1.5));
  const along = h.side;
  const HIDE = 3.4; // half the width of the fist
  const rod = (s0: number, s1: number, r: number, tip = 0) => {
    const F = G.frameAlong(add(grip, mul(along, s0)), along);
    const L = s1 - s0;
    const prof = tip > 0 ? [[0, r], [L - tip, r], [L, r * 0.25]] : tip < 0 ? [[0, r * 0.25], [-tip, r], [L, r]] : [[0, r], [L, r]];
    put(add(grip, mul(along, (s0 + s1) / 2)), solid(G.solidOf(prof, F, P), c));
  };
  if (tool === 'pen') {
    rod(-7, -HIDE, 0.75, -1.4); // cap end
    rod(HIDE, 7.5, 0.75, 1.6); // writing tip
  } else if (tool === 'wrench') {
    const F = G.frameOf(grip, h.n, along, h.fwd);
    const plate = (x0: number, x1: number, w0: number, w1: number) =>
      put(add(grip, mul(along, (x0 + x1) / 2)), solid(G.prismOf(F, [[x0, -w0], [x0, w0], [x1, w1], [x1, -w1]], -0.45, 0.45, P), c));
    plate(-6, -HIDE, 0.8, 0.85); // handle tail
    plate(HIDE, 10.5, 0.85, 0.95); // handle
    plate(10.5, 13.6, 2.6, 2.4); // jaw
  } else if (tool === 'tablet') {
    const F = G.frameOf(add(grip, mul(h.fwd, -2)), h.n, h.fwd, along);
    put(
      grip,
      solid(
        G.prismOf(
          F,
          [
            [-6, -4.5],
            [-6, 4.5],
            [7, 4.5],
            [7, -4.5],
          ],
          0,
          0.9,
          P,
        ),
        c,
      ),
    );
  }
};
