import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme/tokens';
import {beat, SceneData} from '../lib/timeline';
import {EASE, progress} from '../lib/anim';
import {lerpCam} from './RoomScene';
import {CAM_TRAY} from './Scene01Hook';
import {HOOK_CARDS, plainCards, RoomStage, Sheet, TRAY_TOP} from './stage';
import {SurveyChart} from './SurveyChart';

/** Scene 3: the survey. A sheet unfolds out of the memory tray into a frontal chart: people on the age axis, flat short-interval lines. */
export const Scene03Survey: React.FC<{scene: SceneData}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + scene.from) / fps;
  const people = beat(scene, 'people');
  const month = beat(scene, 'month');
  const open = progress(frame, fps, 0, 0.9, EASE.inOut);
  const cam = lerpCam({...CAM_TRAY, zoom: 2.4, screen: [484, 960]}, {...CAM_TRAY, zoom: 1.6, screen: [484, 900]}, open);
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.bg}}>
      <div style={{opacity: interpolate(open, [0, 1], [1, 0.25])}}>
        <RoomStage cam={cam} t={t} cards={plainCards(HOOK_CARDS)} />
      </div>
      <Sheet p={open} from={TRAY_TOP(HOOK_CARDS)}>
        <SurveyChart
          axesP={progress(frame, fps, 0.5, 0.5)}
          dotsP={interpolate(frame, [people - 30, people + 1.2 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
          countP={interpolate(frame, [people - 40, people + 0.6 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out})}
          linesP={interpolate(frame, [month - 1.4 * fps, month + 0.3 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
          decadeP={0}
          peakP={0}
          smallP={0}
        />
      </Sheet>
    </AbsoluteFill>
  );
};
