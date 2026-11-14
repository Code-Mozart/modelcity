import { LANE_WIDTH_M } from '../curves/lane';
import type { PathNode } from '../curves/types';
import { changesBetween } from './changes';

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
export interface Lane {
  name: string;
  /** Meters. */
  width: number;
}

export interface Graph {
  nodes: GNode[];
  edges: GEdge[];
  lanes: Record<number, Lane>;
}

export const DEFAULT_LANE = 1;

export const emptyGraph = (): Graph => ({
  nodes: [],
  edges: [],
  lanes: { [DEFAULT_LANE]: { name: 'default', width: LANE_WIDTH_M } },
});

const indexOfNodes = new WeakMap<Graph, Map<number, GNode>>();
/** The graph whose index was made last: the index of the next graph of the same shape is that one with the changes made in it (^941). */
const lastNodes: Graph[] = [];
/** How many graphs of different shape (the map, the part of it in the window...) keep their indexes at once. */
const KEPT = 6;

/** The node with this id (nodes are looked up through an index kept per graph). */
export function nodeOf(g: Graph, id: number): GNode | undefined {
  let index = indexOfNodes.get(g);
  if (!index) {
    index = patchedNodes(g) ?? new Map(g.nodes.map((n) => [n.id, n]));
    indexOfNodes.set(g, index);
    lastNodes.unshift(g);
    lastNodes.length = Math.min(lastNodes.length, KEPT);
  }
  return index.get(id);
}

/** The index of the last graph, changed to be the index of `g`, if `g` differs from it in some nodes only. The last graph loses its index (it is made again if that graph is asked again). */
function patchedNodes(g: Graph): Map<number, GNode> | null {
  for (const last of lastNodes) {
    const was = indexOfNodes.get(last);
    const changes = was && changesBetween(last, g);
    if (!was || !changes) continue;
    for (const i of changes.nodes) was.set(g.nodes[i]!.id, g.nodes[i]!);
    indexOfNodes.delete(last);
    lastNodes.splice(lastNodes.indexOf(last), 1);
    return was;
  }
  return null;
}

/** The segments of a graph by number and by node, found once per graph (^938): graphs are never changed, so the index never goes stale. */
interface EdgeIndex {
  byId: Map<number, GEdge>;
  into: Map<number, GEdge[]>;
  out: Map<number, GEdge[]>;
  at: Map<number, GEdge[]>;
}
const indexOfEdges = new WeakMap<Graph, EdgeIndex>();

/** The graph whose index of segments was made last (see `lastNodes`). */
const lastEdges: Graph[] = [];

function edgeIndex(g: Graph): EdgeIndex {
  let index = indexOfEdges.get(g);
  if (index) return index;
  index = patchedEdges(g) ?? builtEdges(g);
  indexOfEdges.set(g, index);
  lastEdges.unshift(g);
  lastEdges.length = Math.min(lastEdges.length, KEPT);
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

/** The index of the last graph changed into that of `g`, when only segments differ (their ends are the same, so only the objects in the lists are replaced, ^941). */
function patchedEdges(g: Graph): EdgeIndex | null {
  for (const last of lastEdges) {
    const was = indexOfEdges.get(last);
    const changes = was && changesBetween(last, g);
    if (!was || !changes) continue;
    const swap = (m: Map<number, GEdge[]>, id: number, from: GEdge, to: GEdge) => {
      const list = m.get(id);
      const i = list ? list.indexOf(from) : -1;
      if (list && i >= 0) list[i] = to;
    };
    for (const i of changes.edges) {
      const [from, to] = [last.edges[i]!, g.edges[i]!];
      was.byId.set(to.id, to);
      swap(was.into, to.end, from, to);
      swap(was.out, to.start, from, to);
      swap(was.at, to.start, from, to);
      if (to.end !== to.start) swap(was.at, to.end, from, to);
    }
    indexOfEdges.delete(last);
    lastEdges.splice(lastEdges.indexOf(last), 1);
    return was;
  }
  return null;
}

export const edgeOfId = (g: Graph, id: number): GEdge | undefined => edgeIndex(g).byId.get(id);

const nextId = (items: { id: number }[]) => items.reduce((m, x) => Math.max(m, x.id), -1) + 1;

/** The edges that run into a node and out of it, in the order of the graph (a new list each time, so that a caller may change it). */
export const edgesIn = (g: Graph, id: number) => [...(edgeIndex(g).into.get(id) ?? [])];
export const edgesOut = (g: Graph, id: number) => [...(edgeIndex(g).out.get(id) ?? [])];
export const edgesAt = (g: Graph, id: number) => [...(edgeIndex(g).at.get(id) ?? [])];

/** The lane width, in meters, of an edge. */
export const widthOf = (g: Graph, e: GEdge) => g.lanes[e.lane]?.width ?? LANE_WIDTH_M;

export function addNode(g: Graph, at: PathNode): { graph: Graph; id: number } {
  const id = nextId(g.nodes);
  return { graph: { ...g, nodes: [...g.nodes, { id, x: at.x, y: at.y, th: at.th }] }, id };
}

export function addEdge(g: Graph, start: number, end: number, radius: number | null = null): Graph {
  const edge: GEdge = { id: nextId(g.edges), start, end, radius, lane: DEFAULT_LANE };
  return { ...g, edges: [...g.edges, edge] };
}

export function withNode(g: Graph, id: number, patch: Partial<PathNode>): Graph {
  return { ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

export function withRadius(g: Graph, id: number, radius: number | null): Graph {
  return { ...g, edges: g.edges.map((e) => (e.id === id ? { ...e, radius } : e)) };
}

/** A node moved by `delta` from where it was (what a group move starts from, ^71). */
export interface Placed {
  id: number;
  x: number;
  y: number;
}

export function placed(g: Graph, ids: number[]): Placed[] {
  return ids.flatMap((id) => {
    const n = nodeOf(g, id);
    return n ? [{ id, x: n.x, y: n.y }] : [];
  });
}

export function moveNodes(g: Graph, group: Placed[], delta: { x: number; y: number }): Graph {
  return group.reduce((acc, p) => withNode(acc, p.id, { x: p.x + delta.x, y: p.y + delta.y }), g);
}

/** Give the listed edges the radius of edge `from`, copying its current value (^77). */
export function shareRadius(g: Graph, from: number, to: number[]): Graph {
  const value = edgeOfId(g, from)?.radius ?? null;
  return { ...g, edges: g.edges.map((e) => (to.includes(e.id) ? { ...e, radius: value } : e)) };
}

/** The edges whose two nodes are both in `ids`: the selected segments (^133). */
export const edgesBetween = (g: Graph, ids: number[]): GEdge[] =>
  g.edges.filter((e) => ids.includes(e.start) && ids.includes(e.end));

/**
 * Insert a node on an edge at a point of its curve with the curve's heading: the edge becomes two,
 * both keep the radius, so the curve does not change (^10).
 */
export function insertNode(g: Graph, edge: number, at: PathNode): { graph: Graph; id: number } {
  const e = edgeOfId(g, edge);
  if (!e) return { graph: g, id: -1 };
  const added = addNode(g, at);
  const second: GEdge = { ...e, id: nextId(g.edges), start: added.id };
  const edges = g.edges.map((x) => (x.id === edge ? { ...x, end: added.id } : x));
  return { graph: { ...added.graph, edges: [...edges, second] }, id: added.id };
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

/**
 * The nodes `ids` turned around (every heading a half turn) and the edges between them reversed:
 * the same curves, running the other way (^234).
 */
export function turnedAround(g: Graph, ids: number[]): Graph {
  const nodes = g.nodes.map((n) => (ids.includes(n.id) ? { ...n, th: n.th + Math.PI } : n));
  const edges = g.edges.map((e) =>
    ids.includes(e.start) && ids.includes(e.end) ? { ...e, start: e.end, end: e.start } : e,
  );
  return { ...g, nodes, edges };
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
  return same ? g : { nodes, edges, lanes };
}
