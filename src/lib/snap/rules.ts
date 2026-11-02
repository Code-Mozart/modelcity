import type { EdgeRef } from '../curves/path';
import { pointOn, sweeps } from '../curves/piece';
import type { Arc, BendEdge, Piece, TwoArcEdge } from '../curves/types';
import {
  add,
  angleOf,
  dist,
  dot,
  fromAngle,
  mul,
  perp,
  sub,
  unitOr,
  type Vec,
} from '../curves/vec';
import { infiniteLine } from './geometry';
import type { Rule, SnapCurve, SnapPoint, Suggestion } from './types';

/** A node as the rules see it. */
export interface RuleNode {
  id: number;
  x: number;
  y: number;
  th: number;
}

/** An edge as the rules see it: its curve, its two node ids and the lane width of its road. */
export interface RuleEdge {
  id: number;
  start: number;
  end: number;
  ref: EdgeRef;
  width: number;
}

const point = (at: Vec, rule: Rule, from: number[], extra: Partial<SnapPoint> = {}): SnapPoint => ({
  kind: 'point',
  at: { x: at.x, y: at.y },
  heading: null,
  rule,
  from,
  ...extra,
});

/** A snap line: through `at`, along `dir`, with no forward or backward (^263). */
function line(at: Vec, dir: Vec, rule: Rule, from: number[]): SnapCurve {
  return {
    kind: 'curve',
    pieces: [infiniteLine(at, dir)],
    straight: true,
    origins: [{ x: at.x, y: at.y }],
    limited: true,
    rule,
    from,
  };
}

/**
 * What a node makes (^265, ^266, ^267): a line along its normal and one along its heading, and
 * three points: at the node, and to its left and right, on the normal, one lane width away.
 */
export function nodeRules(n: RuleNode, width: number): Suggestion[] {
  const dir = fromAngle(n.th);
  const side = mul(perp(dir), width);
  const heading = n.th;
  return [
    line(n, perp(dir), 'node-normal', [n.id]),
    line(n, dir, 'node-heading', [n.id]),
    point(n, 'node-points', [n.id], { heading, node: n.id }),
    point(add(n, side), 'node-points', [n.id], { heading }),
    point(sub(n, side), 'node-points', [n.id], { heading }),
  ];
}

/** The part of a curve that belongs to one segment (^268, ^279). */
function curveOf(e: RuleEdge, pieces: Piece[], rule: Rule): SnapCurve {
  const straight = pieces.every((p) => p.type === 'line');
  const mid = pointOn(pieces[Math.floor(pieces.length / 2)]!, 0.5);
  return {
    kind: 'curve',
    pieces,
    straight,
    origins: [{ x: mid.x, y: mid.y }],
    limited: false,
    rule,
    from: [e.start, e.end],
    edge: e.id,
  };
}

/** A piece moved sideways by `d` to its left (negative: right), or null where an arc would turn inside out. */
function offsetPiece(p: Piece, d: number): Piece | null {
  if (p.type === 'line') {
    const n = mul(perp(unitOr(sub(p.Q, p.P), { x: 1, y: 0 })), d);
    return { type: 'line', P: add(p.P, n), Q: add(p.Q, n) };
  }
  const r = p.r - Math.sign(p.da) * d;
  if (r < 0.05) return null;
  const at = (a: number): Vec => add(p.c, mul(fromAngle(a), r));
  return { ...p, r, P: at(p.a0), Q: at(p.a0 + p.da) };
}

/** The curve of a segment (^268) and its two offsets, one lane width to each side (^279). */
function curveRules(e: RuleEdge): Suggestion[] {
  const pieces = e.ref.E.pieces;
  const sides = [e.width, -e.width].map((d) => pieces.map((p) => offsetPiece(p, d)));
  const offsets = sides.filter((s): s is Piece[] => s.every((p) => p !== null));
  return [curveOf(e, pieces, 'curve'), ...offsets.map((o) => curveOf(e, o, 'offset'))];
}

/** The lines along the normal at the ticks of an arc (^271). The radius points as snap points come in part 2 (^270). */
function arcRules(e: RuleEdge, arc: Arc): Suggestion[] {
  const at = (t: number) => pointOn(arc, t);
  return [0, 1].map((t) => line(at(t), sub(at(t), arc.c), 'tick', [e.start, e.end]));
}

/** The bisector of a bend and the tangent of that, at the middle of its arc (^269). */
function bendRules(e: RuleEdge, E: BendEdge, arc: Arc): Suggestion[] {
  const from = [e.start, e.end];
  const bisector = unitOr(sub(E.C, arc.c), { x: 1, y: 0 });
  const middle = add(arc.c, mul(bisector, arc.r));
  return [line(middle, bisector, 'bend', from), line(middle, perp(bisector), 'bend', from)];
}

/** The direction of the curve at the inflection point of an S-curve or a hook. */
function inflectionTangent(E: TwoArcEdge): Vec {
  const straight = E.pieces.find((p) => p.type === 'line' && dist(p.P, p.Q) > 1e-6);
  if (straight) return sub(straight.Q, straight.P);
  const arc = E.pieces.find(sweeps);
  const end = arc ? pointOn(arc, 1) : null;
  return end ? { x: end.tx, y: end.ty } : { x: 1, y: 0 };
}

/** The point where an S-curve or hook turns, and the lines along its tangent and normal (^272, ^273). */
function inflectionRules(e: RuleEdge, E: TwoArcEdge): Suggestion[] {
  const from = [e.start, e.end];
  const t = inflectionTangent(E);
  const heading = angleOf(t);
  return [
    point(E.J, 'inflection-point', from, { heading }),
    line(E.J, t, 'inflection-lines', from),
    line(E.J, perp(t), 'inflection-lines', from),
  ];
}

/** Everything one segment makes. */
export function edgeRules(e: RuleEdge): Suggestion[] {
  const E = e.ref.E;
  const arcs = E.pieces.filter(sweeps);
  const out = [...curveRules(e), ...arcs.flatMap((a) => arcRules(e, a))];
  if (E.kind === 'C' && arcs[0]) out.push(...bendRules(e, E, arcs[0]));
  if (E.kind === 'S' || E.kind === 'H') out.push(...inflectionRules(e, E));
  return out;
}

/** A straight snap curve as a point on it and its unit direction. */
function straightOf(c: SnapCurve): { p: Vec; u: Vec } {
  const piece = c.pieces[0] as { P: Vec; Q: Vec };
  return { p: piece.P, u: unitOr(sub(piece.Q, piece.P), { x: 1, y: 0 }) };
}

/** Whether two straight snap curves are the same line, within a millimeter (^247). */
function sameLine(a: SnapCurve, b: SnapCurve): boolean {
  const [x, y] = [straightOf(a), straightOf(b)];
  const parallel = Math.abs(x.u.x * y.u.y - x.u.y * y.u.x) < 1e-9;
  return parallel && Math.abs(dot(perp(y.u), sub(x.p, y.p))) <= 1e-3;
}

/** Two lines that coincide are one suggestion that keeps all origins (^275). */
function mergeLines(list: SnapCurve[]): SnapCurve[] {
  const out: SnapCurve[] = [];
  for (const c of list) {
    const twin = out.find((o) => sameLine(o, c));
    if (!twin) out.push({ ...c, origins: [...c.origins], from: [...c.from] });
    else {
      twin.origins.push(...c.origins);
      twin.from = [...new Set([...twin.from, ...c.from])];
    }
  }
  return out;
}

/** Points at the same place (within a millimeter) are one suggestion (the first one wins, its heading too). */
function mergePoints(list: SnapPoint[]): SnapPoint[] {
  const seen = new Map<string, SnapPoint>();
  for (const p of list) {
    const key = `${Math.round(p.at.x * 1000)},${Math.round(p.at.y * 1000)}`;
    const twin = seen.get(key);
    if (!twin) seen.set(key, { ...p, from: [...p.from] });
    else {
      twin.from = [...new Set([...twin.from, ...p.from])];
      twin.node ??= p.node;
    }
  }
  return [...seen.values()];
}

/** Deduplicate: coincident snap lines and equal points are one (^275). Curves of segments stay. */
export function dedupe(list: Suggestion[]): Suggestion[] {
  const lines = list.filter((s): s is SnapCurve => s.kind === 'curve' && s.straight && s.limited);
  const points = list.filter((s): s is SnapPoint => s.kind === 'point');
  const rest = list.filter((s) => s.kind === 'curve' && !(s.straight && s.limited));
  return [...mergePoints(points), ...mergeLines(lines), ...rest];
}

/** All snap suggestions of a map: its nodes and its segments (^275). */
export function suggestionsOf(
  nodes: RuleNode[],
  edges: RuleEdge[],
  widthOfNode: (id: number) => number,
): Suggestion[] {
  const all = [
    ...nodes.flatMap((n) => nodeRules(n, widthOfNode(n.id))),
    ...edges.flatMap(edgeRules),
  ];
  return dedupe(all);
}
