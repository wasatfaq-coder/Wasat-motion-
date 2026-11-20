import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit} from '../../lib/anatomy';
import {RoomSvg} from '../../lib/camera';
import {FrontalLayer, Word} from '../../components/Frontal';
import {onTop} from '../../lib/assembly';
import {DESK} from './desk.parts';
import {PHONE} from './phone.parts';
import {phoneState, PhoneState, wordsOf} from './phone.motion';

// Style frames of the hero phone (STOP 2, scene 1): frame 0 = the phone on its stand with the answer typed up to the
// fifth piece, frame 1 = the push-in to the screen. The state of every frame comes from phone.motion.ts (pure, read by
// scripts/motion-check.mjs); this file only draws it. Chat text = the board's rows (board.parts.ts ROW1, ROW2).
const PhoneView: React.FC<{state: PhoneState}> = ({state}) => {
  const phone = PHONE.svg({}, {hide: (n) => state.hide.has(n), extra: state.extra});
  // the phone stands on the desk: desk first, the whole phone over it
  const picture = onTop(DESK.svg(), [phone], 'the phone stands on the desk top: desk first, phone over it');
  return (
    <AnatomyStage>
      <RoomSvg cam={state.cam}>
        <Kit svg={picture} />
      </RoomSvg>
      <FrontalLayer>
        {wordsOf(state).map((w) => (
          <Word key={w.name} at={w.at} text={w.text} size={w.size} angle={state.angle} />
        ))}
      </FrontalLayer>
    </AnatomyStage>
  );
};

/** Style frames of the phone: frame 0 wide, frame 1 close-up (projects/kak-rabotaet-claude/content/stills.json). */
export const KakRabotaetClaudePhone: React.FC = () => <PhoneView state={phoneState(useCurrentFrame())} />;
