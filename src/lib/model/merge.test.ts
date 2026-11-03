import { describe, expect, it } from 'vitest';
import { addEdge, addNode, edgesAt, emptyGraph } from './graph';
import { mergeNodes } from './merge';

function road() {
  let g = emptyGraph();
  const ids: number[] = [];
  for (const x of [0, 10, 20, 30]) {
    const r = addNode(g, { x, y: 0, th: 0 });
    g = r.graph;
    ids.push(r.id);
  }
  for (let i = 0; i < 3; i++) g = addEdge(g, ids[i]!, ids[i + 1]!, null);
  return { g, ids };
}

describe('merging nodes (^248)', () => {
  it('the edges of the node that goes run to the one that stays', () => {
    const { g, ids } = road();
    const m = mergeNodes(g, ids[2]!, ids[0]!);
    expect(m.nodes.map((n) => n.id)).toEqual([ids[0], ids[1], ids[3]]);
    expect(edgesAt(m, ids[0]!)).toHaveLength(3);
    const ids2 = m.nodes.map((n) => n.id);
    expect(m.edges.every((e) => ids2.includes(e.start) && ids2.includes(e.end))).toBe(true);
  });

  it('the edge between the two goes, it would have no length', () => {
    const { g, ids } = road();
    const m = mergeNodes(g, ids[1]!, ids[2]!);
    expect(m.edges).toHaveLength(2);
    expect(m.edges.some((e) => e.start === e.end)).toBe(false);
  });

  it('merging a node into itself changes nothing', () => {
    const { g, ids } = road();
    expect(mergeNodes(g, ids[1]!, ids[1]!)).toBe(g);
  });
});
