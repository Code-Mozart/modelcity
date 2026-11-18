import { describe, expect, it } from 'vitest';
import type { EdgeRow, NodeRow } from '../project/storage';
import { ChunkIndex } from './chunkIndex';
import type { Chunk } from './chunkLoader';

const node = (id: number): NodeRow => [id, id * 1000, 0, 0];
const edge = (id: number, a: number, b: number): EdgeRow => [id, a, b, null, 1];

/** Two chunks that both know segment 0 and node 1 (a segment between them). */
const pair = (): [Chunk, Chunk] => [
  { id: '0,0', nodes: [node(0)], edges: [edge(0, 0, 1)], ends: [node(1)] },
  { id: '1,0', nodes: [node(1)], edges: [edge(0, 0, 1)], ends: [node(0)] },
];

describe('the rows of the chunks that are loaded (^1247)', () => {
  it('shares a row that two chunks know: one object, found by its id', () => {
    const index = new ChunkIndex();
    const [a, b] = pair();
    index.add(a);
    index.add(b);
    expect(b.edges[0]).toBe(a.edges[0]);
    expect(a.ends[0]).toBe(b.nodes[0]);
    expect(index.nodeOf(1)).toBe(b.nodes[0]);
    expect(index.size).toBe(3);
  });

  it('lets go of a row with the last chunk that has it', () => {
    const index = new ChunkIndex();
    const [a, b] = pair();
    index.add(a);
    index.add(b);
    index.remove(a);
    expect(index.nodeOf(1)).toBeDefined();
    expect(index.nodeOf(0)).toBeDefined();
    index.remove(b);
    expect(index.nodeOf(0)).toBeUndefined();
    expect(index.size).toBe(0);
  });
});

describe('the segments at a node (^1258)', () => {
  it('finds the segments at a node while they are loaded, and forgets them with their last chunk (^1258)', () => {
    const index = new ChunkIndex();
    const [a, b] = pair();
    index.add(a);
    index.add({ id: '2,0', nodes: [node(2)], edges: [edge(1, 1, 2)], ends: [node(1)] });
    expect(
      index
        .edgesAt(1)
        .map((e) => e[0])
        .sort(),
    ).toEqual([0, 1]);
    expect(index.edgesAt(0).map((e) => e[0])).toEqual([0]);
    index.add(b);
    index.remove(a);
    expect(index.edgesAt(0).map((e) => e[0])).toEqual([0]);
    index.remove(b);
    expect(index.edgesAt(0)).toEqual([]);
    expect(index.edgesAt(1).map((e) => e[0])).toEqual([1]);
  });
});
