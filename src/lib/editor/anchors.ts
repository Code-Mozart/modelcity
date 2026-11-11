import { lengthTo } from '../curves/along';
import { add, fromAngle, mul, type Vec } from '../curves/vec';
import { nodeOf, type GEdge, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { cornersOf, type Corner, type EdgeHull } from './corners';
import type { Junction } from './junctions';

/** Where a lane in meets the traffic of the junction, and the way it runs there (^1051). */
export interface Anchor {
  at: Vec;
  th: number;
  /** How far from the node along its segment (meters). */
  s: number;
}

const shares = (a: GEdge, b: GEdge) => [a.start, a.end].some((n) => n === b.start || n === b.end);

/** The first place along the segment `e` where it crosses a segment that does not share a node with it (^1051), as meters from its start; null if there is none. */
function firstConflict(g: Graph, e: GEdge, others: GEdge[], corners: Corner[]): number | null {
  const pieces = curveOfEdge(g, e.id)?.pieces ?? [];
  const found = corners.flatMap((c) => {
    const other = c.a === e.id ? c.b : c.b === e.id ? c.a : null;
    const partner = others.find((x) => x.id === other);
    return partner && !shares(e, partner) ? [lengthTo(pieces, c.at)] : [];
  });
  return found.length ? Math.min(...found) : null;
}

/**
 * Where each lane in of a junction first meets another segment (^1051), by its stop node: the
 * first corner (^924, the red crosses of the debug layer) along any segment of the junction that
 * leaves the node, with a segment that does not share a node with it (those part from it or join
 * it and do not cross it), as the distance from the node along the axis of the lane. Marks and
 * arrows are put a fixed distance before this place. Without such a corner it is the node itself.
 */
export function anchorsOf(g: Graph, j: Junction, hulls: EdgeHull[]): Map<number, Anchor> {
  const inside = g.edges.filter((e) => j.segments.includes(e.id));
  const corners = cornersOf(hulls.filter((h) => j.segments.includes(h.edge)));
  const anchors = new Map<number, Anchor>();
  for (const n of new Set(inside.map((e) => e.start))) {
    const node = nodeOf(g, n);
    const hits = inside
      .filter((e) => e.start === n)
      .flatMap((edge) => {
        const s = firstConflict(g, edge, inside, corners);
        return s === null ? [] : [{ edge, s }];
      });
    const s = hits.length ? Math.min(...hits.map((h) => h.s)) : 0;
    // On the axis of the lane, not on the curve of the segment that turns: the line is across the lane and the arrow runs along it.
    if (node) anchors.set(n, { at: add(node, mul(fromAngle(node.th), s)), th: node.th, s });
  }
  return anchors;
}
