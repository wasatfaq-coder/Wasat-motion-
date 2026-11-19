import * as K from '../vendor/anatomy/iso-kit';
import {Assembly, G, Point3} from './assembly';
import {paint, Painted} from './anatomy';

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

/** Particles of one kind at time `t`, painted back to front. Smoke and steam puffs grow and fade; fire tongues are
 *  chips that rise and shrink; drops are small balls on ballistic paths; gas is fine dots that spread. */
export const particles = (P: K.Projection, kind: Kind, e: Emitter, t: number) => {
  const items: Painted[] = [];
  for (const {p, age, i} of live(e, t, kind)) {
    if (kind === 'fire') {
      const k = 1.6 * (1 - age);
      const F = G.frameAlong(p, [Math.sin(i) * 0.2, 0, 1]);
      const svg = K.solidSvg(G.prismOf(F, [[-k, 0], [0, k * 0.5], [k, 0], [0, -k * 0.5]], 0, k * 2.6, P), {tone: 'hi'});
      items.push({at: p, svg: `<g opacity="${(1 - age * 0.6).toFixed(3)}">${svg}</g>`});
    } else if (kind === 'drops') {
      items.push({at: p, svg: K.solidSvg(G.sphereOf(p, 0.7, P, {steps: 16}), {tone: 'hi'})});
    } else if (kind === 'gas') {
      items.push({at: p, svg: K.dotsSvg([K.iso(p, P)], {size: 0.5, tone: 'mid'})});
    } else {
      const r = (kind === 'steam' ? 1.4 : 2) + age * (kind === 'steam' ? 3 : 4.5);
      const svg = K.solidSvg(G.sphereOf(p, r, P, {steps: 24}), {tone: kind === 'steam' ? 'hi' : 'mid'});
      items.push({at: p, svg: `<g opacity="${(0.9 * (1 - age) ** 1.3).toFixed(3)}">${svg}</g>`});
    }
  }
  return paint(items, P);
};

/** The liquid inside a turned vessel: a body that follows the vessel's INNER profile up to `level` (kit units from
 *  the vessel's frame origin), with a flat surface and ripple rings drawn on it. `inner` is [[s, r], …] from the
 *  bottom up. Recorded in the vessel's Assembly (owner = the vessel), so the audit sees it sit inside. */
export const liquid = (A: Assembly, name: string, F: {o: Point3; a: Point3; u: Point3; v: Point3}, inner: [number, number][], level: number, o: {owner?: string; ripple?: number; lit?: boolean} = {}) => {
  const rAt = (s: number) => {
    for (let i = 0; i < inner.length - 1; i++) {
      const [s0, r0] = inner[i];
      const [s1, r1] = inner[i + 1];
      if (s >= s0 && s <= s1) return r0 + ((r1 - r0) * (s - s0)) / Math.max(1e-9, s1 - s0);
    }
    return inner[inner.length - 1][1];
  };
  const prof = inner.filter(([s]) => s < level).map(([s, r]) => [s, r]);
  prof.push([level, rAt(level)]);
  const top = G.add3(F.o, G.mul3(F.a, level)) as Point3;
  // ripple rings on the surface: concentric, phase from `ripple` (a frame-driven value), drawn on the body
  const rings = [0.35, 0.6, 0.85]
    .map((k) => {
      const rr = rAt(level) * ((k + (o.ripple ?? 0)) % 1);
      return rr > 0.4 ? K.lineSvg(G.circleOf({...F, o: top}, 0, rr, A.P), {tone: 'lo'}) : '';
    })
    .join('');
  return A.turned(name, prof, F, {tone: 'mid', lit: o.lit, over: rings, meta: o.owner ? {owner: o.owner} : {}});
};
