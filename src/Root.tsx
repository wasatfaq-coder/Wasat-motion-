import {Composition} from 'remotion';
import {AudioTest} from './AudioTest';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="AudioTest" component={AudioTest} durationInFrames={330} fps={60} width={1080} height={1920} />
  </>
);
