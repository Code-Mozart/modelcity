import { offsetPiece } from '../curves/offset';
import type { Piece } from '../curves/types';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist, dot, perp, sub, type Vec } from '../curves/vec';
import { isDegenerate, pointOn, reversePiece } from '../curves/piece';
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

/**
 * The centerline of a pair: the curve of `ea` moved half its width towards `eb`, to the side
 * where the node `b` is of the node `a`. A curve may have pieces with no length (a straight piece
 * between two arcs that meet): they have no direction to move sideways, and are left out.
 */
function centerline(g: Graph, ea: GEdge, a: GNode, b: GNode): Piece[] | null {
  const pieces = curveOfEdge(g, ea.id)?.pieces.filter((p) => !isDegenerate(p));
  if (!pieces?.length) return null;
  const h = widthOf(g, ea) / 2;
  const atStart = ea.start === a.id;
  const t = pointOn(atStart ? pieces[0]! : pieces.at(-1)!, atStart ? 0 : 1);
  const onRight = dot(sub(b, a), perp({ x: t.tx, y: t.ty })) > 0;
  const moved = pieces.map((p) => offsetPiece(p, onRight ? h : -h));
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

const reversedLine = (m: Marking): Marking => ({
  ...m,
  pieces: m.pieces.map(reversePiece).reverse(),
});

/** The two lines as one, if they have the same style and meet at an end of each, one of them turned round if need be. */
function linked(a: Marking, b: Marking): Marking | null {
  if (a.kind !== b.kind) return null;
  const meet = (p: Vec, q: Vec) => dist(p, q) < SAME_PLACE_M;
  const [as, ae, bs, be] = [a.pieces[0]!.P, a.pieces.at(-1)!.Q, b.pieces[0]!.P, b.pieces.at(-1)!.Q];
  const [first, second] = meet(ae, bs)
    ? [a, b]
    : meet(be, as)
      ? [b, a]
      : meet(ae, be)
        ? [a, reversedLine(b)]
        : meet(as, bs)
          ? [reversedLine(a), b]
          : [];
  return first && second ? { kind: a.kind, pieces: [...first.pieces, ...second.pieces] } : null;
}

/** Lines that meet end to end and have the same style are one line (^954: the dashes run on across the nodes), whichever way each was found. */
function joined(markings: Marking[]): Marking[] {
  const lines = [...markings];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const one = linked(lines[i]!, lines[j]!);
      if (!one) continue;
      lines[i] = one;
      lines.splice(j, 1);
      j = i;
    }
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
