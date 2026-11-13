import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import * as K from '../vendor/anatomy/iso-kit';
import * as LatheKit from '../vendor/anatomy/lathe.mjs';
import {AnatomyStage, anatomyProjection, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, camOn, lerpCam, RoomSvg} from '../lib/camera';
import {add, cornerPath, HAND_POSES, holdInFront, lerpFingers, linePath, mul, Pose, reach, reachShare, sit, solve, stairs, stand, V3, walk, walkPlan, walkTo} from '../lib/rig';
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
const SPEED = 36;
// the walk starts from rest, cruises and stops in double support; it arrives at ARRIVE over STOP_AT
const PLAN = {distance: SPEED * 2.4, speed: SPEED, accel: 0.5, path: linePath([0, 0, 0], YAW)};
const ARRIVE = walkPlan(PLAN).arrive;
const STOP_AT: V3 = PLAN.path(walkPlan(PLAN).end).p;
const T_REACH = ARRIVE + 0.35;
const T_PRESS = T_REACH + 0.7;
const T_OPEN = T_PRESS + 0.8;
const T_POINT = T_OPEN + 0.5;
const T_RELEASE = T_POINT + 0.7;
const BUTTON: V3 = add(add(add(STOP_AT, mul(F, 27)), mul(L, 6)), [0, 0, 49]); // in front of the left shoulder

const FLOOR = K.solidSvg(K.slabOf({x: -30, y: -150, w: 120, d: 180, r: 3}, -2, 2, P, 8, 0.8), {tone: 'hi', halo: true});
// a wall panel turned to face the walker (its face is the plane through the button, normal -F)
const FACE = add(BUTTON, mul(F, 1.6));
const PANEL_F = G.frameOf(FACE, F, L, [0, 0, 1]);
const PANEL = K.solidSvg(G.prismOf(PANEL_F, [[-16, -BUTTON[2]], [16, -BUTTON[2]], [16, 72 - BUTTON[2]], [-16, 72 - BUTTON[2]]], 0, 5, P), {tone: 'hi', halo: true});
const BUTTON_SVG = K.solidSvg(G.disc(0, 1.6, 2.6, G.frameAlong(FACE, mul(F, -1)), P), {tone: 'hi', lit: true});

const pose = (t: number): Pose => {
  const base = walkTo(t, PLAN);
  // reach with anticipation and no overshoot, press with a spring, finger poses during the close-up, release
  const k = t < T_RELEASE ? reachShare(t, T_REACH, 0.7) : 1 - Math.max(0, reachShare(t, T_RELEASE, 0.6));
  const push = t > T_PRESS && t < T_RELEASE ? 1.2 * (spring(t - T_PRESS, {stiffness: 140, damping: 9}) - spring(t - T_PRESS - 0.8, {stiffness: 140, damping: 12})) : 0;
  // open fingers are longer than the pressing index (the middle one reaches 0.7 further): the hand backs off while open
  const open = interpolate(t, [T_OPEN, T_OPEN + 0.3, T_POINT, T_POINT + 0.3], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut});
  const wrist = add(add(BUTTON, mul(F, -14 + push - 3 * open)), mul(L, 2.4)); // index: palm 6.5 + finger 7.2 + tip, lined up with the button
  let fingers = HAND_POSES.press;
  if (t > T_OPEN) fingers = lerpFingers(HAND_POSES.press, HAND_POSES.open, EASE.inOut(Math.min(1, (t - T_OPEN) / 0.4)));
  if (t > T_POINT) fingers = lerpFingers(HAND_POSES.open, HAND_POSES.point, EASE.inOut(Math.min(1, (t - T_POINT) / 0.4)));
  return reach(base, 'L', wrist, k, fingers, F);
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
  const k = interpolate(t, [T_PRESS - 0.1, T_PRESS + 0.5, T_RELEASE - 0.2, T_RELEASE + 0.4], [0, 1, 1, 0], {
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
    [holdInFront(stand([0, 0, 0], Math.PI / 4)), 'clerk'],
    [holdInFront(stand([0, -34, 0], Math.PI / 4)), 'worker'],
    [sit([10, -78, 21], -Math.PI / 4), 'lab'], // side on, so the thighs and knees read
  ];
  const stool = K.solidSvg(K.cylinder(10, -78, 7, 18, 3, P, 32, 0.4), {tone: 'hi'}) + K.solidSvg(K.cylinder(10, -78, 1.6, 0, 18, P, 24, 0.2), {tone: 'mid'});
  const drawn = people.map(([p, o]) => {
    const sk = solve({...p, fingersR: HAND_POSES.hold}); // the right hand closes round the role's tool
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

/** Gait check: one walker turns a corner and stops, another climbs four steps (feet hold their contact). */
const CORNER = {distance: 150, speed: 34, accel: 0.6, path: cornerPath([-50, 40, 0], 0, 50, 34, -1)};
const STAIR_ORIGIN: V3 = [-50, -50, 0];
const STAIRS = stairs(STAIR_ORIGIN, 0, 36, 14, 5, 4);
const STAIR_SVG = [1, 2, 3, 4]
  .map((k) => K.solidSvg(K.slabOf({x: STAIR_ORIGIN[0] + 36 + (k - 1) * 14, y: -64, w: k === 4 ? 72 : 14, d: 28, r: 0.6}, 0, 5 * k, P, 8, 0.5), {tone: 'hi'}))
  .join('');
export const AnatomyGaitSample: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const a = solve(walkTo(t, CORNER));
  const b = solve(walk(t, {speed: 28, path: linePath(STAIR_ORIGIN, 0), ground: STAIRS, lift: 4.5}));
  const people = [a, b].map((sk, i) => ({key: K.depthOf(sk.pelvis, P), svg: drawCharacter(sk, P, i ? OUTFITS.worker : OUTFITS.clerk).svg}));
  people.sort((x, y) => x.key - y.key);
  const cam = camOn(boxCorners(toRoom([-60, -80, 0], U), [150 / U, 140 / U, 80 / U]), 0.95, [540, 720]);
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={K.solidSvg(K.slabOf({x: -70, y: -90, w: 170, d: 150, r: 3}, -2, 2, P, 8, 0.8), {tone: 'hi', halo: true}) + STAIR_SVG} />
        <g className="ns">
          {people.map((p, i) => (
            <Kit key={i} svg={p.svg} />
          ))}
        </g>
      </RoomSvg>
    </AnatomyStage>
  );
};
