import { describe, expect, it } from 'vitest';
import type { EdgeRow } from '../project/storage';
import { branchOfEdge, branchOfNode, type Network } from './branch';

const edge = (id: number, a: number, b: number): EdgeRow => [id, a, b, null, 1];

/** A network of segments in which every node is complete, except those named. */
const network = (edges: EdgeRow[], unknown: number[] = []): Network => ({
  edgesAt: (n) => edges.filter((e) => e[1] === n || e[2] === n),
  complete: (n) => !unknown.includes(n),
});

/** A road 1 - 2 - 3 - 4 that splits at 4 into 4 - 5 and 4 - 6 - 7. */
const tee = [
  edge(0, 1, 2),
  edge(1, 2, 3),
  edge(2, 3, 4),
  edge(3, 4, 5),
  edge(4, 4, 6),
  edge(5, 6, 7),
];

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

describe('the branch of a segment (^128, ^130, ^1258)', () => {
  it('is the chain up to the nodes where it splits, those included', () => {
    const b = branchOfEdge(network(tee), tee[1]!);
    expect(sorted(b.nodes)).toEqual([1, 2, 3, 4]);
    expect(sorted(b.edges)).toEqual([0, 1, 2]);
    expect(b.complete).toBe(true);
  });

  it('the branches after the split are branches of their own', () => {
    expect(sorted(branchOfEdge(network(tee), tee[3]!).nodes)).toEqual([4, 5]);
    expect(sorted(branchOfEdge(network(tee), tee[5]!).nodes)).toEqual([4, 6, 7]);
  });

  it('is a ring when the chain comes back to where it began, without going round for ever', () => {
    const ring = [edge(0, 1, 2), edge(1, 2, 3), edge(2, 3, 1)];
    const b = branchOfEdge(network(ring), ring[0]!);
    expect(sorted(b.nodes)).toEqual([1, 2, 3]);
    expect(b.complete).toBe(true);
  });

  it('stops at a node whose segments are not all known, and says the branch may go on', () => {
    const b = branchOfEdge(network(tee, [3]), tee[0]!);
    expect(sorted(b.nodes)).toEqual([1, 2, 3]);
    expect(b.complete).toBe(false);
  });

  it('is incomplete at the unknown end of the branch it is on, and complete for a branch that does not reach the unknown node', () => {
    const b = branchOfEdge(network(tee, [7]), tee[5]!);
    expect(b.complete).toBe(false);
    expect(branchOfEdge(network(tee, [5]), tee[0]!).complete).toBe(true);
  });
});

describe('the branch of a node (^128, ^1258)', () => {
  const net = network(tee);

  it('of a node between the ends is the branch it is on', () => {
    expect(sorted(branchOfNode(net, 2).nodes)).toEqual([1, 2, 3, 4]);
  });

  it('of a node where branches meet is the branch that goes on from it in the direction of drawing', () => {
    expect(sorted(branchOfNode(net, 4).nodes)).toEqual([4, 5]);
  });

  it('of an end node with only an incoming segment is the branch before it, and of a lone node itself', () => {
    expect(sorted(branchOfNode(net, 5).nodes)).toEqual([4, 5]);
    expect(branchOfNode(network([]), 9)).toEqual({ nodes: [9], edges: [], complete: true });
  });
});
