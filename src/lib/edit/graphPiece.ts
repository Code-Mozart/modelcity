import { emptyGraph, roundToMm, type GEdge, type GNode, type Graph } from '../model/graph';
import type { EdgeRow, NodeRow } from '../project/storage';
import { changed, withCurves, type Pair, type RowChange } from './change';
import type { RowSource } from './deleteNodes';

/** The ids that the next node and the next segment get (^1224): larger than every id in use. */
export interface NextIds {
  node: number;
  edge: number;
}

const toM = (mm: number) => mm / 1000;
const toMm = (m: number) => Math.round(m * 1000);

const nodeOfRow = ([id, x, y, th]: NodeRow): GNode => ({ id, x: toM(x), y: toM(y), th });
const edgeOfRow = ([id, start, end, radius, lane]: EdgeRow): GEdge => ({
  id,
  start,
  end,
  radius: radius === null ? null : toM(radius),
  lane,
});
const rowOfNode = (n: GNode): NodeRow => [n.id, toMm(n.x), toMm(n.y), n.th];
const rowOfEdge = (e: GEdge): EdgeRow => [
  e.id,
  e.start,
  e.end,
  e.radius === null ? null : toMm(e.radius),
  e.lane,
];

/**
 * A piece of the map as a graph in meters (^1262): the shape the pure editing functions of `main`
 * work on (`model/graph.ts`), so that they are ported, not written again. It holds only the rows an
 * operation reads; the ids it makes start at `next`.
 */
export function graphOfRows(nodes: NodeRow[], edges: EdgeRow[], next: NextIds): Graph {
  return {
    ...emptyGraph(),
    nodes: nodes.map(nodeOfRow),
    edges: edges.map(edgeOfRow),
    nextNodeId: next.node,
    nextEdgeId: next.edge,
  };
}

/**
 * The rows round some nodes, as a graph: the nodes, every segment at them, and the nodes at the
 * far ends of those segments.
 */
export async function readPiece(source: RowSource, ids: number[], next: NextIds): Promise<Graph> {
  if (!ids.length) return graphOfRows([], [], next);
  const edges = await source.edgesAt(ids);
  const all = new Set([...ids, ...edges.flatMap((e) => [e[1], e[2]])]);
  return graphOfRows(await source.nodes([...all]), edges, next);
}

/**
 * What an editing function did to a piece, as rows (^1260): every node and segment that is new,
 * different or gone, rounded to the millimeter as it is stored, and the nodes of the piece that the
 * changed segments run between as the context.
 */
export function changeOfGraphs(before: Graph, after: Graph): RowChange {
  const pairs = <T extends { id: number }, R>(a: T[], b: T[], row: (t: T) => R): Pair<R>[] => {
    const was = new Map(a.map((t) => [t.id, t]));
    const now = new Map(b.map((t) => [t.id, t]));
    const ids = new Set([...was.keys(), ...now.keys()]);
    return [...ids].map((id) => {
      const [p, q] = [was.get(id), now.get(id)];
      return { before: p ? row(p) : null, after: q ? row(q) : null };
    });
  };
  const [a, b] = [roundToMm(before), roundToMm(after)];
  const nodes = changed(pairs(a.nodes, b.nodes, rowOfNode));
  // A segment at a node that moved or turned has another curve, also when its row is the same.
  const edges = withCurves(pairs(a.edges, b.edges, rowOfEdge), nodes);
  const touched = new Set(nodes.map((p) => (p.after ?? p.before)![0]));
  const ends = new Set(
    edges.flatMap((p) => [p.before, p.after].flatMap((e) => (e ? [e[1], e[2]] : []))),
  );
  const context = b.nodes.filter((n) => ends.has(n.id) && !touched.has(n.id)).map(rowOfNode);
  return { nodes, edges, context };
}

/** The ids a change made: the next ids after it are past them. */
export function nextAfter(c: RowChange, next: NextIds): NextIds {
  const made = <R extends [number, ...unknown[]]>(pairs: Pair<R>[]) =>
    pairs.reduce((m, p) => (p.after && !p.before ? Math.max(m, p.after[0] + 1) : m), 0);
  return { node: Math.max(next.node, made(c.nodes)), edge: Math.max(next.edge, made(c.edges)) };
}
