import { anchoredEdge } from './anchored';
import { bendEdge } from './bend';
import { biarc } from './biarc';
import { classify, type Classification } from './classify';
import { line } from './piece';
import { TWO_NODES_M, SAME_WAY } from './tolerance';
import { cross, dot, fromAngle, sub } from './vec';
import { reverseEdge } from './reverse';
import type { Dir, Edge, EdgeInput, PathNode, Piece } from './types';

export * from './types';

const sweepOf = (p: Piece) => (p.type === 'arc' ? p.da : 0);

const isInflection = (f0: number, f1: number) =>
  (f0 > 1e-3 && f1 < -1e-3) || (f0 < -1e-3 && f1 > 1e-3);

const firstTurn = (f0: number, f1: number): Dir =>
  Math.abs(f0) > 1e-3 ? (Math.sign(f0) as Dir) : (-Math.sign(f1) as Dir);

/** An S (its widest middle line, else anchored) or a hook with the first turn `s`. */
function twoArc(inp: EdgeInput, kind: 'S' | 'H', s: Dir) {
  return (kind === 'S' && reverseEdge(inp, s)) || anchoredEdge(inp, kind, s);
}

/**
 * Whether `q` lies ahead of `p` on the tangent of its heading, and heads the same way (a straight
 * segment, ^875): within the error of two rounded nodes, else a node 0.3 mm off the tangent would
 * make a hook with arcs of no angle.
 */
function isStraight(p: PathNode, q: PathNode): boolean {
  const t = fromAngle(p.th);
  const d = sub(q, p);
  return (
    dot(t, fromAngle(q.th)) > 1 - SAME_WAY &&
    dot(d, t) > TWO_NODES_M &&
    Math.abs(cross(t, d)) < TWO_NODES_M
  );
}

/** Pick the shape without a stored tag: a bend if possible, else an S, else a hook. */
function autoEdge(inp: EdgeInput, cls: Classification): Edge {
  const { p, q } = inp;
  if (isStraight(p, q)) return { kind: 'line', pieces: [line(p, q)] };
  const pieces = biarc(p, q);
  const [f0, f1] = [sweepOf(pieces[0]), sweepOf(pieces[1])];
  const inflect = isInflection(f0, f1);
  // Whenever the heading lines meet properly a single bend fits; only otherwise do we need two arcs (^16).
  const bend = bendEdge(inp, cls);
  if (bend) return bend;
  if (pieces.every((x) => x.type === 'line')) return { kind: 'line', pieces };
  const s = firstTurn(f0, f1);
  const kind = inflect ? 'S' : 'H';
  // If that turn sense does not work out, the other one may (^40); only then fall back to a line.
  const E = twoArc(inp, kind, s) ?? twoArc(inp, kind, -s as Dir);
  return E ?? { kind: 'line', pieces: [line(p, q)] };
}

/**
 * The edge between two nodes: a bend if the heading lines meet properly, else an S-curve or a hook.
 * It is derived from the positions, headings and the requested radius `Rs` (null for auto, ^8)
 * alone; nothing else is stored (experiment: no shape tag, ^7).
 */
export function buildEdge(p: PathNode, q: PathNode, Rs: number | null): Edge {
  const inp = { p, q, Rs };
  return autoEdge(inp, classify(p, q));
}
