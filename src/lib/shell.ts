// Organic shells for the house style. The Anatomy kit builds machines from boxes, lathes and tubes, so a heart
// made only of those reads as balls and cylinders. These helpers draw smooth closed forms at our level: a bezier
// loop, a soft shaded shell, a vessel that narrows, and a branch. Fills are the kit's face tones (no pattern).
// Coral stays the one meaning colour, passed in by the caller as `lit`.

export type Pt = [number, number];

const n = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Closed contour through `knots` as one cubic bezier loop (Catmull–Rom, `tension` 0.2–0.4). */
export const bezierLoop = (knots: Pt[], tension = 0.32): string => {
  const m = knots.length;
  if (m < 3) throw new Error('bezierLoop: a closed shell needs at least 3 knots');
  const d: string[] = [];
  for (let i = 0; i < m; i++) {
    const p0 = knots[(i - 1 + m) % m];
    const p1 = knots[i];
    const p2 = knots[(i + 1) % m];
    const p3 = knots[(i + 2) % m];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * tension, p1[1] + (p2[1] - p0[1]) * tension];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * tension, p2[1] - (p3[1] - p1[1]) * tension];
    if (i === 0) d.push(`M${n(p1)}`);
    d.push(`C${n(c1)} ${n(c2)} ${n(p2)}`);
  }
  d.push('Z');
  return d.join('');
};

/** Open ribbon of varying width along a polyline: a vessel that narrows, or a coronary on a surface. */
export const ribbon = (pts: Pt[], r0: number, r1: number): string => {
  if (pts.length < 2) throw new Error('ribbon: a vessel needs two points');
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const L = Math.hypot(dx, dy) || 1;
    const px = -dy / L;
    const py = dx / L;
    const r = r0 + ((r1 - r0) * i) / (pts.length - 1);
    left.push([pts[i][0] + px * r, pts[i][1] + py * r]);
    right.push([pts[i][0] - px * r, pts[i][1] - py * r]);
  }
  const side = (row: Pt[]) => {
    let d = `M${n(row[0])}`;
    for (let i = 1; i < row.length; i++) d += `L${n(row[i])}`;
    return d;
  };
  return `${side(left)}${side(right.reverse()).replace('M', 'L')}Z`;
};

/** A straight vessel from `a` to `b` that narrows from radius `r0` to `r1`, with round ends. */
export const taper = (a: Pt, b: Pt, r0: number, r1: number): string => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const px = -uy;
  const py = ux;
  const k = 0.5522847498;
  const cap = (c: Pt, r: number, dir: number) => {
    const ax = px * r;
    const ay = py * r;
    const bx = ux * r * dir;
    const by = uy * r * dir;
    const p0: Pt = [c[0] + ax, c[1] + ay];
    const p1: Pt = [c[0] - ax, c[1] - ay];
    const out: Pt = [c[0] + bx, c[1] + by];
    return {p0, p1, out, kax: ax * k, kay: ay * k, kbx: bx * k, kby: by * k};
  };
  const A = cap(a, r0, -1);
  const B = cap(b, r1, 1);
  return [
    `M${n(A.p0)}`,
    `L${n(B.p0)}`,
    `C${n([B.p0[0] + B.kbx, B.p0[1] + B.kby])} ${n([B.out[0] + B.kax, B.out[1] + B.kay])} ${n(B.out)}`,
    `C${n([B.out[0] - B.kax, B.out[1] - B.kay])} ${n([B.p1[0] + B.kbx, B.p1[1] + B.kby])} ${n(B.p1)}`,
    `L${n(A.p1)}`,
    `C${n([A.p1[0] + A.kbx, A.p1[1] + A.kby])} ${n([A.out[0] - A.kax, A.out[1] - A.kay])} ${n(A.out)}`,
    `C${n([A.out[0] + A.kax, A.out[1] + A.kay])} ${n([A.p0[0] + A.kbx, A.p0[1] + A.kby])} ${n(A.p0)}`,
    'Z',
  ].join('');
};

let seq = 0;

/** One soft shell: smooth fill from the lit top to the dark side, a contact shadow, a dark contour. No texture. */
export const shell = (knots: Pt[], opts: {lit?: boolean; name?: string} = {}): string => {
  const id = opts.name ?? `shell${seq++}`;
  const d = bezierLoop(knots);
  const xs = knots.map((p) => p[0]);
  const ys = knots.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const hx = cx - (Math.max(...xs) - Math.min(...xs)) * 0.12;
  const hy = cy - (Math.max(...ys) - Math.min(...ys)) * 0.22;
  const fill = opts.lit ? 'var(--anatomy-lit-shade)' : `url(#${id}-shade)`;
  const gleam = opts.lit ? 'var(--anatomy-lit-top)' : 'var(--anatomy-top)';
  return `<defs>
<linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="var(--anatomy-shade-3)"/>
<stop offset="0.55" stop-color="var(--anatomy-shade-1)"/>
<stop offset="1" stop-color="var(--anatomy-shade-0)"/>
</linearGradient>
<filter id="${id}-halo" x="-20%" y="-20%" width="140%" height="140%">
<feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="var(--anatomy-halo)" flood-opacity="0.16"/>
</filter>
<clipPath id="${id}-clip"><path d="${d}"/></clipPath>
</defs>
<path d="${d}" fill="${fill}" filter="url(#${id}-halo)"/>
<ellipse cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" rx="${((Math.max(...xs) - Math.min(...xs)) * 0.16).toFixed(1)}" ry="${((Math.max(...ys) - Math.min(...ys)) * 0.12).toFixed(1)}" fill="${gleam}" opacity="0.4" clip-path="url(#${id}-clip)"/>
<path d="${d}" fill="none" stroke="var(--anatomy-hi)" stroke-width="3.5" stroke-linejoin="round"/>`;
};

const smoothOpen = (pts: Pt[], tension = 0.35, steps = 7): Pt[] => {
  if (pts.length < 3) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * tension, p1[1] + (p2[1] - p0[1]) * tension];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * tension, p2[1] - (p3[1] - p1[1]) * tension];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push([u ** 3 * p1[0] + 3 * u ** 2 * t * c1[0] + 3 * u * t ** 2 * c2[0] + t ** 3 * p2[0], u ** 3 * p1[1] + 3 * u ** 2 * t * c1[1] + 3 * u * t ** 2 * c2[1] + t ** 3 * p2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

/** A vessel or a coronary drawn as a soft tapered body. `lit` is the one coral meaning. */
export const vessel = (pts: Pt[], r0: number, r1: number, opts: {lit?: boolean; name?: string} = {}): string => {
  const id = opts.name ?? `ves${seq++}`;
  const line = pts.length > 2 ? smoothOpen(pts) : pts;
  const d = line.length === 2 ? taper(line[0], line[1], r0, r1) : ribbon(line, r0, r1);
  const fill = opts.lit ? 'var(--anatomy-lit-top)' : 'var(--anatomy-shade-2)';
  const side = opts.lit ? 'var(--anatomy-lit-shade)' : 'var(--anatomy-shade-0)';
  return `<defs><linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${side}"/><stop offset="0.45" stop-color="${fill}"/><stop offset="1" stop-color="${side}"/></linearGradient></defs>
<path d="${d}" fill="url(#${id}-v)" stroke="var(--anatomy-hi)" stroke-width="2.5" stroke-linejoin="round"/>`;
};

/** A trunk that narrows, then forks. Each fork starts at the trunk's end and narrows again. */
export const branch = (trunk: {from: Pt; to: Pt; r0: number; r1: number}, forks: {to: Pt; r: number}[]): string =>
  [vessel([trunk.from, trunk.to], trunk.r0, trunk.r1, {name: `trunk${seq++}`}), ...forks.map((f) => vessel([trunk.to, f.to], trunk.r1 * 0.85, f.r, {name: `fork${seq++}`}))].join('');

/** A coronary artery lying on a shell: a thin vessel that narrows as it runs. */
export const coronary = (pts: Pt[], r0: number, r1: number, lit = false): string => vessel(pts, r0, r1, {lit, name: `cor${seq++}`});

export type HeartLabels = {aorta: Pt; apex: Pt; coronary: Pt; valve: Pt};

/** Anterior heart (anatomical right on the viewer's left): atria, ventricles, apex, aorta, pulmonary trunk, venae cavae, coronaries. */
export const heartAnterior = (origin: Pt, scale: number, yScale = scale): {svg: string; labels: HeartLabels} => {
  const p = (x: number, y: number): Pt => [origin[0] + x * scale, origin[1] + y * yScale];
  // One silhouette: right atrium (viewer left), right ventricle, apex, left ventricle, left auricle.
  // Anterior silhouette: apex below, left ventricle on the viewer's right, right atrium on the viewer's left.
  const body: Pt[] = [
    p(0.5, 0.97),
    p(0.66, 0.86),
    p(0.8, 0.66),
    p(0.84, 0.48),
    p(0.74, 0.34),
    p(0.6, 0.3),
    p(0.5, 0.34),
    p(0.38, 0.3),
    p(0.24, 0.36),
    p(0.15, 0.5),
    p(0.14, 0.66),
    p(0.22, 0.8),
    p(0.36, 0.92),
  ];
  const auricle: Pt[] = [p(0.68, 0.32), p(0.82, 0.28), p(0.88, 0.38), p(0.76, 0.44), p(0.64, 0.38)];
  const aorta = [p(0.5, 0.32), p(0.54, 0.18), p(0.7, 0.08), p(0.86, 0.16)];
  const pulmonary = [p(0.42, 0.33), p(0.36, 0.16), p(0.24, 0.08)];
  const pulmonaryFork = p(0.16, 0.18);
  const svc = [p(0.26, 0.02), p(0.24, 0.3)];
  const ivc = [p(0.2, 0.72), p(0.22, 0.52)];
  const lad = [p(0.48, 0.36), p(0.52, 0.55), p(0.5, 0.76), p(0.48, 0.92)];
  const rca = [p(0.4, 0.38), p(0.26, 0.5), p(0.22, 0.68)];
  const svg = [
    shell(body, {name: 'heart-body'}),
    shell(auricle, {name: 'heart-auricle'}),
    vessel(svc, 0.024 * scale, 0.02 * scale, {name: 'svc'}),
    vessel(ivc, 0.02 * scale, 0.016 * scale, {name: 'ivc'}),
    vessel(aorta, 0.03 * scale, 0.018 * scale, {name: 'aorta'}),
    branch({from: pulmonary[0], to: pulmonary[2], r0: 0.026 * scale, r1: 0.014 * scale}, [{to: pulmonaryFork, r: 0.01 * scale}]),
    coronary(rca, 0.006 * scale, 0.003 * scale),
    coronary(lad, 0.007 * scale, 0.003 * scale, true),
  ].join('');
  return {
    svg,
    labels: {aorta: aorta[2], apex: body[0], coronary: lad[1], valve: p(0.46, 0.34)},
  };
};
