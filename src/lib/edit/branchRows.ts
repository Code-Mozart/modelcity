import { branchOfEdge } from '../map/branch';
import type { EdgeRow } from '../project/storage';
import type { RowSource } from './deleteNodes';

/** The segments between the nodes of a branch, all of them (what `main` deletes with a branch, `branchEdges`, ^160): also one that is not part of the chain but joins two of its nodes. */
function between(rows: Map<number, EdgeRow>, nodes: Set<number>): EdgeRow[] {
  return [...rows.values()].filter((e) => nodes.has(e[1]) && nodes.has(e[2]));
}

/**
 * The segments of the branch that a segment is on, found in the storage (^128, ^160): a branch
 * is followed as far as it goes, not as far as it is loaded. The walk of `map/branch.ts` is run
 * on what is read; where it stops at a node whose segments are not known yet they are read, until
 * it comes to a split, an end, or round again.
 */
export async function branchEdgesOf(source: RowSource, start: EdgeRow): Promise<EdgeRow[]> {
  const rows = new Map<number, EdgeRow>([[start[0], start]]);
  const at = new Map<number, Set<number>>();
  const learn = async (ids: number[]) => {
    ids.forEach((id) => at.set(id, new Set()));
    for (const e of await source.edgesAt(ids)) {
      rows.set(e[0], e);
      for (const n of [e[1], e[2]]) at.get(n)?.add(e[0]);
    }
  };
  await learn([start[1], start[2]]);
  for (;;) {
    const branch = branchOfEdge(
      {
        edgesAt: (n) => [...(at.get(n) ?? [])].map((id) => rows.get(id)!),
        complete: (n) => at.has(n),
      },
      start,
    );
    if (branch.complete) return between(rows, new Set(branch.nodes));
    await learn(branch.nodes.filter((n) => !at.has(n)));
  }
}
