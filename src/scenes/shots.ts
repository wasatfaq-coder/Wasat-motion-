import {interpolate} from 'remotion';
import {Cam, lerpCam} from './RoomScene';

/** Camera from a shot list [startFrame, cam]: each new shot blends in over `blend` frames (cut on stressed words). */
export const shotCam = (frame: number, shots: [number, Cam][], blend = 30): Cam => {
  let cam = shots[0][1];
  for (let i = 1; i < shots.length; i++) {
    const t = interpolate(frame, [shots[i][0], shots[i][0] + blend], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    cam = lerpCam(cam, shots[i][1], t);
  }
  return cam;
};
