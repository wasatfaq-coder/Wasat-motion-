import {MotionPose} from '../../../lib/motion';
import {screenOf} from '../../../lib/camera';
import {Point3} from '../../../lib/assembly';
import {U} from '../proj';

/** A thin leader from a part to the label box stored on the pose. The label follows the camera every frame. */
export const marksOf = (pose: MotionPose, anchors: Record<string, Point3>) =>
  pose.plates
    .filter((p) => p.kind !== 'sensor' && p.opacity > 0.02 && anchors[p.name])
    .map((p, i) => {
      const at = anchors[p.name];
      const [sx, sy] = screenOf(pose.cam, [at[0] / U, at[1] / U, at[2] / U]);
      return {n: i + 1, label: p.text ?? '', at: [sx, sy] as [number, number], to: [p.x + p.w, p.y + p.h / 2] as [number, number], show: p.opacity};
    });
