import * as K from '../vendor/anatomy/iso-kit';
import {A, Assembly, Dyn, dynBall, dynSolid, G, Point3} from './assembly';

// Nature and substances in the house style (MASTER_PROMPT_FINAL §24.3): smoke, steam, fire, drops, gas and a liquid
// that fills a vessel. Particles are SHORT-LIVED EFFECTS built from the same toned solids (balls, chips), a pure
// function of time with a fixed seed, so any frame renders the same (§22.3). Like flow dots they are not objects:
// no Assembly, no part norm, never coral. A liquid IS an object part: it is recorded in the vessel's Assembly.

const rand = (seed: number) => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export type Emitter = {
  /** where particles are born (kit units) and how far round it (a disc in the floor plane) */
  at: Point3;
  spread?: number;
  /** particles per second and how long each lives (s) */
  rate?: number;
  life?: number;
  seed?: number;
};

type Kind = 'smoke' | 'steam' | 'fire' | 'drops' | 'gas';

/** Every live particle of an emitter at time `t` (s): position, size and age share 0..1. */
const live = (e: Emitter, t: number, kind: Kind) => {
  const rate = e.rate ?? (kind === 'drops' ? 14 : 8);
  const life = e.life ?? (kind === 'fire' ? 0.7 : kind === 'drops' ? 0.9 : 2.4);
  const spread = e.spread ?? 3;
  const seed = e.seed ?? 1;
  const out: {p: Point3; age: number; i: number}[] = [];
  const first = Math.max(0, Math.floor((t - life) * rate));
  for (let i = first; i <= Math.floor(t * rate); i++) {
    const born = i / rate;
    const age = t - born;
    if (age < 0 || age > life) continue;
    const a = rand(i * 3 + seed) * Math.PI * 2;
    const d = Math.sqrt(rand(i * 7 + seed)) * spread;
    const o: Point3 = [e.at[0] + Math.cos(a) * d, e.at[1] + Math.sin(a) * d, e.at[2]];
    let p: Point3;
    if (kind === 'drops') {
      // ballistic: thrown up and out, gravity 90 kit units/s²
      const v = 14 + rand(i + seed * 5) * 10;
      p = [o[0] + Math.cos(a) * v * 0.35 * age, o[1] + Math.sin(a) * v * 0.35 * age, o[2] + v * age - 45 * age * age];
    } else if (kind === 'gas') {
      // diffusion: a random walk that spreads with √t, no buoyancy
      const r = 6 * Math.sqrt(age);
      p = [o[0] + Math.cos(a * 3.1) * r, o[1] + Math.sin(a * 2.3) * r, o[2] + (rand(i + 11) - 0.3) * r];
    } else {
      // buoyant: rises, slows, drifts and sways
      const rise = kind === 'fire' ? 22 : kind === 'steam' ? 12 : 9;
      const sway = Math.sin(age * 3 + i) * (kind === 'fire' ? 0.6 : 1.6) * age;
      p = [o[0] + sway + age * 2, o[1] + sway * 0.5, o[2] + rise * age * (1 - 0.25 * age / life)];
    }
    out.push({p, age: age / life, i});
  }
  return out;
};

/** Particles of one kind at time `t` as moving parts with their 3D shapes (Dyn): pass them as `extra` to the
 *  Assembly they rise from (obj.svg({}, {extra}) or svgFaded), so src/lib/depth.ts puts each one in front of or behind
 *  the object's parts by ray tests. Root cause (docs/root-causes.md): particles were painted on their own and could
 *  show through the object they were behind. Smoke and steam puffs grow and fade; fire tongues rise and shrink; drops
 *  fly on ballistic paths; gas is fine dots (an annotation: no body to order). */
export const particles = (P: K.Projection, kind: Kind, e: Emitter, t: number): Dyn[] => {
  const out: Dyn[] = [];
  for (const {p, age, i} of live(e, t, kind)) {
    const name = `${kind}${i}`;
    if (kind === 'fire') {
      const k = 1.6 * (1 - age);
      const F = G.frameAlong(p, [Math.sin(i) * 0.2, 0, 1]);
      const poly = [[-k, 0], [0, k * 0.5], [k, 0], [0, -k * 0.5]];
      out.push({...dynSolid(name, p, K.solidSvg(G.prismOf(F, poly, 0, k * 2.6, P), {tone: 'hi'}), A.prism(F, poly, 0, k * 2.6, {name})), opacity: 1 - age * 0.6});
    } else if (kind === 'drops') {
      out.push(dynBall(name, p, 0.7, P, {tone: 'hi'}));
    } else if (kind === 'gas') {
      out.push({name, at: p, svg: K.dotsSvg([K.iso(p, P)], {size: 0.5, tone: 'mid'}), shapes: [], annotation: true});
    } else {
      const r = (kind === 'steam' ? 1.4 : 2) + age * (kind === 'steam' ? 3 : 4.5);
      out.push(dynBall(name, p, r, P, {tone: kind === 'steam' ? 'hi' : 'mid'}, 0.9 * (1 - age) ** 1.3));
    }
  }
  return out;
};

/** An open upright vessel (a glass, a beaker, a tank) with liquid to `level` (kit units above the bottom): a base
 *  disc, the wall as two upright half-rings — the BACK half drawn behind the liquid and the FRONT half in front of it
 *  — and the liquid body with ripple rings on its surface. Root cause behind the split: a wall drawn as one ring goes
 *  round the liquid, its front arc in front and its back arc behind, and no single paint key can say both (lint:
 *  «encircled»). `ripple` is a frame-driven phase 0..1. */
export const vessel = (A: Assembly, name: string, [x, y, z]: Point3, o: {r: number; wall?: number; h: number; level: number; ripple?: number; lit?: boolean; foot?: number}) => {
  const wall = o.wall ?? 0.8;
  const foot = o.foot ?? 1;
  const rIn = o.r - wall;
  A.cyl(name, x, y, o.r, z, foot, {tone: 'mid', ground: true, bevel: 0.3, shadow: 'hero'});
  // split line square to the horizontal view direction, so one half is wholly behind and one wholly in front
  const V = A.V;
  const view = Math.atan2(V[1], V[0]);
  const half = (from: number): K.Plane[] => {
    const n = 24;
    const outer: K.Plane[] = [];
    const inner: K.Plane[] = [];
    for (let i = 0; i <= n; i++) {
      const a = from + (i / n) * Math.PI;
      outer.push([x + o.r * Math.cos(a), y + o.r * Math.sin(a)]);
      inner.push([x + rIn * Math.cos(a), y + rIn * Math.sin(a)]);
    }
    return [...outer, ...inner.reverse()];
  };
  const own = {meta: {owner: `${A.name}.${name}`}};
  A.extruded(`${name}.back`, half(view + Math.PI / 2), z + foot, o.h, {tone: 'hi', ...own});
  const level = Math.min(o.h, Math.max(0.2, o.level));
  const rings = [0.3, 0.55, 0.8]
    .map((k) => {
      const rr = rIn * ((k + (o.ripple ?? 0)) % 1);
      return rr > 0.5 ? K.lineSvg(K.ring(x, y, rr, z + foot + level, A.P), {tone: 'lo'}) : '';
    })
    .join('');
  A.cyl(`${name}.liquid`, x, y, rIn - 0.02, z + foot, level, {tone: 'mid', bevel: 0, lit: o.lit, over: rings, ...own});
  A.extruded(`${name}.front`, half(view - Math.PI / 2), z + foot, o.h, {tone: 'hi', ...own});
  // a lip ring on top of the wall, as two halves for the same reason
  return {surface: [x, y, z + foot + level] as Point3, top: z + foot + o.h};
};
