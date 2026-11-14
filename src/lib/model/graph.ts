import { LANE_WIDTH_M } from '../curves/lane';
import type { PathNode } from '../curves/types';

/**
 * The stored data model as the editor holds it (^106, ^170, `docs/data-model.md`): a directed
 * graph of nodes and edges. Lengths are meters here (the file rounds to millimeters). Everything
 * else (chains, curves, junctions, branches) is derived. All functions are pure.
 */
export interface GNode extends PathNode {
  id: number;
}

/** An edge runs from `start` to `end` (its direction of travel); a null radius is automatic (^8). */
export interface GEdge {
  id: number;
  start: number;
  end: number;
  radius: number | null;
  lane: number;
}

/** A named set of lane properties that edges refer to (^26). */
interface Lane {
  name: string;
  /** Meters. */
  width: number;
}

export interface Graph {
  nodes: GNode[];
  edges: GEdge[];
  lanes: Record<number, Lane>;
  /** The id the next node and the next edge get (^1224): ids are never reused and an insert needs no scan. Larger than every id in use. */
  nextNodeId: number;
  nextEdgeId: number;
}

const DEFAULT_LANE = 1;

export const emptyGraph = (): Graph => ({
  nodes: [],
  edges: [],
  lanes: { [DEFAULT_LANE]: { name: 'default', width: LANE_WIDTH_M } },
  nextNodeId: 0,
  nextEdgeId: 0,
});

const indexOfNodes = new WeakMap<Graph, Map<number, GNode>>();

/** The node with this id (nodes are looked up through an index kept per graph). */
export function nodeOf(g: Graph, id: number): GNode | undefined {
  let index = indexOfNodes.get(g);
  if (!index) {
    index = new Map(g.nodes.map((n) => [n.id, n]));
    indexOfNodes.set(g, index);
  }
  return index.get(id);
}

/** The segments of a graph by number and by node, found once per graph (^938): graphs are never changed, so the index never goes stale. */
interface EdgeIndex {
  byId: Map<number, GEdge>;
  into: Map<number, GEdge[]>;
  out: Map<number, GEdge[]>;
  at: Map<number, GEdge[]>;
}
const indexOfEdges = new WeakMap<Graph, EdgeIndex>();

function edgeIndex(g: Graph): EdgeIndex {
  let index = indexOfEdges.get(g);
  if (!index) {
    index = builtEdges(g);
    indexOfEdges.set(g, index);
  }
  return index;
}

function builtEdges(g: Graph): EdgeIndex {
  const index: EdgeIndex = { byId: new Map(), into: new Map(), out: new Map(), at: new Map() };
  const push = (m: Map<number, GEdge[]>, id: number, e: GEdge) => {
    const list = m.get(id);
    if (list) list.push(e);
    else m.set(id, [e]);
  };
  for (const e of g.edges) {
    index.byId.set(e.id, e);
    push(index.into, e.end, e);
    push(index.out, e.start, e);
    push(index.at, e.start, e);
    if (e.end !== e.start) push(index.at, e.end, e);
  }
  return index;
}

export const edgeOfId = (g: Graph, id: number): GEdge | undefined => edgeIndex(g).byId.get(id);

/** The edges that run into a node and out of it, in the order of the graph (a new list each time, so that a caller may change it). */
export const edgesIn = (g: Graph, id: number) => [...(edgeIndex(g).into.get(id) ?? [])];
export const edgesOut = (g: Graph, id: number) => [...(edgeIndex(g).out.get(id) ?? [])];
export const edgesAt = (g: Graph, id: number) => [...(edgeIndex(g).at.get(id) ?? [])];

export function addNode(g: Graph, at: PathNode): { graph: Graph; id: number } {
  const id = g.nextNodeId;
  const nodes = [...g.nodes, { id, x: at.x, y: at.y, th: at.th }];
  return { graph: { ...g, nodes, nextNodeId: id + 1 }, id };
}

export function addEdge(g: Graph, start: number, end: number, radius: number | null = null): Graph {
  const edge: GEdge = { id: g.nextEdgeId, start, end, radius, lane: DEFAULT_LANE };
  return { ...g, edges: [...g.edges, edge], nextEdgeId: edge.id + 1 };
}

export function withNode(g: Graph, id: number, patch: Partial<PathNode>): Graph {
  return { ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

export function withRadius(g: Graph, id: number, radius: number | null): Graph {
  return { ...g, edges: g.edges.map((e) => (e.id === id ? { ...e, radius } : e)) };
}

/** Give the listed edges the radius of edge `from`, copying its current value (^77). */
export function shareRadius(g: Graph, from: number, to: number[]): Graph {
  const value = edgeOfId(g, from)?.radius ?? null;
  return { ...g, edges: g.edges.map((e) => (to.includes(e.id) ? { ...e, radius: value } : e)) };
}

/**
 * Insert a node on an edge at a point of its curve with the curve's heading: the edge becomes two,
 * both keep the radius, so the curve does not change (^10).
 */
export function insertNode(g: Graph, edge: number, at: PathNode): { graph: Graph; id: number } {
  const e = edgeOfId(g, edge);
  if (!e) return { graph: g, id: -1 };
  const added = addNode(g, at);
  const second: GEdge = { ...e, id: g.nextEdgeId, start: added.id };
  const edges = g.edges.map((x) => (x.id === edge ? { ...x, end: added.id } : x));
  const graph = { ...added.graph, edges: [...edges, second], nextEdgeId: second.id + 1 };
  return { graph, id: added.id };
}

/** Remove one node: a node with one edge in and one out joins its neighbours, otherwise its edges go. */
function removeNode(g: Graph, id: number): Graph {
  const [inE, outE] = [edgesIn(g, id), edgesOut(g, id)];
  const rest = g.edges.filter((e) => e.start !== id && e.end !== id);
  // A ring of two would join into a segment from its other node to itself: its edges go instead (^322).
  const join =
    inE.length === 1 &&
    outE.length === 1 &&
    inE[0]!.start !== id &&
    outE[0]!.end !== id &&
    inE[0]!.start !== outE[0]!.end;
  const joined: GEdge[] = join ? [{ ...inE[0]!, end: outE[0]!.end, radius: null }] : [];
  return { ...g, nodes: g.nodes.filter((n) => n.id !== id), edges: [...rest, ...joined] };
}

/**
 * Remove nodes. A node without any edge is gone too, unless it is `keep` (the first node of the
 * road being drawn has no edge yet).
 */
export function removeNodes(g: Graph, ids: number[], keep: number | null): Graph {
  const removed = ids.reduce(removeNode, g);
  const used = new Set(removed.edges.flatMap((e) => [e.start, e.end]));
  const nodes = removed.nodes.filter((n) => used.has(n.id) || n.id === keep);
  return nodes.length === removed.nodes.length ? removed : { ...removed, nodes };
}

/** Whether two graphs hold the same nodes, edges and lanes, whichever objects they are. */
export function sameGraph(a: Graph, b: Graph): boolean {
  if (a === b) return true;
  const same = <T extends object>(x: T[], y: T[]) =>
    x.length === y.length &&
    x.every((item, i) => Object.entries(item).every(([k, v]) => v === (y[i] as never)[k]));
  const lanes = (g: Graph) => Object.entries(g.lanes).map(([id, l]) => ({ id, ...l }));
  return same(a.nodes, b.nodes) && same(a.edges, b.edges) && same(lanes(a), lanes(b));
}

const mm = (m: number) => Math.round(m * 1000) / 1000;

/**
 * The graph with every length rounded to the millimeter, the resolution of the stored model
 * (`docs/data-model.md`): the editor rounds when it commits a change, so what is saved and loaded
 * again is what was on the screen. The same graph object if nothing changes.
 */
export function roundToMm(g: Graph): Graph {
  const nodes = g.nodes.map((n) =>
    mm(n.x) === n.x && mm(n.y) === n.y ? n : { ...n, x: mm(n.x), y: mm(n.y) },
  );
  const edges = g.edges.map((e) =>
    e.radius === null || mm(e.radius) === e.radius ? e : { ...e, radius: mm(e.radius) },
  );
  const lanes = Object.fromEntries(
    Object.entries(g.lanes).map(([id, l]) => [
      id,
      mm(l.width) === l.width ? l : { ...l, width: mm(l.width) },
    ]),
  );
  const same =
    nodes.every((n, i) => n === g.nodes[i]) &&
    edges.every((e, i) => e === g.edges[i]) &&
    Object.entries(lanes).every(([id, l]) => l === g.lanes[Number(id)]);
  return same ? g : { ...g, nodes, edges, lanes };
}
