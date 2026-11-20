import React from 'react';
import {Composition} from 'remotion';
import {FORMAT} from './theme/format';
import {Main, mainSchema, MainProps, selectedScenes} from './Main';
import {Cover, coverSchema} from './Cover';
import {KakRabotaetClaudeMain, KakRabotaetClaudeSelected} from './projects/kak-rabotaet-claude/Main';
import {KakRabotaetClaudeCover} from './projects/kak-rabotaet-claude/Cover';
import {KakRabotaetClaudePhone} from './projects/kak-rabotaet-claude/PhoneFrames';
import {KakRabotaetClaudeBoard} from './projects/kak-rabotaet-claude/BoardFrames';
import {KakRabotaetClaudeScheme} from './projects/kak-rabotaet-claude/SchemeFrames';
import {ElektromotorMain, ElektromotorSelected} from './projects/elektromotor/Main';
import {ElektromotorCover} from './projects/elektromotor/Cover';
import {episodeSchema} from './components/Episode';
import {AnatomyStyleSample} from './samples/AnatomyStyleSample';
import {AnatomyKitSample} from './samples/AnatomyKitSample';
import {KIT_PAGES, UniversalKitSample} from './samples/UniversalKitSample';
import {AnatomyCoverSample} from './samples/AnatomyCoverSample';
import {anatomyCoverSchema} from './components/AnatomyCover';
import {AnatomyCastSample, AnatomyCharacterSample, AnatomyGaitSample} from './samples/AnatomyCharacterSample';
import {ElektromotorReel, ElektromotorStand, REEL_FRAMES} from './projects/elektromotor/StandFrames';
import {ElektromotorMotor} from './projects/elektromotor/MotorFrames';

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
  <Composition id="AnatomyUniversal" component={UniversalKitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={KIT_PAGES.length} />
  <Composition id="AnatomyCharacter" component={AnatomyCharacterSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={420} />
  <Composition id="AnatomyGait" component={AnatomyGaitSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={300} />
  <Composition id="AnatomyCoverSample" component={AnatomyCoverSample} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  <Composition id="AnatomyCast" component={AnatomyCastSample} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} />
  <Composition
    id="ElektromotorMain"
    component={ElektromotorMain}
    schema={episodeSchema}
    width={FORMAT.width}
    height={FORMAT.height}
    fps={FORMAT.fps}
    durationInFrames={1}
    defaultProps={{muteVoice: false, hideCaptions: false, onlyScenes: []}}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, ElektromotorSelected(props.onlyScenes).reduce((a, s) => a + s.durationInFrames, 0))})}
  />
  <Composition id="ElektromotorCover" component={ElektromotorCover} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  <Composition id="ElektromotorMotor" component={ElektromotorMotor} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={4} />
  <Composition id="ElektromotorStand" component={ElektromotorStand} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={4} />
  <Composition id="ElektromotorReel" component={ElektromotorReel} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={REEL_FRAMES} />
  <Composition
    id="KakRabotaetClaudeMain"
    component={KakRabotaetClaudeMain}
    schema={episodeSchema}
    width={FORMAT.width}
    height={FORMAT.height}
    fps={FORMAT.fps}
    durationInFrames={1}
    defaultProps={{muteVoice: false, hideCaptions: false, onlyScenes: []}}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, KakRabotaetClaudeSelected(props.onlyScenes).reduce((a, s) => a + s.durationInFrames, 0))})}
  />
  <Composition id="KakRabotaetClaudeCover" component={KakRabotaetClaudeCover} schema={anatomyCoverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  <Composition id="KakRabotaetClaudeBoard" component={KakRabotaetClaudeBoard} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={3} />
  <Composition id="KakRabotaetClaudeScheme" component={KakRabotaetClaudeScheme} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={6} />
  <Composition id="KakRabotaetClaudePhone" component={KakRabotaetClaudePhone} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={2} />
  {/* topic compositions: scripts/new-topic.mjs inserts new topics above this line */}
  <Composition id="Cover" component={Cover} schema={coverSchema} width={FORMAT.width} height={FORMAT.height} fps={FORMAT.fps} durationInFrames={1} defaultProps={{variant: 'a' as const}} />
  </>
);
