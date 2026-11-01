import { edgesAt, edgesIn, edgesOut, type Graph } from './graph';

/**
 * What a click does in draw mode (^23, ^65, ^162). On the node being drawn from it finishes the
 * road. While a road is being drawn, on the node where it started it closes a loop, on any other
 * node it merges into it. With no road being drawn, on a lone end node it extends that road, on
 * any other node it splits a new road off.
 */
export type NodeAction = 'finish' | 'close' | 'extend' | 'split' | 'merge' | null;

/** What a click on a curve does in draw mode: split a new road off, merge into it, or only insert a node. */
export type CurveAction = 'split' | 'merge' | 'insert' | null;

/**
 * The state of drawing that decides the actions: the node being drawn from, which way the next
 * edge runs, and the node where the road being drawn started.
 */
export interface DrawState {
  graph: Graph;
  active: number | null;
  end: 'start' | 'end';
  origin: number | null;
}

const degree = (g: Graph, id: number) => edgesAt(g, id).length;

/** The edges of the road being drawn: from the node it started at to the node being drawn from. */
export function drawnEdges({ graph, active, end, origin }: DrawState): Set<number> {
  const seen = new Set<number>();
  let cur = active;
  while (cur !== null && cur !== origin) {
    const back = end === 'end' ? edgesIn(graph, cur) : edgesOut(graph, cur);
    const e = back.find((b) => !seen.has(b.id));
    if (!e) break;
    seen.add(e.id);
    cur = end === 'end' ? e.start : e.end;
  }
  return seen;
}

export function nodeAction(d: DrawState, id: number): NodeAction {
  if (id === d.active) return 'finish';
  if (d.active === null) return degree(d.graph, id) === 1 ? 'extend' : 'split';
  return id === d.origin ? 'close' : 'merge';
}

export function curveAction(d: DrawState, edge: number): CurveAction {
  if (d.active === null) return 'split';
  return drawnEdges(d).has(edge) ? 'insert' : 'merge';
}

/** The node at the other end of the road that ends at the leaf `id`, going through nodes with two edges. */
export function farEnd(g: Graph, id: number): number {
  let [cur, via] = [id, edgesAt(g, id)[0]];
  while (via) {
    cur = via.start === cur ? via.end : via.start;
    const here = edgesAt(g, cur);
    if (here.length !== 2 || cur === id) break;
    via = here.find((e) => e.id !== via!.id);
  }
  return cur;
}

/** The other node of an edge. */
const other = (e: { start: number; end: number }, id: number) => (e.start === id ? e.end : e.start);

/**
 * Branches (^128): a chain of nodes without splits or merges. Its first and last node have a
 * number of edges other than two, all nodes between have exactly two. The nodes of the branch an
 * edge belongs to, ends included.
 */
export function branchOfEdge(g: Graph, edge: number): number[] {
  const first = g.edges.find((e) => e.id === edge);
  if (!first) return [];
  const nodes = new Set([first.start, first.end]);
  for (const from of [first.start, first.end]) {
    let [cur, via] = [from, first];
    for (let here = edgesAt(g, cur); here.length === 2; here = edgesAt(g, cur)) {
      const next = here.find((e) => e.id !== via.id)!;
      cur = other(next, cur);
      via = next;
      if (nodes.has(cur)) break;
      nodes.add(cur);
    }
  }
  return [...nodes];
}

/**
 * The branch of a node: for a node between the ends of a branch the one it is on; for a node where
 * branches meet or end, the branch that goes on from it in the direction the road was drawn, else
 * the one before it (assumed).
 */
export function branchOfNode(g: Graph, id: number): number[] {
  const here = edgesAt(g, id);
  const e = here.length === 2 ? here[0] : (edgesOut(g, id)[0] ?? edgesIn(g, id)[0]);
  return e ? branchOfEdge(g, e.id) : [id];
}
