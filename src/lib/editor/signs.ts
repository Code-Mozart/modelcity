import { alongLoop, loopLength } from '../curves/along';
import type { Vec } from '../curves/vec';
import { edgesIn, edgesOut, nodeOf, type GEdge, type Graph } from '../model/graph';
import { alongOrAgainst } from '../curves/tolerance';
import { curveOfEdge } from './chains';
import { derivedNodes, originalOf, withDerived } from './derived';
import { laneChangesOf } from './laneChanges';
import { isShift, manoeuvreOf, turning, type Manoeuvre } from './manoeuvres';

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
function lastOfBranch(g: Graph, e: GEdge): GEdge {
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
 * The sign of a leg of a merge, the last segment of its branch (^1013): a right turn comes from
 * the right, so it is the right leg, and a left turn the left leg. Any shift comes from the side
 * it moves away from. Null for the leg that goes straight on. (A lane that ends beside another is
 * a merge, ^1056.)
 */
function legSign(g: Graph, leg: GEdge): Sign | null {
  const m = manoeuvreOf(g, leg);
  const turn = turnSide(g, leg, m);
  if (turn) return directions(false, turn === 'left', turn === 'right');
  if (!isShift(m)) return null;
  const towards = m === 'shift left' ? 'left' : 'right';
  return directions(false, towards === 'right', towards === 'left');
}

/**
 * The sign of what follows a split (^1012): the ways its segments leave, each by its own
 * manoeuvre. Nothing but segments that go on (straight or shifting), or nothing but turns,
 * whichever way (two to the left are still one further left than the other): a split. (A lane
 * added beside another is an extension, ^1056.)
 */
function splitSign(g: Graph, outs: GEdge[]): Sign {
  const sides = outs.map((o) => turnSide(g, o, manoeuvreOf(g, o)));
  const turns = sides.filter((s) => s !== null);
  const sharp = sharperOfTwo(g, outs, sides);
  if (sharp) return directions(true, sharp === 'left', sharp === 'right');
  if (turns.length === 0 || turns.length === sides.length) return directions(false, true, true);
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

/** The sign of a segment (^1012) by the direction its branch takes: that of the last node of the branch, where it is a split or a leg of a merge; else straight on (^1024). */
function directionsOf(g: Graph, e: GEdge): Sign {
  const n = nodeOf(g, lastOfBranch(g, e).end);
  if (!n) return STRAIGHT;
  const outs = edgesOut(g, n.id);
  if (outs.length > 1) return splitSign(g, outs);
  return (edgesIn(g, n.id).length > 1 ? legSign(g, lastOfBranch(g, e)) : null) ?? STRAIGHT;
}

/**
 * The sign of every segment of a graph (^1012), by number. An extension or a merge (^1056) is the
 * sign of the segment that ends at the node where it is, and of no other segment of its branch
 * (^1060): the others go straight on. The rest is as the branch reads at its last node (^1024).
 * Takes the graph with its derived nodes in it, which a caller that has it can hand over.
 */
export function signsOf(g: Graph, d: Graph = withDerived(g, derivedNodes(g))): Map<number, Sign> {
  const changes = new Map<number, Sign>();
  for (const c of laneChangesOf(d)) {
    const ends = c.kind === 'merge' ? [c.shifting[0]!] : edgesIn(d, c.node.id);
    for (const e of ends) changes.set(originalOf(e), { kind: c.kind, side: c.side });
  }
  return new Map(
    g.edges.map((e) => {
      const last = lastOfBranch(g, e);
      const cascaded = last.id !== e.id && changes.has(last.id);
      return [e.id, changes.get(e.id) ?? (cascaded ? STRAIGHT : directionsOf(g, e))];
    }),
  );
}

/** A sign at the middle of its segment (^1015). */
export interface PlacedSign {
  at: Vec;
  sign: Sign;
}

export function segmentSigns(g: Graph, d?: Graph): PlacedSign[] {
  const signs = signsOf(g, d);
  return g.edges.flatMap((e): PlacedSign[] => {
    const pieces = curveOfEdge(g, e.id)?.pieces ?? [];
    const mid = alongLoop(pieces, loopLength(pieces) / 2);
    return mid ? [{ at: { x: mid.x, y: mid.y }, sign: signs.get(e.id)! }] : [];
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
