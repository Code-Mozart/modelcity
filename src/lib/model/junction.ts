import { autoHeading, autoHeadingBefore } from '../curves/path';
import { addEdge, edgesAt, edgesIn, edgesOut, type Graph } from './graph';

/**
 * What a click does in draw mode (^23, ^65, ^162). On the node being drawn from it finishes the
 * road. While a road is being drawn, on the node where it started it closes a loop, on any other
 * node it merges into it. With no road being drawn, on a lone end node it extends that road, on
 * any other node it splits a new road off.
 */
export type NodeAction = 'finish' | 'close' | 'extend' | 'split' | 'merge' | null;

/** What a click on a curve does in draw mode: split a new road off, or merge into it, also into the road being drawn (^191). */
export type CurveAction = 'split' | 'merge' | null;

/**
 * The state of drawing that decides the actions: the node being drawn from, which way the next
 * edge runs, and the node where the road being drawn started.
 */
export interface DrawState {
  graph: Graph;
  active: number | null;
  end: DrawEnd;
  origin: number | null;
}

const degree = (g: Graph, id: number) => edgesAt(g, id).length;

export function nodeAction(d: DrawState, id: number): NodeAction {
  if (id === d.active) return 'finish';
  if (d.active === null) return degree(d.graph, id) === 1 ? 'extend' : 'split';
  return id === d.origin ? 'close' : 'merge';
}

export function curveAction(d: DrawState): CurveAction {
  if (d.active === null) return 'split';
  return 'merge';
}

/** The other node of an edge. */
const other = (e: { start: number; end: number }, id: number) => (e.start === id ? e.end : e.start);

/**
 * The nodes reached from `cur` by going on, away from the edge `via` it was reached by, through
 * nodes with exactly two edges. Stops at any other node, or when a node comes up again (`seen`,
 * which collects the nodes).
 */
function walk(g: Graph, cur: number, via: { id: number }, seen: Set<number>): number[] {
  const out: number[] = [];
  for (let here = edgesAt(g, cur); here.length === 2; here = edgesAt(g, cur)) {
    const next = here.find((e) => e.id !== via.id)!;
    [cur, via] = [other(next, cur), next];
    if (seen.has(cur)) break;
    seen.add(cur);
    out.push(cur);
  }
  return out;
}

/** The node at the other end of the road that ends at the leaf `id`, going through nodes with two edges. */
export function farEnd(g: Graph, id: number): number {
  const first = edgesAt(g, id)[0];
  if (!first) return id;
  const start = other(first, id);
  return walk(g, start, first, new Set([id, start])).at(-1) ?? start;
}

/**
 * Branches (^128): a chain of nodes without splits or merges. Its first and last node have a
 * number of edges other than two, all nodes between have exactly two. The nodes of the branch an
 * edge belongs to, ends included.
 */
export function branchOfEdge(g: Graph, edge: number): number[] {
  const first = g.edges.find((e) => e.id === edge);
  if (!first) return [];
  const nodes = new Set([first.start, first.end]);
  for (const from of [first.start, first.end]) walk(g, from, first, nodes);
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

/**
 * Which way the next edge of the road being drawn runs (^65): `end`, out of the node being drawn
 * from; `start`, into it (the road is drawn backwards). `first`: the road was just extended from
 * its first node and nothing is placed yet: a node placed next still goes before it (like
 * `start`), but a merge runs out of the node, in the order of the clicks (^239).
 */
export type DrawEnd = 'start' | 'end' | 'first';

/** The way a merge into `target` runs: in the order of the clicks right after the first node was clicked, except closing the loop. */
export const mergeEnd = (end: DrawEnd, target: number | null, origin: number | null): DrawEnd =>
  end === 'first' && target !== origin ? 'end' : end;

/** The heading a node placed at `pt` gets so that the edge to the node `tip` is one arc (^65). */
export const autoHeadingFor = (end: DrawEnd) => (end === 'end' ? autoHeading : autoHeadingBefore);

/** An edge between the node being drawn from and another node, in the direction of the road (^65). */
export const linkTo = (g: Graph, active: number, end: DrawEnd, id: number): Graph =>
  end === 'end' ? addEdge(g, active, id) : addEdge(g, id, active);

/** The ends of the curve to be drawn: from the node being drawn from to `node`, or the other way. */
export const ordered = <T>(tip: T, node: T, end: DrawEnd): [T, T] =>
  end === 'end' ? [tip, node] : [node, tip];

/** The arm of a node (^130): all nodes connected to it by segments, itself included. */
export function armOf(g: Graph, id: number): number[] {
  const arm = new Set([id]);
  for (const node of arm) {
    for (const e of edgesAt(g, node)) arm.add(other(e, node));
  }
  return [...arm];
}
