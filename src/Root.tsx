import React from 'react';
import {Composition} from 'remotion';
import {FORMAT} from './theme/format';
import {Main, mainSchema, MainProps, selectedScenes} from './Main';

export const RemotionRoot: React.FC = () => (
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
);
