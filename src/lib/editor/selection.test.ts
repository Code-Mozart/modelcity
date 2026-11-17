import { describe, expect, it } from 'vitest';
import {
  afterBox,
  afterNodeClick,
  afterSegmentClick,
  afterVoidClick,
  applyDelta,
  deltaOf,
  NOTHING,
  sameSelection,
  selectionName,
  withNodes,
  withoutNodes,
  type Selection,
} from './selection';

const sel = (...ids: number[]): Selection => new Set(ids);
const list = (s: Selection) => [...s];

describe('the selection as a set (^1257)', () => {
  it('adds and takes out nodes without changing what it was given', () => {
    const s = sel(1, 2);
    expect(list(withNodes(s, [2, 3]))).toEqual([1, 2, 3]);
    expect(list(withoutNodes(s, [1]))).toEqual([2]);
    expect(list(s)).toEqual([1, 2]);
  });

  it('is the same selection whatever the order the nodes were picked in', () => {
    expect(sameSelection(sel(1, 2), sel(2, 1))).toBe(true);
    expect(sameSelection(sel(1, 2), sel(1, 3))).toBe(false);
  });
});

describe('a click on a node (^71, ^72, ^774)', () => {
  it('selects just it, also instead of what was selected', () => {
    expect(list(afterNodeClick(NOTHING, 4, false))).toEqual([4]);
    expect(list(afterNodeClick(sel(1, 2, 4), 4, false))).toEqual([4]);
    expect(list(afterNodeClick(sel(1, 2), 4, false))).toEqual([4]);
  });

  it('with Shift adds a node that is not selected, and takes out one that is', () => {
    expect(list(afterNodeClick(sel(1), 4, true))).toEqual([1, 4]);
    expect(list(afterNodeClick(sel(1, 4), 4, true))).toEqual([1]);
  });
});

describe('a click on a segment (^74, ^690, ^691)', () => {
  it('selects its two nodes, with Shift adds them or, if both are selected, takes them out', () => {
    expect(list(afterSegmentClick(sel(9), [1, 2], false))).toEqual([1, 2]);
    expect(list(afterSegmentClick(sel(9), [1, 2], true))).toEqual([9, 1, 2]);
    expect(list(afterSegmentClick(sel(1), [1, 2], true))).toEqual([1, 2]);
    expect(list(afterSegmentClick(sel(1, 2, 9), [1, 2], true))).toEqual([9]);
  });
});

describe('a click on nothing and a box (^75, ^684, ^495, ^685)', () => {
  it('deselects all; with Shift the selection stays', () => {
    expect(afterVoidClick(sel(1, 2), false)).toBe(NOTHING);
    expect(list(afterVoidClick(sel(1, 2), true))).toEqual([1, 2]);
    expect(afterVoidClick(NOTHING, false)).toBe(NOTHING);
  });

  it('a box selects the nodes inside it; with Shift it adds them to what was selected before it began', () => {
    expect(list(afterBox(sel(9), [1, 2], false))).toEqual([1, 2]);
    expect(list(afterBox(sel(9), [1, 2], true))).toEqual([9, 1, 2]);
    // The box shrinks: the nodes that left it are not selected any more.
    expect(list(afterBox(sel(9), [1], true))).toEqual([9, 1]);
  });
});

describe('the name of a selection step (^216)', () => {
  it.each([
    [[1], [1, 2, 3], 'select 2 nodes'],
    [[], [4], 'select node'],
    [[1, 2], [1], 'deselect node'],
    [[1, 2, 3], [1], 'deselect 2 nodes'],
    [[1, 2], [], 'deselect all'],
  ])('%j to %j is %s', (before, after, name) => {
    expect(selectionName(sel(...before), sel(...after))).toBe(name);
  });
});

describe('what a step changed in the selection (^1257)', () => {
  it('goes both ways: done, and undone', () => {
    const [before, after] = [sel(1, 2, 3), sel(2, 3, 4, 5)];
    const delta = deltaOf(before, after);
    expect(delta).toEqual({ added: [4, 5], removed: [1] });
    expect(sameSelection(applyDelta(before, delta), after)).toBe(true);
    expect(sameSelection(applyDelta(after, delta, true), before)).toBe(true);
  });
});
