import { edgesAt, type GEdge, type Graph } from '../model/graph';
import { parallel, touching } from './parallel';
import { concentricWithParallel } from './sharedRadius';

/**
 * A segment with a node that is new or has moved, that touches another segment at both ends (a
 * node snapped onto an offset curve, ^279) without running parallel to it, gets the radius that
 * makes it concentric, whatever radius it had (^877, user: yes). Only if that makes it parallel:
 * where the radius does not fit nothing changes. Segments of nodes that did not move never change.
 */
export function followParallels(before: Graph, after: Graph): Graph {
  const was = new Map(before.nodes.map((n) => [n.id, n]));
  const moved = after.nodes.filter((n) => {
    const b = was.get(n.id);
    return !b || Math.hypot(b.x - n.x, b.y - n.y) > 1e-9;
  });
  const ids = new Set(moved.flatMap((n) => edgesAt(after, n.id).map((e) => e.id)));
  let g = after;
  for (const id of ids) {
    const e = g.edges.find((x) => x.id === id);
    const beside = e && g.edges.filter((s) => s.id !== id && touching(g, s, e));
    if (!e || !beside?.length || beside.some((s) => parallel(g, s, e))) continue;
    const next = concentricWithParallel(g, id);
    const now = next.edges.find((x): x is GEdge => x.id === id);
    if (now && beside.some((s) => parallel(next, s, now))) g = next;
  }
  return g;
}
