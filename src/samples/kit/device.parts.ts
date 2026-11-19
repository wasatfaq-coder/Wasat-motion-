import {Assembly, G} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {faceMatrix, monitor, phone, screenUi} from '../../lib/device';
import KEYS from './device.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── interfaces: a phone lying screen up and a monitor on its stand; the screen rectangles carry the interface
// the phone lies on a charging pad: pad, rim, status light, cable to the floor
const ph = new Assembly('phone', P, {role: 'secondary'});
ph.cyl('pad', 7, 14.5, 10, 0, 1.2, {tone: 'mid', ground: true, bevel: 0.4, shadow: 'hero'});
ph.ring('pad.rim', 0, 0.3, 8.8, 10, G.frameAlong([7, 14.5, 1.2], [0, 0, 1]), {tone: 'lo'});
ph.cyl('pad.led', 7, 24.2, 0.3, 0.5, 0.2, {tone: 'hi', bevel: 0});
// the cable ends in a plug on the table (a cut end hung in the air on the showcase)
ph.slab('pad.plug', {x: 39.4, y: 18.4, w: 4, d: 3, r: 0.6}, 0, 1.2, {tone: 'lo', ground: true, bevel: 0.2});
ph.pipe('pad.cable', [[17, 14.5, 0.6], [24, 14.5, 0.6], [32, 19.9, 0.6], [39.4, 19.9, 0.6]], 0.5, {bend: 3, limp: true});
export const PHONE_SCREEN = phone(ph, [0, 0, 1.2], {ui: (s) => screenUi(P, s)});
export const PHONE = keyed(ph, 'PHONE');
const mo = new Assembly('monitor', P, {role: 'secondary'});
export const MONITOR_SCREEN = // the monitor shows a literal dashboard: a title bar and five bars, drawn on the screen face with faceMatrix
monitor(mo, [0, 0, 0], {
  ui: (s) => {
    const bars = [0.5, 0.75, 0.4, 0.9, 0.6].map((v, i) => `<rect x="${90 + i * 120}" y="${360 - v * 250}" width="70" height="${v * 250}" fill="none" stroke="currentColor" stroke-width="5"/>`).join('');
    return `<g class="iso-line" style="color:var(--anatomy-mid)"><g transform="${faceMatrix(P, s.o, s.u, s.v, 760, 420)}"><rect x="40" y="30" width="680" height="34" rx="10" fill="none" stroke="currentColor" stroke-width="5"/><path d="M60 380L700 380" stroke="currentColor" stroke-width="5"/>${bars}</g></g>`;
  },
});
export const MONITOR = keyed(mo, 'MONITOR');
