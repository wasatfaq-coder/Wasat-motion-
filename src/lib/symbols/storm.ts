import {Assembly, G, Point3} from '../assembly';
import * as K from '../../vendor/anatomy/iso-kit';

// Storm cloud (MASTER_PROMPT_FINAL §24.1, symbol «storm»: anger, irritation, growing tension). A cloud of
// isometric blocks gathers over the character on the event that caused the state; at full strength bolts strike;
// when the cause is removed the bolts stop and the blocks drift apart. Every block is a piece that moves out from
// its home, so ONE settled paint order serves every state (svg(state) only sets shares and hides).

export type StormOpts = {lit?: boolean; scale?: number};

/** Builds the cloud with its centre bottom at `at`. `state` 0..1: 0 = gone, 0.6 = gathered, ≥ 0.75 = bolts. */
export const storm = (name: string, P: K.Projection, [cx, cy, cz]: Point3, o: StormOpts = {}) => {
  const k = o.scale ?? 1;
  const A = new Assembly(name, P, {role: 'secondary', allow: [[`${name}.b*`, `${name}.b*`], [`${name}.b*`, `${name}.core`], [`${name}.belly`, `${name}.b*`]]});
  // a flat core the cloud rests on (the symbol's own base: it floats over the head, nothing holds it)
  A.slab('core', {x: cx - 10 * k, y: cy - 7 * k, w: 20 * k, d: 14 * k, r: 3 * k}, cz + 2 * k, 4 * k, {tone: 'mid', ground: true, bevel: 0.6, shadow: 'hero'});
  A.slab('belly', {x: cx - 13 * k, y: cy - 9 * k, w: 26 * k, d: 18 * k, r: 4 * k}, cz, 2 * k, {tone: 'lo', bevel: 0.5, meta: {owner: `${name}.core`}});
  // blocks in four layers: [dx, dy, dz, w, d, h]
  const L: number[][] = [];
  const ringOf = (n: number, rx: number, ry: number, z: number, w: number, h: number, phase: number) => {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2;
      L.push([rx * Math.cos(a), ry * Math.sin(a), z, w, w * 0.8, h]);
    }
  };
  ringOf(9, 12, 8, 1.2, 9, 5, 0.2);
  ringOf(8, 9, 6, 5.5, 9, 5, 0.6);
  ringOf(5, 5.5, 3.5, 9.5, 8, 4.5, 1.1);
  ringOf(3, 2.5, 1.5, 13, 7, 3.5, 0.4);
  const blocks: {id: string; at: number}[] = [];
  L.forEach(([dx, dy, dz, w, d, h], i) => {
    const out: Point3 = [dx * 1.6 * k, dy * 1.6 * k, (dz * 0.6 + 6) * k];
    const id = `b${i}`;
    A.slab(id, {x: cx + (dx - w / 2) * k, y: cy + (dy - d / 2) * k, w: w * k, d: d * k, r: 2 * k}, cz + dz * k, h * k, {tone: 'hi', bevel: 0.8, piece: id, move: out, meta: {owner: `${name}.core`}});
    blocks.push({id, at: (i / L.length) * 0.55});
  });
  // three bolts of zigzag segments under the belly
  const bolts: string[] = [];
  const side: Point3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  [-8, 0, 8].forEach((bx, j) => {
    // the bolt starts a little under the belly: the wider wedge (1.6) tilted with its first zig sank 0.65 into it
    const pts: Point3[] = [[cx + bx * k, cy + (j - 1) * 2 * k, cz - 0.55 * k]];
    for (let s = 1; s <= 5; s++) {
      const zig = (s % 2 ? 2.4 : -2.4) * (j === 1 ? -1 : 1) * k;
      const prev = pts[s - 1];
      pts.push([prev[0] + side[0] * zig, prev[1] + side[1] * zig, prev[2] - 4.2 * k]);
    }
    for (let s = 0; s < 5; s++) {
      const F = G.frameAlong(pts[s], G.sub3(pts[s + 1], pts[s]));
      const len = G.len3(G.sub3(pts[s + 1], pts[s]));
      // 0.9 read as a hairline zigzag on a phone; a bolt is a wedge as wide as a finger at the cloud
      const w = (1.6 - s * 0.2) * k;
      const id = `bolt${j}.${s}`;
      A.prism(id, F, [[-w, 0], [0, w * 0.6], [w, 0], [0, -w * 0.6]], -0.2 * k, len + 0.2 * k, {tone: 'hi', lit: o.lit, meta: {owner: `${name}.bolt${j}`, touch: [`${name}.*`]}});
      bolts.push(`${name}.${id}`);
    }
  });
  const share = (state: number, from: number) => 1 - Math.max(0, Math.min(1, (state - from) / 0.25));
  return {
    A,
    /** state 0..1 (frame-driven); t (s) flickers the bolts: each bolt strikes in its own short window */
    svg: (state: number, t = 0) => {
      const shares: Record<string, number> = {};
      const gone = new Set<string>();
      for (const b of blocks) {
        shares[b.id] = share(state, b.at);
        if (state <= b.at) gone.add(`${name}.${b.id}`);
      }
      const strike = (j: number) => state >= 0.75 && Math.sin(t * 9 + j * 2.1) > 0.35;
      return A.svg(shares, {
        hide: (n) => {
          if (gone.has(n)) return true;
          if (state < 0.2 && (n === `${name}.core` || n === `${name}.belly`)) return true;
          const m = n.match(/\.bolt(\d)\./);
          return m ? !strike(Number(m[1])) : false;
        },
      });
    },
    bolts,
  };
};
