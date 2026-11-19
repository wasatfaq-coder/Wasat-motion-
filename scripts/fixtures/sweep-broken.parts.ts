import {Assembly, G} from '../../src/lib/assembly';
import {anatomyProjection} from '../../src/lib/anatomy';

// A deliberately broken state-dependent object for `object-audit --selftest`: a lid on a top-edge hinge whose thickness
// swings into the box wall as it opens (the trapdoor defect). The audit must report it through stateSweep.
const P = anatomyProjection(10);
const box = (open: number) => {
  const A = new Assembly('lid', P, {role: 'environment'});
  A.slab('wall', {x: 0, y: 0, w: 2, d: 10, r: 0.2}, 0, 10, {ground: true});
  const a = open * 1.4;
  const along: [number, number, number] = [Math.cos(a), 0, -Math.sin(a)];
  const F = {o: [2, 0, 10] as [number, number, number], a: [-Math.sin(a), 0, -Math.cos(a)] as [number, number, number], u: [0, 1, 0] as [number, number, number], v: along};
  A.prism('lid', F, [[0, 0], [10, 0], [10, 8], [0, 8]], 0, 2, {});
  void G;
  return A;
};
export const stateSweep = {lid: box};
