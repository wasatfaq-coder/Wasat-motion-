import {MotionSpec} from '../../lib/motion';

// Per-frame state of every moving scene of «Как работает Claude» (CLAUDE.md «Motion», src/lib/motion.ts). For each scene or reel:
// - beats are STATES (angles, shares, opacities, a camera), moves between them with beatClock + settle, never a
//   cross-fade of two pictures; a part that turns is rebuilt at its angle every frame;
// - moving parts are dynTube / dynBall / dynSolid (src/lib/assembly.ts) with shapes, drawn with Assembly.svgFaded:
//   the depth order against the static object is ray-tested every frame (src/lib/depth.ts);
// - the camera is camFit(hero box corners, {rect: safeRect({captions}), pins: labels}), not zoom numbers;
// - arrows carry tail + owner, labels and insets carry screen rects.
// The scene .tsx only draws pose(frame). scripts/motion-check.mjs (audit, CI, pregate) walks every frame of MOTION.
export const MOTION: MotionSpec[] = [];
