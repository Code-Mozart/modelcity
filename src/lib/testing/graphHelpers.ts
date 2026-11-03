import { addEdge, addNode, emptyGraph, type Graph } from '../model/graph';

const H = Math.PI / 2;

/** Nodes (x, y, heading) and the edges between them (start, end, radius) by index. */
export function graphOf(
  nodes: [number, number, number][],
  edges: [number, number, number | null][],
): Graph {
  let g = emptyGraph();
  const ids = nodes.map(([x, y, th]) => {
    const r = addNode(g, { x, y, th });
    g = r.graph;
    return r.id;
  });
  for (const [a, b, radius] of edges) g = addEdge(g, ids[a]!, ids[b]!, radius);
  return g;
}

/** Two bends from the left to the right, then down: 20 m and `inner`, `shift` meters apart (one lane width: parallel when concentric). */
export const twoBends = (shift = 3, inner: number | null = 17): Graph =>
  graphOf(
    [
      [0, 0, 0],
      [50, 30, H],
      [0, shift, 0],
      [50 - shift, 30, H],
    ],
    [
      [0, 1, 20],
      [2, 3, inner],
    ],
  );

/** Three concentric bends one lane width apart: 20, 17 and 23 m. */
export const threeBends = (): Graph =>
  graphOf(
    [
      [0, 0, 0],
      [50, 30, H],
      [0, 3, 0],
      [47, 30, H],
      [0, -3, 0],
      [53, 30, H],
    ],
    [
      [0, 1, 20],
      [2, 3, 17],
      [4, 5, 23],
    ],
  );
