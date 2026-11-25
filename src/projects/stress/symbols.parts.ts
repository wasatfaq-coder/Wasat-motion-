import {storm, tangle} from '../../lib/symbols';
import {HOME_PERSON, P} from './proj';
import KEYS from './symbols.parts.keys.json';

// Storm over the person: gathered (state 0.7), no bolts. Bolts are coral only when anger is the topic's meaning.
const cloud = storm('cloud', P, [HOME_PERSON[0], HOME_PERSON[1], 44], {scale: 0.68});
// Tangle beside the chronic pedestal, sitting just above its plinth. Not around the head.
const ball = tangle('ball', P, [50, 46, 10], {r: 6.4, cord: 0.48, loops: 14, core: true});

export const CLOUD = cloud.A.applyKeys((KEYS as {CLOUD: Record<string, number>}).CLOUD);
export const BALL = ball.A.applyKeys((KEYS as {BALL: Record<string, number>}).BALL);
export const cloudSvg = (state = 0.7) => cloud.svg(state);
export const ballSvg = (state = 1) => ball.svg(state);
