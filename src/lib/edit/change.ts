import type { EdgeRow, MapChange, NodeRow } from '../project/storage';

/** A row as it was and as it is: `null` before is a row that was made, `null` after one that was taken away. */
export interface Pair<R> {
  before: R | null;
  after: R | null;
}

/**
 * What an operation changed on the map (^1260): the rows that are different, each as it was and
 * as it is, so that the same thing goes both ways (undo is the change turned round). `context` are
 * nodes that were read but are not changed: the ends of changed segments, needed to work out their
 * curves and where they are (the index, the chunks).
 */
export interface RowChange {
  nodes: Pair<NodeRow>[];
  edges: Pair<EdgeRow>[];
  context: NodeRow[];
}

export const NO_CHANGE: RowChange = { nodes: [], edges: [], context: [] };

export const isEmpty = (c: RowChange) => !c.nodes.length && !c.edges.length;

/** The change the other way round: what undoes it. */
export const inverse = (c: RowChange): RowChange => ({
  nodes: c.nodes.map(({ before, after }) => ({ before: after, after: before })),
  edges: c.edges.map(({ before, after }) => ({ before: after, after: before })),
  context: c.context,
});

/** The change as the storage takes it: the rows that are there after it (new or different), and the ids of those that are gone. */
export function toMapChange(c: RowChange): MapChange {
  const rows = <R extends [number, ...unknown[]]>(pairs: Pair<R>[]) =>
    pairs.flatMap((p) => (p.after ? [p.after] : []));
  const gone = <R extends [number, ...unknown[]]>(pairs: Pair<R>[]) =>
    pairs.flatMap((p) => (p.after || !p.before ? [] : [p.before[0]]));
  return {
    nodes: rows(c.nodes),
    edges: rows(c.edges),
    removedNodes: gone(c.nodes),
    removedEdges: gone(c.edges),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Pairs of rows, leaving out those that did not change (a row that was changed and then changed back is not a change). */
export const changed = <R>(pairs: Pair<R>[]): Pair<R>[] =>
  pairs.filter((p) => !same(p.before, p.after));

/**
 * Several changes, one after the other, as one (^1260): each row as it was before the first that
 * touched it and as it is after the last, so that a batch of steps is written in one transaction
 * (all or nothing). A row that is back as it was is not a change.
 */
export function compose(changes: RowChange[]): RowChange {
  const merge = <R extends [number, ...unknown[]]>(lists: Pair<R>[][]): Pair<R>[] => {
    const by = new Map<number, Pair<R>>();
    for (const p of lists.flat()) {
      const id = (p.before ?? p.after)![0];
      const kept = by.get(id);
      if (kept) kept.after = p.after;
      else by.set(id, { before: p.before, after: p.after });
    }
    return [...by.values()];
  };
  const context = new Map(changes.flatMap((c) => c.context).map((n) => [n[0], n]));
  const nodes = changed(merge(changes.map((c) => c.nodes)));
  const edges = withCurves(merge(changes.map((c) => c.edges)), nodes);
  return { nodes, edges, context: [...context.values()] };
}

/**
 * The segments that changed, and those whose rows are the same but one of whose nodes changed
 * (^1265): their curves and boxes did, so the index and the chunks have to hear of them.
 */
export function withCurves(edges: Pair<EdgeRow>[], nodes: Pair<NodeRow>[]): Pair<EdgeRow>[] {
  const moved = new Set(nodes.map((p) => (p.before ?? p.after)![0]));
  return edges.filter(
    (p) =>
      !same(p.before, p.after) || (p.after && (moved.has(p.after[1]) || moved.has(p.after[2]))),
  );
}
