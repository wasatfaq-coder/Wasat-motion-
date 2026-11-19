import React from 'react';
import {useCurrentFrame} from 'remotion';
import * as K from '../vendor/anatomy/iso-kit';
import {A, Assembly, Point3} from '../lib/assembly';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {Cam, camFitSvg, RoomSvg, safeRect} from '../lib/camera';
import {P3} from '../lib/iso';
import {crowd, figure, queue, stream} from '../lib/crowd';
import {screenCorners} from '../lib/device';
import {flowDots} from '../lib/money';
import {particles} from '../lib/nature';
import {planOf, simplify} from '../lib/primitives/mapTable';
import {intrusions, ScaleLayers, scaleView} from '../lib/scale';
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
// coral: the one coral meaning the page shows, or 'none: <reason>'; bleed: why environment may run past the safe rect.
// scripts/style-check.mjs checks every frame against these (scripts/lib/frame-checks.mjs).
type Page = {id: string; A: Assembly; svg: () => string; cam?: () => Cam; node?: () => React.ReactNode; coral?: string; bleed?: string};
const NO_CORAL = 'none: a kit object without a topic meaning';
const plain = (id: string, a: Assembly, coral = NO_CORAL): Page => ({id, A: a, svg: () => a.svg(), coral});
const P = UNI_P;
const T = 30; // the lab bench top

/** The box round every recorded solid of an object, in room units (for camFit). */
/** The box of each recorded solid of an object, in room units (what a nested scale model must not stand inside). */
export const solidBoxes = (a: Assembly): [P3, P3][] =>
  (a.R.solids as unknown[]).map((s) => {
    const b = A.boundsOf(s) as {min: Point3; max: Point3};
    const lo = toRoom(b.min, UNI_U);
    const hi = toRoom(b.max, UNI_U);
    return [lo, [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]];
  });
export const boxOf = (a: Assembly): [P3, P3] => {
  const b = (a.R.solids as unknown[]).map((s) => A.boundsOf(s) as {min: Point3; max: Point3});
  const min = [0, 1, 2].map((k) => Math.min(...b.map((x) => x.min[k]))) as Point3;
  const max = [0, 1, 2].map((k) => Math.max(...b.map((x) => x.max[k]))) as Point3;
  const lo = toRoom(min, UNI_U);
  const hi = toRoom(max, UNI_U);
  return [lo, [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]];
};
// a page is framed by what it draws (every path point), not by the axis box of its solids: that box is wider than a
// round body and misses what a page adds beside the object (docs/root-causes.md)
const frame = (svg: string) => camFitSvg(svg, {rect: safeRect(), fill: 0.86});

// people: a queue, a stream and one figure lifted by happiness, in one group
const people = (() => {
  const g = new Assembly('people', P, {role: 'secondary'});
  crowd(g, queue([[0, 0, 0], [40, 0, 0]], 5, 10, 0), {prefix: 'q'});
  crowd(g, stream([[0, 24, 0], [44, 24, 0]], 4, 1.2), {prefix: 's'});
  // the lifted figure is the coral one (its meaning), with its contact patch on the floor under it
  figure(g, 'happy', {at: [22, 44, levitate(2, 0.5, 9, 6).lift * SHOW('levitation')], yaw: 0, lit: true});
  return g;
})();

// the interface is drawn on each device's screen part (the `ui` option, src/lib/device.ts screenUi); the screen's
// corners bound frontal text panels (screenCorners)
const SCREEN_OK = screenCorners(PHONE_SCREEN).length === 4 && screenCorners(MONITOR_SCREEN).length === 4;

// the free spot on the bench top for the inner model (scaleView refuses a spot inside a solid)
export const SCALE_SPOT: P3 = toRoom([30, 14, T], UNI_U);
// scaleView also refuses it; the sample shows how a topic tests a candidate spot before using it
export const SCALE_SPOT_FREE = intrusions([SCALE_SPOT, [1, 1, 1]], solidBoxes(LAB)).length === 0;

// a scale chain: the lab bench (outer) and, on it, the fruit bowl model (inner, 4 times smaller)
const SCALE = [
  {id: 'bench', label: 'стол', box: boxOf(LAB), inner: {at: SCALE_SPOT, factor: 4}, occupied: solidBoxes(LAB), draw: () => <Kit svg={LAB.svg()} />},
  {id: 'bowl', label: 'ваза', box: boxOf(FRUIT), draw: () => <Kit svg={FRUIT.svg()} />},
];

const burner: [P3, P3] = [toRoom([44, 8, T], UNI_U), toRoom([16, 16, 26], UNI_U)];

export const KIT_PAGES: Page[] = [
  plain('fruit', FRUIT),
  plain('data', DATA, 'the one bar the voice would name'),
  plain('balance', BALANCE, 'the heavier pan'),
  plain('docs', DOCS),
  plain('map', MAP_TABLE, 'the one region'),
  plain('chron', CHRON, 'none: the event sign is too small to carry a meaning on a long timeline (the topic frames the event closer)'),
  // t = 0.06 s: two of the three bolts strike at once (each flickers in its own window)
  {id: 'storm', coral: 'the bolts', A: STORM.A, svg: () => STORM.svg(SHOW('storm'), 0.06)},
  {id: 'tangle', coral: NO_CORAL, A: TANGLE.A, svg: () => TANGLE.svg(SHOW('tangle'))},
  // the flower in its catalog show state, with a burst of sparks (they join the flower's depth order as moving parts)
  {id: 'bloom', coral: NO_CORAL, A: BLOOM, svg: () => BLOOM.svg({}, {extra: sparks(P, [0, 0, 46], SHOW('sparks'))})},
  // the same flower half open: a state build, framed by the open flower's box (each page frames what it shows)
  {id: 'bloomhalf', coral: NO_CORAL, A: BLOOM, svg: () => bloomStates('bloomHalf', P, [0, 0, 0])(0.5)},
  // the hatch open (closed, it reads as plain floor): the state the catalog shows
  {id: 'trapdoor', coral: NO_CORAL, A: BLOOM, svg: () => trapdoorStates('trapdoor', P, [0, 0, 0])(Math.min(SHOW('trapdoor'), sink(1.2, 0, 9, 10).open))},
  plain('crowd', CROWD, 'the one person picked out'),
  plain('people', people, 'the person lifted by happiness'),
  {id: 'phone', coral: NO_CORAL, A: PHONE, svg: () => (SCREEN_OK ? PHONE.svg() : '')},
  {id: 'monitor', coral: NO_CORAL, A: MONITOR, svg: () => MONITOR.svg()},
  // drops thrown off a coin stack top (drops next to a body read as rivets: they are shown in open air)
  {id: 'drops', coral: 'the stack the drops come off', A: CASH, svg: () => CASH.svg({}, {extra: particles(P, 'drops', {at: [20, 0, 12], spread: 1}, 0.45)})},
  // money moving: dots run along a pipe route over the stacks
  {id: 'cash', coral: 'the coin stack', A: CASH, svg: () => CASH.svg({}, {extra: [{name: 'flow', at: [24, -6, 2], svg: flowDots(P, [[-4, -6, 2], [24, -6, 2], [24, 20, 2]], 0.5), annotation: true}]})},
  // fire under the flask and steam above it, ordered against the bench by ray tests
  {id: 'lab', coral: 'none: a burner flame is a few pixels when the whole bench is framed; the zoom page shows it', A: LAB, svg: () => LAB.svgFaded([...particles(P, 'fire', {at: [52, 16, T + 11.6], spread: 1, rate: 24}, 1.4), ...particles(P, 'steam', {at: [52, 16, T + 31], spread: 1.5}, 1.4), ...particles(P, 'gas', {at: [30, 24, T + 6]}, 1)])},
  {id: 'swatches', coral: NO_CORAL, A: SWATCHES, svg: () => SWATCHES.svg({}, {extra: [{name: 'title', at: [0, 0, 0], svg: `<title>${describe(['wood', 'metal', 'glass'])}</title>`, annotation: true}]})},
  // transitions: a section of the archive half cut away with its drawer peeled out; a zoom most of the way into the burner (the pull-out page shows the start of the way back)
  {id: 'cutaway', coral: NO_CORAL, A: DOCS, svg: () => DOCS.svg(peel(['drawer', 'stamp'], 0.5), {hide: cutaway(DOCS, [0, 0, 1], 48, 6, 0.3), extra: [{name: 'swap', at: [0, 0, 0], svg: `<g opacity="${swap(0.5).in.toFixed(2)}"></g>`, annotation: true}]})},
  {id: 'zoom', coral: 'the flame', bleed: 'a zoom into the burner: the bench runs past the frame', A: LAB, svg: () => LAB.svgFaded(particles(P, 'fire', {at: [52, 16, T + 11.6], spread: 1, rate: 24}, 1.4, {lit: true})), cam: () => zoomInto(boxOf(LAB), burner, 1).cam},
  {id: 'pullout', coral: NO_CORAL, bleed: 'a pull-out from the burner: the bench runs past the frame', A: LAB, svg: () => LAB.svg(), cam: () => pullOut(burner, boxOf(LAB), 0.75).cam},
  {id: 'scale', coral: NO_CORAL, bleed: 'a scale step: the outer bench runs past the frame', A: LAB, svg: () => '', node: () => <ScaleLayers layers={scaleView(SCALE, 0.6).layers} />, cam: () => scaleView(SCALE, 0.6).cam},
  // the map helpers: a plan point of the projection and a simplified ring drawn on the table top
  {id: 'mapplan', coral: 'the one region', A: MAP_TABLE, svg: () => MAP_TABLE.svg({}, {extra: [{name: 'plan', at: [45, 30, 29.4], annotation: true, svg: K.lineSvg(K.onTop(simplify([[0, 0], [10, 0.2], [20, 0], [20, 10], [0, 10]].map(([a, b]) => planOf([[0, 0], [30, 20]], 90, 60)([a, b])), 0.5), 29.4, P, true), {tone: 'lo'})}]})},
];

export const UniversalKitSample: React.FC = () => {
  const page = KIT_PAGES[Math.min(KIT_PAGES.length - 1, useCurrentFrame())];
  const cam = page.cam ? page.cam() : frame(page.svg());
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>{page.node ? page.node() : <Kit svg={page.svg()} />}</RoomSvg>
    </AnatomyStage>
  );
};
