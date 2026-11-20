import { applyDrag, dragHeading, type AngleSnap } from '../curves/drag';
import type { Sample } from '../curves/piece';
import type { Vec } from '../curves/vec';
import {
  edgeOfId,
  insertNode,
  nodeOf,
  removeNodes,
  withNode,
  withRadius,
  type Graph,
} from '../model/graph';
import { nodeAtSample } from './drawing';
import type { RowHandle } from './handles';

/** What a press of the left button holds on to (^9): a node, or a control point of the scaffold. */
export type Grip = { type: 'node'; node: number } | RowHandle;

/** The nodes whose rows a drag of a grip works on (a node with the nodes that move along with it, ^71). */
export function gripNodes(grip: Grip, group: readonly number[]): number[] {
  if (grip.type === 'node') return [grip.node, ...group.filter((id) => id !== grip.node)];
  return grip.type === 'head' ? [grip.node] : [...grip.nodes];
}

/** How a drag goes: the angle steps of a heading (null: `Ctrl` holds them off, ^287), and the nodes that move along with a dragged node. */
export interface DragHow {
  angle: AngleSnap | null;
  group: readonly number[];
}

/**
 * The piece of the map after dragging a grip to `pt` (`main`'s `dragGraph` and `dragStep`): a node
 * goes to the pointer and the nodes of its group by as much (^71, ^264), keeping their headings; a
 * heading point turns its node (^468); a bend point turns both headings so their lines meet at the
 * pointer (^534); a radius point sets the radius that puts it nearest the pointer (^535). The curve
 * code works on a small path of the nodes the grip affects, written back.
 */
export function dragged(g: Graph, grip: Grip, pt: Vec, how: DragHow): Graph {
  if (grip.type === 'node') return movedTo(g, grip.node, pt, how.group);
  if (grip.type === 'head') {
    const n = nodeOf(g, grip.node);
    if (!n) return g;
    const th = dragHeading({ nodes: [n], radii: [] }, 0, pt, how.angle).nodes[0]!.th;
    return withNode(g, n.id, { th });
  }
  return draggedEdge(g, grip, pt);
}

function movedTo(g: Graph, id: number, pt: Vec, group: readonly number[]): Graph {
  const n = nodeOf(g, id);
  if (!n) return g;
  const [dx, dy] = [pt.x - n.x, pt.y - n.y];
  const others = group.filter((o) => o !== id);
  const moved = others.reduce((acc, o) => {
    const m = nodeOf(g, o);
    return m ? withNode(acc, o, { x: m.x + dx, y: m.y + dy }) : acc;
  }, g);
  return withNode(moved, id, { x: pt.x, y: pt.y });
}

/** The grip as the curve code's handle of a path of one segment (`i` 0). */
const handleOf = (grip: Extract<Grip, { type: 'ctrl' | 'rad' }>) =>
  grip.type === 'rad'
    ? { type: 'rad' as const, i: 0, k: grip.k, t: grip.t, x: grip.x, y: grip.y }
    : { type: 'ctrl' as const, i: 0, x: grip.x, y: grip.y };

function draggedEdge(g: Graph, grip: Extract<Grip, { type: 'ctrl' | 'rad' }>, pt: Vec): Graph {
  const e = edgeOfId(g, grip.edge);
  const [p, q] = [nodeOf(g, e?.start ?? -1), nodeOf(g, e?.end ?? -1)];
  if (!e || !p || !q) return g;
  const handle = handleOf(grip);
  const next = applyDrag({ nodes: [p, q], radii: [e.radius] }, { handle }, pt, { angle: null });
  const [a, b] = [next.nodes[0]!, next.nodes[1]!];
  const turned = withNode(withNode(g, p.id, { th: a.th }), q.id, { th: b.th });
  return next.radii[0] === e.radius ? turned : withRadius(turned, e.id, next.radii[0] ?? null);
}

/**
 * Merge a node into another (^248, `main`'s `mergeNodes`): the node `from` goes, its segments run to
 * `into`, which keeps its place and heading. A segment between the two would have no length and
 * goes too; a loop stays.
 */
export function mergeNodes(g: Graph, from: number, into: number): Graph {
  if (from === into) return g;
  const moved = g.edges.map((e) => ({
    e,
    out: { ...e, start: e.start === from ? into : e.start, end: e.end === from ? into : e.end },
  }));
  const kept = moved.filter(({ e, out }) => !(out.start === out.end && e.start !== e.end));
  return { ...g, nodes: g.nodes.filter((n) => n.id !== from), edges: kept.map(({ out }) => out) };
}

/** Where a dragged node was let go to merge (^248, ^268): onto a node, or onto a curve at a point (with its heading there). */
export type Drop = { node: number } | { edge: number; nodes: [number, number]; at: Sample };

/**
 * A node dropped to merge (`main`'s `droppedNode`): into a node, or into a curve, which is split by a
 * node with the heading of the curve there (so the curve does not change). The dropped node goes;
 * a node left without a segment goes too, except `keep` (the node a road is drawn from, ^285).
 * Also the id the dropped node became.
 */
export function droppedNode(g: Graph, id: number, drop: Drop, keep: number | null) {
  const into =
    'node' in drop ? { graph: g, id: drop.node } : insertNode(g, drop.edge, nodeAtSample(drop.at));
  // As on `main`, every node of the piece left without a segment goes (all segments of its nodes are in it).
  return { graph: removeNodes(mergeNodes(into.graph, id, into.id), [], keep), id: into.id };
}
