import { autoHeading, autoHeadingBefore } from '../curves/path';
import type { PathNode } from '../curves/types';
import type { Sample } from '../curves/piece';
import type { Vec } from '../curves/vec';
import {
  addEdge,
  addNode,
  edgesAt,
  insertNode,
  nodeOf,
  removeNodes,
  type Graph,
} from '../model/graph';

/**
 * Which way the next segment of the road being drawn runs (^65): `end`, out of the node being
 * drawn from (forwards); `start`, into it (backwards). It stays so until the drawing ends.
 */
export type DrawEnd = 'start' | 'end';

/** The road being drawn (^40, ^65, ^162): the node it is drawn from, which way, and where it started. Ported from `main` (`model/junction.ts`). */
export interface DrawState {
  active: number | null;
  end: DrawEnd;
  origin: number | null;
}

export const NOT_DRAWING: DrawState = { active: null, end: 'end', origin: null };

export const sameDraw = (a: DrawState, b: DrawState) =>
  a.active === b.active && a.end === b.end && a.origin === b.origin;

/**
 * What a click on a node does in draw mode (^23, ^65, ^162): on the node being drawn from it
 * finishes the road (cancels it while only its first node is placed); while a road is drawn, on
 * the node where it started it closes a loop, on any other node it merges into it; with no road
 * being drawn, on a node with one segment or none it extends that road, on any other it splits a
 * new road off. `degree` is the number of segments at a node.
 */
export type NodeAction = 'finish' | 'cancel' | 'close' | 'extend' | 'split' | 'merge';

export function nodeAction(d: DrawState, id: number, degree: (id: number) => number): NodeAction {
  if (id === d.active) return degree(id) === 0 ? 'cancel' : 'finish';
  if (d.active === null) return degree(id) <= 1 ? 'extend' : 'split';
  return id === d.origin ? 'close' : 'merge';
}

/** What a click on a curve does in draw mode: split a new road off, or merge the road being drawn into it (^191). */
export const curveAction = (d: DrawState): 'split' | 'merge' =>
  d.active === null ? 'split' : 'merge';

/**
 * The way a click on a leaf node extends by default (^916): from a branch start node (its segment
 * starts there) backwards; from a branch end node or a node with no segment forwards. `out` is the
 * number of segments that start at the node.
 */
export const leafWay = (out: number): 'forwards' | 'backwards' =>
  out > 0 ? 'backwards' : 'forwards';

/** The heading a node placed at `pt` gets so that the segment from or to `tip` is one arc (^65). */
export const autoHeadingFor = (end: DrawEnd) => (end === 'end' ? autoHeading : autoHeadingBefore);

/** A segment between the node being drawn from and another node, the way the road runs (^65). */
export const linkTo = (g: Graph, active: number, end: DrawEnd, id: number): Graph =>
  end === 'end' ? addEdge(g, active, id) : addEdge(g, id, active);

/** The ends of the curve to be drawn: from the node being drawn from to `node`, or the other way. */
export const ordered = <T>(tip: T, node: T, end: DrawEnd): [T, T] =>
  end === 'end' ? [tip, node] : [node, tip];

/** The node a point of a curve would become: its position and the heading of the curve there. */
export const nodeAtSample = (at: Sample): PathNode => ({
  x: at.x,
  y: at.y,
  th: Math.atan2(at.ty, at.tx),
});

/**
 * A node at the end of the road being drawn, or the first node of a new road (^40): the drawing
 * goes on from it. `th` null takes the automatic heading (one arc from the node before, ^65).
 */
export function placeNode(
  g: Graph,
  d: DrawState,
  at: { pt: Vec; th: number | null },
): { graph: Graph; draw: DrawState; id: number } {
  const tip = d.active === null ? undefined : nodeOf(g, d.active);
  if (!tip) {
    const r = addNode(g, { x: at.pt.x, y: at.pt.y, th: at.th ?? 0 });
    return { graph: r.graph, draw: { active: r.id, end: 'end', origin: r.id }, id: r.id };
  }
  const th = at.th ?? autoHeadingFor(d.end)(tip, at.pt);
  const r = addNode(g, { x: at.pt.x, y: at.pt.y, th });
  return { graph: linkTo(r.graph, tip.id, d.end, r.id), draw: { ...d, active: r.id }, id: r.id };
}

/** Insert a node on a curve; the curve does not change (^10). */
export const insertAt = (g: Graph, edge: number, at: Sample) =>
  insertNode(g, edge, nodeAtSample(at));

/**
 * Make a node with one segment or none the one the next node attaches to (^65, ^916): from a branch
 * start node (`out` segments start at it) backwards, else forwards; `reverse` (`Alt`, ^915, ^917)
 * the other way. `origin` is where the road started: the far end of its branch.
 */
export function extendFrom(id: number, out: number, reverse: boolean, origin: number): DrawState {
  const backwards = (leafWay(out) === 'backwards') !== reverse;
  return { active: id, end: backwards ? 'start' : 'end', origin };
}

/** Start a new road at an existing node: a split (^23). */
export const splitFrom = (id: number): DrawState => ({ active: id, end: 'end', origin: id });

/** End the road being drawn at an existing node: a merge, or a loop at its first node (^23, ^162). */
export function mergeInto(g: Graph, d: DrawState, id: number): Graph {
  return d.active === null ? g : linkTo(g, d.active, d.end, id);
}

/** A road whose only node is its first one is cancelled when it is finished: the node goes (^437). */
export const cancelled = (g: Graph, d: DrawState): Graph =>
  d.active !== null && !edgesAt(g, d.active).length ? removeNodes(g, [d.active], null) : g;
