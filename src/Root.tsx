import React from 'react';
import {Composition} from 'remotion';
import {FORMAT} from './theme/format';
import {StressMain, StressSelected} from './projects/stress/Main';
import {StressCover} from './projects/stress/Cover';
import {episodeSchema} from './components/Episode';
import {AnatomyStyleSample} from './samples/AnatomyStyleSample';
import {AnatomyKitSample} from './samples/AnatomyKitSample';
import {KIT_PAGES, UniversalKitSample} from './samples/UniversalKitSample';
import {AnatomyCoverSample} from './samples/AnatomyCoverSample';
import {DELIVERY_PAGES, DeliverySample} from './samples/DeliverySample';
import {KETTLE_FRAMES, KettleSketch} from './samples/KettleSketch';
import {anatomyCoverSchema} from './components/AnatomyCover';
import {AnatomyCastSample, AnatomyCharacterSample, AnatomyGaitSample} from './samples/AnatomyCharacterSample';
import {HEART_STUDY_FRAMES, HeartStudy} from './samples/HeartStudy';

export const RemotionRoot: React.FC = () => (
  <>
  {/* the kit showcase and samples (MASTER_PROMPT_FINAL v3.0, «Набор и витрина») */}
  <Composition id="AnatomyStyle" component={AnatomyStyleSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={240} />
  <Composition id="AnatomyKit" component={AnatomyKitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={240} />
  <Composition id="AnatomyUniversal" component={UniversalKitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={KIT_PAGES.length} />
  <Composition id="AnatomyDelivery" component={DeliverySample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={DELIVERY_PAGES} />
  <Composition id="KettleSketch" component={KettleSketch} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={KETTLE_FRAMES} />
  <Composition id="AnatomyCharacter" component={AnatomyCharacterSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={420} />
  <Composition id="AnatomyGait" component={AnatomyGaitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={300} />
  <Composition id="AnatomyCoverSample" component={AnatomyCoverSample} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  <Composition id="AnatomyCast" component={AnatomyCastSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} />
  <Composition id="HeartStudy" component={HeartStudy} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={HEART_STUDY_FRAMES} />
  <Composition
    id="StressMain"
    component={StressMain}
    schema={episodeSchema}
    width={FORMAT.width}
    height={FORMAT.height}
    fps={FORMAT.fps}
    durationInFrames={1}
    defaultProps={{muteVoice: true, hideCaptions: false, onlyScenes: []}}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, StressSelected(props.onlyScenes).reduce((a, s) => a + s.durationInFrames, 0))})}
  />
  <Composition id="StressCover" component={StressCover} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  {/* topic compositions: scripts/new-topic.mjs inserts new topics above this line */}
  </>
);
