import React from 'react';
import {Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {AnatomyStage, Kit} from '../../lib/anatomy';
import {RoomSvg} from '../../lib/camera';
import {FrontalLayer, Word} from '../../components/Frontal';
import {FORMAT} from '../../theme/format';
import {BOARD} from './board.parts';
import {SchemeView} from './SchemeFrames';
import {REEL_SFX, reelState} from './reel.motion';
import SFX_LEAD from '../../../scripts/sfx-lead.json';

// Silent test reel of STOP 2: scenes 5–6 («визуальное превью без диктора»). The state of every frame is reel.motion.ts
// (read by scripts/motion-check.mjs); this file only draws it and places the sound accents (no music, no voice).
const lead = SFX_LEAD as Record<string, number>;

export const KakRabotaetClaudeReel: React.FC = () => {
  const s = reelState(useCurrentFrame());
  return (
    <>
      {s.loc === 'board' ? (
        <AnatomyStage>
          <RoomSvg cam={s.board.cam} top={380} bottom={1060} sides={140} fade={110}>
            <Kit svg={BOARD.svg({}, {extra: s.board.extra, hide: (n) => s.board.hide.has(n)})} />
          </RoomSvg>
          <FrontalLayer>
            {s.board.words.map((w) => (
              <Word key={w.name} at={w.at} text={w.text} size={w.size} angle={s.board.angle} show={w.show ?? 1} />
            ))}
          </FrontalLayer>
        </AnatomyStage>
      ) : (
        <SchemeView state={s.scheme} />
      )}
      {REEL_SFX.map((e, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(e.at * FORMAT.fps) - (lead[e.file] ?? 0))} name={`sfx ${e.file}`} layout="none">
          <Audio src={staticFile(e.file)} volume={e.volume} />
        </Sequence>
      ))}
    </>
  );
};
