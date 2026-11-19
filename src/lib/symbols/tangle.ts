import {Assembly, Point3} from '../assembly';
import * as K from '../../vendor/anatomy/iso-kit';

// Tangle (MASTER_PROMPT_FINAL §24.1, symbol «tangle»: stress, anxiety, muddled thoughts). One cord wound in loops
// round a centre (a yarn ball, or a head when `core` is false). Loops are added as the load grows and come off one by
// one at each step of the solution; the free end lengthens and drops away. Every loop is a recorded route, so the
// audit sees the full ball; a state only hides loops (one settled paint order for every state).

export type TangleOpts = {r?: number; cord?: number; loops?: number; core?: boolean; lit?: boolean};

// deterministic spread of loop orientations over the sphere (golden spiral of normals). A loop seen edge-on folds
// into a line on screen, so normals nearly square to the view `V` are skipped (|n·V| ≥ 0.45).
const normals = (n: number, V: Point3): Point3[] => {
  const out: Point3[] = [];
  for (let i = 0, m = n * 4; i < m && out.length < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / m;
    const rho = Math.sqrt(1 - z * z);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    const q: Point3 = [rho * Math.cos(a), rho * Math.sin(a), z];
    if (Math.abs(q[0] * V[0] + q[1] * V[1] + q[2] * V[2]) >= 0.45) out.push(q);
  }
  return out;
};

const circle = (c: Point3, n: Point3, r: number, steps = 28, start = 0): Point3[] => {
  const t: Point3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u0: Point3 = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
  const ul = Math.hypot(...u0);
  const u: Point3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul];
  const v: Point3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return Array.from({length: steps + 1}, (_, i) => {
    const a = start + (i / steps) * Math.PI * 2;
    return [c[0] + r * (u[0] * Math.cos(a) + v[0] * Math.sin(a)), c[1] + r * (u[1] * Math.cos(a) + v[1] * Math.sin(a)), c[2] + r * (u[2] * Math.cos(a) + v[2] * Math.sin(a))];
  });
};

/** The tangle centred at `c`. `state` 0..1 is the LOAD: 0 = no loops, 1 = all loops on. */
export const tangle = (name: string, P: K.Projection, c: Point3, o: TangleOpts = {}) => {
  const R = o.r ?? 10;
  const cord = o.cord ?? 0.55;
  const N = o.loops ?? 40;
  const A = new Assembly(name, P, {role: 'secondary', crowd: [[`${name}.loop*`, `${name}.loop*`]], allow: [[`${name}.loop*`, `${name}.loop*`], [`${name}.loop*`, `${name}.core`], [`${name}.end*`, `${name}.loop*`]]});
  if (o.core ?? true) A.ball('core', c, R - cord, {tone: 'mid', ground: true, shadow: 'hero'});
  const ns = normals(N, A.V);
  ns.forEach((n, i) => {
    // successive loops sit a hair further out, the way a wound ball grows
    const r = R + (i / N) * cord * 1.2;
    A.pipe(`loop${i}`, circle(c, n, r, 28, i * 0.7).slice(0, -1), cord, {closed: true, limp: true, maxLength: 10, meta: {owner: `${name}.core`, touch: [`${name}.*`]}});
  });
  // the free end: out of the wound ball (from the core surface, under the loops), down and away
  // the end leaves sideways on screen (+x −y) and lies down on the floor: a run towards the viewer (+x +y) reads as a
  // vertical stick on screen and the ball as a lollipop
  const side: Point3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  const go = (k: number, z: number): Point3 => [c[0] + side[0] * k, c[1] + side[1] * k, z];
  const floor = c[2] - R + cord;
  const endPts: Point3[] = [go(R - cord, c[2] - 2), go(R + 3, c[2] - 3), go(R + 6, floor + 1.5), go(R + 9, floor), go(R + 20, floor)];
  A.pipe('end', endPts, cord, {bend: 3, limp: true, ends: [false, false], // it comes out from under the loops: its start is wound in, not mounted
    lit: o.lit, meta: {touch: [`${name}.*`]}});
  return {
    A,
    /** state = load 0..1: the first round(N·state) loops are on (the first wound stays on longest) */
    svg: (state: number) => {
      const on = Math.round(N * Math.max(0, Math.min(1, state)));
      return A.svg({}, {hide: (n) => {
        const m = n.match(/\.loop(\d+)/);
        if (m) return Number(m[1]) >= on;
        if (n.includes('.end')) return on < N * 0.15;
        return on === 0;
      }});
    },
  };
};
