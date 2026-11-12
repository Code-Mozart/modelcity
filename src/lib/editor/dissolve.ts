import { buildEdge } from '../curves/edge';
import { samplesAlong } from '../curves/arrows';
import { pieceLength } from '../curves/piece';
import { SAME_PLACE_M } from '../curves/tolerance';
import type { Piece } from '../curves/types';
import { edgesAt, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { nearestOnPieces } from '../snap/geometry';
import { parallel } from './parallel';
import { derivedNodes, withDerived } from './derived';
import { curveOfEdge } from './chains';
import { towersOf } from './towers';
import { violationsOf } from './violations';
import type { Snapshot } from './types';

const SPACING_M = 0.5;

const piecesOf = (g: Graph, e: GEdge): Piece[] | null => {
  const [a, b] = [nodeOf(g, e.start), nodeOf(g, e.end)];
  return a && b ? buildEdge(a, b, e.radius).pieces : null;
};

/** Whether every sampled point of `from` lies within the tolerance of `to` (^865). */
const within = (from: Piece[], to: Piece[]) =>
  samplesAlong(from, SPACING_M, 0).every((s) => {
    const at = nearestOnPieces(to, s);
    return at !== null && at.d < SAME_PLACE_M;
  });

/** The two curves are the same curve, whichever way they are cut into pieces (^891). */
const sameCurve = (a: Piece[], b: Piece[]) => within(a, b) && within(b, a);

/** The two segments of a node that runs straight through, in and out, with the same lane configuration (^892). */
function throughEdges(g: Graph, b: GNode): [GEdge, GEdge] | null {
  const at = edgesAt(g, b.id);
  const [e1, e2] = [at.find((e) => e.end === b.id), at.find((e) => e.start === b.id)];
  if (at.length !== 2 || !e1 || !e2 || e1.lane !== e2.lane || e1.start === e2.end) return null;
  return g.edges.some((e) => e.start === e1.start && e.end === e2.end) ? null : [e1, e2];
}

/** The segment A-C that would replace the two segments of `b`, if it draws the same curve, else null (^891). */
function joined(g: Graph, b: GNode): Join | null {
  const through = throughEdges(g, b);
  const [a, c] = through ? [nodeOf(g, through[0].start), nodeOf(g, through[1].end)] : [];
  const old = through?.map((e) => piecesOf(g, e));
  if (!through || !a || !c || !old || old.some((p) => !p)) return null;
  const [e1, e2] = through;
  const same = (radius: number | null) =>
    sameCurve(
      old.flatMap((p) => p!),
      buildEdge(a, c, radius).pieces,
    );
  const radius = [e1.radius, e2.radius, null].find(same);
  if (radius === undefined) return null;
  const [into, other] = e1.id < e2.id ? [e1, e2] : [e2, e1];
  return { into: { ...into, start: a.id, end: c.id, radius }, other };
}

const without = (g: Graph, b: number, join: { into: GEdge; other: GEdge }): Graph => ({
  ...g,
  nodes: g.nodes.filter((n) => n.id !== b),
  edges: g.edges.flatMap((e) =>
    e.id === join.other.id ? [] : e.id === join.into.id ? [join.into] : [e],
  ),
});

type Join = { into: GEdge; other: GEdge };

/** How much road runs parallel to another segment, derived nodes included (the partially parallel segments, ^822): the length of the segments that have a partner. */
function parallelLength(g: Graph): number {
  const d = withDerived(g, derivedNodes(g));
  return d.edges
    .filter((a) => d.edges.some((b) => b.id !== a.id && parallel(d, a, b)))
    .reduce(
      (sum, e) =>
        sum + (curveOfEdge(d, e.id)?.pieces ?? []).reduce((l, p) => l + pieceLength(p), 0),
      0,
    );
}

/**
 * Whether the graph keeps what the segments beside it need: no new violation, and no less road
 * that runs parallel (^894). A node of a lane that a node beside it touches then becomes a derived
 * node of the segment (^822), and the road stays parallel.
 */
function keepsParallels(g: Graph, next: Graph): boolean {
  return (
    violationsOf(next).length <= violationsOf(g).length &&
    parallelLength(next) >= parallelLength(g) - SAME_PLACE_M
  );
}

/** The nodes that dissolve together with `b`: those of its tower that have no effect either (^894). */
function groupOf(g: Graph, b: GNode, can: (n: GNode) => boolean): GNode[] {
  const tower = towersOf(g).find((t) => t.some((n) => n.id === b.id)) ?? [b];
  return tower.filter(can);
}

/**
 * Collapse the nodes `ids` that have no effect (^1064, ^891): a node with two segments that one
 * segment from neighbour to neighbour would replace without changing the curve, in the position
 * domain. The nodes of a tower collapse together or not at all, so the lanes stay parallel (^894):
 * a tower is left as it is unless all its nodes are among `ids`. Never by itself: only by the control.
 */
export function collapseNodes(g: Graph, ids: number[]): Graph {
  const chosen = new Set(ids);
  const done = new Set<number>();
  let next = g;
  for (const id of ids) {
    const now = next;
    const b = nodeOf(now, id);
    if (!b || done.has(id) || !joined(now, b)) continue;
    const members = groupOf(now, b, (n) => joined(now, n) !== null);
    members.forEach((n) => done.add(n.id));
    if (members.every((n) => chosen.has(n.id))) next = dissolvedTogether(now, members);
  }
  return next;
}

/** The graph without these nodes, if that keeps what the segments beside it need (^894), else as it was. */
function dissolvedTogether(g: Graph, members: GNode[]): Graph {
  let next = g;
  for (const n of members) {
    const join = joined(next, n);
    if (join) next = without(next, n.id, join);
  }
  return next !== g && keepsParallels(g, next) ? next : g;
}

/** The state with the selected nodes collapsed (^1200); the ones that are gone leave the selection. */
export function collapseStep(d: Snapshot): Snapshot {
  const graph = collapseNodes(d.graph, d.selection);
  return { ...d, graph, selection: d.selection.filter((id) => nodeOf(graph, id)) };
}
