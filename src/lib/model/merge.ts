import type { Graph } from './graph';

/**
 * Merge a node into another (^248): the node `from` goes, its edges now run to `into`, which keeps
 * its position and heading. An edge between the two would have no length, so it goes too; an edge
 * that was a loop before stays.
 */
export function mergeNodes(g: Graph, from: number, into: number): Graph {
  if (from === into) return g;
  const moved = g.edges.map((e) => ({
    e,
    out: { ...e, start: e.start === from ? into : e.start, end: e.end === from ? into : e.end },
  }));
  const kept = moved.filter(({ e, out }) => !(out.start === out.end && e.start !== e.end));
  return { ...g, nodes: g.nodes.filter((n) => n.id !== from), edges: kept.map(({ out }) => out) };
}
