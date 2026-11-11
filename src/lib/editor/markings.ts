import { offsetPiece } from '../curves/offset';
import type { Piece } from '../curves/types';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist, dot, perp, sub, type Vec } from '../curves/vec';
import { distanceToPiece, isDegenerate, pieceLength, pointOn, reversePiece } from '../curves/piece';
import { widthOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { originOf } from './derived';
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

/** Dashed for the same way; solid for opposite ways in a group of three or more; none for a 1+1 in the physical markings, the Ortsstraße having no centerline (^972), where the logical ones draw it dashed (^951, ^981). */
const kindOf = (same: boolean, group: number, physical: boolean): Marking['kind'] | null => {
  if (same) return 'dashed';
  if (group === 2) return physical ? null : 'dashed';
  return 'solid';
};

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

/** What decides the lines besides the graph: the physical markings or the logical ones (^975), and whether two segments (of the stored graph) are inside one junction, where no line is drawn between them (^1032). */
export interface Rules {
  physical: boolean;
  inside: (a: number, b: number) => boolean;
}

/** The pairs of neighbouring parallel segments of a run, once each. */
function pairsOf(g: Graph, run: Run, seen: Set<string>, rules: Rules): Marking[] {
  const found: Marking[] = [];
  for (let k = 0; k + 1 < run.nodes.length; k++) {
    for (const [ea, eb] of pairsAt(g, run, k)) {
      const key = `${Math.min(ea.id, eb.id)},${Math.max(ea.id, eb.id)}`;
      if (seen.has(key) || rules.inside(originOf(g, ea.id), originOf(g, eb.id))) continue;
      seen.add(key);
      const [a, b] = [run.nodes[k]!, run.nodes[k + 1]!];
      const pieces = centerline(g, ea, a, b);
      const kind = kindOf(sameWay(ea, a, eb, b), run.nodes.length, rules.physical);
      if (pieces && kind) found.push({ pieces, kind });
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

const POINTS = [0, 0.25, 0.5, 0.75, 1];

/** Whether every place of the line `m` is on the line `other`, within the position tolerance (^865). */
const liesOn = (m: Marking, other: Marking) =>
  m.pieces.every((p) =>
    POINTS.every((t) => {
      const at = pointOn(p, t);
      return other.pieces.some((q) => distanceToPiece(q, at) < SAME_PLACE_M);
    }),
  );

const lengthOf = (m: Marking) => m.pieces.reduce((n, p) => n + pieceLength(p), 0);

/** Lines of one style on top of each other are drawn once, the longest: a short line over the main line would restart its dashes (^974). */
export function distinct(lines: Marking[]): Marking[] {
  const longest = [...lines].sort((a, b) => lengthOf(b) - lengthOf(a));
  const kept: Marking[] = [];
  for (const m of longest) {
    if (!kept.some((k) => k.kind === m.kind && liesOn(m, k))) kept.push(m);
  }
  return kept;
}

/**
 * The lane markings of a graph with its derived nodes in it (`withDerived`, ^822, so that segments
 * that are parallel for a part only are parallel there, ^950): one line for each pair of
 * neighbouring parallel segments (^950), dashed or solid by the way they run and the size of the
 * group (^951). Derived from the graph, never stored (^956).
 */
export function markingsOf(g: Graph, rules: Partial<Rules> = {}): Marking[] {
  const all: Rules = { physical: false, inside: () => false, ...rules };
  const seen = new Set<string>();
  return distinct(joined(runsOfGraph(g).flatMap((run) => pairsOf(g, run, seen, all))));
}
