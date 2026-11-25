import {storm, tangle} from '../../lib/symbols';
import {P} from './proj';
import KEYS from './symbols.parts.keys.json';

// Storm over the heart, not on it. No bolts: anger is not this topic's coral meaning.
const cloud = storm('cloud', P, [-16, -8, 18], {scale: 0.34});
const ball = tangle('ball', P, [22, 22, 8], {r: 4.2, cord: 0.42, loops: 16, core: true});

export const CLOUD = cloud.A.applyKeys((KEYS as {CLOUD: Record<string, number>}).CLOUD);
export const BALL = ball.A.applyKeys((KEYS as {BALL: Record<string, number>}).BALL);
export const cloudSvg = (state = 0.7) => cloud.svg(state);
export const ballSvg = (state = 1) => ball.svg(state);
