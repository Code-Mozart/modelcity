import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist, dot, fromAngle, sub } from '../curves/vec';
import type { GNode, Graph } from '../model/graph';

/** Whether `m` is where a node of a tower with `n` is: one lane width away on the normal of `n`, within the tolerance (^865), whatever its heading. */
const besideOnNormal = (m: GNode, n: GNode) =>
  Math.abs(dist(m, n) - LANE_WIDTH_M) < SAME_PLACE_M &&
  Math.abs(dot(sub(m, n), fromAngle(n.th))) < SAME_PLACE_M;

/** The heading of `n` or the opposite one, whichever is nearer to `th`. */
const nearerWay = (n: GNode, th: number) => (Math.cos(th - n.th) >= 0 ? n.th : n.th + Math.PI);

/**
 * A node that is new or has moved, and is where a node of a tower is, takes the heading of that
 * tower, the same or the opposite one, whichever is nearer (^867). A node that only turned keeps
 * its heading: turning it away from the tower is a violation (^254), but the editor helps, it does
 * not forbid (^843). Nodes that did not move never change.
 */
export function followTowers(before: Graph, after: Graph): Graph {
  const was = new Map(before.nodes.map((n) => [n.id, n]));
  const moved = (n: GNode) => {
    const b = was.get(n.id);
    return !b || Math.hypot(b.x - n.x, b.y - n.y) > 1e-9;
  };
  let changed = false;
  const nodes = after.nodes.map((m) => {
    if (!moved(m)) return m;
    const tower = after.nodes.find((n) => n.id !== m.id && !moved(n) && besideOnNormal(m, n));
    const th = tower ? nearerWay(tower, m.th) : m.th;
    if (Math.abs(Math.sin(th - m.th)) < 1e-12 && Math.cos(th - m.th) > 0) return m;
    changed = true;
    return { ...m, th };
  });
  return changed ? { ...after, nodes } : after;
}
