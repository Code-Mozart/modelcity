import { LANE_WIDTH_M } from '../curves/lane';
import { pointOn, sweeps } from '../curves/piece';
import { edgesAt, nodeOf, type Graph } from '../model/graph';
import { cross, dist, sub, unitOr, type Vec } from '../curves/vec';
import { curvesThrough, snapTo, type Reach, type SnapQuery } from '../snap/engine';
import { extendRules, nodeRules, suggestionsOf, type RuleEdge } from '../snap/rules';
import type { SnapCurve, SnapHit, Suggestion } from '../snap/types';
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

/** How far a snap point may be from the line of a control point and still be reached, meters. */
const LOCUS_TOL_M = 0.05;

/** A node dropped within this world distance (meters) of another node or of a curve is merged into it, whatever the zoom (^248, ^283). */
export const MERGE_WORLD_M = 0.1;

/** Where a node goes when the pointer snapped: the place, with the heading it gets there (^254, ^301). */
export function snappedTo(
  hit: SnapHit | null,
  info: PointerInfo,
  press: Press | null,
): Placement | null {
  if (!hit) return null;
  // A heading takes the heading of what it snapped to, the pointer stays where it is (^313); `Shift` aims at it, for an existing node (^335).
  if (press?.kind === 'drag' && turningNode(press) !== null && info.shift)
    return { pt: info.pt, th: null, aim: { at: hit.pt, away: info.alt } };
  if (turningNode(press) !== null) return { pt: info.pt, th: headingFrom(hit, info.alt) };
  // A click places the node at the snap with its heading; `Shift` keeps only the position (^358).
  return { pt: hit.pt, th: info.shift ? null : placedHeading(hit, info.alt), line: onLine(hit) };
}

/** Where a click places a node: where the pointer snapped, else at the pointer with the automatic heading. */
export const placedAt = (hit: SnapHit | null, info: PointerInfo): Placement =>
  snappedTo(hit, info, null) ?? { pt: info.pt, th: null };

/** Whether the snap is a snap line, not the curve of a segment or its offset (^319). */
const onLine = (hit: SnapHit): boolean => {
  const s = hit.by[0];
  return s?.kind === 'curve' && s.straight && s.rule !== 'curve' && s.rule !== 'offset';
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
const controlEdge = (press: Press | null): number | null =>
  press?.kind === 'drag' && ['rad', 'ctrl', 'mid1', 'mid2'].includes(press.drag.handle.type)
    ? press.id
    : null;

const withoutEdge = (g: Graph, id: number): Graph => ({
  ...g,
  edges: g.edges.filter((e) => e.id !== id),
});

/** The arc and the place on it of the radius point that is dragged (^333). */
function radiusPointOf(press: Press) {
  if (press.kind !== 'drag' || press.drag.handle.type !== 'rad') return null;
  const { i, k = 0, t = 0.5 } = press.drag.handle;
  const arc = chainsOf(press.undo.graph)[press.road]?.edges[i]?.E.pieces[k];
  return arc && sweeps(arc) ? { arc, t } : null;
}

/**
 * The line a radius point moves along: the heading line at an end of its arc, the bisector in the
 * middle (^333). Null for the other control points, which are not tied to a line.
 */
function locusOf(press: Press): { p: Vec; d: Vec } | null {
  const r = radiusPointOf(press);
  if (!r) return null;
  const at = pointOn(r.arc, r.t);
  const middle = r.t === 0.5;
  const d = middle ? sub(at, r.arc.c) : { x: at.tx, y: at.ty };
  return { p: middle ? r.arc.c : at, d: unitOr(d, { x: 1, y: 0 }) };
}

/** Samples along a curve of a snap suggestion, to see whether it crosses a line. */
const SAMPLES = 24;

/** The signed distances of a suggestion's curve from the line `locus` runs along, at samples. */
function sides(c: SnapCurve, locus: { p: Vec; d: Vec }): number[] {
  return c.pieces.flatMap((piece) =>
    Array.from({ length: SAMPLES + 1 }, (_, k) =>
      cross(sub(pointOn(piece, k / SAMPLES), locus.p), locus.d),
    ),
  );
}

/**
 * What a control point can reach (^333): places on the line it moves along, and the lines and
 * curves that cross it. Everything else is not offered and not shown. Undefined for control points
 * that are not tied to a line.
 */
function reachOf(press: Press | null): Reach | undefined {
  const locus = press && locusOf(press);
  if (!locus) return undefined;
  return {
    point: (at) => Math.abs(cross(sub(at, locus.p), locus.d)) <= LOCUS_TOL_M,
    curve: (c) => {
      const s = sides(c, locus);
      return Math.min(...s) <= LOCUS_TOL_M && Math.max(...s) >= -LOCUS_TOL_M;
    },
  };
}

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
export function snapBase(
  graph: Graph,
  press: Press | null,
  extendFrom: number | null,
): Suggestion[] {
  const from = extendFrom === null ? undefined : nodeOf(graph, extendFrom);
  return [...baseOf(graph, press), ...(from ? extendRules(from) : [])];
}

function baseOf(graph: Graph, press: Press | null): Suggestion[] {
  // A heading snaps to everything but the node itself and its own segments (^313).
  const turning = turningNode(press);
  if (turning !== null) return suggestionsOfGraph(without(press!.undo.graph, [turning]));
  const moving = movedIds(press);
  // A control point of a segment snaps to everything but the segment itself, whose shape it changes (^249).
  const control = controlEdge(press);
  if (control !== null)
    return [...suggestionsOfGraph(withoutEdge(graph, control)), ...ownPlace(press!)];
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
  const lines = own
    .filter((s): s is SnapCurve => s.kind === 'curve')
    .map((s) => ({ ...s, from: [], gives: s.gives?.map((g) => ({ ...g, from: [] })) }));
  return [
    ...suggestionsOfGraph(without(before, moving)),
    ...places,
    ...lines,
    ...ownCurves(before, press.id),
  ];
}

/**
 * The curves of the segments of the dragged node as they were (^336): it can be moved a bit along
 * them. They are not the curve of a segment to merge into, and they snap the heading too.
 */
function ownCurves(before: Graph, id: number): Suggestion[] {
  const mine = new Set(edgesAt(before, id).map((e) => e.id));
  return suggestionsOfGraph(before)
    .filter((s) => s.kind === 'curve' && s.rule === 'curve' && mine.has(s.edge ?? -1))
    .map((s) => ({ ...s, rule: 'own' as const, edge: undefined, from: [] }));
}

/** Where the control point that is dragged was: a snap point, like the nodes that are moved (^113, ^356). */
function ownPlace(press: Press): Suggestion[] {
  if (press.kind !== 'drag') return [];
  const { x, y } = press.drag.handle;
  return [{ kind: 'point', at: { x, y }, heading: null, rule: 'previous', from: [] }];
}

/** Where the moved nodes were, to show them while they move (^113). */
export function previousPlaces(press: Press | null): Vec[] {
  if (press?.kind !== 'drag' || !press.moved) return [];
  if (controlEdge(press) !== null) return [{ x: press.drag.handle.x, y: press.drag.handle.y }];
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
  const query = { pt: info.pt, scale: info.scale, pinned: a.pinned, reach: reachOf(a.press) };
  const placed = what === 'place' && a.hover?.kind !== 'preview';
  const hit = placed ? hoveredHit(base, a.hover, query) : snapTo(base, query);
  return hit && withoutExtendAtTip(hit, a);
}

/** Snapped to the node being drawn from itself, its extend lines are not shown (^325). */
function withoutExtendAtTip(hit: SnapHit, a: SnapArgs): SnapHit {
  const [first, tip] = [hit.by[0], a.drawing ? a.pinned.at(-1) : undefined];
  if (first?.kind !== 'point' || first.node === undefined || first.node !== tip) return hit;
  return { ...hit, by: hit.by.filter((s) => !s.rule.startsWith('extend')) };
}

/** What a hover is made of for the snapping: the editor state and the chains with the zoom. */
export interface SnapWorld {
  /** The pointer with its keys: `Alt` takes the other heading (^301), `Shift` snaps only the position (^358). */
  info: PointerInfo | null;
  drawn: Drawn;
  chains: Chain[];
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
    previewOf(w.drawn, {
      pt: snap.pt,
      th: w.info?.shift ? null : placedHeading(snap, w.info?.alt ?? false),
    })
  );
}

/** The node the pointer snapped to, as a hovered handle. */
function nodeHover(snap: SnapHit, w: SnapWorld): Hover | null {
  // Wherever a node is, it is that node: never a second one on top of it (^248, ^296).
  const at = (h: RoadHandle) => h.type === 'node' && dist(h, snap.pt) < MERGE_WORLD_M;
  const handle = chainHandles(w.chains, w.info?.scale ?? 1).find(at);
  return handle ? { kind: 'handle', handle } : null;
}

/** The place on a curve the pointer snapped to (the curve of a segment, or a radius point on it), as a candidate. */
function curveHover(snap: SnapHit, w: SnapWorld): Hover | null {
  // Where a line crosses the curve (the middle line of a straight segment, ^798) it is a place on the curve all the same.
  const by = snap.by.find((s) => s.kind === 'curve' && s.rule === 'curve') ?? snap.by[0];
  const onCurve =
    by?.kind === 'curve'
      ? by.rule === 'curve'
      : by?.rule === 'radius-point' || by?.rule === 'inflection-point';
  const hit = onCurve ? nearestOnChains(w.chains, snap.pt, MERGE_WORLD_M) : null;
  return hit && !nearNode(hit) ? { kind: 'candidate', hit } : null;
}
