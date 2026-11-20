import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {chatUi, faceDisc, faceDyn, facePoint, facePrism, leanFrame, phoneStand, roundRect, standingPhone} from '../../lib/device';
import KEYS from './standphone.parts.keys.json';

// ── a phone standing on a desk stand, its screen turned to the viewer, a messenger on it (device.ts: leanFrame,
// phoneStand, standingPhone, chatUi). Illustrative layout, not a topic. The last answer chip is the coral piece: the
// page hides the static chip and draws it as a moving part (faceDyn), as a scene does while the answer is typed.
const sp = new Assembly('standphone', P, {role: 'secondary'});
const F = leanFrame([0, 0, 8]);
phoneStand(sp, F);
const ph = standingPhone(sp, F);
export const STANDPHONE_SCREEN = ph.screen;
/** an illustrative answer, one chip per word, each chip as wide as its word (1 kit unit a letter + padding) */
export const STANDPHONE_WORDS = ['как', 'дела', 'у', 'тебя', 'сегодня'];
export const STANDPHONE_CHIPS = chatUi(sp, ph.screen, STANDPHONE_WORDS.map((w) => w.length + 0.8), {chipH: 1.6});
// a date pill over the question and three «typing» dots under the answer: blocks a scene adds with the face helpers
facePrism(sp, ph.screen, 'date', roundRect(4.6, 4.75, 8.0, 5.0, 0.12), 0.04, {tone: 'lo'});
for (let i = 0; i < 3; i++) faceDisc(sp, ph.screen, `typing${i}`, 1.3 + i * 0.7, 16.2, 0.22, 0.04, {tone: 'mid'});
export const STANDPHONE = sp.applyKeys((KEYS as Record<string, Record<string, number>>).STANDPHONE);

const last = STANDPHONE_CHIPS.length - 1;
/** The coral chip (the piece the answer ends with) as a moving part, and its name to hide in the static picture. */
export const standphoneCoral = () => faceDyn(P, STANDPHONE_SCREEN, `${STANDPHONE_CHIPS[last].name}.dyn`, STANDPHONE_CHIPS[last].poly, {lit: true});
export const STANDPHONE_CORAL_PART = `standphone.${STANDPHONE_CHIPS[last].name}`;
/** Points on the chips for frontal words (Frontal Word); `dx` along the chip row (to measure the screen's scale). */
export const standphoneWordAt = (i: number, dx = 0) => facePoint(STANDPHONE_SCREEN, STANDPHONE_CHIPS[i].x + dx, STANDPHONE_CHIPS[i].y, 0.1);
