import { edgeOfId, type Graph } from '../model/graph';
import { branchEdges, onSelection } from './selection';
import { removeNodesFrom, removeSegmentsFrom } from './ops';
import type { RoadHandle, RoadHit } from './chains';
import type { Snapshot } from './types';

/** A removal as one undoable step: its name, and what it does to the state. */
export interface Removal {
  name: string;
  change: (d: Snapshot) => Snapshot;
}

/** Remove nodes (^70): `delete node`, `delete 3 nodes`. */
export function nodesRemoval(ids: number[]): Removal | null {
  if (!ids.length) return null;
  const name = ids.length === 1 ? 'delete node' : `delete ${ids.length} nodes`;
  return { name, change: (d) => removeNodesFrom(d, ids) };
}

/** Remove a segment, or with Alt its whole branch (^160). */
function segmentsRemoval(g: Graph, edge: number, branch: boolean): Removal {
  const ids = branch ? branchEdges(g, edge) : [edge];
  return {
    name: branch ? 'remove branch' : 'remove segment',
    change: (d) => removeSegmentsFrom(d, ids),
  };
}

/**
 * What a right click removes: on a node that is one of several selected, or on a segment between
 * two of them, all selected nodes (^290); else the node, or the segment (with Alt its branch); null
 * on empty canvas, which finishes the road (^43).
 */
export function rightClickRemoval(
  g: Graph,
  selection: number[],
  target: { handle: RoadHandle | null; hit: RoadHit | null },
  alt: boolean,
): Removal | null {
  const { handle, hit } = target;
  if (handle?.type === 'node') {
    return nodesRemoval(onSelection(selection, [handle.id]) ? selection : [handle.id]);
  }
  if (!hit) return null;
  const e = edgeOfId(g, hit.edge);
  if (e && onSelection(selection, [e.start, e.end])) return nodesRemoval(selection);
  return segmentsRemoval(g, hit.edge, alt);
}
