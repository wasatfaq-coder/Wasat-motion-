import {Assembly, G} from '../../src/lib/assembly';
import {anatomyProjection} from '../../src/lib/anatomy';

// Deliberately broken objects for `node scripts/object-audit.mjs --selftest` (docs/root-causes.md): one per root
// cause that Assembly.lint() must catch in seconds. Each export name is the lint keyword the selftest expects.
// Not a *.parts.ts under src/, so the normal audit never reads it.
const P = anatomyProjection(10);
const up = (x: number, y: number, z: number) => G.frameAlong([x, y, z], [0, 0, 1]);
const make = (name: string) => new Assembly(name, P, {role: 'environment'});

// a rod running through a coaxial collar
export const through = make('through');
through.cyl('base', 0, 0, 5, 0, 2, {ground: true});
through.turned('rod', [[0, 1], [20, 1]], up(0, 0, 2), {meta: {owner: 'base'}});
through.ring('collar', 8, 9, 1, 1.8, up(0, 0, 2), {meta: {owner: 'base'}});

// a ring round a smaller coaxial body inside its span (soil in a pot rim)
export const encircled = make('encircled');
encircled.cyl('pot', 0, 0, 6, 0, 8, {ground: true});
encircled.ring('rim', 8, 10, 5, 6.5, up(0, 0, 0), {meta: {owner: 'pot'}});
encircled.cyl('soil', 0, 0, 4.5, 8.5, 1, {meta: {owner: 'pot'}});

// a pipe end on a part that shares the pipe's owner
export const mount = make('mount');
mount.slab('front', {x: 0, y: 0, w: 6, d: 1, r: 0.2}, 0, 6, {ground: true, meta: {owner: 'drawer'}});
mount.pipe('handle', [[1, 1, 3], [1, 3, 3], [5, 3, 3], [5, 1, 3]], 0.4, {bend: 1.2, meta: {owner: 'drawer'}});

// a thick hose ending on a thin round tube (the end's rim cannot sit within ±0.15)
export const terminal = make('terminal');
terminal.cyl('post', 0, 0, 1, 0, 10, {ground: true});
terminal.pipe('hose', [[12, 0, 5], [1.05, 0, 5]], 0.9);

// a tight right-angle corner whose outline folds over itself on screen
export const selfOverlap = make('selfOverlap');
selfOverlap.slab('base', {x: 0, y: 0, w: 20, d: 20, r: 1}, 0, 1, {ground: true});
selfOverlap.pipe('cable', [[2, 2, 1.4], [2, 16, 1.4], [16, 16, 1.4]], 0.7, {bend: 0.2, limp: true, ends: [false, false]});

// a rise followed by a run towards the viewer: the line turns back on itself on screen (a step along the line of sight)
export const fold = make('fold');
fold.slab('base', {x: 0, y: 0, w: 20, d: 20, r: 1}, 0, 1, {ground: true});
fold.pipe('cable', [[2, 2, 1.4], [2, 2, 12], [14, 14, 12]], 0.5, {bend: 1.3, limp: true, ends: [false, false]});

// an owner name that names no part (a builder name that already starts with the object's own name)
export const owner = make('owner');
owner.slab('owner.column', {x: 0, y: 0, w: 4, d: 4, r: 0.4}, 0, 10, {ground: true});
owner.cyl('hinge', 2, 2, 1, 10, 1, {meta: {owner: 'owner.colum'}});

// a cable lying on the floor that runs straight at the viewer: on screen it is a vertical stick
export const view = make('view');
view.slab('base', {x: 0, y: 0, w: 24, d: 24, r: 1}, 0, 1, {ground: true});
view.pipe('cable', [[2, 2, 1.5], [18, 18, 1.5]], 0.5, {limp: true, ends: [false, false]});
