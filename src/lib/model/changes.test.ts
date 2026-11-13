import { describe, expect, it } from 'vitest';
import { connectedMap } from '../testing/samples';
import {
  edgeOfId,
  edgesAt,
  edgesIn,
  edgesOut,
  moveNodes,
  nodeOf,
  placed,
  withRadius,
  type Graph,
} from './graph';
import { changesBetween } from './changes';

const random = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** What the indexes say of a graph, compared with looking through its lists (^941). */
function expectIndexesOf(g: Graph) {
  for (const n of g.nodes) {
    expect(nodeOf(g, n.id)).toBe(n);
    expect(edgesAt(g, n.id)).toEqual(g.edges.filter((e) => e.start === n.id || e.end === n.id));
    expect(edgesIn(g, n.id)).toEqual(g.edges.filter((e) => e.end === n.id));
    expect(edgesOut(g, n.id)).toEqual(g.edges.filter((e) => e.start === n.id));
  }
  for (const e of g.edges) expect(edgeOfId(g, e.id)).toBe(e);
}

describe('changes between graphs and the indexes made from them (^941)', () => {
  it('finds what a move changed, and nothing for a different shape', () => {
    const g = connectedMap(4);
    const moved = moveNodes(g, placed(g, [g.nodes[3]!.id]), { x: 1, y: 0 });
    expect(changesBetween(g, moved)).toEqual({ nodes: [3], edges: [] });
    expect(changesBetween(g, { ...g, nodes: g.nodes.slice(1) })).toBeNull();
  });

  it('the indexes of graphs made by moves and new radii are those of the lists, also going back and forth', () => {
    const next = random(5);
    const base = connectedMap(4);
    const graphs: Graph[] = [base];
    let g = base;
    for (let i = 0; i < 12; i++) {
      const n = g.nodes[Math.floor(next() * g.nodes.length)]!;
      const e = g.edges[Math.floor(next() * g.edges.length)]!;
      g =
        i % 3 === 2
          ? withRadius(g, e.id, 10 + next() * 20)
          : moveNodes(g, placed(g, [n.id]), { x: next(), y: next() });
      graphs.push(g);
      expectIndexesOf(g);
    }
    for (const old of [graphs[2]!, graphs[9]!, base, graphs[12]!]) expectIndexesOf(old);
  });
});
