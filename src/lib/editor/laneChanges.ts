import { offsetPiece } from '../curves/offset';
import { isDegenerate } from '../curves/piece';
import type { Piece } from '../curves/types';
import { dist, dot, fromAngle, perp, sub } from '../curves/vec';
import {
  edgesIn,
  edgesOut,
  nodeOf,
  widthOf,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
import { curveOfEdge } from './chains';
import type { Marking } from './markings';
import { towersOf } from './towers';

type Side = 'left' | 'right';

/**
 * A lane that is added beside another (an extension) or one that ends beside another (a merge):
 * decided on the graph with the derived nodes in it (^822), by towers and distances (^1056). The
 * `shifting` segment is the one that moves across, the `going` one the one that goes on beside it.
 */
export interface LaneChange {
  kind: 'extension' | 'merge';
  /** The side of the lane that is added, or of the lane that ends: left or right of the one that goes on (^1056). */
  side: Side;
  /** The node where the lanes part or join. */
  node: GNode;
  shifting: GEdge;
  going: GEdge;
}

/** The tower of every node, by number. */
function towerNumbers(d: Graph): Map<number, number> {
  const of = new Map<number, number>();
  towersOf(d).forEach((t, i) => t.forEach((n) => of.set(n.id, i)));
  return of;
}

/** Whether the node `a` is to the left of the node `b`, seen along the heading of `b`. */
const leftOf = (a: GNode, b: GNode) => dot(sub(a, b), perp(fromAngle(b.th))) < 0;

/**
 * The extension at a node `B` (^1056): two segments leave it, B->C and B->D, C to the left of D,
 * and C and D (their far nodes) are part of one tower. The lane that is added is the one that
 * reaches farther, in a straight line from B: if that is C, a left extension, else a right one.
 */
function extensionAt(d: Graph, b: GNode, tower: Map<number, number>): LaneChange | null {
  const outs = edgesOut(d, b.id);
  const ends = outs.map((e) => nodeOf(d, e.end));
  const [x, y] = ends;
  const joined = x && y && tower.has(x.id) && tower.get(x.id) === tower.get(y.id);
  if (outs.length !== 2 || !joined) return null;
  const [c, dd] = leftOf(x, y) ? [0, 1] : [1, 0];
  const side: Side = dist(b, ends[c]!) > dist(b, ends[dd]!) ? 'left' : 'right';
  const [shifting, going] = side === 'left' ? [outs[c]!, outs[dd]!] : [outs[dd]!, outs[c]!];
  return { kind: 'extension', side, node: b, shifting, going };
}

/**
 * The merges at a node `B` (^1056): a segment A->B for which there is another one, C->B, with A
 * and C part of one tower and A farther from B than C is. A is the lane that ends; it merges into
 * the side where C is.
 */
function mergesAt(d: Graph, b: GNode, tower: Map<number, number>): LaneChange[] {
  const ins = edgesIn(d, b.id);
  const start = (e: GEdge) => nodeOf(d, e.start)!;
  return ins.flatMap((a) =>
    ins
      .filter((c) => c.id !== a.id && tower.get(start(a).id) !== undefined)
      .filter((c) => tower.get(start(c).id) === tower.get(start(a).id))
      .filter((c) => dist(start(a), b) > dist(start(c), b))
      .map((c): LaneChange => ({
        kind: 'merge',
        side: leftOf(start(c), start(a)) ? 'left' : 'right',
        node: b,
        shifting: a,
        going: c,
      })),
  );
}

/** The extensions and merges of a graph with its derived nodes in it, at its real nodes (^1056). */
export function laneChangesOf(d: Graph): LaneChange[] {
  const tower = towerNumbers(d);
  return d.nodes
    .filter((n) => n.id > 0)
    .flatMap((n) => [extensionAt(d, n, tower) ?? [], ...mergesAt(d, n, tower)].flat());
}

/**
 * The dashed lines through the extensions and merges (^1057): along the lane that goes on, half
 * its width towards the lane that shifts, from the node where the lanes part to where they are
 * beside each other, or the other way round for a merge.
 */
export function laneChangeLines(d: Graph, changes: LaneChange[]): Marking[] {
  return changes.flatMap((c) => {
    const pieces = (curveOfEdge(d, c.going.id)?.pieces ?? []).filter((p) => !isDegenerate(p));
    const towards = c.kind === 'extension' ? c.side : towardsOf(d, c);
    const moved = pieces.map((p) =>
      offsetPiece(p, (towards === 'right' ? 1 : -1) * (widthOf(d, c.going) / 2)),
    );
    return pieces.length && moved.every((p) => p !== null)
      ? [{ pieces: moved as Piece[], kind: 'dashed' as const }]
      : [];
  });
}

/** The side of the lane that goes on at which the merging lane is: opposite to the side it merges into. */
const towardsOf = (d: Graph, c: LaneChange): Side => {
  const [a, g] = [nodeOf(d, c.shifting.start)!, nodeOf(d, c.going.start)!];
  return leftOf(a, g) ? 'left' : 'right';
};
