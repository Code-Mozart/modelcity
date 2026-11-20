import { curveOf, type SkeletonEdge } from '../map/curve';
import type { NodeRow } from '../project/storage';
import type { RowChange } from './change';

/** What an operation in progress shows over the map (^1262): the segments and nodes it would make or change, and the ids of the loaded segments and nodes it hides. */
export interface DraftView {
  edges: SkeletonEdge[];
  nodes: NodeRow[];
  hiddenEdges: ReadonlySet<number>;
  hiddenNodes: ReadonlySet<number>;
}

export const NO_DRAFT: DraftView = {
  edges: [],
  nodes: [],
  hiddenEdges: new Set(),
  hiddenNodes: new Set(),
};

/** The draft as it is drawn: its rows after it, with their curves; the rows it changes or takes away are hidden. */
export function draftViewOf(
  c: RowChange | null,
  nodeOf: (id: number) => NodeRow | undefined,
): DraftView {
  if (!c) return NO_DRAFT;
  const nodes = c.nodes.flatMap((p) => (p.after ? [p.after] : []));
  const known = new Map([...c.context, ...nodes].map((n) => [n[0], n]));
  const find = (id: number) => known.get(id) ?? nodeOf(id);
  const edges = c.edges.flatMap((p) => {
    const e = p.after;
    const [a, b] = e ? [find(e[1]), find(e[2])] : [];
    return e && a && b ? [curveOf(e, a, b)] : [];
  });
  const id = (p: { before: [number, ...unknown[]] | null; after: [number, ...unknown[]] | null }) =>
    (p.before ?? p.after)![0];
  return {
    edges,
    nodes,
    hiddenEdges: new Set(c.edges.map(id)),
    hiddenNodes: new Set(c.nodes.map(id)),
  };
}
