import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import {AnatomyStage, anatomyProjection, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, camOn, lerpCam, RoomSvg} from '../lib/camera';
import {add, HAND_POSES, lerpFingers, lerpPose, mul, Pose, reach, sit, solve, stand, V3, walk} from '../lib/rig';
import {drawCharacter, OUTFITS} from '../lib/character';
import {EASE} from '../lib/anim';
import {spring} from '../lib/physics';

/* eslint-disable @typescript-eslint/no-explicit-any */
const G: any = LatheKit;

// Rig sample (§22): the faceless mannequin walks (no foot sliding), stops, presses a button with IK, the camera
// pushes in on the hand (finger poses), then pulls back. One coral part: the button. No dossier: a tool demo.
const U = 14;
const P = anatomyProjection(U);
const YAW = -Math.PI / 3; // walks to screen right, a little away: the left side and the left arm face the viewer
const F: V3 = [Math.cos(YAW), Math.sin(YAW), 0];
const L: V3 = [-F[1], F[0], 0];
const STOP = 2.4; // s
const SPEED = 36;
const STOP_AT: V3 = mul(F, SPEED * STOP);
const BUTTON: V3 = add(add(add(STOP_AT, mul(F, 27)), mul(L, 6)), [0, 0, 49]); // in front of the left shoulder

const FLOOR = K.solidSvg(K.slabOf({x: -30, y: -150, w: 120, d: 180, r: 3}, -2, 2, P, 8, 0.8), {tone: 'hi', halo: true});
// a wall panel turned to face the walker (its face is the plane through the button, normal -F)
const FACE = add(BUTTON, mul(F, 1.6));
const PANEL_F = G.frameOf(FACE, F, L, [0, 0, 1]);
const PANEL = K.solidSvg(G.prismOf(PANEL_F, [[-16, -BUTTON[2]], [16, -BUTTON[2]], [16, 72 - BUTTON[2]], [-16, 72 - BUTTON[2]]], 0, 5, P), {tone: 'hi', halo: true});
const BUTTON_SVG = K.solidSvg(G.disc(0, 1.6, 2.6, G.frameAlong(FACE, mul(F, -1)), P), {tone: 'hi', lit: true});

const pose = (t: number): Pose => {
  if (t < STOP) return walk(t, {yaw: YAW, speed: SPEED});
  const w = walk(STOP, {yaw: YAW, speed: SPEED});
  const settle: Pose = {
    ...stand(STOP_AT, YAW),
    footL: [w.footL[0], w.footL[1], 4],
    footR: [w.footR[0], w.footR[1], 4],
  };
  const k1 = EASE.inOut(Math.min(1, (t - STOP) / 0.45));
  const base = lerpPose(w, settle, k1);
  // reach 2.9–3.6 s, press with a spring 3.6–4.2 s, finger poses during the close-up, release after 5.4 s
  const k2 = EASE.inOut(Math.max(0, Math.min(1, (t - 2.9) / 0.7)) - Math.max(0, Math.min(1, (t - 5.6) / 0.6)));
  const push = t > 3.6 && t < 5.6 ? 1.2 * (spring(t - 3.6, {stiffness: 140, damping: 9}) - spring(t - 4.4, {stiffness: 140, damping: 12})) : 0;
  const wrist = add(add(BUTTON, mul(F, -14 + push)), mul(L, 2.4)); // index: palm 6.5 + finger 7.2 + tip, lined up with the button
  let fingers = HAND_POSES.press;
  if (t > 4.4) fingers = lerpFingers(HAND_POSES.press, HAND_POSES.open, EASE.inOut(Math.min(1, (t - 4.4) / 0.4)));
  if (t > 4.9) fingers = lerpFingers(HAND_POSES.open, HAND_POSES.point, EASE.inOut(Math.min(1, (t - 4.9) / 0.4)));
  return reach(base, 'L', wrist, k2, fingers, F);
};

export const AnatomyCharacterSample: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const s = solve(pose(t));
  const body = drawCharacter(s, P, OUTFITS.plain);
  // camera: follows the walk, then pushes in on the hand and pulls back
  const root = s.pelvis;
  const wide = camOn(boxCorners(toRoom(add(root, [-14, -14, -38]), U), [28 / U, 28 / U, 80 / U]), 0.7, [540, 720]);
  const close = camOn([BUTTON, add(BUTTON, mul(F, -20)), add(BUTTON, [0, 0, 7]), add(BUTTON, [0, 0, -7])].map((p) => toRoom(p, U)), 0.6, [540, 720]);
  const k = interpolate(t, [3.7, 4.3, 5.4, 6.0], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE.inOut,
  });
  const cam = lerpCam(wide, close, k);
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={FLOOR} />
        <g className="ns">
          <Kit svg={PANEL + BUTTON_SVG} />
          <Kit svg={body.svg} />
        </g>
      </RoomSvg>
    </AnatomyStage>
  );
};

/** Three roles by clothing and props (clerk, worker, lab) and the sitting pose. */
export const AnatomyCastSample: React.FC = () => {
  const people: [Pose, keyof typeof OUTFITS][] = [
    [stand([0, 0, 0], Math.PI / 4), 'clerk'],
    [stand([0, -34, 0], Math.PI / 4), 'worker'],
    [sit([10, -78, 21], -Math.PI / 4), 'lab'], // side on, so the thighs and knees read
  ];
  const stool = K.solidSvg(K.cylinder(10, -78, 7, 18, 3, P, 32, 0.4), {tone: 'hi'}) + K.solidSvg(K.cylinder(10, -78, 1.6, 0, 18, P, 24, 0.2), {tone: 'mid'});
  const drawn = people.map(([p, o]) => {
    const sk = solve(p);
    return {
      key: K.depthOf(p.root, P),
      svg: drawCharacter(sk, P, OUTFITS[o]).svg,
    };
  });
  drawn.push({key: K.depthOf([10, -78, 10], P) - 0.01, svg: stool});
  drawn.sort((a, b) => a.key - b.key);
  const cam = camOn(boxCorners(toRoom([-14, -96, 0], U), [40 / U, 110 / U, 80 / U]), 0.8, [540, 720]);
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={K.solidSvg(K.slabOf({x: -24, y: -104, w: 56, d: 124, r: 3}, -2, 2, P, 8, 0.8), {tone: 'hi', halo: true})} />
        <g className="ns">
          {drawn.map((d, i) => (
            <Kit key={i} svg={d.svg} />
          ))}
        </g>
      </RoomSvg>
    </AnatomyStage>
  );
};
