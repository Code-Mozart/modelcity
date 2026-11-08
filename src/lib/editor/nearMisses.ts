import { LANE_WIDTH_M } from '../curves/lane';
import { NEAR_MISS_M, SAME_PLACE_M } from '../curves/tolerance';
import { dist, dot, fromAngle, sub } from '../curves/vec';
import type { GNode, Graph } from '../model/graph';

const mm = (m: number) => `${(m * 1000).toFixed(1)} mm`;
const degrees = (rad: number) => `${((rad * 180) / Math.PI).toFixed(3)}°`;

/**
 * The other nodes that a node almost touches (^884): a lane width away, on the normal, along or
 * against the heading, to within `NEAR_MISS_M`, but not within the tolerance in every respect. Said
 * as what each is off by, so that a relation that looks right but is not can be seen.
 */
export function nearMisses(g: Graph, id: number): string[] {
  const n = g.nodes.find((x) => x.id === id);
  if (!n) return [];
  return g.nodes.flatMap((o) => {
    const miss = o.id === n.id ? null : missOf(n, o);
    return miss ? [`node ${o.id}: ${miss}`] : [];
  });
}

function missOf(n: GNode, o: GNode): string | null {
  const t = fromAngle(o.th);
  const apart = dist(n, o) - LANE_WIDTH_M;
  const slip = dot(sub(n, o), t);
  const turn = Math.atan2(Math.sin(n.th - o.th), Math.cos(n.th - o.th));
  const way = Math.min(Math.abs(turn), Math.PI - Math.abs(turn));
  const heading = way * LANE_WIDTH_M;
  const off = [Math.abs(apart), Math.abs(slip), heading];
  const near = off.every((v) => v < NEAR_MISS_M);
  const exact = off.every((v) => v < SAME_PLACE_M);
  if (!near || exact) return null;
  return `distance ${mm(apart)}, slip ${mm(slip)}, heading ${degrees(way)}`;
}
