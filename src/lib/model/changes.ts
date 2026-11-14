import type { Graph } from './graph';

/**
 * What differs between two graphs that have the same shape (^941): the same nodes and the same
 * segments, in the same places in the lists, with the same two nodes at their ends. That is what a
 * move, a turn, a new radius or a new lane of something is: only the objects that changed are
 * different ones (an edit makes new objects only for what it changed). Everything that is made from
 * a graph can then be made again for those only. `null` when the shape differs (a node or a segment
 * was added, removed or joined to other nodes): then everything is made again.
 */
export interface Changes {
  /** The places in `nodes` of the nodes that are different objects. */
  nodes: number[];
  /** The places in `edges` of the segments that are different objects. */
  edges: number[];
}

const found = new WeakMap<Graph, { from: Graph; changes: Changes | null }>();

/** One pass of comparing objects over both lists, found once for a pair of graphs. */
export function changesBetween(from: Graph, to: Graph): Changes | null {
  const was = found.get(to);
  if (was && was.from === from) return was.changes;
  const changes = compare(from, to);
  found.set(to, { from, changes });
  return changes;
}

function compare(a: Graph, b: Graph): Changes | null {
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) return null;
  if (a.lanes !== b.lanes) return null;
  const nodes = differing(a.nodes, b.nodes, (x, y) => x.id === y.id);
  const edges = differing(
    a.edges,
    b.edges,
    (x, y) => x.id === y.id && x.start === y.start && x.end === y.end,
  );
  return nodes && edges && { nodes, edges };
}

/** The places where two lists of the same length hold different objects, or null if two of them are not of the same kind (`same`). */
function differing<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): number[] | null {
  const places: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!same(a[i]!, b[i]!)) return null;
    places.push(i);
  }
  return places;
}
