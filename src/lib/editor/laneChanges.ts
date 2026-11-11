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
 * `shifting` segments are the lane that moves across, the `going` ones the lane that goes on
 * beside it, each from the node `node` to its node of the tower (`from`, `beside`); a lane is
 * followed along through nodes with one segment in and one out, since derived nodes cut it up.
 */
export interface LaneChange {
  kind: 'extension' | 'merge';
  /** The side of the lane that is added, or the side a lane that ends merges into (^1056). */
  side: Side;
  /** The node where the lanes part or join. */
  node: GNode;
  shifting: GEdge[];
  going: GEdge[];
  /** The nodes of the tower, the last one before the lanes part or join: on the lane that shifts, and on the one that goes on. */
  from: GNode;
  beside: GNode;
}

/** The tower of every node, by number. */
function towerNumbers(d: Graph): Map<number, number> {
  const of = new Map<number, number>();
  towersOf(d).forEach((t, i) => t.forEach((n) => of.set(n.id, i)));
  return of;
}

/** Whether the node `a` is to the left of the node `b`, seen along the heading of `b`. */
const leftOf = (a: GNode, b: GNode) => dot(sub(a, b), perp(fromAngle(b.th))) < 0;

/** A node along a lane from a node, and the segments between. */
export interface Step {
  node: GNode;
  edges: GEdge[];
}

const isPlain = (d: Graph, n: GNode) =>
  edgesIn(d, n.id).length === 1 && edgesOut(d, n.id).length === 1;

/** The nodes along a lane that leaves (`out`) or arrives at a node by its first segment, through plain nodes. */
export function walk(d: Graph, first: GEdge, way: 'out' | 'in'): Step[] {
  const steps: Step[] = [];
  const [edges, seen] = [[first], new Set([first.id])];
  for (let e = first; ;) {
    const node = nodeOf(d, way === 'out' ? e.end : e.start);
    if (!node) break;
    steps.push({ node, edges: [...edges] });
    const next = (way === 'out' ? edgesOut(d, node.id) : edgesIn(d, node.id))[0];
    if (!isPlain(d, node) || !next || seen.has(next.id)) break;
    [e] = [next];
    seen.add(e.id);
    edges.push(e);
  }
  return steps;
}

/** The first nodes of two lanes, nearest to where they start, that are part of one tower. */
function sharedTower(a: Step[], b: Step[], tower: Map<number, number>): [Step, Step] | null {
  for (const x of a) {
    const mate = b.find(
      (y) => tower.has(x.node.id) && tower.get(y.node.id) === tower.get(x.node.id),
    );
    if (mate) return [x, mate];
  }
  return null;
}

/**
 * The extension at a node `B` (^1056): two segments leave it, B->C and B->D, C to the left of D,
 * and C and D (the first nodes of the lanes that are part of one tower) are. The lane that is
 * added is the one that reaches farther, in a straight line from B: if that is C, a left
 * extension, else a right one.
 */
function extensionAt(d: Graph, b: GNode, tower: Map<number, number>): LaneChange | null {
  const outs = edgesOut(d, b.id);
  const pair =
    outs.length === 2 && sharedTower(walk(d, outs[0]!, 'out'), walk(d, outs[1]!, 'out'), tower);
  if (!pair) return null;
  const [left, right] = leftOf(pair[0].node, pair[1].node) ? pair : [pair[1], pair[0]];
  const side: Side = dist(b, left.node) > dist(b, right.node) ? 'left' : 'right';
  const [shifting, going] = side === 'left' ? [left, right] : [right, left];
  return {
    kind: 'extension',
    side,
    node: b,
    shifting: shifting.edges,
    going: going.edges,
    from: shifting.node,
    beside: going.node,
  };
}

/**
 * The merges at a node `B` (^1056): a segment A->B for which there is another one, C->B, with A
 * and C (the first nodes of the lanes that are part of one tower) and A farther from B than C is.
 * A is the lane that ends; it merges into the side where C is.
 */
function mergesAt(d: Graph, b: GNode, tower: Map<number, number>): LaneChange[] {
  const ins = edgesIn(d, b.id);
  return ins.flatMap((a) =>
    ins
      .filter((c) => c.id !== a.id)
      .flatMap((c): LaneChange[] => {
        const pair = sharedTower(walk(d, a, 'in'), walk(d, c, 'in'), tower);
        if (!pair || dist(pair[0].node, b) <= dist(pair[1].node, b)) return [];
        const [mine, theirs] = pair;
        const side: Side = leftOf(theirs.node, mine.node) ? 'left' : 'right';
        return [
          {
            kind: 'merge',
            side,
            node: b,
            shifting: mine.edges,
            going: theirs.edges,
            from: mine.node,
            beside: theirs.node,
          },
        ];
      }),
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
    const towards = c.kind === 'extension' ? c.side : leftOf(c.from, c.beside) ? 'left' : 'right';
    return c.going.flatMap((e) => {
      const pieces = (curveOfEdge(d, e.id)?.pieces ?? []).filter((p) => !isDegenerate(p));
      const h = (towards === 'right' ? 1 : -1) * (widthOf(d, e) / 2);
      const moved = pieces.map((p) => offsetPiece(p, h));
      return pieces.length && moved.every((p) => p !== null)
        ? [{ pieces: moved as Piece[], kind: 'dashed' as const }]
        : [];
    });
  });
}
