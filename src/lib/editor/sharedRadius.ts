import { LANE_WIDTH_M } from '../curves/lane';
import { sweeps } from '../curves/piece';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist, type Vec } from '../curves/vec';
import { edgeOfId, nodeOf, withRadius, type GEdge, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { focusTower, parallel, touching, withParallels, type TowerLine } from './parallel';
import type { Chain } from './chains';
import type { Focus } from './focus';
import { branchEdges, selectedSegments } from './selection';
import type { BuildAt } from '../curves/drag';
import type { Press } from './types';

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
  return max !== null && Math.abs(value - max) < SAME_PLACE_M ? null : value;
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
  return besideS(g, e);
}

/**
 * An S-curve built between the nodes beside another S-curve gets the radius that makes it that
 * curve moved: the smaller arc of the one beside it less a lane width (^828, ^826).
 */
function besideS(g: Graph, e: GEdge): Graph {
  if (curveOfEdge(g, e.id)?.kind !== 'S') return g;
  const radii = g.edges.flatMap((s) => {
    const E = s.id !== e.id && touching(g, s, e) ? curveOfEdge(g, s.id) : undefined;
    return E?.kind === 'S' ? [E.R] : [];
  });
  return radii.length ? withRadius(g, e.id, Math.max(...radii) - LANE_WIDTH_M) : g;
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

/**
 * The line through the radius points of the segments that follow the dragged one (^344): the
 * parallels among the segments that really change with it (`sharedWith`), so the line always shows
 * what follows, and not at all when nothing does: with only the two nodes of the segment selected
 * it changes alone (^302), and a selected segment that is not parallel is no point of the line (^832).
 */
export function followingTower(
  g: Graph,
  chains: Chain[],
  focus: Focus | null,
  selection: number[],
): TowerLine | null {
  const edge = focus?.type === 'rad' ? chains[focus.road]?.edgeIds[focus.i] : undefined;
  if (edge === undefined) return null;
  const parallels = withParallels(g, [edge]);
  const follow = sharedWith(g, selection, edge).filter(
    (s) => s.id !== edge && parallels.includes(s.id),
  );
  return follow.length ? focusTower(g, chains, focus, [edge, ...follow.map((s) => s.id)]) : null;
}

/**
 * The curve of a dragged S-curve at a radius while the lanes beside it follow (^828, ^302): the
 * radius point of a lane beside another one moves along its own curve, which is the other one moved,
 * so the point has to be looked for there, not on an S-curve with two equal arcs. Only for an
 * S-curve with parallel lanes; it is built on those lanes alone.
 */
export function groupBuilder(
  press: Extract<Press, { kind: 'drag' }>,
  selection: number[],
): BuildAt | undefined {
  const [g, own] = [press.undo.graph, press.id];
  const ids = curveOfEdge(g, own)?.kind === 'S' ? withParallels(g, [own]) : [];
  if (ids.length < 2) return undefined;
  const plan = sharedWith(g, selection, own).filter((p) => ids.includes(p.id));
  const lanes = { ...g, edges: g.edges.filter((e) => ids.includes(e.id)) };
  return (R) => curveOfEdge(shareConcentric(withRadius(lanes, own, R), own, plan), own) ?? null;
}
