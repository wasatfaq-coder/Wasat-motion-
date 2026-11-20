import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit, toRoom} from '../../lib/anatomy';
import {camFit, Cam, RoomSvg, screenOf} from '../../lib/camera';
import {FrontalLayer, Plate} from '../../components/Frontal';
import {Dyn} from '../../lib/assembly';
import {BOARD, BOARD_U, barDyn, BAR_SHARES, CANDIDATES, GAP, LABELLED, ROW1, ROW1_Y, ROW2, ROW2_TYPED, ROW2_Y, rowXs, tileAnchor, tileDyn, TILE_H, cellMid, ROWS_CORNERS, PANEL_H, boardPoint, TRAY_X0} from './board.parts';

// Style frames of the token board (STOP 2, scenes 2–4). frame 0 = scene 2 (rows cut, three labels, the example plate),
// frame 1 = scene 3 (the column of candidates with bars), frame 2 = scene 4 (a candidate flies to the end of row 2).
// Pure state per frame; the moving tiles are Dyn parts drawn as `extra` of the board.
type View = {extra: Dyn[]; hide: string[]; labels: number; cam: Cam};

const stateOf = (f: number): Omit<View, 'cam'> => {
  const x1 = rowXs(ROW1, GAP);
  const x2 = rowXs(ROW2, GAP);
  if (f === 0) return {extra: [], hide: [], labels: 1};
  if (f === 1) return {extra: [], hide: [], labels: 0};
  // frame 2: candidate 1 («лучше» is not the longest bar) in flight to the 6th place; the old coral tile turns plain
  const k = 1;
  const t = 0.55;
  const from = {x: TRAY_X0 + 1.2, y: cellMid(k) - TILE_H / 2};
  const to = {x: x2[ROW2_TYPED], y: ROW2_Y};
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const fly = tileDyn('fly', lerp(from.x, to.x), lerp(from.y, to.y) + 3.2 * Math.sin(Math.PI * t), CANDIDATES[k].text, {n0: 3, lit: true});
  const stays = tileDyn('tile2.4', x2[ROW2_TYPED - 1], ROW2_Y, ROW2[ROW2_TYPED - 1].text);
  void x1;
  return {extra: [fly, stays, ...BAR_SHARES.flatMap((s, i) => barDyn(i, i === k ? s : s * 0.8))], hide: ['board.tile2.4', `board.cand${k}`, ...BAR_SHARES.flatMap((_, i) => [`board.bar${i}`, `board.barcap${i}`])], labels: 0};
};

const viewOf = (f: number): View => {
  const s = stateOf(f);
  // frame 0 holds the rows, frames 1–2 the end of row 2 and the tray (the part of BOARD_BOX where the action is)
  const region = f === 0 ? ROWS_CORNERS : [12, 63].flatMap((x) => [2, PANEL_H].flatMap((y) => [boardPoint(x, y, 0), boardPoint(x, y, 3.6)]));
  const cam = camFit(region.map((p) => toRoom(p, BOARD_U)), {fill: 0.96});
  return {...s, cam};
};

export const KakRabotaetClaudeBoard: React.FC<{only?: string}> = ({only}) => {
  const frame = useCurrentFrame();
  const v = viewOf(Math.min(frame, 2));
  const picture = BOARD.svg({}, {extra: v.extra, hide: (n) => v.hide.includes(n) || (!!only && !n.startsWith(`board.${only}`))});
  const x1 = rowXs(ROW1, GAP);
  const at = (i: number) => screenOf(v.cam, toRoom(tileAnchor(x1[i], ROW1_Y, ROW1[i].text), BOARD_U));
  return (
    <AnatomyStage>
      <RoomSvg cam={v.cam} bottom={1170} sides={60} fade={80}>
        <Kit svg={picture} />
      </RoomSvg>
      <FrontalLayer>
        {LABELLED.map((l, i) => {
          const p = at(l.row1);
          return <Plate key={l.label} at={[[760, 215, 505][i], p[1] - 150]} to={p} text={l.label} size={44} show={v.labels} />;
        })}
      </FrontalLayer>
    </AnatomyStage>
  );
};
