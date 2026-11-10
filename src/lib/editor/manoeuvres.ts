import { alongOrAgainst, sameWay, SAME_PLACE_M } from '../curves/tolerance';
import { isDegenerate, pieceLength } from '../curves/piece';
import type { Piece } from '../curves/types';
import { dist, dot, fromAngle, perp, sub, type Vec } from '../curves/vec';
import { edgesAt, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { touchPoint } from './derived';

/**
 * What a segment does between its start and its end, as it is travelled (^1006): judged by where
 * its end node lies and heads, seen from its start node. `straight`: on the line of the start
 * heading; a `shift`: the same heading, moved sideways; a turn: another heading; a `u-turn`: the
 * opposite heading.
 */
export type Manoeuvre =
  'straight' | 'left turn' | 'right turn' | 'shift left' | 'shift right' | 'u-turn';

/** The sum of the turning of the arcs of a segment: positive is to the right (y is down). */
export const turning = (g: Graph, e: GEdge) =>
  (curveOfEdge(g, e.id)?.pieces ?? []).reduce((n, p) => n + (p.type === 'arc' ? p.da : 0), 0);

export function manoeuvreOf(g: Graph, e: GEdge): Manoeuvre | null {
  const [a, b] = [nodeOf(g, e.start), nodeOf(g, e.end)];
  if (!a || !b) return null;
  if (!alongOrAgainst(a, b)) return turning(g, e) > 0 ? 'right turn' : 'left turn';
  if (!sameWay(a, b)) return 'u-turn';
  const side = dot(sub(b, a), perp(fromAngle(a.th)));
  if (Math.abs(side) < SAME_PLACE_M) return 'straight';
  return side > 0 ? 'shift right' : 'shift left';
}

/** A segment at a node of a split or merge, and what it is there (^1007 to ^1009). */
export interface Role {
  edge: number;
  /** `in`: the segment ends at the node; `out`: it starts there. */
  way: 'in' | 'out';
  manoeuvre: Manoeuvre | null;
  /** It pulls through the node: with a segment on the other side of the node it is one curve (^1007). */
  main: boolean;
  /** A shift that ends (out) or begins (in) beside another segment of the node: a lane is added, or ends (^1009). */
  lane: 'extension' | 'narrowing' | null;
}

/** A node where segments split or merge, with the role of each of its segments (^1008). */
export interface JunctionNode {
  node: GNode;
  /** `split`: more segments out than in; `merge`: more in than out; `both`: neither. */
  kind: 'split' | 'merge' | 'both';
  /** No segment pulls through: the segments split or merge as equals. */
  equal: boolean;
  roles: Role[];
}

/** The pieces of a segment that have a length. */
const realPieces = (g: Graph, e: GEdge): Piece[] =>
  (curveOfEdge(g, e.id)?.pieces ?? []).filter((p) => !isDegenerate(p));

/**
 * Whether the piece `b` goes on as the piece `a` ends, where they meet with one heading: both are
 * straight, or both are arcs of one circle (judged where the points are, ^853: the far end of each
 * lies on the circle of the other).
 */
function sameBend(a: Piece, b: Piece): boolean {
  if (a.type === 'line' || b.type === 'line') return a.type === b.type;
  const on = (p: Vec, arc: Piece & { type: 'arc' }) =>
    Math.abs(dist(p, arc.c) - arc.r) < SAME_PLACE_M;
  return Math.sign(a.da) === Math.sign(b.da) && on(b.Q, a) && on(a.P, b);
}

/** A pair of an incoming and an outgoing segment that go on as one curve through the node, with how long each keeps to it. */
interface Through {
  i: GEdge;
  o: GEdge;
  before: number;
  after: number;
}

/**
 * The segments of a node that pull through it (^1007): an incoming and an outgoing one of the same
 * lane configuration whose curve does not change its bend at the node. Where a segment has more
 * than one such partner, the one that keeps to the common curve longest is it.
 */
function mains(g: Graph, ins: GEdge[], outs: GEdge[]): Set<number> {
  const pairs = ins.flatMap((i) =>
    outs.flatMap((o): Through[] => {
      const [last, first] = [realPieces(g, i).at(-1), realPieces(g, o)[0]];
      if (!last || !first || i.lane !== o.lane || !sameBend(last, first)) return [];
      return [{ i, o, before: pieceLength(last), after: pieceLength(first) }];
    }),
  );
  const best = (of: Through[], by: (t: Through) => number) =>
    of.reduce((a, b) => (by(b) > by(a) ? b : a));
  const main = pairs.filter(
    (t) =>
      best(
        pairs.filter((x) => x.i === t.i),
        (x) => x.after,
      ) === t &&
      best(
        pairs.filter((x) => x.o === t.o),
        (x) => x.before,
      ) === t,
  );
  return new Set(main.flatMap((t) => [t.i.id, t.o.id]));
}

export const isShift = (m: Manoeuvre | null) => m === 'shift left' || m === 'shift right';

/** Whether the far node of the segment `e` of the node `n` lies beside another segment of the node on the same side of it: one lane width away, heading along it (^818). */
export function besideSibling(g: Graph, n: GNode, e: GEdge, siblings: GEdge[]): boolean {
  const far = nodeOf(g, e.start === n.id ? e.end : e.start);
  return siblings.some((s) => {
    const pieces = s.id === e.id ? null : curveOfEdge(g, s.id)?.pieces;
    return !!far && !!pieces && touchPoint(pieces, far) !== null;
  });
}

interface Around {
  main: Set<number>;
  ins: GEdge[];
  outs: GEdge[];
}

function roleOf(g: Graph, n: GNode, e: GEdge, ctx: Around): Role {
  const way = e.end === n.id ? 'in' : 'out';
  const manoeuvre = manoeuvreOf(g, e);
  const beside = isShift(manoeuvre) && besideSibling(g, n, e, way === 'in' ? ctx.ins : ctx.outs);
  const lane = beside ? (way === 'out' ? 'extension' : 'narrowing') : null;
  return { edge: e.id, way, manoeuvre, main: ctx.main.has(e.id), lane };
}

/** The nodes where segments split or merge (three segments or more), with the roles of their segments (^1008). */
export function junctionNodes(g: Graph): JunctionNode[] {
  return g.nodes.flatMap((n): JunctionNode[] => {
    const at = edgesAt(g, n.id);
    if (at.length < 3) return [];
    const [ins, outs] = [at.filter((e) => e.end === n.id), at.filter((e) => e.start === n.id)];
    const main = mains(g, ins, outs);
    const kind = outs.length > ins.length ? 'split' : ins.length > outs.length ? 'merge' : 'both';
    const roles = at.map((e) => roleOf(g, n, e, { main, ins, outs }));
    return [{ node: n, kind, equal: main.size === 0, roles }];
  });
}

/** A word of the debug layer under a node (^1010). */
export interface JunctionLabel {
  at: Vec;
  text: string;
}

/**
 * The labels of the debug layer (^1010): under every node of a split or merge its kind, with
 * `equal` if no segment pulls through. What a segment is there is shown by its sign (^1015).
 */
export const junctionLabels = (g: Graph): JunctionLabel[] =>
  junctionNodes(g).map((j) => ({
    at: { x: j.node.x, y: j.node.y },
    text: j.equal ? `${j.kind}, equal` : j.kind,
  }));
