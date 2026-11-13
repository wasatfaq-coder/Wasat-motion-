import React from 'react';
import {Composition} from 'remotion';
import {FORMAT} from './theme/format';
import {Main, mainSchema, MainProps, selectedScenes} from './Main';
import {Cover, coverSchema} from './Cover';
import {AnatomyStyleSample} from './samples/AnatomyStyleSample';
import {AnatomyKitSample} from './samples/AnatomyKitSample';
import {AnatomyCastSample, AnatomyCharacterSample, AnatomyGaitSample} from './samples/AnatomyCharacterSample';

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Main"
    component={Main}
    schema={mainSchema}
    width={FORMAT.width}
    height={FORMAT.height}
    fps={FORMAT.fps}
    durationInFrames={1}
    defaultProps={{muteVoice: false, hideCaptions: false, onlyScenes: []} as MainProps}
    calculateMetadata={({props}) => ({
      durationInFrames: selectedScenes(props.onlyScenes).reduce((a, s) => a + s.durationInFrames, 0),
    })}
  />
  {/* style sample for new topics (MASTER_PROMPT_FINAL §22) */}
  <Composition id="AnatomyStyle" component={AnatomyStyleSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={240} />
  <Composition id="AnatomyKit" component={AnatomyKitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={240} />
  <Composition id="AnatomyCharacter" component={AnatomyCharacterSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={420} />
  <Composition id="AnatomyGait" component={AnatomyGaitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={300} />
  <Composition id="AnatomyCast" component={AnatomyCastSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} />
  {/* topic compositions: scripts/new-topic.mjs inserts new topics above this line */}
  <Composition id="Cover" component={Cover} schema={coverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  </>
);
