import {iso, Projection} from '../vendor/anatomy/iso-kit';

// Handedness of the kit (root cause of a past error: every force arrow of the motor stand pointed the wrong way).
// The kit's isometric camera has the screen's right = +x − y with z up: viewed from the camera, +x runs down-RIGHT and
// +y down-LEFT, which is a LEFT-handed world. A physical right-hand rule (force on a current I·L×B, torque r×F, a
// magnetic field of a current, the sense of a screw) computed on kit vectors with the ordinary cross product comes out
// MIRRORED on screen. Compute every right-hand-rule vector with `physCross`, never with `cross` on kit coordinates.
// `assertHandedness` is a self-check used by scripts/pregate.mjs.

type V3 = [number, number, number];
/** The right-hand cross product in a world that is drawn left-handed: the ordinary cross product with the sign flipped. */
export const physCross = (a: V3, b: V3): V3 => [-(a[1] * b[2] - a[2] * b[1]), -(a[2] * b[0] - a[0] * b[2]), -(a[0] * b[1] - a[1] * b[0])];

/** Force on a straight conductor of direction `current` (the sense of the current) in the field `field`: F ∝ I·L × B. */
export const forceOnWire = (current: V3, field: V3): V3 => physCross(current, field);

/** Screen direction (px, y down) of a kit vector. */
export const screenDir = (v: V3, P: Projection): [number, number] => {
  const o = iso([0, 0, 0], P);
  const t = iso(v, P);
  return [t[0] - o[0], t[1] - o[1]];
};

/** True when, on screen, the right-hand rule holds: x × y points along +z as drawn (physCross(x, y) = +z). */
export const assertHandedness = (P: Projection) => {
  const z = physCross([1, 0, 0], [0, 1, 0]);
  // on screen a right-handed frame with z up and x pointing right-and-down has y pointing right-and-UP: not what the kit draws
  const x = screenDir([1, 0, 0], P);
  const y = screenDir([0, 1, 0], P);
  const kitIsLeftHanded = x[0] > 0 && y[0] < 0 && x[1] > 0 && y[1] > 0; // x down-right, y down-left, z up
  return {ok: z[2] === -1 && kitIsLeftHanded, z, x, y, kitIsLeftHanded};
};
