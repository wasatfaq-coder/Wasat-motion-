// Isometric projection. x → screen lower-right, y → screen lower-left, z → up.
export const COS30 = Math.cos(Math.PI / 6);
export const SIN30 = 0.5;

export type P3 = [number, number, number];

export const iso = (s: number) => ([x, y, z]: P3): [number, number] => [
  COS30 * (x - y) * s,
  SIN30 * (x + y) * s - z * s,
];

export const pts = (s: number, list: P3[]) =>
  list.map((p) => iso(s)(p).join(',')).join(' ');

/** SVG matrix for drawing flat 2D art on a plane. Local u → along axis, local w → down. */
export const planeMatrix = (
  s: number,
  plane: 'wallX' | 'wallY' | 'floor',
  origin: P3,
) => {
  const [ox, oy] = iso(s)(origin);
  if (plane === 'wallX') {
    // plane y = const, u along +x, w down (−z)
    return `matrix(${COS30 * s},${SIN30 * s},0,${s},${ox},${oy})`;
  }
  if (plane === 'wallY') {
    // plane x = const, u along +y, w down (−z)
    return `matrix(${-COS30 * s},${SIN30 * s},0,${s},${ox},${oy})`;
  }
  // floor: u along +x, w along +y
  return `matrix(${COS30 * s},${SIN30 * s},${-COS30 * s},${SIN30 * s},${ox},${oy})`;
};
