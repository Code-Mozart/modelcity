import { buildEdge } from '../curves/edge';
import { SAME_PLACE_M } from '../curves/tolerance';
import type { Piece } from '../curves/types';
import { dist, type Vec } from '../curves/vec';
import { edgesAt, nodeOf, type Graph } from '../model/graph';
import type { SnapHit } from '../snap/types';
import { chainsOf, nearestOnChains, type Chain } from './chains';
import type { Press } from './types';
import { movedIds, without } from './snapping';

/** Where a dragged node is merged: into a node, or into a curve at a place with its tangent (^248, ^268). */
export type Drop = { node?: number; edge?: number; at: Vec; th: number } | null;

/** The node a dragged node is dropped on: a snap point at a node, or any node within the world distance. */
function nodeUnder(graph: Graph, moving: number[], hit: SnapHit | null, at: Vec): Drop {
  const by = hit?.by[0];
  const snapped = by?.kind === 'point' && by.rule === 'node-points' ? by.node : undefined;
  const near = graph.nodes.find((n) => !moving.includes(n.id) && dist(n, at) < SAME_PLACE_M)?.id;
  const n = nodeOf(graph, snapped ?? near ?? -1);
  return n ? { node: n.id, at: { x: n.x, y: n.y }, th: n.th } : null;
}

/** The curve of a segment a drag ends on: snapped to it, or within the world distance (^268, ^283). */
function curveUnder(before: Graph, moving: number[], hit: SnapHit | null, at: Vec): Drop {
  const by = hit?.by[0];
  if (by?.kind === 'curve' && by.rule === 'curve' && by.edge !== undefined) {
    return { edge: by.edge, at: hit!.pt, th: hit!.heading ?? 0 };
  }
  const near = nearestOnChains(chainsOf(without(before, moving)), at, SAME_PLACE_M);
  const th = near ? Math.atan2(near.at.ty, near.at.tx) : 0;
  return near ? { edge: near.edge, at: { x: near.at.x, y: near.at.y }, th } : null;
}

/** What a drag that ends now merges into, if anything. */
export function dropOf(graph: Graph, press: Press | null, hit: SnapHit | null): Drop {
  // Only a dragged node merges; the id of any other handle is a segment's (^306).
  const node =
    press?.kind === 'drag' && press.moved && press.drag.handle.type === 'node'
      ? nodeOf(graph, press.id)
      : undefined;
  if (press?.kind !== 'drag' || !node) return null;
  const moving = movedIds(press);
  return nodeUnder(graph, moving, hit, node) ?? curveUnder(press.undo.graph, moving, hit, node);
}

/**
 * The curves the dragged node's segments would have after the merge, to show dashed like the curve
 * of an extend (^284): from the node at the other end of each to the place of the merge.
 */
export function dropPreview(graph: Graph, press: Press | null, drop: Drop): Piece[][] {
  if (press?.kind !== 'drag' || !drop) return [];
  const target = { ...drop.at, th: drop.th };
  return edgesAt(graph, press.id).flatMap((e) => {
    const other = nodeOf(graph, e.start === press.id ? e.end : e.start);
    if (!other) return [];
    const [p, q] = e.start === press.id ? [target, other] : [other, target];
    return [buildEdge(p, q, e.radius).pieces];
  });
}

/**
 * The chains for drawing, without the curves of the segments that a drop would replace: while the
 * preview is dashed (^284) only the gizmo shows, the geometry of a preview is later (^155).
 */
export function roadsShown(chains: Chain[], graph: Graph, press: Press | null, drop: Drop) {
  const gone = drop && press?.kind === 'drag' ? edgesAt(graph, press.id).map((e) => e.id) : [];
  const none = { kind: 'line' as const, pieces: [] };
  return chains.map((c) => ({
    path: c.path,
    width: c.width,
    edges: c.edges.map((ref, i) => (gone.includes(c.edgeIds[i]!) ? { ...ref, E: none } : ref)),
  }));
}
