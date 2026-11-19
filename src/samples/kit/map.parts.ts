import {Assembly} from '../../lib/assembly';
import {UNI_P as P} from './projection';
import {mapTable, route} from '../../lib/primitives/mapTable';
import KEYS from './map.parts.keys.json';
const keyed = <T extends Assembly>(A: T, k: string) => A.applyKeys((KEYS as Record<string, Record<string, number>>)[k]) as T;

// ── map: a relief table with invented regions, a coral route and pins at its stops
const map = new Assembly('map', P, {role: 'secondary'});
const blobRing = (cx: number, cy: number, rx: number, ry: number, seed: number): [number, number][] =>
  Array.from({length: 18}, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const k = 1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.cos(a * 5 + seed * 2);
    return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)];
  });
const MAP = mapTable(map, [0, 0, 0], {
  w: 90,
  d: 60,
  bounds: [
    [0, 0],
    [30, 20],
  ],
  regions: [
    {id: 'a', ring: blobRing(6, 14, 4.5, 3.5, 0.2), height: 2},
    {id: 'b', ring: blobRing(15, 13, 4, 4, 1.4), height: 3.5},
    {id: 'c', ring: blobRing(24, 14, 4.2, 3.6, 2.2), height: 1.6},
    {id: 'd', ring: blobRing(9, 5, 4.6, 3.4, 3.1), height: 2.6},
    {id: 'e', ring: blobRing(21, 5, 5, 3.4, 4.4), height: 4.2},
  ],
});
const STOPS: [number, number][] = [
  [6, 14],
  [15, 13],
  [21, 5],
];
export const ROUTE_HEADS = route(map, 'route', MAP, STOPS);
export const MAP_TABLE = keyed(map, 'MAP_TABLE');
export const MAP_INFO = MAP;

