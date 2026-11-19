import React from 'react';
import {useCurrentFrame} from 'remotion';
import {A, Assembly, Point3} from '../lib/assembly';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, camFit, RoomSvg, safeRect} from '../lib/camera';
import {P3} from '../lib/iso';
import {UNI_U} from './kit/projection';
import {CHRON} from './kit/chron.parts';
import {CROWD} from './kit/crowd.parts';
import {BALANCE, DATA} from './kit/data.parts';
import {MONITOR, PHONE} from './kit/device.parts';
import {DOCS} from './kit/docs.parts';
import {FRUIT} from './kit/fruit.parts';
import {MAP_TABLE} from './kit/map.parts';
import {CASH} from './kit/money.parts';
import {LAB} from './kit/nature.parts';
import {BLOOM, STORM, TANGLE} from './kit/symbols.parts';
import {trapdoor} from '../lib/symbols';
import {UNI_P} from './kit/projection';

// Showcase of the universal kit (MASTER_PROMPT_FINAL §24): frame N shows object N, framed by camFit in the safe rect.
// The audited builds of src/samples/kit; scripts/style-check.mjs renders these frames and compares them with the
// reference stills in styles/anatomy/refs. Illustrative geometry and values, not a topic.
type Page = {id: string; A: Assembly; svg: () => string};
const plain = (id: string, a: Assembly): Page => ({id, A: a, svg: () => a.svg()});

export const KIT_PAGES: Page[] = [
  plain('fruit', FRUIT),
  plain('data', DATA),
  plain('balance', BALANCE),
  plain('docs', DOCS),
  plain('map', MAP_TABLE),
  plain('chron', CHRON),
  {id: 'storm', A: STORM.A, svg: () => STORM.svg(1, 0.2)},
  {id: 'tangle', A: TANGLE.A, svg: () => TANGLE.svg(1)},
  plain('bloom', BLOOM),
  // the hatch is shown open: closed, it reads as plain floor (the audited build is the closed one)
  plain('trapdoor', trapdoor('trapdoor', UNI_P, [0, 0, 0], 0.75)),
  plain('crowd', CROWD),
  plain('phone', PHONE),
  plain('monitor', MONITOR),
  plain('cash', CASH),
  plain('lab', LAB),
];

/** The box round every recorded solid of an object, in room units (for camFit). */
const boxOf = (a: Assembly): [P3, P3] => {
  const b = (a.R.solids as unknown[]).map((s) => A.boundsOf(s) as {min: Point3; max: Point3});
  const min = [0, 1, 2].map((k) => Math.min(...b.map((x) => x.min[k]))) as Point3;
  const max = [0, 1, 2].map((k) => Math.max(...b.map((x) => x.max[k]))) as Point3;
  const lo = toRoom(min, UNI_U);
  const hi = toRoom(max, UNI_U);
  return [lo, [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]];
};

export const UniversalKitSample: React.FC = () => {
  const frame = useCurrentFrame();
  const page = KIT_PAGES[Math.min(KIT_PAGES.length - 1, frame)];
  const cam = camFit(boxCorners(...boxOf(page.A)), {rect: safeRect(), fill: 0.86});
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={page.svg()} />
      </RoomSvg>
    </AnatomyStage>
  );
};
