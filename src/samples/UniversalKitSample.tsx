import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as K from '../vendor/anatomy/iso-kit';
import {A, Assembly, Point3} from '../lib/assembly';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, Cam, camFit, RoomSvg, safeRect} from '../lib/camera';
import {P3} from '../lib/iso';
import {crowd, figure, queue, stream} from '../lib/crowd';
import {faceMatrix, screenCorners} from '../lib/device';
import {flowDots, note} from '../lib/money';
import {particles} from '../lib/nature';
import {planOf, simplify} from '../lib/primitives/mapTable';
import {ScaleLayers, scaleView} from '../lib/scale';
import {bloomStates, CATALOG, levitate, sink, sparks, trapdoorStates} from '../lib/symbols';

// every symbol is shown in the state its catalog row names (`show`): the state in which it reads
const SHOW = (id: keyof typeof CATALOG.symbols) => CATALOG.symbols[id].show;
import {cutaway, peel, pullOut, swap, zoomInto} from '../lib/transitions';
import {describe} from '../theme/materials';
import {UNI_P, UNI_U} from './kit/projection';
import {CHRON} from './kit/chron.parts';
import {CROWD} from './kit/crowd.parts';
import {BALANCE, DATA} from './kit/data.parts';
import {MONITOR, MONITOR_SCREEN, PHONE, PHONE_SCREEN} from './kit/device.parts';
import {DOCS} from './kit/docs.parts';
import {FRUIT} from './kit/fruit.parts';
import {MAP_TABLE} from './kit/map.parts';
import {SWATCHES} from './kit/materials.parts';
import {CASH} from './kit/money.parts';
import {LAB} from './kit/nature.parts';
import {BLOOM, STORM, TANGLE} from './kit/symbols.parts';

// Showcase of the universal kit (MASTER_PROMPT_FINAL §24): frame N shows page N, framed by camFit in the safe rect.
// Every exported builder of the kit is called here (scripts/regress-checks.mjs refuses one that is not: code that no
// sample runs is code nobody has seen), and scripts/style-check.mjs compares these frames with styles/anatomy/refs.
// Illustrative geometry and values, not a topic.
type Page = {id: string; A: Assembly; svg: () => string; cam?: () => Cam; node?: () => React.ReactNode};
const plain = (id: string, a: Assembly): Page => ({id, A: a, svg: () => a.svg()});
const P = UNI_P;
const T = 30; // the lab bench top

/** The box round every recorded solid of an object, in room units (for camFit). */
const boxOf = (a: Assembly): [P3, P3] => {
  const b = (a.R.solids as unknown[]).map((s) => A.boundsOf(s) as {min: Point3; max: Point3});
  const min = [0, 1, 2].map((k) => Math.min(...b.map((x) => x.min[k]))) as Point3;
  const max = [0, 1, 2].map((k) => Math.max(...b.map((x) => x.max[k]))) as Point3;
  const lo = toRoom(min, UNI_U);
  const hi = toRoom(max, UNI_U);
  return [lo, [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]];
};
const frame = (a: Assembly) => camFit(boxCorners(...boxOf(a)), {rect: safeRect(), fill: 0.86});

// people: a queue, a stream and one figure lifted by happiness, in one group
const people = (() => {
  const g = new Assembly('people', P, {role: 'secondary'});
  crowd(g, queue([[0, 0, 0], [60, 0, 0]], 5, 10, 0), {prefix: 'q'});
  crowd(g, stream([[0, 30, 0], [70, 30, 0]], 4, 1.2), {prefix: 's', lit: 1});
  figure(g, 'happy', {at: [30, 55, levitate(2, 0.5, 9, 6).lift * SHOW('levitation')], yaw: 0});
  return g;
})();

// the interface on the phone screen: literal layout blocks (a status bar, three list rows, a button) mapped onto the
// face; their text would go on a frontal panel pinned to the screen corners
const UI = (() => {
  const s = PHONE_SCREEN;
  const m = faceMatrix(P, s.o, s.u, s.v, 360, 760);
  const c = screenCorners(s).map((p) => K.iso(p, P));
  const rows = [0, 1, 2].map((i) => `<rect x="24" y="${120 + i * 120}" width="312" height="90" rx="14" fill="none" stroke="currentColor" stroke-width="5"/>`).join('');
  return `<g class="iso-line" style="color:var(--anatomy-mid)"><g transform="${m}"><rect x="24" y="40" width="312" height="40" rx="10" fill="none" stroke="currentColor" stroke-width="5"/>${rows}<rect x="80" y="620" width="200" height="70" rx="35" fill="none" stroke="currentColor" stroke-width="6"/></g></g><path d="M${c.map((p) => p.join(',')).join('L')}Z" fill="none" stroke="none"/>`;
})();

// a scale chain: the lab bench (outer) and, on it, the fruit bowl model (inner, 4 times smaller)
const SCALE = [
  {id: 'bench', label: 'стол', box: boxOf(LAB), inner: {at: toRoom([20, 10, T], UNI_U), factor: 4}, draw: () => <Kit svg={LAB.svg()} />},
  {id: 'bowl', label: 'ваза', box: boxOf(FRUIT), draw: () => <Kit svg={FRUIT.svg()} />},
];

const burner: [P3, P3] = [toRoom([44, 8, T], UNI_U), toRoom([16, 16, 26], UNI_U)];

export const KIT_PAGES: Page[] = [
  plain('fruit', FRUIT),
  plain('data', DATA),
  plain('balance', BALANCE),
  plain('docs', DOCS),
  plain('map', MAP_TABLE),
  plain('chron', CHRON),
  {id: 'storm', A: STORM.A, svg: () => STORM.svg(SHOW('storm'), 0.2)},
  {id: 'tangle', A: TANGLE.A, svg: () => TANGLE.svg(SHOW('tangle'))},
  // the flower half open, with a burst of sparks (they join the flower's depth order as moving parts)
  {id: 'bloom', A: BLOOM, svg: () => BLOOM.svg({}, {extra: sparks(P, [0, 0, 46], SHOW('sparks'))})},
  // the same flower half open: a state build, framed by the open flower's box (each page frames what it shows)
  {id: 'bloomhalf', A: BLOOM, svg: () => bloomStates('bloomHalf', P, [0, 0, 0])(0.5)},
  // the hatch open (closed, it reads as plain floor): the state the catalog shows
  {id: 'trapdoor', A: BLOOM, svg: () => trapdoorStates('trapdoor', P, [0, 0, 0])(Math.min(SHOW('trapdoor'), sink(1.2, 0, 9, 10).open)), cam: () => camFit(boxCorners([0, 0, -2], [6, 4, 3]), {rect: safeRect(), fill: 0.86})},
  plain('crowd', CROWD),
  plain('people', people),
  {id: 'phone', A: PHONE, svg: () => PHONE.svg() + UI},
  {id: 'monitor', A: MONITOR, svg: () => MONITOR.svg() + `<g data-screen="${MONITOR_SCREEN.u[0]}"></g>`},
  // drops thrown off a coin stack top (drops next to a body read as rivets: they are shown in open air)
  {id: 'drops', A: CASH, svg: () => CASH.svg({}, {extra: particles(P, 'drops', {at: [20, 0, 12], spread: 1}, 0.45)})},
  // money moving: dots run along a pipe route over the stacks
  {id: 'cash', A: CASH, svg: () => CASH.svg() + flowDots(P, [[-4, -6, 2], [24, -6, 2], [24, 20, 2]], 0.5) + (() => {
    const extra = new Assembly('loose', P);
    note(extra, 'note', [30, 14, 0], {lit: false});
    return extra.svg();
  })()},
  // fire under the flask and steam above it, ordered against the bench by ray tests
  {id: 'lab', A: LAB, svg: () => LAB.svgFaded([...particles(P, 'fire', {at: [52, 16, T + 11.6], spread: 0.8}, 1.4), ...particles(P, 'steam', {at: [52, 16, T + 26], spread: 1.5}, 1.4), ...particles(P, 'gas', {at: [30, 24, T + 6]}, 1)])},
  {id: 'swatches', A: SWATCHES, svg: () => SWATCHES.svg() + `<title>${describe(['wood', 'metal', 'glass'])}</title>`},
  // transitions: a section of the archive half cut away with its drawer peeled out; a zoom half way into the burner
  {id: 'cutaway', A: DOCS, svg: () => DOCS.svg(peel(['drawer', 'stamp'], 0.5), {hide: cutaway(DOCS, [0, 0, 1], 48, 6, 0.3)}) + `<g opacity="${swap(0.5).in.toFixed(2)}"></g>`},
  {id: 'zoom', A: LAB, svg: () => LAB.svg(), cam: () => zoomInto(boxOf(LAB), burner, 0.5).cam},
  {id: 'pullout', A: LAB, svg: () => LAB.svg(), cam: () => pullOut(burner, boxOf(LAB), 0.3).cam},
  {id: 'scale', A: LAB, svg: () => '', node: () => <ScaleLayers layers={scaleView(SCALE, 0.6).layers} />, cam: () => scaleView(SCALE, 0.6).cam},
  // the map helpers: a plan point of the projection and a simplified ring drawn on the table top
  {id: 'mapplan', A: MAP_TABLE, svg: () => MAP_TABLE.svg() + K.lineSvg(K.onTop(simplify([[0, 0], [10, 0.2], [20, 0], [20, 10], [0, 10]].map(([a, b]) => planOf([[0, 0], [30, 20]], 90, 60)([a, b])), 0.5), 29.4, P, true), {tone: 'lo'})},
];

export const UniversalKitSample: React.FC = () => {
  const page = KIT_PAGES[Math.min(KIT_PAGES.length - 1, useCurrentFrame())];
  const cam = page.cam ? page.cam() : frame(page.A);
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>{page.node ? page.node() : <Kit svg={page.svg()} />}</RoomSvg>
    </AnatomyStage>
  );
};
