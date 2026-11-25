import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Assembly} from '../lib/assembly';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, camFit, RoomSvg} from '../lib/camera';
import {Atmos, AtmosField} from '../components/Atmos';
import {kettleCoil, kettleInside, kettleShell, KC, kitchen, mug, P, U, Z0} from './kettle.parts';

// A study of the kettle alone: frame 0 closed, frame 1 translucent (an x-ray, like a glass kettle), frame 2 close-up of the top.
export const KettleStudy: React.FC = () => {
  const f = useCurrentFrame();
  const scene = new Assembly('k.scene', P, {role: 'hero'});
  kitchen(scene);
  kettleInside(scene, KC, Z0 + 2.4);
  const coil = new Assembly('k.coil', P, {role: 'hero'});
  kettleCoil(coil, KC, Z0 + 2.4, {coilOn: f !== 2});
  if (f === 0) mug(scene, 62, 20);
  const shell = new Assembly('k.shell', P, {role: 'hero'});
  kettleShell(shell, KC, Z0 + 2.4, {coilOn: f !== 2});
  const opacity = f === 1 ? 0.3 : 1;
  const svg = scene.svg() + coil.svg() + `<g opacity="${opacity}">${shell.svg()}</g>`;
  const lo = toRoom([14, 2, Z0], U);
  const size = toRoom([f === 2 ? 22 : 44, f === 2 ? 22 : 36, f === 2 ? 22 : 40], U);
  const cam = camFit(boxCorners(f === 2 ? toRoom([23, 9, Z0 + 20], U) : lo, size), {rect: {x0: 70, x1: 900, y0: 400, y1: 1450}, fill: 0.9});
  return (
    <AnatomyStage>
      <RoomSvg cam={cam} fade={70} sides={60} top={300} bottom={1500} under={<AtmosField hero={[480, 960]} />}>
        <Kit svg={svg} />
      </RoomSvg>
      <Atmos />
    </AnatomyStage>
  );
};
