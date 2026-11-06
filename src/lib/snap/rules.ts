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
function line(
  at: Vec,
  dir: Vec,
  made: { rule: Rule; from: number[]; heading?: number; along?: boolean; th?: number },
): SnapCurve {
  const { rule, from, heading, along, th } = made;
  const here = { x: at.x, y: at.y };
  const gift = {
    at: here,
    from,
    ...(heading === undefined ? {} : { heading }),
    ...(th === undefined ? {} : { origin: { at: here, th } }),
  };
  return {
    gives: [{ ...gift, ...(along ? { along } : {}) }],
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
  const origin = { at: { x: n.x, y: n.y }, th: n.th };
  return [
    line(n, perp(dir), { rule: 'node-normal', from: [n.id], heading, th: n.th }),
    // A tangent line: a node on it heads along it, away from this node (^793).
    line(n, dir, { rule: 'node-heading', from: [n.id], along: true, th: n.th }),
    point(n, 'node-points', [n.id], { heading, node: n.id, origin }),
    point(add(n, side), 'node-points', [n.id], { heading, origin }),
    // Right-hand traffic (^253): on the right the lane runs the same way, on the left the opposite way.
    point(sub(n, side), 'node-points', [n.id], { heading: heading + Math.PI, origin }),
  ];
}

/**
 * What the node a road is extended from makes besides its own lines, only in extend mode (^325 to
 * ^330, ^337 to ^340): snap lines through it at 15° to 75° from its heading, in steps of 15°, and
 * the same the other way.
 */
export function extendRules(n: RuleNode): Suggestion[] {
  return ([15, 30, 45, 60, 75] as const).flatMap((deg) =>
    (['+', '-'] as const).map((sign) =>
      line(n, fromAngle(n.th + ((sign === '+' ? deg : -deg) * Math.PI) / 180), {
        rule: `extend${sign}${deg}`,
        from: [n.id],
        th: n.th,
      }),
    ),
  );
}

/** The part of a curve that belongs to one segment (^268, ^279). */
function curveOf(e: RuleEdge, pieces: Piece[], rule: Rule, side?: 1 | -1): SnapCurve {
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
    ...(side === undefined ? {} : { side }),
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
  // On the screen (y down) a positive offset is on the right-hand side of the direction of travel (^253).
  const offsets = ([1, -1] as const).flatMap((side) => {
    const moved = pieces.map((p) => offsetPiece(p, side * e.width));
    return moved.every((p) => p !== null) ? [curveOf(e, moved as Piece[], 'offset', side)] : [];
  });
  return [curveOf(e, pieces, 'curve'), ...offsets];
}

/** The radius points of an arc, and the lines along the normal at its ticks (^270, ^271). */
function arcRules(e: RuleEdge, arc: Arc): Suggestion[] {
  const from = [e.start, e.end];
  const at = (t: number) => pointOn(arc, t);
  const points = [0, 0.5, 1].map((t) => {
    const s = at(t);
    const th = angleOf({ x: s.tx, y: s.ty });
    return point(s, 'radius-point', from, { heading: th, origin: { at: { x: s.x, y: s.y }, th } });
  });
  const ticks = [0, 1].map((t) => {
    const s = at(t);
    const th = angleOf({ x: s.tx, y: s.ty });
    return line(s, sub(s, arc.c), { rule: 'tick', from, heading: th, th });
  });
  return [...points, ...ticks];
}

/** The bisector of a bend and the tangent of that, at the middle of its arc (^269). */
function bendRules(e: RuleEdge, E: BendEdge, arc: Arc): Suggestion[] {
  const from = [e.start, e.end];
  const bisector = unitOr(sub(E.C, arc.c), { x: 1, y: 0 });
  const middle = add(arc.c, mul(bisector, arc.r));
  // The curve at the middle runs along the second line, so a node on the first one heads that way, and on the second along it (^799).
  const there = pointOn(arc, 0.5);
  const th = angleOf({ x: there.tx, y: there.ty });
  return [
    line(middle, bisector, { rule: 'bend', from, heading: th, th }),
    line(middle, perp(bisector), { rule: 'bend', from, along: true, th }),
  ];
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
    point(E.J, 'inflection-point', from, {
      heading,
      origin: { at: { x: E.J.x, y: E.J.y }, th: heading },
    }),
    line(E.J, t, { rule: 'inflection-lines', from, along: true, th: heading }),
    line(E.J, perp(t), { rule: 'inflection-lines', from, heading, th: heading }),
  ];
}

/** The line across the middle of a straight segment, the way of its symmetry (^798): a node on it heads along the segment. */
function middleRules(e: RuleEdge, E: { pieces: Piece[] }): Suggestion[] {
  const [first, last] = [E.pieces[0], E.pieces[E.pieces.length - 1]];
  if (first?.type !== 'line' || last?.type !== 'line') return [];
  const way = unitOr(sub(last.Q, first.P), { x: 1, y: 0 });
  const middle = mul(add(first.P, last.Q), 0.5);
  return [
    line(middle, perp(way), { rule: 'middle', from: [e.start, e.end], heading: angleOf(way) }),
  ];
}

/** Everything one segment makes. */
export function edgeRules(e: RuleEdge): Suggestion[] {
  const E = e.ref.E;
  const arcs = E.pieces.filter(sweeps);
  const out = [...curveRules(e), ...arcs.flatMap((a) => arcRules(e, a))];
  if (E.kind === 'line') out.push(...middleRules(e, E));
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

/** Two lines that coincide are one suggestion that keeps all origins and all they give (^275, ^792). */
function mergeLines(list: SnapCurve[]): SnapCurve[] {
  const out: SnapCurve[] = [];
  for (const c of list) {
    const twin = out.find((o) => sameLine(o, c));
    if (!twin)
      out.push({ ...c, origins: [...c.origins], from: [...c.from], gives: [...(c.gives ?? [])] });
    else {
      twin.origins.push(...c.origins);
      twin.from = [...new Set([...twin.from, ...c.from])];
      twin.gives = [...(twin.gives ?? []), ...(c.gives ?? [])];
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
