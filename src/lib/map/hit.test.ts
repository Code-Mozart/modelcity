import { describe, expect, it } from 'vitest';
import type { View } from '../camera/view';
import { edge, loaded, node } from '../testing/loadedMap';
import { interactable, nodeAt, nodesInBox, segmentAt } from './hit';

const view = (rot = 0): View => ({ cx: 0, cy: 0, scale: 1, rot, gx: 0, gy: 0 });
const size = { width: 200, height: 200 };

describe('what is under the pointer (^1257)', () => {
  const map = loaded(
    [node(1, 0, 0), node(2, 100, 0), node(3, 10, 4), node(4, 300, 0)],
    [edge(7, 1, 2), edge(8, 2, 4)],
  );

  it('finds the nearest node within reach, and none beyond it', () => {
    expect(nodeAt(map, { x: 1, y: 1 }, 5)?.[0]).toBe(1);
    expect(nodeAt(map, { x: 9, y: 3 }, 5)?.[0]).toBe(3);
    expect(nodeAt(map, { x: 50, y: 50 }, 5)).toBeNull();
  });

  it('finds a node in the next chunk, where the pointer is near the border', () => {
    expect(nodeAt(map, { x: 298, y: 0 }, 5)?.[0]).toBe(4);
  });

  it('finds the segment under the pointer, with its two nodes, also when it crosses chunks', () => {
    const hit = segmentAt(map, { x: 200, y: 2 }, 5);
    expect(hit?.edge[0]).toBe(8);
    expect(hit?.nodes.map((n) => n[0])).toEqual([2, 4]);
    expect(hit?.d).toBeCloseTo(2, 3);
    expect(segmentAt(map, { x: 200, y: 20 }, 5)).toBeNull();
  });

  it('gives the nearest of two segments', () => {
    const two = loaded(
      [node(1, 0, 0), node(2, 100, 0), node(3, 0, 6), node(4, 100, 6)],
      [edge(1, 1, 2), edge(2, 3, 4)],
    );
    expect(segmentAt(two, { x: 50, y: 4 }, 10)?.edge[0]).toBe(2);
    expect(segmentAt(two, { x: 50, y: 1 }, 10)?.edge[0]).toBe(1);
  });

  it('finds nothing in a chunk that is still loading, nor round it', () => {
    const waiting = loaded([node(1, 0, 0), node(2, 300, 0)], [edge(1, 1, 2)], ['0,0']);
    expect(interactable(waiting, { x: 1, y: 1 })).toBe(false);
    expect(nodeAt(waiting, { x: 0, y: 0 }, 5)).toBeNull();
    expect(segmentAt(waiting, { x: 0, y: 0 }, 5)).toBeNull();
    // The chunk next to it is there: its nodes can be picked.
    expect(nodeAt(waiting, { x: 300, y: 0 }, 5)?.[0]).toBe(2);
  });
});

describe('the nodes in a box (^1257)', () => {
  const nodes = [node(1, -50, -50), node(2, 50, 50), node(3, 20, -30), node(4, 400, 400)];
  const map = loaded(nodes, []);

  it('finds the nodes inside a box of the screen, whichever corner it was dragged from', () => {
    // The screen is 200 x 200 round (0, 0): the world point (x, y) is at (x + 100, y + 100).
    const inside = nodesInBox(map, { view: view(), size }, { x: 160, y: 170 }, { x: 40, y: 40 });
    expect(inside.nodes.sort()).toEqual([1, 2, 3]);
    expect(inside.waiting).toBe(0);
  });

  it('is a turned rectangle of the world when the view is turned', () => {
    // Turned a quarter: the world point (x, y) is at (100 - y, 100 + x).
    const found = nodesInBox(
      map,
      { view: view(Math.PI / 2), size },
      { x: 110, y: 40 },
      { x: 190, y: 160 },
    );
    expect(found.nodes.sort()).toEqual([1, 3].sort());
  });

  it('counts the chunks under the box that are not loaded, and finds the nodes of the others', () => {
    const half = loaded(nodes, [], ['-1,-1']);
    const found = nodesInBox(half, { view: view(), size }, { x: 0, y: 0 }, { x: 200, y: 200 });
    expect(found.waiting).toBeGreaterThan(0);
    expect(found.nodes).toContain(2);
    expect(found.nodes).not.toContain(1);
  });
});
