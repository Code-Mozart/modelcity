import { anchoredEdge } from './anchored';
import { bendEdge } from './bend';
import { biarc } from './biarc';
import { classify, type Classification } from './classify';
import { line } from './piece';
import { reverseEdge } from './reverse';
import type { Dir, Edge, EdgeInput, PathNode, Piece, ShapeTag, TwoArcEdge } from './types';

export * from './types';

const sweepOf = (p: Piece) => (p.type === 'arc' ? p.da : 0);

function twoArcEdge(inp: EdgeInput, tag: Exclude<ShapeTag, { kind: 'C' }>): TwoArcEdge | null {
  if (tag.kind === 'H') return anchoredEdge(inp, 'H', tag.s);
  return reverseEdge(inp, tag.s, tag.mid) ?? anchoredEdge(inp, 'S', tag.s);
}

function edgeFromTag(inp: EdgeInput, tag: ShapeTag, cls: Classification): Edge | null {
  return tag.kind === 'C' ? bendEdge(inp, cls) : twoArcEdge(inp, tag);
}

const isInflection = (f0: number, f1: number) =>
  (f0 > 1e-3 && f1 < -1e-3) || (f0 < -1e-3 && f1 > 1e-3);

const firstTurn = (f0: number, f1: number): Dir =>
  Math.abs(f0) > 1e-3 ? (Math.sign(f0) as Dir) : (-Math.sign(f1) as Dir);

/** Pick the shape without a stored tag: a bend if possible, else an S, else a hook. */
function autoEdge(inp: EdgeInput, cls: Classification): Edge {
  const { p, q } = inp;
  const pieces = biarc(p, q);
  const [f0, f1] = [sweepOf(pieces[0]), sweepOf(pieces[1])];
  const inflect = isInflection(f0, f1);
  const bend = cls.kind === 'C' && !inflect ? bendEdge(inp, cls) : null;
  if (bend) return bend;
  if (pieces.every((x) => x.type === 'line')) return { kind: 'line', pieces };
  const s = firstTurn(f0, f1);
  const E = twoArcEdge(inp, inflect ? { kind: 'S', s } : { kind: 'H', s });
  return E ?? { kind: 'line', pieces: [line(p, q)] };
}

/**
 * The edge between two nodes. A stored shape tag wins while it is still valid (^7); `Rs` is the
 * requested radius, null for auto (^8).
 */
export function buildEdge(p: PathNode, q: PathNode, Rs: number | null, tag: ShapeTag | null): Edge {
  const inp = { p, q, Rs };
  const cls = classify(p, q);
  return (tag && edgeFromTag(inp, tag, cls)) || autoEdge(inp, cls);
}

/** Shape tag that reproduces an edge, if it needs one. */
export function tagOf(E: Edge): ShapeTag | null {
  if (E.kind === 'C') return { kind: 'C' };
  if (E.kind === 'S') return { kind: 'S', s: E.s1, mid: E.mid };
  if (E.kind === 'H') return { kind: 'H', s: E.s1 };
  return null;
}
