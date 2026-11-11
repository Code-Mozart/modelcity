import { alongLoop, loopLength } from '../curves/along';
import type { Vec } from '../curves/vec';
import { edgesIn, edgesOut, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { alongOrAgainst } from '../curves/tolerance';
import { curveOfEdge } from './chains';
import { besideSide, isShift, manoeuvreOf, turning, type Manoeuvre } from './manoeuvres';

/**
 * What a segment is, as a sign of the debug layer (^1012), after the German signs of the
 * prescribed directions (209, 214) and the boards for a lane that is added or ends (541, 531).
 * `directions`: the ways named; `extension`: a lane is added on that side; `merge`: the lane ends
 * and merges into the lane on that side.
 */
export type Sign =
  | { kind: 'directions'; straight: boolean; left: boolean; right: boolean }
  | { kind: 'extension' | 'merge'; side: 'left' | 'right' };

const directions = (straight: boolean, left: boolean, right: boolean): Sign => ({
  kind: 'directions',
  straight,
  left,
  right,
});
const STRAIGHT = directions(true, false, false);

/** A node that a branch runs through: one segment in, one out (^128). */
const plain = (g: Graph, id: number) => edgesIn(g, id).length === 1 && edgesOut(g, id).length === 1;

/** The last segment of the branch of a segment, going on through plain nodes (not round a ring for ever). */
export function lastOfBranch(g: Graph, e: GEdge): GEdge {
  const seen = new Set([e.id]);
  let last = e;
  while (plain(g, last.end)) {
    const next = edgesOut(g, last.end)[0]!;
    if (seen.has(next.id)) break;
    seen.add(next.id);
    last = next;
  }
  return last;
}

/** Left or right of a manoeuvre that is a turn (a u-turn by the way it turns), else null. */
function turnSide(g: Graph, e: GEdge, m: Manoeuvre | null): 'left' | 'right' | null {
  if (m === 'left turn') return 'left';
  if (m === 'right turn') return 'right';
  return m === 'u-turn' ? (turning(g, e) > 0 ? 'right' : 'left') : null;
}

/**
 * The sign of a leg of a merge, the last segment of its branch (^1013): a leg that starts beside
 * another leg (a tower, whatever the curves between) is a lane that ends: it merges into the
 * lane on the side away from where it comes from. A right turn comes from the right, so it is the
 * right leg, and a left turn the left leg. Any other shift comes from the side it moves away
 * from. Null for the leg that goes straight on.
 */
function legSign(g: Graph, n: GNode, leg: GEdge): Sign | null {
  const from = besideSide(g, n, leg, edgesIn(g, n.id));
  if (from) return { kind: 'merge', side: from === 'left' ? 'right' : 'left' };
  const m = manoeuvreOf(g, leg);
  const turn = turnSide(g, leg, m);
  if (turn) return directions(false, turn === 'left', turn === 'right');
  if (!isShift(m)) return null;
  const towards = m === 'shift left' ? 'left' : 'right';
  return directions(false, towards === 'right', towards === 'left');
}

/**
 * The sign of what follows a split (^1012): the ways its segments leave, each by its own
 * manoeuvre. Two segments of which one ends beside the other (a tower, whatever the curves
 * between, and on the side of the other that it is on): a lane is added on that side. Nothing
 * but segments that go on (straight or shifting), or nothing but turns, whichever way (two to
 * the left are still one further left than the other): a split.
 */
function splitSign(g: Graph, n: GNode, outs: GEdge[]): Sign {
  const all = outs.map((o) => ({ o, m: manoeuvreOf(g, o) }));
  const sides = outs.map((o) => besideSide(g, n, o, outs));
  const added = sides.find((s) => s !== null);
  if (outs.length === 2 && added) return { kind: 'extension', side: added };
  const turnSides = all.map(({ o, m }) => turnSide(g, o, m));
  const turns = turnSides.filter((s) => s !== null);
  const sharp = sharperOfTwo(g, outs, turnSides);
  if (sharp) return directions(true, sharp === 'left', sharp === 'right');
  if (turns.length === 0 || turns.length === turnSides.length) return directions(false, true, true);
  return directions(true, turns.includes('left'), turns.includes('right'));
}

/**
 * How a turn compares with a quarter turn: less (-1), more (1), or a quarter turn (0), which is
 * judged by the headings of its nodes (^865) and not by an angle that is 90 degrees but for a hair.
 */
function againstQuarter(g: Graph, e: GEdge): -1 | 0 | 1 {
  const [a, b] = [nodeOf(g, e.start), nodeOf(g, e.end)];
  if (a && b && alongOrAgainst({ th: a.th + Math.PI / 2 }, b)) return 0;
  return Math.abs(turning(g, e)) < Math.PI / 2 ? -1 : 1;
}

/**
 * The quarter-turn rule (^1023): of two turns to opposite sides, one of less than a quarter turn
 * counts as going on if the other is more than a quarter turn. The side of that sharper turn, or
 * null if the rule does not apply.
 */
function sharperOfTwo(
  g: Graph,
  outs: GEdge[],
  sides: ('left' | 'right' | null)[],
): 'left' | 'right' | null {
  if (outs.length !== 2 || sides.includes(null) || sides[0] === sides[1]) return null;
  const [q0, q1] = [againstQuarter(g, outs[0]!), againstQuarter(g, outs[1]!)];
  if (q0 === -1 && q1 === 1) return sides[1]!;
  return q0 === 1 && q1 === -1 ? sides[0]! : null;
}

/**
 * The sign of a segment (^1012): that of its branch, read at the last node of the branch. If
 * that node is a split, also one that is a merge as well, the sign of the split: what follows
 * matters more than how the node is reached (^1024). Else, if it is a merge and the branch
 * reaches it as a leg that is not straight on, the sign of the leg; else straight on.
 */
export function signOf(g: Graph, e: GEdge): Sign {
  const last = lastOfBranch(g, e);
  const n = nodeOf(g, last.end);
  if (!n) return STRAIGHT;
  const outs = edgesOut(g, n.id);
  if (outs.length > 1) return splitSign(g, n, outs);
  return (edgesIn(g, n.id).length > 1 ? legSign(g, n, last) : null) ?? STRAIGHT;
}

/** A sign at the middle of its segment (^1015). */
export interface PlacedSign {
  at: Vec;
  sign: Sign;
}

export function segmentSigns(g: Graph): PlacedSign[] {
  return g.edges.flatMap((e): PlacedSign[] => {
    const pieces = curveOfEdge(g, e.id)?.pieces ?? [];
    const mid = alongLoop(pieces, loopLength(pieces) / 2);
    if (!mid) return [];
    return [{ at: { x: mid.x, y: mid.y }, sign: signOf(g, e) }];
  });
}

/** The name of a sign, with the number of the German sign it is after (^1017). */
export function signName(s: Sign): string {
  if (s.kind !== 'directions') {
    const number = (s.kind === 'extension' ? 541 : 531) + (s.side === 'left' ? '-10' : '-20');
    return `${s.kind === 'extension' ? 'extension' : 'merge into'} ${s.side} (after ${number})`;
  }
  const key = `${s.straight ? 'S' : ''}${s.left ? 'L' : ''}${s.right ? 'R' : ''}`;
  return DIRECTION_NAMES[key] ?? 'none';
}

const DIRECTION_NAMES: Record<string, string> = {
  S: 'straight (209-30)',
  SR: 'straight and right (214)',
  SL: 'straight and left (214-10)',
  SLR: 'straight, right and left (209-30 and 214-30)',
  LR: 'split (214-30)',
  R: 'right (209)',
  L: 'left (209-10)',
};

/**
 * The sign that is painted on the lane (^1052), or null: *straight, right and left* is not painted
 * (the lane before it has no arrow), and neither is the split of a direction that ends in the
 * junction, where both turns are at least a quarter turn (the side road of a T). The split of a
 * fork, where the turns are gentle, is painted.
 */
export function paintedSign(g: Graph, e: GEdge): Sign | null {
  const sign = signOf(g, e);
  if (sign.kind !== 'directions') return sign;
  const [all, onlyTurns] = [
    sign.straight && sign.left && sign.right,
    !sign.straight && sign.left && sign.right,
  ];
  if (all) return null;
  if (!onlyTurns) return sign;
  const turns = edgesOut(g, lastOfBranch(g, e).end).map((o) => againstQuarter(g, o));
  return turns.every((q) => q >= 0) ? null : sign;
}
