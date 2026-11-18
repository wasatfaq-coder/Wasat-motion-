import {toRoom} from '../../lib/anatomy';
import {boxCorners} from '../../lib/camera';
import {CoverSpec} from '../../lib/coverLayout';
import {Point3} from '../../lib/assembly';
import {P3} from '../../lib/iso';
import {AX, AY, PLATE_TOP, STAND, STAND_U, commutatorItems, loopItems, wireItems} from './stand.parts';

// Three covers from the built field stand (parts-plan §6). The cutaway motor of variant A is not built yet,
// so A shows the stand's wire — the only hero that exists — with the title already written in the plan.
// cover.json stays unchosen: the user still picks. Coral is the conductor, already in the picture, so the title is not coral.
const R = (p: Point3): P3 => toRoom(p, STAND_U);
const box = (min: Point3, size: Point3): P3[] => boxCorners(R(min), [size[0] / STAND_U, size[1] / STAND_U, size[2] / STAND_U]);
const FLOOR = {x: -1, y: -1, w: 14, d: 10};

const wireArt = STAND.svg({}, {extra: wireItems(), hide: (n) => /axis|bearing/.test(n)});
const loopArt = STAND.svg({}, {extra: [...loopItems(Math.PI / 6), ...commutatorItems(Math.PI / 6)]});
const halfArt = STAND.svg({}, {extra: [...loopItems(0.35), ...commutatorItems(0.35)]});

export const COVERS: Record<'a' | 'b' | 'c', CoverSpec> = {
  a: {
    technique: 'gap',
    hook: 'коралловый провод между магнитами, и не видно, что его толкает',
    lines: ['Что крутит', 'вал?'],
    layout: 'top',
    art: wireArt,
    frame: box([AX - 22, AY - 20, PLATE_TOP + 2], [44, 40, 30]),
    hero: box([AX - 5, AY - 5, PLATE_TOP + 8], [10, 10, 24]),
    floor: FLOOR,
    crop: 1.18,
  },
  b: {
    technique: 'contrast',
    hook: 'коралловая рамка между двумя магнитами, стороны рамки противоположны',
    lines: ['Толкает', 'провод'],
    layout: 'top',
    art: loopArt,
    frame: box([AX - 22, AY - 20, PLATE_TOP + 6], [44, 40, 32]),
    hero: box([AX - 10, AY - 10, PLATE_TOP + 16], [20, 20, 16]),
    floor: FLOOR,
    crop: 1.12,
  },
  c: {
    technique: 'incomplete',
    hook: 'два полукольца коллектора с зазором между ними',
    lines: ['Две', 'половинки'],
    layout: 'top',
    art: halfArt,
    frame: box([AX - 18, AY - 16, PLATE_TOP], [36, 32, 24]),
    hero: box([AX - 8, AY - 8, PLATE_TOP + 3], [16, 16, 12]),
    floor: FLOOR,
    crop: 1.16,
  },
};
