import type { RowChange } from '../edit/change';
import { branchEdgesOf } from '../edit/branchRows';
import { deleteEdges, deleteNodes, type RowSource } from '../edit/deleteNodes';
import type { Doing } from './deleting';
import { NOT_DRAWING, type DrawState } from './drawing';

/** What a delete does: the change of the map, and the road being drawn after it. */
export interface DeletePlan {
  change: RowChange;
  draw: DrawState;
}

/**
 * The node the road being drawn goes on from when its node is deleted (^70, `main`'s
 * `neighbourOf`): the one before it, at the other end of the segment that leads to it.
 */
async function neighbourOf(source: RowSource, d: DrawState): Promise<number | null> {
  if (d.active === null) return null;
  const at = await source.edgesAt([d.active]);
  const e = at.find((r) => (d.end === 'end' ? r[2] === d.active : r[1] === d.active));
  return e ? (d.end === 'end' ? e[1] : e[2]) : null;
}

const removed = (c: RowChange) => new Set(c.nodes.filter((p) => !p.after).map((p) => p.before![0]));

/**
 * The change a delete makes, worked out from the storage (^434, ^920, ^160), and the road being
 * drawn after it (`main`'s `afterRemoval`): when its node goes, it goes on from the node before
 * (which stays even with no segment left); a road whose node is still there goes on from it (it
 * stays even with no segment left); else no road is drawn.
 */
export async function planDelete(
  doing: Doing,
  source: RowSource,
  draw: DrawState,
): Promise<DeletePlan> {
  const losesTip =
    doing.kind === 'nodes' && draw.active !== null && doing.ids.includes(draw.active);
  const tip = losesTip ? await neighbourOf(source, draw) : draw.active;
  const change = await changeOf(doing, source, tip);
  const gone = removed(change);
  const alive = (id: number | null) => (id !== null && !gone.has(id) ? id : null);
  const active = alive(tip);
  const after = active === null ? NOT_DRAWING : { ...draw, active, origin: alive(draw.origin) };
  return { change, draw: draw.active === null ? draw : after };
}

function changeOf(doing: Doing, source: RowSource, keep: number | null): Promise<RowChange> {
  if (doing.kind === 'nodes') return deleteNodes(source, doing.ids, keep);
  if (doing.kind === 'segments') return deleteEdges(source, doing.edges, keep);
  return branchEdgesOf(source, doing.edge).then((edges) => deleteEdges(source, edges, keep));
}
