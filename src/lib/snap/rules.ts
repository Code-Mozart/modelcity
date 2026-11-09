import type { EdgeRef } from '../curves/path';
import { offsetPiece } from '../curves/offset';
import { pointOn, sweeps } from '../curves/piece';
import type { Arc, BendEdge, Piece, TwoArcEdge } from '../curves/types';
import { add, angleOf, dist, fromAngle, mul, perp, sub, unitOr, type Vec } from '../curves/vec';
import { infiniteLine } from './geometry';
import { dedupe } from './merge';
import { RANK, type Rule, type SnapCurve, type SnapPoint, type Suggestion } from './types';

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
    point(n, 'node-points', [n.id], { heading, node: n.id, origin, rank: RANK.node }),
    point(add(n, side), 'node-points', [n.id], { heading, origin, rank: RANK.offset }),
    // Right-hand traffic (^253): on the right the lane runs the same way, on the left the opposite way.
    point(sub(n, side), 'node-points', [n.id], {
      heading: heading + Math.PI,
      origin,
      rank: RANK.offset,
    }),
  ];
}

/**
 * The angles of the extend lines from the heading: 7.5° to 82.5° in steps of 7.5° (^483). A curve
 * that leaves the node at the angle α to its chord turns by 2α (a half circle, 180°, at the normal line,
 * 90°), so the curve turns in steps of 15°.
 */
const EXTEND_ANGLES = Array.from({ length: 11 }, (_, k) => (k + 1) * 7.5);

/**
 * What the node a road is extended from makes besides its own lines, only in extend mode (^325 to
 * ^330, ^337 to ^340): snap lines through it at 7.5° to 82.5° from its heading, in steps of 7.5°, and
 * the same the other way.
 */
export function extendRules(n: RuleNode): Suggestion[] {
  return EXTEND_ANGLES.flatMap((deg) =>
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
    return point(s, 'radius-point', from, {
      heading: th,
      origin: { at: { x: s.x, y: s.y }, th },
      rank: t === 0.5 ? RANK.bisector : RANK.derived,
    });
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
    point(E.C, 'corner', from, { rank: RANK.corner }),
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
    ...[E.k1, E.k2].flatMap((k) => (k ? [point(k, 'corner', from, { rank: RANK.corner })] : [])),
    point(E.J, 'inflection-point', from, {
      heading,
      origin: { at: { x: E.J.x, y: E.J.y }, th: heading },
      rank: RANK.derived,
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
