import type { NodeRow } from '../project/storage';
import type { RowChange } from './change';

/** The nodes that the segments of a change run between and that the change does not change itself: what the curves, the index and the chunks of the change need to know. */
export function neededNodes(c: RowChange): number[] {
  const changed = new Set(c.nodes.map((p) => (p.before ?? p.after)![0]));
  const ends = c.edges.flatMap((p) => [p.before, p.after].flatMap((e) => (e ? [e[1], e[2]] : [])));
  return [...new Set(ends)].filter((id) => !changed.has(id));
}

/**
 * The change with the nodes round it as they are in the storage now (^1260): a step that is
 * undone or done again later may find the nodes next to it somewhere else than when it was made
 * (they were moved in between), and the curves, the index and the chunks follow where they are.
 */
export async function withFreshContext(
  c: RowChange,
  read: (ids: number[]) => Promise<NodeRow[]>,
): Promise<RowChange> {
  const ids = neededNodes(c);
  return { ...c, context: ids.length ? await read(ids) : [] };
}
