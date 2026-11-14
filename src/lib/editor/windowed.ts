import { boxAround, boxesMeet, type Box } from '../curves/hull';
import type { Graph } from '../model/graph';
import { chainsOf } from './chains';

/**
 * The part of a graph that a window on the map needs (^1216): everything made from the graph (the
 * surface, markings, lane facts, derived nodes) is only made for what is shown, so that what it
 * costs depends on the window and not on the map. The part holds every chain with a segment whose
 * curve meets the box or holds a node of `keep`, and every chain that meets those at a node (the lanes of a junction look at
 * each other), with the nodes and segments in the order of the graph. A graph that is all inside is
 * returned as it is.
 */
export function windowOf(g: Graph, box: Box, keep: readonly number[] = []): Graph {
  const chains = chainsOf(g);
  const hit = chains.map((c) => c.edges.some((r) => boxesMeet(curveBox(r.E.pieces), box)));
  // Nodes that must be in it (pinned, selected, being extended) bring their chains, wherever they are.
  const wanted = new Set(keep);
  const nodes = new Set<number>();
  chains.forEach((c, i) => {
    hit[i] ||= c.nodeIds.some((id) => wanted.has(id));
    if (hit[i]) c.nodeIds.forEach((id) => nodes.add(id));
  });
  const edges = new Set<number>();
  chains.forEach((c, i) => {
    if (hit[i] || c.nodeIds.some((id) => nodes.has(id))) {
      c.edgeIds.forEach((id) => edges.add(id));
      c.nodeIds.forEach((id) => nodes.add(id));
    }
  });
  if (edges.size === g.edges.length) return g;
  return {
    ...g,
    nodes: g.nodes.filter((n) => nodes.has(n.id) || inside(box, n)),
    edges: g.edges.filter((e) => edges.has(e.id)),
  };
}

const inside = (b: Box, p: { x: number; y: number }) =>
  p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;

/** The box of the pieces of a curve, found once for each (the curve of a segment is the same object while it stays as it is). */
const boxes = new WeakMap<object, Box>();
function curveBox(pieces: Parameters<typeof boxAround>[0]): Box {
  let b = boxes.get(pieces);
  if (!b) boxes.set(pieces, (b = boxAround(pieces)));
  return b;
}
