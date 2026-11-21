import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M, alongOrAgainst } from '../curves/tolerance';
import { dist, dot, fromAngle, mul, perp, sub, type Vec } from '../curves/vec';
import { edgesAt, type GEdge, type GNode, type Graph } from '../model/graph';
import { parallel } from './parallel';

/** Cells of the grid that finds touching nodes: wider than a lane. */
const CELL_M = 4;

/**
 * A bar (^350): joins the nodes of a run, beside their circles. `from` and `to` are the first and
 * the last node of the run, `side` the world direction of the side the bar is on.
 */
export interface Bar {
  from: Vec;
  to: Vec;
  side: Vec;
}

/** Whether two nodes touch (^254, ^352): side by side, one lane width apart, the same or the opposite heading. */
function touches(a: GNode, b: GNode): boolean {
  const t = fromAngle(a.th);
  const parallel = alongOrAgainst(a, b);
  return (
    parallel &&
    Math.abs(dist(a, b) - LANE_WIDTH_M) < SAME_PLACE_M &&
    Math.abs(dot(sub(b, a), t)) < SAME_PLACE_M
  );
}

/** The nodes that touch a node, found through a grid of cells. */
function neighbours(grid: Map<string, GNode[]>) {
  const at = (n: GNode, dx: number, dy: number) =>
    grid.get(`${Math.floor(n.x / CELL_M) + dx},${Math.floor(n.y / CELL_M) + dy}`) ?? [];
  return (n: GNode): GNode[] =>
    [-1, 0, 1]
      .flatMap((dx) => [-1, 0, 1].flatMap((dy) => at(n, dx, dy)))
      .filter((m) => m.id !== n.id && touches(n, m));
}

/** The towers of a graph (^352): chains of touching nodes, in order across the lanes. */
export function towersOf(g: Graph): GNode[][] {
  const grid = new Map<string, GNode[]>();
  for (const n of g.nodes) {
    const key = `${Math.floor(n.x / CELL_M)},${Math.floor(n.y / CELL_M)}`;
    grid.set(key, [...(grid.get(key) ?? []), n]);
  }
  const near = neighbours(grid);
  const seen = new Set<number>();
  const towers: GNode[][] = [];
  for (const start of g.nodes) {
    if (seen.has(start.id)) continue;
    const tower = [start];
    seen.add(start.id);
    for (const n of tower) {
      const more = near(n).filter((m) => !seen.has(m.id));
      more.forEach((m) => seen.add(m.id));
      tower.push(...more);
    }
    if (tower.length > 1) towers.push(order(tower));
  }
  return towers;
}

/** The nodes of a tower in order across the lanes. */
function order(tower: GNode[]): GNode[] {
  const across = perp(fromAngle(tower[0]!.th));
  return [...tower].sort((a, b) => dot(a, across) - dot(b, across));
}

/** The side of the tower (+1 or -1 along its axis) a segment leaves a node to. */
function sideOf(n: GNode, e: GEdge, axis: Vec): 1 | -1 {
  const dir = e.start === n.id ? fromAngle(n.th) : mul(fromAngle(n.th), -1);
  return dot(dir, axis) >= 0 ? 1 : -1;
}

/** The runs of a tower on one side: neighbouring nodes joined by parallel segments on that side (^350). */
function runsOf(tower: GNode[], joined: (a: GNode, b: GNode) => boolean): GNode[][] {
  const runs: GNode[][] = [[tower[0]!]];
  for (let k = 1; k < tower.length; k++) {
    if (joined(tower[k - 1]!, tower[k]!)) runs.at(-1)!.push(tower[k]!);
    else runs.push([tower[k]!]);
  }
  return runs.filter((r) => r.length > 1);
}

/** A run of a tower on one side (^350): the neighbouring nodes whose segments on that side are parallel, in order across the lanes. */
export interface Run {
  nodes: GNode[];
  /** The way of the axis of the tower the segments of the run leave to: +1 or -1. */
  side: 1 | -1;
  axis: Vec;
  /** The segments of a node on that side. */
  onSide: (n: GNode) => GEdge[];
}

/** The runs of all towers, on both sides (^350): each is a group of two or more parallel segments side by side. */
export function runsOfGraph(g: Graph): Run[] {
  const found: Run[] = [];
  for (const tower of towersOf(g)) {
    const axis = fromAngle(tower[0]!.th);
    for (const side of [1, -1] as const) {
      const onSide = (n: GNode) => edgesAt(g, n.id).filter((e) => sideOf(n, e, axis) === side);
      const joined = (a: GNode, b: GNode) =>
        onSide(a).some((ea) => onSide(b).some((eb) => parallel(g, ea, eb)));
      for (const nodes of runsOf(tower, joined)) found.push({ nodes, side, axis, onSide });
    }
  }
  return found;
}

/**
 * The bars (^350, ^352): on each side of a tower, neighbouring nodes whose segments on that side
 * are parallel (^334) form a run; a run of two or more nodes gets one bar.
 */
export const barsOf = (g: Graph): Bar[] =>
  runsOfGraph(g).map((r) => ({
    from: r.nodes[0]!,
    to: r.nodes.at(-1)!,
    side: mul(r.axis, r.side),
  }));
