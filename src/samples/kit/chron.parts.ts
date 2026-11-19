import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {carriage, gear, gearPlate, link, rail, station} from '../../lib/primitives/timeline';
import KEYS from './chron.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── chronicle: a rail of 100 years, four stations, a carriage at the first, a gear pair linking two events
const chron = new Assembly('chron', P, {role: 'secondary', order: ['carriage'], allow: [['chron.gear.a', 'chron.gear.b']], crowd: [['chron.link', 'chron.rail.*']]});
const R = rail(chron, [0, 0, 0], {from: 1900, to: 2000, perYear: 1.2});
export const STATIONS = [
  {id: 's1', year: 1905},
  {id: 's2', year: 1930},
  {id: 's3', year: 1957},
  {id: 's4', year: 1991},
].map((s) => station(chron, s, R.xOf, R.y0, 0));
carriage(chron, R.xOf(1905), R.y0, R.top, R.xOf(1991) - R.xOf(1905));
const plateTop = gearPlate(chron, 'gearplate', [R.xOf(1930) - 9, R.y0 + 26, 0], 28, 16);
gear(chron, 'gear.a', [R.xOf(1930), R.y0 + 34, plateTop], {r: 6, teeth: 12, h: 2});
gear(chron, 'gear.b', [R.xOf(1930) + 6 + 4, R.y0 + 34, plateTop], {r: 4, teeth: 8, h: 2, phase: Math.PI / 8});
link(chron, 'link', STATIONS[1].top, STATIONS[2].top);
export const CHRON = keyed(chron, 'CHRON');
export const RAIL = R;

