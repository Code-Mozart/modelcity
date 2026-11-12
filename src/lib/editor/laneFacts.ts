import { boxesMeet } from '../curves/hull';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dot, fromAngle, perp, sub, type Vec } from '../curves/vec';
import {
  edgesIn,
  edgesOut,
  nodeOf,
  widthOf,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
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
  /** A segment ends at the node: there is road before it (^1105). */
  behind: boolean;
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

/**
 * The segments of a node that count for the rules (^1101): none if the node is not a lane in, the
 * place a lane comes in at (^1105): a node that segments end at (two or more are a merge, which is
 * a place lanes arrive at) or that is the end of a road with nothing behind it (one that leaves
 * in a single way is only the end of a road). Else those that lead into its arms, or, if there
 * are fewer than two arms, all that leave its tower, if there are two or more.
 */
function segmentsOf(g: Graph, tower: Map<number, number>, n: GNode, arms: number[]): GEdge[] {
  const behind = edgesIn(g, n.id).length;
  const leaving = edgesOut(g, n.id).filter((e) => tower.get(e.end) !== tower.get(n.id));
  if (behind > 1) return [];
  if (arms.length >= 2) {
    return behind
      ? leaving.filter((e) => arms.includes(tower.get(e.end)!))
      : leaving.length >= 2
        ? leaving
        : [];
  }
  return leaving.length >= 2 || (behind && leaving.some((e) => joinedByOtherRoad(g, tower, n, e)))
    ? leaving
    : [];
}

/** Whether another road ends where the segment `e` of the node `n` ends: a segment from a node of another tower (a lane merging with a lane of its own tower is a lane change, ^1056). */
function joinedByOtherRoad(g: Graph, tower: Map<number, number>, n: GNode, e: GEdge): boolean {
  return edgesIn(g, e.end).some((o) => o.id !== e.id && tower.get(o.start) !== tower.get(n.id));
}

/**
 * The facts of every lane in that is part of a small pattern (^1072): its tower and the towers its
 * segments lead to have at most two nodes each, 1+1 or a single lane one way. A node is a lane in
 * if its segments lead into two or more arms around it, or (a node a plain road runs through has
 * one) it leaves its tower in two or more ways.
 */
export function laneFactsOf(g: Graph): LaneFacts[] {
  const tower = towerIds(g);
  return withIncomplete(g, tower, factsOf(g, tower));
}

/** The facts of the lanes in, without what is missing (^1101). */
function factsOf(g: Graph, tower: Map<number, number>): LaneFacts[] {
  const near = adjacency(g, tower);
  const size = (t: number) => [...tower.values()].filter((x) => x === t).length;
  return g.nodes.flatMap((n): LaneFacts[] => {
    const own = tower.get(n.id)!;
    const arms = armsOf(near, own);
    const edges = segmentsOf(g, tower, n, arms);
    const towers = [own, ...edges.map((e) => tower.get(e.end)!)];
    if (!edges.length || towers.some((t) => size(t) > 2)) return [];
    const conflicts = conflictsOf(g, tower, n, edges);
    return [
      {
        node: n,
        edges,
        behind: edgesIn(g, n.id).length > 0,
        width: widthOf(g, edges[0]!),
        conflicts,
        givesWay: conflicts.some((c) => sideOf(n, c.from) === 'right'),
        incomplete: null,
      },
    ];
  });
}

/**
 * The segments inside junctions, whatever their size (^1104): those of a lane in, a node that
 * leaves its tower in two or more ways or leads into two or more arms (^1101). Found per node.
 */
export function junctionEdgeIds(g: Graph): Set<number> {
  const tower = towerIds(g);
  const near = adjacency(g, tower);
  return new Set(
    g.nodes.flatMap((n) =>
      segmentsOf(g, tower, n, armsOf(near, tower.get(n.id)!)).map((e) => e.id),
    ),
  );
}

/** Which of the lanes in meet one another, directly or through others (^1096): by their nodes. */
function groupsOf(facts: LaneFacts[]): Map<number, number> {
  const parent = new Map(facts.map((f) => [f.node.id, f.node.id]));
  const find = (x: number): number => (parent.get(x) === x ? x : find(parent.get(x)!));
  for (const f of facts) {
    for (const c of f.conflicts) {
      if (parent.has(c.from.id)) parent.set(find(c.from.id), find(f.node.id));
    }
  }
  return new Map(facts.map((f) => [f.node.id, find(f.node.id)]));
}

/**
 * What each lane does not lead to that it typically would (^1100, ^1076): the possible connections
 * of a lane are the towers the segments of the lanes it meets lead to, except those of its own
 * arm (its tower and the towers its road comes from: no U-turn). Judged per node: no junction is
 * looked for, only who meets whom.
 */
function withIncomplete(g: Graph, tower: Map<number, number>, facts: LaneFacts[]): LaneFacts[] {
  const group = groupsOf(facts);
  const targets = new Map<number, Set<number>>();
  for (const f of facts) {
    const set = targets.get(group.get(f.node.id)!) ?? new Set<number>();
    f.edges.forEach((e) => set.add(tower.get(e.end)!));
    targets.set(group.get(f.node.id)!, set);
  }
  return facts.map((f) => {
    const roads = edgesIn(g, f.node.id).map((e) => tower.get(e.start)!);
    const own = new Set([tower.get(f.node.id)!, ...roads, ...leadingBack(g, tower, roads)]);
    const reached = new Set(f.edges.map((e) => tower.get(e.end)!));
    const possible = [...targets.get(group.get(f.node.id)!)!].filter((t) => !own.has(t));
    const missing = possible.some((t) => !reached.has(t));
    return { ...f, incomplete: missing ? f.edges.flatMap((e) => courseOf(g, e) ?? []) : null };
  });
}

/** The towers whose lanes lead on into the towers `roads`: the lane out of an arm whose lane in is not at the same place (^1100). */
function leadingBack(g: Graph, tower: Map<number, number>, roads: number[]): number[] {
  return g.edges.filter((e) => roads.includes(tower.get(e.end)!)).map((e) => tower.get(e.start)!);
}
