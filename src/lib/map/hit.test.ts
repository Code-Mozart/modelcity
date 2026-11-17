import { describe, expect, it } from 'vitest';
import type { View } from '../camera/view';
import type { EdgeRow, NodeRow } from '../project/storage';
import { chunkId, chunkOf } from './chunks';
import type { Chunk } from './chunkLoader';
import { interactable, nodeAt, nodesInBox, segmentAt, type LoadedMap } from './hit';

const mm = (m: number) => Math.round(m * 1000);
const node = (id: number, x: number, y: number): NodeRow => [id, mm(x), mm(y), 0];
const edge = (id: number, a: number, b: number): EdgeRow => [id, a, b, null, 1];

/** A map in memory made of rows: a chunk for each place that has a node, a segment in the chunks of both its nodes; `loading` ids are loading. */
function loaded(nodes: NodeRow[], edges: EdgeRow[], loading: string[] = []): LoadedMap {
  const all = new Map(nodes.map((n) => [n[0], n]));
  const chunks = new Map<
    string,
    LoadedMap['chunks'] extends ReadonlyMap<string, infer S> ? S : never
  >();
  const chunk = (id: string): Chunk => {
    const s = chunks.get(id);
    if (s?.status === 'ready') return s.chunk;
    const fresh: Chunk = { id, nodes: [], edges: [], ends: [] };
    chunks.set(id, { status: 'ready', chunk: fresh });
    return fresh;
  };
  // Empty chunks are loaded too, as they are in memory.
  for (let cy = -2; cy <= 2; cy++) for (let cx = -2; cx <= 2; cx++) chunk(chunkId(cx, cy));
  const idOf = (n: NodeRow) => chunkId(...chunkOf(n[1] / 1000, n[2] / 1000));
  nodes.forEach((n) => chunk(idOf(n)).nodes.push(n));
  for (const e of edges)
    for (const id of new Set([idOf(all.get(e[1])!), idOf(all.get(e[2])!)])) chunk(id).edges.push(e);
  loading.forEach((id) => chunks.set(id, { status: 'loading' }));
  return { chunks, nodeOf: (id) => all.get(id) };
}

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
