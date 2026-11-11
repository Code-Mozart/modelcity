import { alongLoop, loopLength } from '../curves/along';
import type { Vec } from '../curves/vec';
import { edgesIn, edgesOut, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { besideSibling, isShift, manoeuvreOf, turning, type Manoeuvre } from './manoeuvres';

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
 * the right, so it is the right leg, and a left turn the left leg. A shift beside the leg it
 * moves towards is a lane that ends: it merges into that side. Any other shift comes from the
 * side it moves away from. Null for the leg that goes straight on.
 */
function legSign(g: Graph, n: GNode, leg: GEdge): Sign | null {
  const m = manoeuvreOf(g, leg);
  const turn = turnSide(g, leg, m);
  if (turn) return directions(false, turn === 'left', turn === 'right');
  if (!isShift(m)) return null;
  const towards = m === 'shift left' ? 'left' : 'right';
  if (besideSibling(g, n, leg, edgesIn(g, n.id))) return { kind: 'merge', side: towards };
  return directions(false, towards === 'right', towards === 'left');
}

/**
 * The sign of what follows a split (^1012): the ways its segments leave, each by its own
 * manoeuvre. Two segments of which one shifts and ends beside the other: a lane is added on the
 * side of the shift. Nothing but segments that go on (straight or shifting), or nothing but
 * turns, whichever way (two to the left are still one further left than the other): a split.
 */
function splitSign(g: Graph, n: GNode, outs: GEdge[]): Sign {
  const all = outs.map((o) => ({ o, m: manoeuvreOf(g, o) }));
  const shift = all.find(({ o, m }) => isShift(m) && besideSibling(g, n, o, outs));
  if (outs.length === 2 && shift) {
    return { kind: 'extension', side: shift.m === 'shift left' ? 'left' : 'right' };
  }
  const sides = all.map(({ o, m }) => turnSide(g, o, m));
  const turns = sides.filter((s) => s !== null);
  if (turns.length === 0 || turns.length === sides.length) return directions(false, true, true);
  return directions(true, turns.includes('left'), turns.includes('right'));
}

/**
 * The sign of a segment (^1012): that of its branch, read at the last node of the branch. If
 * that node is a merge and the branch reaches it as a leg that is not straight on, the sign of
 * the leg; else, if the node is a split, the sign of the split; else straight on.
 */
export function signOf(g: Graph, e: GEdge): Sign {
  const last = lastOfBranch(g, e);
  const n = nodeOf(g, last.end);
  if (!n) return STRAIGHT;
  const leg = edgesIn(g, n.id).length > 1 ? legSign(g, n, last) : null;
  if (leg) return leg;
  const outs = edgesOut(g, n.id);
  return outs.length > 1 ? splitSign(g, n, outs) : STRAIGHT;
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
