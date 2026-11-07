import { LANE_WIDTH_M } from '../curves/lane';
import { nearestParam, sweeps } from '../curves/piece';
import { SAME_PLACE_M, SAME_WAY } from '../curves/tolerance';
import type { Piece, TwoArcEdge } from '../curves/types';
import { dist, dot, fromAngle, type Vec } from '../curves/vec';
import type { GEdge, GNode, Graph } from '../model/graph';
import { nearestOnPieces } from '../snap/geometry';
import { curveOfEdge } from './chains';

/**
 * A derived node (^821, ^822, ^823): a node that is derived from other nodes or segments and never
 * stored. `edge` is the segment it lies on. Its id is negative, so it never collides with a real one.
 */
export interface DerivedNode extends GNode {
  edge: number;
  /** `touch`: a node touches the segment there (^822); `inflection`: the inflection point of an S-curve or hook (^823). */
  kind: 'touch' | 'inflection';
}

/** The most rounds of the cascade: each one finds the nodes that the nodes of the round before derive (^812). */
const MAX_ROUNDS = 12;

const headingOf = (t: { x: number; y: number }) => Math.atan2(t.y, t.x);

/** A box that holds the pieces, to leave the segments that are far from a node out. */
export function boxOf(pieces: Piece[]) {
  const xs = pieces.flatMap((p) =>
    p.type === 'arc' ? [p.c.x - p.r, p.c.x + p.r] : [p.P.x, p.Q.x],
  );
  const ys = pieces.flatMap((p) =>
    p.type === 'arc' ? [p.c.y - p.r, p.c.y + p.r] : [p.P.y, p.Q.y],
  );
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export const near = (box: ReturnType<typeof boxOf>, n: Vec, m: number) =>
  n.x >= box.x0 - m && n.x <= box.x1 + m && n.y >= box.y0 - m && n.y <= box.y1 + m;

export interface Placed {
  x: number;
  y: number;
  th: number;
}

/** Where a node touches a segment (^818): on its offset curve, with the segment running the same way or the opposite way. */
export function touchPoint(pieces: Piece[], n: Placed): Placed | null {
  const at = nearestOnPieces(pieces, n);
  if (!at || Math.abs(at.d - LANE_WIDTH_M) >= SAME_PLACE_M) return null;
  const along = Math.abs(dot({ x: at.tx, y: at.ty }, fromAngle(n.th)));
  return along > 1 - SAME_WAY
    ? { x: at.pt.x, y: at.pt.y, th: headingOf({ x: at.tx, y: at.ty }) }
    : null;
}

/** The way the middle straight of an S-curve or hook runs, also where the arcs meet and it has no length (^823). */
function middleHeading(E: TwoArcEdge): number | null {
  if (E.mid) return headingOf({ x: E.mid.ux, y: E.mid.uy });
  const line = E.pieces.find((p) => p.type === 'line');
  return line?.type === 'line'
    ? headingOf({ x: line.Q.x - line.P.x, y: line.Q.y - line.P.y })
    : null;
}

/** The inflection points of the S-curves and hooks, with the heading of their middle line (^823). */
function inflections(g: Graph): { edge: GEdge; at: Placed }[] {
  return g.edges.flatMap((edge) => {
    const E = curveOfEdge(g, edge.id);
    const th = E && (E.kind === 'S' || E.kind === 'H') ? middleHeading(E) : null;
    return E && th !== null && 'J' in E ? [{ edge, at: { x: E.J.x, y: E.J.y, th } }] : [];
  });
}

/** The segments of a graph with their pieces and the box that holds them. */
export const curvesOf = (g: Graph) =>
  g.edges.flatMap((edge) => {
    const pieces = curveOfEdge(g, edge.id)?.pieces;
    return pieces ? [{ edge, pieces, box: boxOf(pieces) }] : [];
  });

/** The nodes a node derives: one on each segment it touches (^822). */
function touched(
  curves: { edge: GEdge; pieces: Piece[]; box: ReturnType<typeof boxOf> }[],
  n: Placed,
  add: (edge: GEdge, at: Placed, kind: DerivedNode['kind']) => DerivedNode | null,
): DerivedNode[] {
  return curves.flatMap(({ edge, pieces, box }) => {
    const at = near(box, n, LANE_WIDTH_M + SAME_PLACE_M) ? touchPoint(pieces, n) : null;
    const node = at && add(edge, at, 'touch');
    return node ? [node] : [];
  });
}

/**
 * The derived nodes of a graph (^822, ^823): the inflection points, and wherever a node, real or
 * derived, touches a segment, a node on it (it touches that node in turn, so they form a tower,
 * ^819). Derived nodes touch further segments, so the rule cascades to any number of lanes beside
 * each other (^812). Derived from the graph, never stored.
 */
export function derivedNodes(g: Graph): DerivedNode[] {
  const curves = curvesOf(g);
  const out: DerivedNode[] = [];
  const known = (at: Placed) =>
    g.nodes.some((n) => dist(n, at) < SAME_PLACE_M) || out.some((n) => dist(n, at) < SAME_PLACE_M);
  const add = (edge: GEdge, at: Placed, kind: DerivedNode['kind']) => {
    if (known(at)) return null;
    const node = { id: -(out.length + 1), ...at, edge: edge.id, kind };
    out.push(node);
    return node;
  };
  inflections(g).forEach(({ edge, at }) => add(edge, at, 'inflection'));
  let frontier: Placed[] = [...g.nodes, ...out];
  for (let round = 0; round < MAX_ROUNDS && frontier.length; round++) {
    frontier = frontier.flatMap((n) => touched(curves, n, add));
  }
  return out;
}

/** Where on the segment a point is, to put the points of a segment in order: the piece, and the place on it. */
const along = (pieces: Piece[], at: Vec): number => {
  const i = pieces.reduce(
    (best, p, k) => {
      const d = dist(at, nearestOnPieces([p], at)?.pt ?? at);
      return d < best.d ? { k, d } : best;
    },
    { k: 0, d: Infinity },
  );
  return i.k + nearestParam(pieces[i.k]!, at);
};

/**
 * The graph with the derived nodes in it (^822): the segments they are on are cut at them, so
 * that what is parallel, touching and a tower is found for the pieces too, as for any segments
 * (the partially parallel segments of ^363). Straight segments and bends only; an S-curve or a hook
 * is left whole (^828). Its nodes and edges have negative ids. Only for looking at, never stored.
 */
export function withDerived(g: Graph, derived: DerivedNode[]): Graph {
  if (!derived.length) return g;
  let next = -1;
  const edges = g.edges.flatMap((e): GEdge[] => {
    const E = curveOfEdge(g, e.id);
    const mine = derived.filter((d) => d.edge === e.id && d.kind === 'touch');
    if (!E || !mine.length || (E.kind !== 'line' && E.kind !== 'C')) return [e];
    const arc = E.pieces.find(sweeps);
    const radius = arc?.type === 'arc' ? arc.r : null;
    const ids = [
      e.start,
      ...mine.sort((a, b) => along(E.pieces, a) - along(E.pieces, b)).map((d) => d.id),
      e.end,
    ];
    return ids.slice(1).map((end, i) => ({ ...e, id: next--, start: ids[i]!, end, radius }));
  });
  return { ...g, nodes: [...g.nodes, ...derived], edges };
}
