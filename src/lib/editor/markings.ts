import { offsetPiece } from '../curves/offset';
import type { Piece } from '../curves/types';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist, mul, add, type Vec } from '../curves/vec';
import { widthOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { parallel } from './parallel';
import { runsOfGraph, type Run } from './towers';

/**
 * A lane marking (^949): a line on the centerline between two neighbouring parallel segments,
 * as pieces that follow each other so that a dash pattern runs on across the joints (^954).
 */
export interface Marking {
  pieces: Piece[];
  kind: 'dashed' | 'solid';
}

/** Whether two segments of a pair at the nodes `a` and `b` run the same way: both start there or both end there (^951). */
const sameWay = (ea: GEdge, a: GNode, eb: GEdge, b: GNode) =>
  (ea.start === a.id) === (eb.start === b.id);

/** Dashed for the same way and for a group of two; solid for opposite ways in a larger group (^951). */
const kindOf = (same: boolean, group: number): Marking['kind'] =>
  same || group === 2 ? 'dashed' : 'solid';

/** The centerline of a pair: the curve of `ea` moved half its width towards `eb`, which is on the side where the node `b` is of the node `a`. */
function centerline(g: Graph, ea: GEdge, a: GNode, b: GNode): Piece[] | null {
  const pieces = curveOfEdge(g, ea.id)?.pieces;
  if (!pieces?.length) return null;
  const h = widthOf(g, ea) / 2;
  const middle: Vec = mul(add(a, b), 0.5);
  const aEnd = ea.start === a.id ? pieces[0]!.P : pieces.at(-1)!.Q;
  const first = ea.start === a.id ? pieces[0]! : pieces.at(-1)!;
  const probe = offsetPiece(first, h);
  const right = probe && dist(ea.start === a.id ? probe.P : probe.Q, middle) < dist(aEnd, middle);
  const moved = pieces.map((p) => offsetPiece(p, right ? h : -h));
  return moved.every((p) => p !== null) ? (moved as Piece[]) : null;
}

/** The pairs of segments at two neighbouring nodes of a run that are parallel. */
function pairsAt(g: Graph, run: Run, k: number): [GEdge, GEdge][] {
  const [a, b] = [run.nodes[k]!, run.nodes[k + 1]!];
  const all = run.onSide(a).flatMap((ea) => run.onSide(b).map((eb): [GEdge, GEdge] => [ea, eb]));
  return all.filter(([ea, eb]) => parallel(g, ea, eb));
}

/** The pairs of neighbouring parallel segments of a run, once each. */
function pairsOf(g: Graph, run: Run, seen: Set<string>): Marking[] {
  const found: Marking[] = [];
  for (let k = 0; k + 1 < run.nodes.length; k++) {
    for (const [ea, eb] of pairsAt(g, run, k)) {
      const key = `${Math.min(ea.id, eb.id)},${Math.max(ea.id, eb.id)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [a, b] = [run.nodes[k]!, run.nodes[k + 1]!];
      const pieces = centerline(g, ea, a, b);
      const kind = kindOf(sameWay(ea, a, eb, b), run.nodes.length);
      if (pieces) found.push({ pieces, kind });
    }
  }
  return found;
}

/** Whether `next` goes on where `m` ends, in the same style. */
const goesOn = (m: Marking, next: Marking) =>
  m.kind === next.kind && dist(m.pieces.at(-1)!.Q, next.pieces[0]!.P) < SAME_PLACE_M;

/** Markings that meet end to start and have the same style are one line (^954: the dashes run on across the nodes). */
function joined(markings: Marking[]): Marking[] {
  const rest = [...markings];
  const lines: Marking[] = [];
  for (let m = rest.shift(); m; m = rest.shift()) {
    const line = { ...m, pieces: [...m.pieces] };
    for (
      let i = rest.findIndex((o) => goesOn(line, o));
      i >= 0;
      i = rest.findIndex((o) => goesOn(line, o))
    ) {
      line.pieces.push(...rest.splice(i, 1)[0]!.pieces);
    }
    lines.push(line);
  }
  return lines;
}

/**
 * The lane markings of a graph with its derived nodes in it (`withDerived`, ^822, so that segments
 * that are parallel for a part only are parallel there, ^950): one line for each pair of
 * neighbouring parallel segments (^950), dashed or solid by the way they run and the size of the
 * group (^951). Derived from the graph, never stored (^956).
 */
export function markingsOf(g: Graph): Marking[] {
  const seen = new Set<string>();
  return joined(runsOfGraph(g).flatMap((run) => pairsOf(g, run, seen)));
}
