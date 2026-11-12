import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE} from '../lib/anim';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage, Sheet, TRAY_TOP} from './stage';
import {SurveyChart} from './SurveyChart';

/** Scene 4: the decade question. A coral line rises to about 50 and stays level; a bracket marks that the rise is modest. */
export const Scene04Decade: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const faster = beat(scene, 'faster');
  const peak = beat(scene, 'peak');
  const small = beat(scene, 'small');
  const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
  // the sheet folds back into the tray at the end of the scene
  const close = interpolate(frame, [scene.durationInFrames - 0.8 * fps, scene.durationInFrames], [0, 1], {...clamp, easing: EASE.inOut});
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <div style={{opacity: interpolate(close, [0, 1], [0.25, 1])}}>
        <RoomStage cam={{...CAM_TRAY, zoom: interpolate(close, [0, 1], [1.6, 2.2]), screen: [484, 900]}} t={t} cards={plainCards(HOOK_CARDS)} />
      </div>
      <Sheet p={1 - close} from={TRAY_TOP(HOOK_CARDS)}>
        <SurveyChart
          axesP={1}
          dotsP={1}
          countP={1}
          linesP={1}
          dimShort={interpolate(frame, [faster - 30, faster], [0, 1], clamp)}
          decadeP={interpolate(frame, [faster - 1.0 * fps, faster + 0.5 * fps], [0, 1], clamp)}
          peakP={interpolate(frame, [peak - 6, peak + 12], [0, 1], {...clamp, easing: EASE.overshoot})}
          smallP={interpolate(frame, [small - 6, small + 18], [0, 1], clamp)}
        />
      </Sheet>
    </AbsoluteFill>
  );
};
