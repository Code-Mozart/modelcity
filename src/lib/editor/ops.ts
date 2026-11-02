import { dragHeading } from '../curves/drag';
import { dist, type Vec } from '../curves/vec';
import { withSharedRadius } from './press';
import { targetOf, type Drawn } from './targets';
import type { Placement, PointerInfo, Press } from './types';
import { nodeAtSample, type RoadHit } from './chains';
import { armOf, autoHeadingFor, farEnd, linkTo, mergeEnd } from '../model/junction';
import { dragGraph } from '../model/dragGraph';
import {
  addNode,
  edgesAt,
  edgesIn,
  edgesOut,
  insertNode,
  moveNodes,
  nodeOf,
  removeNodes,
  turnedAround,
  withNode,
  type Graph,
} from '../model/graph';

/** The node a click at `pt` would place: where the pointer is, with the automatic heading. */
export const placementAt = (pt: Vec): Placement => ({ pt, th: null });

/** A press on a curve in draw mode: a node is inserted, and the road splits off it or merges into it (^23). */
export function curvePress(d: Drawn, hit: RoadHit): { drawn: Drawn; press: Press } {
  const target = targetOf(d, { kind: 'candidate', hit }, true);
  const r = insertAt(d, hit);
  const act = target.kind === 'curve' ? target.act : null;
  const then = act === 'split' || act === 'merge' ? act : null;
  return {
    drawn: r.drawn,
    press: { kind: 'place', id: r.id, undo: d, then, moved: false, target },
  };
}

/** A press on empty canvas in draw mode: a node is placed (^40). */
export function placePress(d: Drawn, info: PointerInfo): { drawn: Drawn; press: Press } {
  const r = placeNode(d, placementAt(info.pt));
  const target = { kind: 'empty' } as const;
  const press: Press = { kind: 'place', id: r.id, undo: d, then: null, moved: false, target };
  return { drawn: r.drawn, press };
}

/** A node at the end of the road being drawn, or the first node of a new road (^40). */
export function placeNode(d: Drawn, at: Placement): { drawn: Drawn; id: number } {
  const tip = d.active === null ? undefined : nodeOf(d.graph, d.active);
  if (!tip) {
    const r = addNode(d.graph, { x: at.pt.x, y: at.pt.y, th: at.th ?? 0 });
    return {
      drawn: { ...d, graph: r.graph, active: r.id, end: 'end', origin: r.id, selection: [r.id] },
      id: r.id,
    };
  }
  const heading = autoHeadingFor(d.end);
  const r = addNode(d.graph, { x: at.pt.x, y: at.pt.y, th: at.th ?? heading(tip, at.pt) });
  const graph = linkTo(r.graph, tip.id, d.end, r.id);
  const end = d.end === 'first' ? 'start' : d.end;
  return { drawn: { ...d, graph, active: r.id, end, selection: [r.id] }, id: r.id };
}

/** Insert a node on a curve; the curve does not change (^10). */
export function insertAt(d: Drawn, hit: RoadHit): { drawn: Drawn; id: number } {
  const { at } = hit;
  const r = insertNode(d.graph, hit.edge, nodeAtSample(at));
  return { drawn: { ...d, graph: r.graph, selection: [r.id] }, id: r.id };
}

/**
 * Make an end node, of any road when none is drawn, the one the next node attaches to (^65): the
 * road becomes the road being drawn, at that end, and it started at its other end.
 */
export function extendTo(drawn: Drawn, id: number): Drawn {
  const { graph } = drawn;
  const start = edgesOut(graph, id).length > 0 && edgesIn(graph, id).length === 0;
  const end = start ? 'first' : 'end';
  return { ...drawn, active: id, end, origin: farEnd(graph, id), selection: [id] };
}

/** The state after a removal: the road goes on from `tip` if that is still there, else it is not drawn (^160). */
function afterRemoval(d: Drawn, graph: Graph, tip: number | null): Drawn {
  const alive = (id: number | null) => (id !== null && nodeOf(graph, id) ? id : null);
  const active = alive(tip);
  const end = active === null ? 'end' : d.end;
  return { ...d, graph, active, end, origin: alive(d.origin), selection: [] };
}

/** Remove nodes (^70): the road being drawn goes on from the node before, if its node goes. */
export function removeNodesFrom(d: Drawn, ids: number[]): Drawn {
  const tip = d.active !== null && ids.includes(d.active) ? neighbourOf(d) : d.active;
  return afterRemoval(d, removeNodes(d.graph, ids, tip), tip);
}

/**
 * Remove segments (^160): one, or a whole branch. Their nodes go with them if they had no other
 * one, except the node being drawn from, which stays. If that was left with no segment, the road
 * goes on from the node at the other end of its removed segment (with a branch: if that still has
 * a segment, else the road is no longer drawn).
 */
export function removeSegmentsFrom(d: Drawn, edges: number[]): Drawn {
  const gone = d.graph.edges.filter((e) => edges.includes(e.id));
  if (!gone.length) return d;
  const without = { ...d.graph, edges: d.graph.edges.filter((e) => !edges.includes(e.id)) };
  const touched = gone.find((e) => d.active === e.start || d.active === e.end);
  const stranded = touched !== undefined && !edgesAt(without, d.active!).length;
  const next = touched && (touched.start === d.active ? touched.end : touched.start);
  const alone = gone.length === 1 || (next !== undefined && edgesAt(without, next).length > 0);
  const tip = stranded ? (alone ? next! : null) : d.active;
  return afterRemoval(d, removeNodes(without, [], tip), tip);
}

/** Turn the arm of a node around (^234): the drawing goes on from the same node, the other way. */
export function flipArmFrom(d: Drawn, id: number): Drawn {
  const arm = armOf(d.graph, id);
  const flipped = d.active !== null && arm.includes(d.active);
  const end = flipped ? (d.end === 'end' ? 'start' : 'end') : d.end;
  return { ...d, graph: turnedAround(d.graph, arm), end };
}

/** The node the road being drawn goes on from when its node is removed: the one before it. */
export function neighbourOf({ graph, active, end }: Drawn): number | null {
  if (active === null) return null;
  const e = (end === 'end' ? edgesIn(graph, active) : edgesOut(graph, active))[0];
  return e ? (end === 'end' ? e.start : e.end) : null;
}

/** Start a new road at an existing node: a split (^23). The new road shares the node. */
export const splitAt = (d: Drawn, id: number): Drawn => ({
  ...d,
  active: id,
  end: 'end',
  origin: id,
  selection: [id],
});

/** End the road being drawn at an existing node: a merge, or a loop at its first node (^23, ^162). */
export function mergeInto(d: Drawn, id: number): Drawn {
  if (d.active === null) return d;
  const end = mergeEnd(d.end, id, d.origin);
  return { ...d, graph: linkTo(d.graph, d.active, end, id), selection: [id] };
}

/**
 * The graph after dragging the grabbed handle to the pointer: a group moves along and a radius is
 * shared (^71, ^77).
 */
export function dragStep(
  d: Drawn,
  press: Extract<Press, { kind: 'drag' }>,
  info: PointerInfo,
): Graph {
  const handle = { ...press.drag.handle, road: press.road, id: press.id };
  const dragged = dragGraph(d.graph, handle, info.pt, { snap: info.shift });
  const next = withSharedRadius(dragged, d.selection, press);
  const to = nodeOf(next, press.id);
  const group = handle.type === 'node' && to ? press.group : [];
  if (!to || !group.length) return next;
  return moveNodes(next, group, { x: to.x - press.origin.x, y: to.y - press.origin.y });
}

/** Dragging while a node is placed sets its heading, from where it was placed (^40). */
export function placeStep(g: Graph, id: number, info: PointerInfo): Graph {
  const n = nodeOf(g, id);
  if (!n || dist(info.pt, n) < 6 / info.scale) return g;
  const th = dragHeading({ nodes: [n], radii: [] }, 0, info.pt, info.shift).nodes[0]!.th;
  return withNode(g, id, { th });
}
