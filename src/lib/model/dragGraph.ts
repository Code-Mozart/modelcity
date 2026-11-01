import { applyDrag } from '../curves/drag';
import type { Path } from '../curves/path';
import type { PathNode } from '../curves/types';
import type { Vec } from '../curves/vec';
import { edgeOfId, nodeOf, withNode, withRadius, type Graph } from './graph';
import type { RoadHandle } from '../editor/chains';

const sameNode = (a: PathNode, b: PathNode) => a.x === b.x && a.y === b.y && a.th === b.th;

function writeBack(g: Graph, id: number, from: PathNode, to: PathNode): Graph {
  return sameNode(from, to) ? g : withNode(g, id, { x: to.x, y: to.y, th: to.th });
}

type Mod = Parameters<typeof applyDrag>[3];

function dragNodeHandle(g: Graph, handle: RoadHandle, pt: Vec, mod: Mod): Graph {
  const n = nodeOf(g, handle.id);
  if (!n) return g;
  const path: Path = { nodes: [n], radii: [] };
  return writeBack(g, n.id, n, applyDrag(path, { handle: { ...handle, i: 0 } }, pt, mod).nodes[0]!);
}

function dragEdgeHandle(g: Graph, handle: RoadHandle, pt: Vec, mod: Mod): Graph {
  const e = edgeOfId(g, handle.id);
  const [p, q] = [nodeOf(g, e?.start ?? -1), nodeOf(g, e?.end ?? -1)];
  if (!e || !p || !q) return g;
  const path: Path = { nodes: [p, q], radii: [e.radius] };
  const next = applyDrag(path, { handle: { ...handle, i: 0 } }, pt, mod);
  const moved = writeBack(writeBack(g, p.id, p, next.nodes[0]!), q.id, q, next.nodes[1]!);
  return next.radii[0] === e.radius ? moved : withRadius(moved, e.id, next.radii[0] ?? null);
}

/**
 * The graph after dragging the grabbed handle to `pt`. The curve code drags on a path, so the nodes
 * and the radius the handle affects are put into a small one and written back (headings never
 * change when radii do, ^8).
 */
export function dragGraph(g: Graph, handle: RoadHandle, pt: Vec, mod: Mod): Graph {
  const onNode = handle.type === 'node' || handle.type === 'head';
  return (onNode ? dragNodeHandle : dragEdgeHandle)(g, handle, pt, mod);
}
