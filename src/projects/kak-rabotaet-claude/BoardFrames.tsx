import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit} from '../../lib/anatomy';
import {RoomSvg} from '../../lib/camera';
import {FrontalLayer, Plate} from '../../components/Frontal';
import {BOARD} from './board.parts';
import {boardState, EXAMPLE, labelAt, PROB, LABEL_SIZE} from './board.motion';
import {LABELLED} from './board.parts';

// Style frames of the token board (STOP 2, scenes 2–4); the state of every frame is board.motion.ts (read by motion-check),
// this file only draws it. `only` is a debug filter (a name prefix of the parts to draw).
export const KakRabotaetClaudeBoard: React.FC<{only?: string}> = ({only}) => {
  const frame = useCurrentFrame();
  const s = boardState(frame);
  const picture = BOARD.svg({}, {extra: s.extra, hide: (n) => s.hide.includes(n) || (!!only && !n.startsWith(`board.${only}`))});
  return (
    <AnatomyStage>
      <RoomSvg cam={s.cam} bottom={1170} sides={60} fade={80}>
        <Kit svg={picture} />
      </RoomSvg>
      <FrontalLayer>
        {LABELLED.map((l, i) => {
          const {at, to} = labelAt(s, i);
          return <Plate key={l.label} at={at} to={to} text={l.label} size={LABEL_SIZE} show={s.labels} />;
        })}
        <Plate at={EXAMPLE.at} text={EXAMPLE.text} size={EXAMPLE.size} show={s.labels} />
        <Plate at={PROB.at} text={PROB.text} size={PROB.size} show={s.prob} />
      </FrontalLayer>
    </AnatomyStage>
  );
};
