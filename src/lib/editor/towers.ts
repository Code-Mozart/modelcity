import { LANE_WIDTH_M } from '../curves/lane';
import { dist, dot, fromAngle, mul, perp, sub, type Vec } from '../curves/vec';
import { edgesAt, type GEdge, type GNode, type Graph } from '../model/graph';
import type { Piece } from '../curves/types';
import type { Chain } from './chains';
import { sameCenters, touching } from './sharedRadius';

const TOL_M = 1e-3;
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
  const parallel = Math.abs(Math.abs(dot(t, fromAngle(b.th))) - 1) < 1e-9;
  return (
    parallel && Math.abs(dist(a, b) - LANE_WIDTH_M) < TOL_M && Math.abs(dot(sub(b, a), t)) < TOL_M
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

/**
 * The bars (^350, ^352): on each side of a tower, neighbouring nodes whose segments on that side
 * are parallel (^334) form a run; a run of two or more nodes gets one bar.
 */
export function barsOf(g: Graph, chains: Chain[]): Bar[] {
  const pieces = new Map<number, Piece[]>();
  for (const c of chains) c.edges.forEach((r, i) => pieces.set(c.edgeIds[i]!, r.E.pieces));
  const parallel = (a: GEdge, b: GEdge) =>
    a.id !== b.id &&
    touching(g, a, b) &&
    sameCenters(pieces.get(a.id) ?? [], pieces.get(b.id) ?? []);
  const bars: Bar[] = [];
  for (const tower of towersOf(g)) {
    const axis = fromAngle(tower[0]!.th);
    for (const s of [1, -1] as const) {
      const onSide = (n: GNode) => edgesAt(g, n.id).filter((e) => sideOf(n, e, axis) === s);
      const joined = (a: GNode, b: GNode) =>
        onSide(a).some((ea) => onSide(b).some((eb) => parallel(ea, eb)));
      for (const r of runsOf(tower, joined)) {
        bars.push({ from: r[0]!, to: r.at(-1)!, side: mul(axis, s) });
      }
    }
  }
  return bars;
}
