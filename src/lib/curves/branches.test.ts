import { describe, expect, it } from 'vitest';
import { branchOfEdge, branchOfNode } from './branches';
import { appendNode } from './path';
import { replaceRoad, startRoad, type NodeRef, type Roads } from './roads';

/** A road along the given points. */
function chain(roads: Roads, pts: [number, number][]): Roads {
  const [first, ...rest] = pts;
  let out = startRoad(roads, { x: first![0], y: first![1] }).roads;
  const road = out.length - 1;
  for (const [x, y] of rest) out = replaceRoad(out, road, appendNode(out[road]!, { x, y }).path);
  return out;
}

const key = (r: NodeRef) => `${r.road}:${r.node}`;
const set = (refs: NodeRef[]) => refs.map(key).sort();

describe('branches (^128)', () => {
  it('an L with bends is one branch, ends included', () => {
    const roads = chain(
      [],
      [
        [0, 0],
        [20, 0],
        [20, 20],
        [40, 30],
      ],
    );
    expect(set(branchOfEdge(roads, { road: 0, i: 1 }))).toEqual(['0:0', '0:1', '0:2', '0:3']);
    expect(set(branchOfNode(roads, { road: 0, node: 2 }))).toEqual(['0:0', '0:1', '0:2', '0:3']);
  });

  it('a T has three branches: the road splits at the shared node', () => {
    let roads = chain(
      [],
      [
        [0, 0],
        [20, 0],
        [40, 0],
      ],
    );
    roads = chain(roads, [
      [20, 0],
      [20, 20],
      [20, 40],
    ]);
    expect(set(branchOfEdge(roads, { road: 0, i: 0 }))).toEqual(['0:0', '0:1', '1:0']);
    expect(set(branchOfEdge(roads, { road: 0, i: 1 }))).toEqual(['0:1', '0:2', '1:0']);
    expect(set(branchOfEdge(roads, { road: 1, i: 1 }))).toEqual(
      ['1:0', '1:1', '1:2', '0:1'].sort(),
    );
  });
});

describe('branches through shared nodes (^128)', () => {
  it('goes through a shared node that has only two edges', () => {
    let roads = chain(
      [],
      [
        [0, 0],
        [20, 0],
      ],
    );
    roads = chain(roads, [
      [20, 0],
      [40, 0],
    ]);
    expect(set(branchOfEdge(roads, { road: 0, i: 0 }))).toEqual(['0:0', '0:1', '1:0', '1:1']);
  });
});
