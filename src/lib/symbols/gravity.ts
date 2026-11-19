import {spring, SPRING_MECHANICAL, squash} from '../physics';

// Gravity as a state (MASTER_PROMPT_FINAL §24.1, symbols «levitation» and «trapdoor»): happiness lifts the
// character off the floor, shame drops them through a hatch. Pure functions of time (physics.ts): the scene adds
// `lift` to the character's z (kit or room units, the same unit as `height`) and scales the contact shadow.

/** Levitation that starts at `t0` and ends at `t1` (s): a slow rise on a critically damped spring, a gentle bob while
 *  aloft, a landing with a short squash. `height` is the hover height; the shadow shrinks as the body rises. */
export const levitate = (t: number, t0: number, t1: number, height: number, o: {bob?: number; bobHz?: number} = {}) => {
  const rise = spring((t - t0) * 0.55, SPRING_MECHANICAL);
  const fall = t > t1 ? spring((t - t1) * 0.8, SPRING_MECHANICAL) : 0;
  const level = Math.max(0, rise - fall);
  const bob = (o.bob ?? 0.06) * height * Math.sin((t - t0) * Math.PI * 2 * (o.bobHz ?? 0.5)) * level;
  const lift = height * level + bob;
  // landing: contact once the fall has almost settled
  const landed = t > t1 && level < 0.02;
  const sinceLanding = landed ? t - t1 - 1.2 : -1;
  return {lift, shadow: 1 - 0.55 * Math.min(1, lift / Math.max(1e-6, height)), squash: squash(sinceLanding, 0.08, 0.18)};
};

/** Sinking through an open hatch from `t0`, rising back from `t1` (s): `depth` below the floor at most. */
export const sink = (t: number, t0: number, t1: number, depth: number) => {
  const down = spring((t - t0) * 0.9, SPRING_MECHANICAL);
  const up = t > t1 ? spring((t - t1) * 0.7, SPRING_MECHANICAL) : 0;
  return {drop: depth * Math.max(0, down - up), open: Math.max(0, Math.min(1, (t - t0) * 3)) * (1 - Math.max(0, Math.min(1, (t - t1 - 0.6) * 2)))};
};
