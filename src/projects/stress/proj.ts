import {anatomyProjection} from '../../lib/anatomy';
import {Point3} from '../../lib/assembly';

/** Kit units per room unit. One projection for the whole topic. */
export const U = 10;
export const P = anatomyProjection(U);

export const HOME_PERSON: Point3 = [30, 36, 0];
export const SHOP_PERSON: Point3 = [16, 42, 0];
export const STAND_PERSON: Point3 = [22, 40, 0];

/** Chest mark, in front of the torso (toward the camera: +x +y), clear of the body. */
export const chestBead = (at: Point3, scale = 1.5): Point3 => [at[0] + 8 * (scale / 1.5), at[1] + 8 * (scale / 1.5), at[2] + 13 * (scale / 1.5)];
