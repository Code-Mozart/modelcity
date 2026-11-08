import { buildEdge } from '../curves/edge';
import { samplesAlong } from '../curves/arrows';
import { SAME_PLACE_M } from '../curves/tolerance';
import type { Piece } from '../curves/types';
import { edgesAt, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { nearestOnPieces } from '../snap/geometry';
import { parallel } from './parallel';
import { towersOf } from './towers';
import { violationsOf } from './violations';

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

const sameEdge = (a: GEdge | undefined, b: GEdge) =>
  !!a && a.start === b.start && a.end === b.end && a.radius === b.radius && a.lane === b.lane;

const movedNode = (was: GNode | undefined, n: GNode) =>
  !was || was.x !== n.x || was.y !== n.y || was.th !== n.th;

/** The ends of the segments that are new, changed or gone. */
function endsOfChanged(before: Graph, after: Graph): number[] {
  const [was, now] = [
    new Map(before.edges.map((e) => [e.id, e])),
    new Map(after.edges.map((e) => [e.id, e])),
  ];
  const changed = [
    ...after.edges.filter((e) => !sameEdge(was.get(e.id), e)),
    ...before.edges.filter((e) => !now.has(e.id)),
  ];
  return changed.flatMap((e) => [e.start, e.end]);
}

/** The nodes this operation touched, and the nodes next to them: only these can have lost their effect (^893). */
function touched(before: Graph, after: Graph): Set<number> {
  const was = new Map(before.nodes.map((n) => [n.id, n]));
  const changed = new Set([
    ...after.nodes.filter((n) => movedNode(was.get(n.id), n)).map((n) => n.id),
    ...endsOfChanged(before, after),
  ]);
  const next = after.edges.flatMap((e) => [
    ...(changed.has(e.start) ? [e.end] : []),
    ...(changed.has(e.end) ? [e.start] : []),
  ]);
  return new Set([...changed, ...next]);
}

type Join = { into: GEdge; other: GEdge };

/** The pairs of segments of the graph that are parallel, one of them a segment of a join (^100). */
const parallelPairs = (g: Graph, ids: Set<number>) =>
  g.edges.flatMap((a) =>
    ids.has(a.id)
      ? g.edges.filter((b) => b.id !== a.id && parallel(g, a, b)).map((b) => [a.id, b.id] as const)
      : [],
  );

/** Whether the graph keeps what the segments beside it need: no new violation, and what was parallel stays parallel (^894). */
function keepsParallels(g: Graph, next: Graph, joins: Join[]): boolean {
  if (violationsOf(next).length > violationsOf(g).length) return false;
  const into = new Map(
    joins.flatMap(
      (j) =>
        [
          [j.into.id, j.into.id],
          [j.other.id, j.into.id],
        ] as const,
    ),
  );
  return parallelPairs(g, new Set(into.keys())).every(([a, b]) => {
    const [x, y] = [into.get(a)!, into.get(b) ?? b];
    const [ea, eb] = [next.edges.find((e) => e.id === x), next.edges.find((e) => e.id === y)];
    return x === y || (!!ea && !!eb && parallel(next, ea, eb));
  });
}

/** The nodes that dissolve together with `b`: those of its tower that have no effect either (^894). */
function groupOf(g: Graph, b: GNode, can: (n: GNode) => boolean): GNode[] {
  const tower = towersOf(g).find((t) => t.some((n) => n.id === b.id)) ?? [b];
  return tower.filter(can);
}

/**
 * Nodes without an effect dissolve (^829, ^891): a node with two segments that one segment from
 * neighbour to neighbour would replace without changing the curve, in the position domain. Only
 * nodes this operation touched, and not `keep` (selected, being drawn); never on load (^893). The
 * nodes of a tower dissolve together or not at all, so the lanes stay parallel (^894).
 */
export function dissolveNodes(before: Graph, after: Graph, keep: number[]): Graph {
  let g = after;
  const done = new Set<number>();
  for (const id of touched(before, after)) {
    const b = nodeOf(g, id);
    if (!b || done.has(id) || keep.includes(id) || !joined(g, b)) continue;
    const members = groupOf(g, b, (n) => !keep.includes(n.id) && joined(g, n) !== null);
    members.forEach((n) => done.add(n.id));
    let next = g;
    const joins: Join[] = [];
    for (const n of members) {
      const join = joined(next, n);
      if (!join) continue;
      joins.push(join);
      next = without(next, n.id, join);
    }
    if (joins.length && keepsParallels(g, next, joins)) g = next;
  }
  return g;
}
