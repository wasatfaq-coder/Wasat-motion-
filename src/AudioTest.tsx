import {AbsoluteFill, staticFile} from 'remotion';
import {Audio} from '@remotion/media';

// Route check: a voice file plays inside a composition.
export const AudioTest: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: 'white'}}>
    <Audio src={staticFile('audio/vo/scene-01.mp3')} />
  </AbsoluteFill>
);
