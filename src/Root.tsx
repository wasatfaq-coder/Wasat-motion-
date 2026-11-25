import React from 'react';
import {Composition} from 'remotion';
import {FORMAT} from './theme/format';
import {AnatomyStyleSample} from './samples/AnatomyStyleSample';
import {AnatomyKitSample} from './samples/AnatomyKitSample';
import {KIT_PAGES, UniversalKitSample} from './samples/UniversalKitSample';
import {AnatomyCoverSample} from './samples/AnatomyCoverSample';
import {DELIVERY_PAGES, DeliverySample} from './samples/DeliverySample';
import {KETTLE_FRAMES, KettleSketch} from './samples/KettleSketch';
import {ATLAS_SKETCH_FRAMES, AtlasTableSketch} from './samples/AtlasTableSketch';
import {KettleStudy} from './samples/KettleStudy';
import {KETTLE_DEMO_FRAMES, KETTLE_FPS, KettleDemo} from './samples/KettleDemo';
import {anatomyCoverSchema} from './components/AnatomyCover';
import {AnatomyCastSample, AnatomyCharacterSample, AnatomyGaitSample} from './samples/AnatomyCharacterSample';

export const RemotionRoot: React.FC = () => (
  <>
  {/* the kit showcase and samples (MASTER_PROMPT_FINAL v3.0, «Набор и витрина») */}
  <Composition id="AnatomyStyle" component={AnatomyStyleSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={240} />
  <Composition id="AnatomyKit" component={AnatomyKitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={240} />
  <Composition id="AnatomyUniversal" component={UniversalKitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={KIT_PAGES.length} />
  <Composition id="AnatomyDelivery" component={DeliverySample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={DELIVERY_PAGES} />
  <Composition id="KettleSketch" component={KettleSketch} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={KETTLE_FRAMES} />
  <Composition id="AtlasTableSketch" component={AtlasTableSketch} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={ATLAS_SKETCH_FRAMES} />
  <Composition id="KettleDemo" component={KettleDemo} width={FORMAT.width} height={FORMAT.height} fps={KETTLE_FPS} durationInFrames={KETTLE_DEMO_FRAMES} />
  <Composition id="KettleStudy" component={KettleStudy} width={FORMAT.width} height={FORMAT.height} fps={30} durationInFrames={3} />
  <Composition id="AnatomyCharacter" component={AnatomyCharacterSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={420} />
  <Composition id="AnatomyGait" component={AnatomyGaitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={300} />
  <Composition id="AnatomyCoverSample" component={AnatomyCoverSample} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  <Composition id="AnatomyCast" component={AnatomyCastSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} />
  {/* topic compositions: scripts/new-topic.mjs inserts new topics above this line */}
  </>
);
