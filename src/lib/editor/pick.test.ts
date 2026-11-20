import { describe, expect, it } from 'vitest';
import { edge, loaded, node } from '../testing/loadedMap';
import { afterClick, nodesOf, pick, reachOf, type Hover } from './pick';
import type { Selection } from './selection';

const sel = (...ids: number[]): Selection => new Set(ids);
/** The scale at which the reach of a mouse is 5 m. */
const AT = { scale: 9 / 5, touch: false };
const map = loaded([node(1, 0, 0), node(2, 100, 0), node(3, 100, 3)], [edge(7, 1, 2)]);

describe('what the pointer is on (^1257, ^883)', () => {
  it('is a node before a segment, and a segment before nothing', () => {
    expect(pick(map, { x: 1, y: 1 }, AT)).toEqual({ kind: 'node', id: 1 });
    expect(pick(map, { x: 50, y: 2 }, AT)).toEqual({ kind: 'segment', edge: 7, nodes: [1, 2] });
    expect(pick(map, { x: 50, y: 40 }, AT)).toBeNull();
  });

  it('is the node where a node and a segment are both near', () => {
    // Node 3 is 3 m from the segment: with a reach of 5 m both are near.
    expect(pick(map, { x: 100, y: 2 }, AT)).toEqual({ kind: 'node', id: 3 });
  });

  it('has a reach in meters that is a number of pixels, a larger one for a finger', () => {
    expect(reachOf(false, 2)).toBeCloseTo(4.5);
    expect(reachOf(true, 2)).toBeGreaterThan(reachOf(false, 2));
    expect(reachOf(false, 0.5)).toBeCloseTo(18);
  });
});

describe('what a click does to the selection (^71 to ^75, ^690, ^691)', () => {
  const node1: Hover = { kind: 'node', id: 1 };
  const seg: Hover = { kind: 'segment', edge: 7, nodes: [1, 2] };

  it.each<[string, Hover | null, boolean, number[], number[]]>([
    ['a node', node1, false, [4, 5], [1]],
    ['a node with Shift', node1, true, [4, 5], [4, 5, 1]],
    ['a selected node with Shift', node1, true, [1, 4], [4]],
    ['a segment', seg, false, [4], [1, 2]],
    ['a segment with Shift', seg, true, [4], [4, 1, 2]],
    ['a segment whose nodes are selected, with Shift', seg, true, [1, 2, 4], [4]],
    ['nothing', null, false, [1, 2], []],
    ['nothing with Shift', null, true, [1, 2], [1, 2]],
  ])('on %s', (...[, on, shift, before, after]) => {
    expect([...afterClick(sel(...before), on, shift)]).toEqual(after);
  });

  it('says which nodes a hover would pick', () => {
    expect(nodesOf(node1)).toEqual([1]);
    expect(nodesOf(seg)).toEqual([1, 2]);
    expect(nodesOf(null)).toEqual([]);
  });
});
