import { dragHeading } from '../curves/drag';
import { dist, type Vec } from '../curves/vec';
import { withSharedRadius } from './press';
import type { Drawn } from './targets';
import type { Placement, PointerInfo, Press } from './types';
import { nodeAtSample, type RoadHit } from '../model/chains';
import { autoHeadingFor, farEnd, linkTo } from '../model/junction';
import { dragGraph } from '../model/dragGraph';
import {
  addNode,
  edgesIn,
  edgesOut,
  insertNode,
  moveNodes,
  nodeOf,
  withNode,
  type Graph,
} from '../model/graph';

/** The node a click at `pt` would place: where the pointer is, with the automatic heading. */
export const placementAt = (pt: Vec): Placement => ({ pt, th: null });

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
  return { drawn: { ...d, graph, active: r.id, selection: [r.id] }, id: r.id };
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
  const end = start ? 'start' : 'end';
  return { ...drawn, active: id, end, origin: farEnd(graph, id), selection: [id] };
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
  return { ...d, graph: linkTo(d.graph, d.active, d.end, id), selection: [id] };
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
