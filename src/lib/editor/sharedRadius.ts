import { middleOf } from '../curves/measure';
import { pointOn, sweeps } from '../curves/piece';
import type { Piece } from '../curves/types';
import { LANE_WIDTH_M } from '../curves/lane';
import { dist, dot, fromAngle, type Vec } from '../curves/vec';
import type { PathNode } from '../curves/types';
import { linkTo, type DrawEnd } from '../model/junction';
import {
  addNode,
  edgeOfId,
  nodeOf,
  withRadius,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
import { chainsOf, type Chain } from './chains';
import { branchEdges, selectedSegments } from './selection';

const TOL_M = 1e-3;

/** Whether two headings are the same or exactly opposite (^100). */
const alongOrAgainst = (a: GNode, b: GNode) =>
  Math.abs(Math.abs(dot(fromAngle(a.th), fromAngle(b.th))) - 1) < 1e-9;

/** Whether the ends of two segments are one lane width apart, pair by pair, in this order. */
const apart = (a: [GNode, GNode], b: [GNode, GNode]) =>
  a.every((n, i) => alongOrAgainst(n, b[i]!) && Math.abs(dist(n, b[i]!) - LANE_WIDTH_M) < TOL_M);

/** Whether the nodes of two segments touch at both ends, in either order (^100, ^334 A and B). */
export function touching(g: Graph, a: GEdge, b: GEdge): boolean {
  const [as, ae, bs, be] = [a.start, a.end, b.start, b.end].map((id) => nodeOf(g, id));
  if (!as || !ae || !bs || !be) return false;
  return apart([as, ae], [bs, be]) || apart([as, ae], [be, bs]);
}

/** The centers of the arcs of a segment (a straight one has none). */
function centersOf(g: Graph, edge: number): Vec[] {
  const chain = chainsOf(g).find((ch) => ch.edgeIds.includes(edge));
  const ref = chain?.edges[chain.edgeIds.indexOf(edge)];
  return ref ? ref.E.pieces.filter(sweeps).map((p) => p.c) : [];
}

/** Whether the arcs of two segments share their centers, as many and each one (^334 C). */
function concentric(g: Graph, a: number, b: number): boolean {
  const [ca, cb] = [centersOf(g, a), centersOf(g, b)];
  return ca.length === cb.length && ca.every((c) => cb.some((d) => dist(c, d) < TOL_M));
}

/** Whether two segments are parallel (^100, ^334): their nodes touch at both ends and their curves are concentric. */
function parallel(g: Graph, a: GEdge, b: GEdge): boolean {
  return touching(g, a, b) && concentric(g, a.id, b.id);
}

/** The center of the arc of a segment that is a bend (the only shape with one arc). */
function arcOf(g: Graph, edge: number): { c: Vec } | null {
  const chain = chainsOf(g).find((ch) => ch.edgeIds.includes(edge));
  const ref = chain?.edges[chain.edgeIds.indexOf(edge)];
  const arc = ref?.E.kind === 'C' ? ref.E.pieces.find(sweeps) : undefined;
  return arc ? { c: arc.c } : null;
}

/** The largest radius a segment can have, null for a straight one (^332). */
function maxOf(g: Graph, edge: number): number | null {
  const chain = chainsOf(g).find((ch) => ch.edgeIds.includes(edge));
  const ref = chain?.edges[chain.edgeIds.indexOf(edge)];
  return ref && 'Rmax' in ref.E ? ref.E.Rmax : null;
}

/**
 * A radius as it is stored after all transformations (^332): the maximum, within the tolerance, is
 * auto (null); a value above the maximum stays as it is (it is clamped when the curve is built).
 */
export function storedRadius(g: Graph, edge: number, value: number): number | null {
  const max = maxOf(g, edge);
  return max !== null && Math.abs(value - max) < TOL_M ? null : value;
}

/** The radius of a segment, the value of auto being its maximum (^332). */
const valueOf = (g: Graph, e: GEdge): number | null => e.radius ?? maxOf(g, e.id);

/** One segment that follows the dragged radius: its radius is the dragged value plus `delta` (^324). */
export interface Share {
  id: number;
  delta: number;
}

/**
 * Give the segments of the plan the radius of the dragged one (^77): its value, also when it is
 * the maximum of that segment, plus the offset that keeps parallel segments concentric (^282,
 * ^324). A value above the maximum of a segment stays as it is, it is clamped when the curve is
 * built (^332).
 */
export function shareConcentric(g: Graph, own: number, plan: Share[]): Graph {
  const from = edgeOfId(g, own);
  const value = from ? valueOf(g, from) : null;
  if (value === null) return g;
  const delta = new Map(plan.map((p) => [p.id, p.delta]));
  const edges = g.edges.map((e) =>
    e.id !== own && delta.has(e.id)
      ? { ...e, radius: storedRadius(g, e.id, value + delta.get(e.id)!) }
      : e,
  );
  return { ...g, edges };
}

/**
 * A segment that was built between the nodes beside another segment's nodes (touching, ^100) gets
 * the radius that makes its curve concentric with that segment (^281, ^279).
 */
export function concentricWithParallel(g: Graph, edge: number): Graph {
  const e = edgeOfId(g, edge);
  const start = e && nodeOf(g, e.start);
  if (!e || !start) return g;
  for (const s of g.edges) {
    const arc = s.id !== e.id && touching(g, s, e) ? arcOf(g, s.id) : null;
    if (arc) return withRadius(g, e.id, dist(arc.c, start));
  }
  return g;
}

/** The radius a segment has now: the one of its first arc, null for a straight one. */
function radiusOfEdge(g: Graph, edge: number): number | null {
  const chain = chainsOf(g).find((ch) => ch.edgeIds.includes(edge));
  const ref = chain?.edges[chain.edgeIds.indexOf(edge)];
  return ref?.E.pieces.find(sweeps)?.r ?? null;
}

/** The segments together with all that are parallel to them, and to those in turn: any number of lanes on top of each other (^302). */
function withParallels(g: Graph, ids: number[]): number[] {
  const all = new Set(ids);
  const queue = [...ids];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    const e = edgeOfId(g, id);
    const more = g.edges.filter((o) => e && !all.has(o.id) && parallel(g, e, o));
    more.forEach((o) => all.add(o.id));
    queue.push(...more.map((o) => o.id));
  }
  return [...all];
}

/** Which of a group of parallel segments governs it (^324): the one on the branch of the dragged one, else the innermost. */
function governing(g: Graph, group: number[], own: number): number {
  if (group.includes(own)) return own;
  const branch = branchEdges(g, own);
  const onBranch = group.find((id) => branch.includes(id));
  const inner = (id: number) => radiusOfEdge(g, id) ?? Infinity;
  return onBranch ?? group.reduce((best, id) => (inner(id) < inner(best) ? id : best));
}

/**
 * The segments whose radius follows the dragged one (^77, ^302, ^324): the selected ones, and
 * always the segments parallel to them; unless only its own two nodes are selected: then it
 * changes alone. Parallel segments are one group, the governing segment gets the dragged value and
 * the others keep their offset to it (they stay concentric). Asked of the graph before the drag:
 * the radius changes what is parallel (^334).
 */
export function sharedWith(g: Graph, selection: number[], own: number): Share[] {
  const e = edgeOfId(g, own);
  if (!e) return [];
  const alone = selection.length === 2 && selection.includes(e.start) && selection.includes(e.end);
  if (alone) return [{ id: own, delta: 0 }];
  const ids = withParallels(g, [own, ...selectedSegments(g, selection)]);
  const groups = parallelGroups(g, ids);
  return groups.flatMap((group) => {
    const master = governing(g, group, own);
    const base = radiusOfEdge(g, master);
    return group.map((id) => {
      const r = radiusOfEdge(g, id);
      return { id, delta: id === master || r === null || base === null ? 0 : r - base };
    });
  });
}

/** The ids split into groups of segments that are parallel to each other, one lane after the other (^302). */
function parallelGroups(g: Graph, ids: number[]): number[][] {
  const left = [...ids];
  const groups: number[][] = [];
  while (left.length) {
    const group = [left.shift()!];
    for (const id of group) {
      const e = edgeOfId(g, id)!;
      const next = left.filter((o) => parallel(g, e, edgeOfId(g, o)!));
      group.push(...next);
      next.forEach((o) => left.splice(left.indexOf(o), 1));
    }
    groups.push(group);
  }
  return groups;
}

/** The radius the segment gets that a click would build from the node being drawn from (^331): the same as what is built. */
export function previewRadius(g: Graph, tip: number, node: PathNode, end: DrawEnd): number | null {
  const added = addNode(g, node);
  const linked = linkTo(added.graph, tip, end, added.id);
  const e = linked.edges.find((x) => x.start === added.id || x.end === added.id);
  return e ? (edgeOfId(concentricWithParallel(linked, e.id), e.id)?.radius ?? null) : null;
}

/** A short line through the middles of two parallel segments, on their shared bisector (^344). */
export interface ParallelLink {
  p: Vec;
  q: Vec;
}

/** Whether the arcs of two curves share their centers, each one (a straight one has none). */
export function sameCenters(a: Piece[], b: Piece[]): boolean {
  const [ca, cb] = [a.filter(sweeps), b.filter(sweeps)];
  return ca.length === cb.length && ca.every((x) => cb.some((y) => dist(x.c, y.c) < TOL_M));
}

/** The middle of a bend is the middle of its arc, on the bisector; else the middle of the curve. */
function middleOn(pieces: Piece[]) {
  const arcs = pieces.filter(sweeps);
  return arcs.length === 1 ? pointOn(arcs[0]!, 0.5) : middleOf(pieces);
}

/**
 * The links between the segments `ids` and the segments parallel to them (^100, ^334): through the
 * middle of each, which for bends is on the bisector, for straight segments the line through their
 * midpoints (^344).
 */
export function parallelLinks(g: Graph, chains: Chain[], ids: number[]): ParallelLink[] {
  const refs = chains.flatMap((c) => c.edges.map((ref, i) => ({ id: c.edgeIds[i]!, ref })));
  const edge = new Map(g.edges.map((e) => [e.id, e]));
  return refs.flatMap((a) =>
    ids.includes(a.id)
      ? refs
          .filter((b) => b.id > a.id || !ids.includes(b.id))
          .filter((b) => b.id !== a.id && touching(g, edge.get(a.id)!, edge.get(b.id)!))
          .filter((b) => sameCenters(a.ref.E.pieces, b.ref.E.pieces))
          .flatMap((b) => {
            const [p, q] = [middleOn(a.ref.E.pieces), middleOn(b.ref.E.pieces)];
            return p && q ? [{ p: { x: p.x, y: p.y }, q: { x: q.x, y: q.y } }] : [];
          })
      : [],
  );
}
