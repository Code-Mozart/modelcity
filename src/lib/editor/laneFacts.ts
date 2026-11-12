import { boxesMeet } from '../curves/hull';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dot, fromAngle, perp, sub, type Vec } from '../curves/vec';
import { edgesOut, nodeOf, widthOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { crossAcross } from './corners';
import { curvesOf } from './derived';
import { towersOf } from './towers';

/**
 * What can be said about a lane that comes in at a node, from the six topological criteria alone
 * (^1092 to ^1098, ^1101): no junction is looked for, each node is judged by its own segments and
 * its neighbours. Derived from the graph, never stored.
 */

/** On which side of the heading line of a node another place lies: on the line (within the one tolerance for places, ^865), to its left or to its right (^1095, ^1101). */
export type Course = 'left' | 'ahead' | 'right';

export function sideOf(from: GNode, to: Vec): Course {
  const lateral = dot(sub(to, from), perp(fromAngle(from.th)));
  if (Math.abs(lateral) < SAME_PLACE_M) return 'ahead';
  return lateral > 0 ? 'right' : 'left';
}

/** What a segment does (^1101): the side of its end node of the heading line of its start node. */
export function courseOf(g: Graph, e: GEdge): Course | null {
  const [a, b] = [nodeOf(g, e.start), nodeOf(g, e.end)];
  return a && b ? sideOf(a, b) : null;
}

/** Where a segment of a node meets a segment of another lane in (^1096): they cross, or end at the same node. */
export interface Conflict {
  /** The node the other lane comes in at. */
  from: GNode;
  mine: GEdge;
  theirs: GEdge;
}

export interface LaneFacts {
  node: GNode;
  /** Its segments that count (^1101). */
  edges: GEdge[];
  /** The width of its lane. */
  width: number;
  /** The other lanes it meets. */
  conflicts: Conflict[];
  /** One of the conflicts is with a lane that comes in from its right (^1101). */
  givesWay: boolean;
  /** The ways its segments lead, if it does not lead everywhere that is typical (^1100); else null. */
  incomplete: Course[] | null;
}

type Curve = ReturnType<typeof curvesOf>[number];

/** The number of the tower of every node: a node in no tower is a tower of its own. */
function towerIds(g: Graph): Map<number, number> {
  const ids = new Map<number, number>();
  towersOf(g).forEach((t, i) => t.forEach((n) => ids.set(n.id, i)));
  g.nodes.forEach((n, i) => {
    if (!ids.has(n.id)) ids.set(n.id, -1 - i);
  });
  return ids;
}

/** Which towers have a segment between them, in either way (^1101). */
function adjacency(g: Graph, tower: Map<number, number>): Map<number, Set<number>> {
  const near = new Map<number, Set<number>>();
  for (const e of g.edges) {
    const [a, b] = [tower.get(e.start)!, tower.get(e.end)!];
    if (a === b) continue;
    near.set(a, (near.get(a) ?? new Set()).add(b));
    near.set(b, (near.get(b) ?? new Set()).add(a));
  }
  return near;
}

const shares = (a: GEdge, b: GEdge) =>
  a.start === b.start || a.end === b.end || a.start === b.end || a.end === b.start;

/** Whether two segments meet (^1096): they end at the same node, or they cross and share no node. */
function meet(a: Curve, b: Curve): boolean {
  if (a.edge.end === b.edge.end) return true;
  if (shares(a.edge, b.edge) || !boxesMeet(a.box, b.box)) return false;
  return a.pieces.some((p) => b.pieces.some((q) => crossAcross(p, q).length > 0));
}

/** The towers that are arms of the pattern a node is in (^1101): adjacent to its tower and to another tower that is adjacent to it, so that a plain road, whose towers behind and ahead do not touch, has none. */
function armsOf(near: Map<number, Set<number>>, own: number): number[] {
  const around = [...(near.get(own) ?? [])];
  return around.filter((t) => around.some((u) => u !== t && near.get(t)?.has(u)));
}

/** Whether a lane goes out of the tower `t` into the pattern: a segment from another of its towers ends at a node of it (^1099). */
const hasOut = (g: Graph, tower: Map<number, number>, t: number, pattern: number[]) =>
  g.edges.some(
    (e) =>
      tower.get(e.end) === t && tower.get(e.start) !== t && pattern.includes(tower.get(e.start)!),
  );

/** The segments of other lanes (in other towers) that the segments `edges` of a node meet (^1096). */
function conflictsOf(g: Graph, tower: Map<number, number>, n: GNode, edges: GEdge[]): Conflict[] {
  const curves = curvesOf(g);
  const own = tower.get(n.id);
  return curves
    .filter((b) => tower.get(b.edge.start) !== own)
    .flatMap((b) =>
      curves
        .filter((a) => edges.includes(a.edge) && meet(a, b))
        .map((a) => ({ from: nodeOf(g, b.edge.start)!, mine: a.edge, theirs: b.edge })),
    );
}

/** The segments of a node that count for the rules (^1101): those that lead into its arms, or, if there are fewer than two arms, all that leave its tower, if there are two or more. */
function segmentsOf(g: Graph, tower: Map<number, number>, n: GNode, arms: number[]): GEdge[] {
  const leaving = edgesOut(g, n.id).filter((e) => tower.get(e.end) !== tower.get(n.id));
  if (arms.length >= 2) return leaving.filter((e) => arms.includes(tower.get(e.end)!));
  return leaving.length >= 2 ? leaving : [];
}

/**
 * The facts of every lane in that is part of a small pattern (^1072): its tower and the towers its
 * segments lead to have at most two nodes each, 1+1 or a single lane one way. A node is a lane in
 * if its segments lead into two or more arms around it, or (a node a plain road runs through has
 * one) it leaves its tower in two or more ways.
 */
export function laneFactsOf(g: Graph): LaneFacts[] {
  const tower = towerIds(g);
  const near = adjacency(g, tower);
  const size = (t: number) => [...tower.values()].filter((x) => x === t).length;
  return g.nodes.flatMap((n): LaneFacts[] => {
    const own = tower.get(n.id)!;
    const arms = armsOf(near, own);
    const edges = segmentsOf(g, tower, n, arms);
    const towers = [own, ...edges.map((e) => tower.get(e.end)!)];
    if (!edges.length || towers.some((t) => size(t) > 2)) return [];
    const conflicts = conflictsOf(g, tower, n, edges);
    const reached = new Set(edges.map((e) => tower.get(e.end)));
    const typical = arms.some((t) => hasOut(g, tower, t, [own, ...arms]) && !reached.has(t));
    return [
      {
        node: n,
        edges,
        width: widthOf(g, edges[0]!),
        conflicts,
        givesWay: conflicts.some((c) => sideOf(n, c.from) === 'right'),
        incomplete: arms.length >= 2 && typical ? edges.flatMap((e) => courseOf(g, e) ?? []) : null,
      },
    ];
  });
}
