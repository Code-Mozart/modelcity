import { sweeps } from '../curves/piece';
import { dist, type Vec } from '../curves/vec';
import type { PathNode } from '../curves/types';
import { linkTo, type DrawEnd } from '../model/junction';
import { addNode, edgeOfId, nodeOf, withRadius, type GEdge, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { parallel, touching, withParallels } from './parallel';
import { branchEdges, selectedSegments } from './selection';

const TOL_M = 1e-3;

/** The center of the arc of a segment that is a bend (the only shape with one arc). */
function centerOf(g: Graph, edge: number): Vec | null {
  const E = curveOfEdge(g, edge);
  return (E?.kind === 'C' && E.pieces.find(sweeps)?.c) || null;
}

/** The largest radius a segment can have, null for a straight one (^332). */
function maxOf(g: Graph, edge: number): number | null {
  const E = curveOfEdge(g, edge);
  return E && 'Rmax' in E ? E.Rmax : null;
}

/**
 * A radius as it is stored after all transformations (^332): the maximum, within the tolerance, is
 * auto (null); a value above the maximum stays as it is (it is clamped when the curve is built).
 */
function storedRadius(g: Graph, edge: number, value: number): number | null {
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
    const center = s.id !== e.id && touching(g, s, e) ? centerOf(g, s.id) : null;
    if (center) return withRadius(g, e.id, dist(center, start));
  }
  return g;
}

/** The radius a segment has now: the one of its first arc, null for a straight one. */
function radiusOfEdge(g: Graph, edge: number): number | null {
  return curveOfEdge(g, edge)?.pieces.find(sweeps)?.r ?? null;
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
