import { describe, expect, it } from 'vitest';
import { nearestOnChains, chainsOf } from '../editor/chains';
import {
  addEdge,
  addNode,
  edgesAt,
  edgesIn,
  edgesOut,
  emptyGraph,
  insertNode,
  removeNodes,
  sameGraph,
  shareRadius,
  withNode,
  withRadius,
  type Graph,
} from './graph';
import { branchOfEdge, branchOfNode, curveAction, farEnd, nodeAction } from './junction';

/** A chain of nodes along the x axis, 10 m apart, edges from each to the next. */
function chain(count: number, g: Graph = emptyGraph()) {
  const ids: number[] = [];
  let graph = g;
  for (let i = 0; i < count; i++) {
    const r = addNode(graph, { x: i * 10, y: 0, th: 0 });
    graph = r.graph;
    ids.push(r.id);
  }
  ids.slice(1).forEach((id, i) => (graph = addEdge(graph, ids[i]!, id)));
  return { graph, ids };
}

describe('the graph (^106)', () => {
  it('gives new nodes and edges the next id of the counter, and never reuses one (^1224)', () => {
    const { graph, ids } = chain(3);
    expect(ids).toEqual([0, 1, 2]);
    expect(graph.edges.map((e) => e.id)).toEqual([0, 1]);
    const after = removeNodes(graph, [2], null);
    expect(addNode(after, { x: 0, y: 5, th: 0 }).id).toBe(3);
  });

  it('inserts a node on an edge: two edges with the same radius, the same curve', () => {
    const { graph } = chain(2);
    const withRadius = shareRadius(graph, 0, [0]);
    const r = insertNode(withRadius, 0, { x: 5, y: 0, th: 0 });
    expect(r.graph.nodes).toHaveLength(3);
    expect(r.graph.edges).toHaveLength(2);
    expect(edgesIn(r.graph, r.id)).toHaveLength(1);
    expect(edgesOut(r.graph, r.id)).toHaveLength(1);
  });

  it('removes a node between two edges by joining its neighbours, an end node with its edge', () => {
    const { graph, ids } = chain(4);
    const middle = removeNodes(graph, [ids[1]!], null);
    expect(middle.nodes).toHaveLength(3);
    expect(middle.edges).toHaveLength(2);
    const end = removeNodes(graph, [ids[0]!], null);
    expect(end.nodes).toHaveLength(3);
    expect(end.edges).toHaveLength(2);
    expect(removeNodes(chain(2).graph, [0], null).nodes).toHaveLength(0);
  });

  it('keeps a node without edges only if it is the one being drawn from', () => {
    const lone = addNode(emptyGraph(), { x: 0, y: 0, th: 0 });
    expect(removeNodes(lone.graph, [], null).nodes).toHaveLength(0);
    expect(removeNodes(lone.graph, [], lone.id).nodes).toHaveLength(1);
  });
});

describe('chains (^106)', () => {
  it('one chain for a road, a chain per arm at a junction, a loop is one chain', () => {
    const { graph, ids } = chain(3);
    expect(chainsOf(graph)).toHaveLength(1);
    const lone = addNode(graph, { x: 10, y: 10, th: 0 });
    const branched = addEdge(lone.graph, ids[1]!, lone.id);
    expect(chainsOf(branched)).toHaveLength(3);
    const loop = addEdge(chain(3).graph, 2, 0);
    const [c] = chainsOf(loop);
    expect(chainsOf(loop)).toHaveLength(1);
    expect(c!.nodeIds).toEqual([0, 1, 2, 0]);
  });

  it('finds the nearest curve with its edge id', () => {
    const { graph } = chain(3);
    const hit = nearestOnChains(chainsOf(graph), { x: 15, y: 0.1 }, 1)!;
    expect(hit.edge).toBe(1);
    expect(hit.d).toBeLessThan(0.2);
  });
});

describe('actions and branches (^23, ^128, ^162)', () => {
  const state = (g: Graph, active: number | null, origin: number | null) => ({
    graph: g,
    active,
    end: 'end' as const,
    origin,
  });

  it('with nothing drawn: a lone end extends, any other node splits', () => {
    const { graph, ids } = chain(3);
    expect(nodeAction(state(graph, null, null), ids[0]!)).toBe('extend');
    expect(nodeAction(state(graph, null, null), ids[1]!)).toBe('split');
    expect(curveAction(state(graph, null, null))).toBe('split');
  });

  it('while drawing: the node drawn from finishes, where it started closes, others merge', () => {
    const { graph, ids } = chain(3);
    const d = state(graph, ids[2]!, ids[0]!);
    expect(nodeAction(d, ids[2]!)).toBe('finish');
    expect(nodeAction(d, ids[0]!)).toBe('close');
    expect(nodeAction(d, ids[1]!)).toBe('merge');
    expect(curveAction(d)).toBe('merge');
    const other = chain(2, graph);
    expect(curveAction(state(other.graph, ids[2]!, ids[0]!))).toBe('merge');
  });

  it('knows the far end of a road and the branch an edge or node belongs to', () => {
    const { graph, ids } = chain(4);
    expect(farEnd(graph, ids[0]!)).toBe(ids[3]);
    expect(branchOfEdge(graph, 1).sort()).toEqual(ids);
    expect(branchOfNode(graph, ids[1]!).sort()).toEqual(ids);
    const side = addNode(graph, { x: 10, y: 10, th: 0 });
    const tee = addEdge(side.graph, ids[1]!, side.id);
    expect(edgesAt(tee, ids[1]!)).toHaveLength(3);
    expect(branchOfEdge(tee, 0).sort()).toEqual([ids[0], ids[1]].sort());
  });
});

describe('sameGraph and removing nothing (^227)', () => {
  const g = addEdge(
    addNode(addNode(emptyGraph(), { x: 0, y: 0, th: 0 }).graph, { x: 9, y: 0, th: 0 }).graph,
    0,
    1,
  );

  it('graphs with the same content are the same, whichever objects they are', () => {
    expect(sameGraph(g, { ...g, nodes: g.nodes.map((n) => ({ ...n })) })).toBe(true);
    expect(sameGraph(g, withNode(g, 1, { x: 9.001 }))).toBe(false);
    expect(sameGraph(g, withRadius(g, 0, 5))).toBe(false);
    expect(sameGraph(g, addNode(g, { x: 1, y: 1, th: 0 }).graph)).toBe(false);
  });

  it('removing no node, with no node left over, gives the same graph', () => {
    expect(removeNodes(g, [], null)).toBe(g);
  });
});
