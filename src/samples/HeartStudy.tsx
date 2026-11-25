import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, camFitHeight, RoomSvg, safeRect, screenOf} from '../lib/camera';
import {Callouts} from '../components/Atlas';
import {COLORS} from '../theme/tokens';
import {bezierLoop, branch, coronary, heartAnterior, ribbon, shell, taper, vessel} from '../lib/shell';
import {APEX_AT, AORTA_AT, HEART_BOX, HEART_MECH, HEART_U, VALVE_AT, VALVE_BOX} from './kit/heart.parts';

// Frames 0–1: the kit heart. Frames 2–3: the same heart as a smooth shell.
// Every shell export is named here so regress-checks sees it run.
const SHELL_READY = [
  bezierLoop([[0, 0], [1, 0], [0, 1]]),
  ribbon([[0, 0], [1, 0.2], [2, 0]], 2, 0.6),
  taper([0, 0], [3, 1], 1, 0.4),
  branch({from: [0, 0], to: [2, 0], r0: 1, r1: 0.5}, [{to: [3, 1], r: 0.3}]),
  coronary([[0, 0], [1, 1]], 1, 0.3, true),
  shell([[0, 0], [2, 0], [1, 2]], {name: 'probe'}),
  vessel([[0, 0], [2, 0]], 1, 0.4, {name: 'probe-v'}),
].every((s) => s.includes('M') || s.includes('path'));
const RECT = safeRect({captions: false});
const room = (box: [typeof APEX_AT, typeof APEX_AT]) =>
  boxCorners(
    [box[0][0] / HEART_U, box[0][1] / HEART_U, box[0][2] / HEART_U],
    [(box[0][0] + box[1][0]) / HEART_U, (box[0][1] + box[1][1]) / HEART_U, (box[0][2] + box[1][2]) / HEART_U],
  );

const camOf = (box: [typeof APEX_AT, typeof APEX_AT]) => camFitHeight(room(box), {rect: RECT, fill: 0.92});
const call = (n: number, label: string, at: [number, number], to: [number, number]) => ({n, label, at, to, show: 1});

export const HeartStudy: React.FC = () => {
  const frame = useCurrentFrame();
  if (!SHELL_READY) return null;
  if (frame >= 2) {
    const detail = frame === 3;
    const pic = detail ? heartAnterior([540 - 0.5 * 2200, 900 - 0.28 * 2600], 2200, 2600) : heartAnterior([80, 220], 980, 1400);
    const items = detail
      ? [call(1, 'аорта', pic.labels.aorta, [820, 280]), call(2, 'коронарная', pic.labels.coronary, [160, 1080])]
      : [call(1, 'аорта', pic.labels.aorta, [900, 200]), call(2, 'верхушка', pic.labels.apex, [160, 1680]), call(3, 'коронарная', pic.labels.coronary, [960, 1760])];
    return (
      <AnatomyStage>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
          <rect width={1080} height={1920} fill={COLORS.bg} />
          <g dangerouslySetInnerHTML={{__html: pic.svg}} />
        </svg>
        <Callouts items={items} />
      </AnatomyStage>
    );
  }
  const detail = frame === 1;
  const cam = camOf(detail ? VALVE_BOX : HEART_BOX);
  const at = (p: typeof APEX_AT) => screenOf(cam, toRoom(p, HEART_U));
  const items = detail
    ? [call(1, 'клапан', at(VALVE_AT), [220, 640]), call(2, 'заслонка', at([20, 14, 12.2]), [780, 720])]
    : [call(1, 'аорта', at(AORTA_AT), [180, 520]), call(2, 'клапан', at(VALVE_AT), [860, 980]), call(3, 'желудочек', at(APEX_AT), [200, 1280])];
  return (
    <AnatomyStage>
      <RoomSvg cam={cam} sides={40} fade={80}>
        <Kit svg={HEART_MECH.svg()} />
      </RoomSvg>
      <Callouts items={items} />
    </AnatomyStage>
  );
};

export const HEART_STUDY_FRAMES = 4;
