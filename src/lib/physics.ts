// Frame-based physics (MASTER_PROMPT_FINAL §12, §19.7, §22): every value is a pure function of time t (seconds),
// no state carried between frames, so any frame renders the same in any order.

/** Damped spring from 0 to 1 started at t = 0 (closed form). stiffness k, damping c, mass m.
 *  Underdamped springs overshoot and settle; critical/overdamped ones approach without overshoot. */
export const spring = (t: number, {stiffness = 170, damping = 18, mass = 1} = {}) => {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
};

/** Anticipation: a small move against the direction (share of the travel) before the main move. */
export const anticipate = (t: number, duration: number, share = 0.08) =>
  t <= 0 || t >= duration ? 0 : -share * Math.sin((Math.PI * t) / duration);

/** Ballistic height with bounces on a floor: drop from h0 with gravity g, restitution e (0..1). */
export const bounce = (t: number, {h0 = 1, g = 9.81, e = 0.45, rest = 0.002} = {}) => {
  if (t <= 0) return h0;
  let v = Math.sqrt(2 * g * h0);
  let start = v / g; // first impact after falling from h0
  if (t < start) return h0 - 0.5 * g * t * t;
  for (;;) {
    v *= e;
    if ((v * v) / (2 * g) < rest) return 0;
    const flight = (2 * v) / g;
    if (t < start + flight) {
      const u = t - start;
      return v * u - 0.5 * g * u * u;
    }
    start += flight;
  }
};

/** Squash at impact: 1 at rest, < 1 for a short time after each landing (pass the time since the impact). */
export const squash = (sinceImpact: number, amount = 0.15, duration = 0.12) =>
  sinceImpact < 0 || sinceImpact > duration ? 1 : 1 - amount * Math.sin((Math.PI * sinceImpact) / duration);

/** Follow-through: a light part trails its carrier by a spring (returns the lag share 0..1 of the carrier step). */
export const followThrough = (t: number, opts?: {stiffness?: number; damping?: number}) => 1 - spring(t, {stiffness: 120, damping: 9, ...opts});
