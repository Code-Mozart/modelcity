import { LANE_WIDTH_M } from '../curves/lane';
import type { Vec } from '../curves/vec';
import { nodeOf, type Graph } from '../model/graph';
import { dist } from '../curves/vec';
import { curvesThrough, snapTo, type SnapQuery } from '../snap/engine';
import { nodeRules, suggestionsOf, type RuleEdge } from '../snap/rules';
import type { SnapHit, Suggestion } from '../snap/types';
import {
  chainHandles,
  chainsOf,
  nearestOnChains,
  nearNode,
  type Chain,
  type RoadHandle,
} from './chains';
import { previewOf, type Drawn } from './targets';
import { headingFrom, placedHeading } from '../snap/heading';
import type { Hover, Placement, PointerInfo, Press } from './types';

/** A node dropped within this world distance (meters) of another node or of a curve is merged into it, whatever the zoom (^248, ^283). */
export const MERGE_WORLD_M = 0.1;

/** Where a node goes when the pointer snapped: the place, with the heading it gets there (^254, ^301). */
export function snappedTo(
  hit: SnapHit | null,
  info: PointerInfo,
  press: Press | null,
): Placement | null {
  if (!hit) return null;
  // A heading takes the heading of what it snapped to, the pointer stays where it is (^313).
  if (turningNode(press) !== null)
    return { pt: info.pt, th: headingFrom(hit, info.alt), node: null };
  return { pt: hit.pt, th: placedHeading(hit, info.alt), node: nodeAt(hit) };
}

/** The node whose place the snap is (a snap point of a node, ^248). */
const nodeAt = (hit: SnapHit): number | null => {
  const s = hit.by[0];
  return s?.kind === 'point' ? (s.node ?? null) : null;
};

/** The nodes that move with a press: the dragged one and its group (^264). */
export function movedIds(press: Press | null): number[] {
  return press?.kind === 'drag' && press.drag.handle.type === 'node'
    ? [press.id, ...press.group.map((g) => g.id)]
    : [];
}

/** The node whose heading is being set: its heading point is dragged, or it was just placed and is dragged (^313). */
export const turningNode = (press: Press | null): number | null =>
  press?.kind === 'place' || (press?.kind === 'drag' && press.drag.handle.type === 'head')
    ? press.id
    : null;

/** The control points of a segment that snap like a position: the radius, the bend and the S-curve points (^249). */
export const controlEdge = (press: Press | null): number | null =>
  press?.kind === 'drag' && ['rad', 'ctrl', 'mid1', 'mid2'].includes(press.drag.handle.type)
    ? press.id
    : null;

const withoutEdge = (g: Graph, id: number): Graph => ({
  ...g,
  edges: g.edges.filter((e) => e.id !== id),
});

/** The graph without some nodes and the edges at them: what the others offer while those move. */
export function without(g: Graph, ids: number[]): Graph {
  if (!ids.length) return g;
  const gone = new Set(ids);
  const edges = g.edges.filter((e) => !gone.has(e.start) && !gone.has(e.end));
  return { ...g, nodes: g.nodes.filter((n) => !gone.has(n.id)), edges };
}

/** All snap suggestions of a graph (^275): its nodes and its segments, derived from the chains. */
export function suggestionsOfGraph(g: Graph): Suggestion[] {
  const chains = chainsOf(g);
  const width = new Map(chains.flatMap((c) => c.nodeIds.map((id) => [id, c.width] as const)));
  const edges = chains.flatMap((c) =>
    c.edges.map((ref, i): RuleEdge => ({
      id: c.edgeIds[i]!,
      start: c.nodeIds[i]!,
      end: c.nodeIds[i + 1]!,
      ref,
      width: c.width,
    })),
  );
  return suggestionsOf(g.nodes, edges, (id) => width.get(id) ?? LANE_WIDTH_M);
}

/**
 * What a placed or moved node can snap to (^101): the suggestions of everything but the nodes that
 * move, and the places they were at (^113).
 */
export function snapBase(graph: Graph, press: Press | null): Suggestion[] {
  // A heading snaps to everything but the node itself and its own segments (^313).
  const turning = turningNode(press);
  if (turning !== null) return suggestionsOfGraph(without(press!.undo.graph, [turning]));
  const moving = movedIds(press);
  // A control point of a segment snaps to everything but the segment itself, whose shape it changes (^249).
  const control = controlEdge(press);
  if (control !== null) return suggestionsOfGraph(withoutEdge(graph, control));
  if (!moving.length || !press || press.kind !== 'drag') return suggestionsOfGraph(graph);
  const before = press.undo.graph;
  const were = moving.flatMap((id) => nodeOf(before, id) ?? []);
  const places = were.map((n): Suggestion => ({
    kind: 'point',
    at: { x: n.x, y: n.y },
    heading: n.th,
    rule: 'previous',
    from: [],
  }));
  // The node that is dragged keeps its snap lines: sideways, or further along its heading (^300).
  const own = were.filter((n) => n.id === press.id).flatMap((n) => nodeRules(n, LANE_WIDTH_M));
  const lines = own.filter((s) => s.kind === 'curve').map((s) => ({ ...s, from: [] }));
  return [...suggestionsOfGraph(without(before, moving)), ...places, ...lines];
}

/** Where the moved nodes were, to show them while they move (^113). */
export function previousPlaces(press: Press | null): Vec[] {
  if (press?.kind !== 'drag' || !press.moved) return [];
  return movedIds(press)
    .flatMap((id) => nodeOf(press.undo.graph, id) ?? [])
    .map((n) => ({ x: n.x, y: n.y }));
}

export interface SnapArgs {
  info: PointerInfo | null;
  press: Press | null;
  hover: Hover | null;
  drawing: boolean;
  pinned: readonly number[];
}

/** Where a node is placed in draw mode: over empty canvas, a curve or a node. */
const placing = (hover: Hover | null) =>
  hover?.kind === 'preview' ||
  hover?.kind === 'candidate' ||
  (hover?.kind === 'handle' && ['node', 'rad'].includes(hover.handle.type));

/** Whether the pointer places or moves a node now: in draw mode, or dragging a node. */
function snaps({ press, hover, drawing }: SnapArgs): 'place' | 'move' | 'turn' | null {
  if (turningNode(press) !== null) return press!.moved ? 'turn' : null;
  if (press) return movedIds(press).length || controlEdge(press) !== null ? 'move' : null;
  return drawing && placing(hover) ? 'place' : null;
}

/** What a node or curve that is hovered already is as a snap suggestion, to show it like the others (^101). */
function hoveredHit(base: Suggestion[], hover: Hover | null, q: SnapQuery): SnapHit | null {
  const hit = hoveredPlace(base, hover);
  if (!hit) return null;
  // The curves through the place are shown with it, as when the pointer is pulled there (^289).
  const through = curvesThrough(base, hit.pt, q).filter((c) => !hit.by.includes(c));
  return { ...hit, by: [...hit.by, ...through] };
}

function hoveredPlace(base: Suggestion[], hover: Hover | null): SnapHit | null {
  if (hover?.kind === 'handle') {
    const h = hover.handle;
    // A node, or a radius point: the snap point that is where the handle is (^296).
    const s = base.find(
      (x) =>
        x.kind === 'point' &&
        (h.type === 'node' ? x.node === h.id : x.rule === 'radius-point' && dist(x.at, h) < 1e-3),
    );
    return s?.kind === 'point' ? { pt: s.at, heading: s.heading, by: [s] } : null;
  }
  if (hover?.kind !== 'candidate') return null;
  const { at, edge } = hover.hit;
  const curve = base.find((x) => x.kind === 'curve' && x.rule === 'curve' && x.edge === edge);
  return curve ? { pt: at, heading: Math.atan2(at.ty, at.tx), by: [curve] } : null;
}

/**
 * What the pointer is pulled to, if it places or moves a node and `Ctrl` is not held (^101, ^112).
 * Over a node or a curve that is hovered already, that is it: splitting and merging use the same
 * suggestions as everything else.
 */
export function snapFor(base: Suggestion[], a: SnapArgs): SnapHit | null {
  const { info } = a;
  const what = snaps(a);
  if (!info || info.ctrl || !what) return null;
  const query = { pt: info.pt, scale: info.scale, pinned: a.pinned };
  if (what === 'place' && a.hover?.kind !== 'preview') return hoveredHit(base, a.hover, query);
  return snapTo(base, query);
}

/** What a hover is made of for the snapping: the editor state and the chains with the zoom. */
export interface SnapWorld {
  /** `Alt` is held: the other heading of a touching point (^301). */
  alt: boolean;
  drawn: Drawn;
  chains: Chain[];
  scale: number;
}

/**
 * Where the pointer snaps in draw mode is what a click works on (^101): a node is a node, the curve
 * of a segment or a radius point is a place on the curve (split, merge, ^278); else it is where a
 * node would be placed.
 */
export function snapPreview(
  hover: Hover | null,
  snap: SnapHit | null,
  world: () => SnapWorld,
): Hover | null {
  if (hover?.kind !== 'preview' || !snap) return hover;
  const w = world();
  return (
    nodeHover(snap, w) ??
    curveHover(snap, w) ??
    previewOf(w.drawn, { pt: snap.pt, th: placedHeading(snap, w.alt) })
  );
}

/** The node the pointer snapped to, as a hovered handle. */
function nodeHover(snap: SnapHit, w: SnapWorld): Hover | null {
  // Wherever a node is, it is that node: never a second one on top of it (^248, ^296).
  const at = (h: RoadHandle) => h.type === 'node' && dist(h, snap.pt) < MERGE_WORLD_M;
  const handle = chainHandles(w.chains, w.scale).find(at);
  return handle ? { kind: 'handle', handle } : null;
}

/** The place on a curve the pointer snapped to (the curve of a segment, or a radius point on it), as a candidate. */
function curveHover(snap: SnapHit, w: SnapWorld): Hover | null {
  const by = snap.by[0];
  const onCurve =
    by?.kind === 'curve'
      ? by.rule === 'curve'
      : by?.rule === 'radius-point' || by?.rule === 'inflection-point';
  const hit = onCurve ? nearestOnChains(w.chains, snap.pt, MERGE_WORLD_M) : null;
  return hit && !nearNode(hit) ? { kind: 'candidate', hit } : null;
}
