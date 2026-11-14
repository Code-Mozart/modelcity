import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M } from '../curves/tolerance';
import { pointOn, sweeps } from '../curves/piece';
import { edgesAt, nodeOf, type Graph } from '../model/graph';
import { cross, dist, sub, unitOr, type Vec } from '../curves/vec';
import { curvesThrough, snapTo, type Reach, type SnapQuery } from '../snap/engine';
import { nearestOnPieces } from '../snap/geometry';
import { extendRules, nodeRules, suggestionsOf, type RuleEdge } from '../snap/rules';
import { RANK, type SnapCurve, type SnapHit, type Suggestion } from '../snap/types';
import {
  chainHandles,
  chainsOf,
  nearestOnChains,
  nearNode,
  type Chain,
  type RoadHandle,
} from './chains';
import { previewOf, type Drawn } from './targets';
import { tipWays } from './ways';
import { arcRadii, onLine } from './snapHit';
import { headingFrom, placedHeading } from '../snap/heading';
import { curveOfEdge, type RoadHit } from './chains';
import type { Hover, Placement, PointerInfo, Press } from './types';

/** The heading control point on a snap: it copies the heading, the pointer stays (^313); `Shift` aims at it, for an existing node (^335). */
function turnedTo(hit: SnapHit, info: PointerInfo, press: Press | null): Placement | null {
  if (turningNode(press) === null) return null;
  if (press?.kind === 'drag' && info.shift)
    return { pt: info.pt, th: null, aim: { at: hit.pt, away: info.alt } };
  return { pt: info.pt, th: headingFrom(hit, info.alt) };
}

/**
 * Where a node goes when the pointer snapped: the place, with the heading it gets there (^254,
 * ^301). `near` are the headings of the nodes its segments run to: of the heading the snap gives
 * and the opposite one it takes the one that turns them less (^888).
 */
export function snappedTo(
  hit: SnapHit | null,
  info: PointerInfo,
  press: Press | null,
  near: number[] = [],
): Placement | null {
  if (!hit) return null;
  const turned = turnedTo(hit, info, press);
  if (turned) return turned;
  // A click places the node at the snap with its heading; `Shift` keeps only the position (^358).
  const placed = {
    pt: hit.pt,
    th: info.shift ? null : placedHeading(hit, info.alt, near),
    line: onLine(hit),
  };
  return press?.kind === 'drag' ? { ...placed, radii: arcRadii(hit) } : placed;
}

/** Where a click places a node: where the pointer snapped, else at the pointer with the automatic heading. */
export const placedAt = (hit: SnapHit | null, info: PointerInfo, near: number[] = []): Placement =>
  snappedTo(hit, info, null, near) ?? { pt: info.pt, th: null };

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

/** The control points of a segment that snap like a position: the radius and the bend points (^249). */
const controlEdge = (press: Press | null): number | null =>
  press?.kind === 'drag' && ['rad', 'ctrl'].includes(press.drag.handle.type) ? press.id : null;

const withoutEdge = (g: Graph, id: number): Graph => ({
  ...g,
  edges: g.edges.filter((e) => e.id !== id),
});

/** The arc and the place on it of the radius point that is dragged (^333). */
function radiusPointOf(press: Press, partOf: Part) {
  if (press.kind !== 'drag' || press.drag.handle.type !== 'rad') return null;
  const { k = 0, t = 0.5 } = press.drag.handle;
  // The id of a radius point is its segment's (^306).
  const arc = curveOfEdge(partOf(press.undo.graph), press.id)?.pieces[k];
  return arc && sweeps(arc) ? { arc, t } : null;
}

/**
 * The line a radius point moves along: the heading line at an end of its arc, the bisector in the
 * middle (^333). Null for the other control points, which are not tied to a line.
 */
function locusOf(press: Press, partOf: Part): { p: Vec; d: Vec } | null {
  const r = radiusPointOf(press, partOf);
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
export function reachOf(press: Press | null, partOf: Part = whole): Reach | undefined {
  const locus = press && locusOf(press, partOf);
  if (!locus) return undefined;
  return {
    line: locus,
    point: (at) => Math.abs(cross(sub(at, locus.p), locus.d)) <= SAME_PLACE_M,
    curve: (c) => {
      const s = sides(c, locus);
      return Math.min(...s) <= SAME_PLACE_M && Math.max(...s) >= -SAME_PLACE_M;
    },
  };
}

/** The part of a graph that is in the window on the map (^941). */
type Part = (g: Graph) => Graph;
const whole: Part = (g) => g;

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
  partOf: Part = whole,
): Suggestion[] {
  const from = extendFrom === null ? undefined : nodeOf(graph, extendFrom);
  return [...baseOf(graph, press, partOf), ...(from ? extendRules(from) : [])];
}

/** `partOf` gives the part of a graph that is in the window on the map (^941): only what is near the view, and what is pinned, offers a snap. */
function baseOf(graph: Graph, press: Press | null, partOf: Part): Suggestion[] {
  // A heading snaps to everything but the node itself and its own segments (^313).
  const turning = turningNode(press);
  // While a heading is turned no offset curve is offered (^878).
  if (turning !== null)
    return suggestionsOfGraph(without(partOf(press!.undo.graph), [turning])).filter(
      (s) => !(s.kind === 'curve' && s.rule === 'offset'),
    );
  const moving = movedIds(press);
  // A control point of a segment snaps to everything but the segment itself, whose shape it changes (^249).
  const control = controlEdge(press);
  if (control !== null)
    return [...suggestionsOfGraph(withoutEdge(graph, control)), ...ownPlace(press!)];
  if (!moving.length || !press || press.kind !== 'drag') return suggestionsOfGraph(graph);
  const before = partOf(press.undo.graph);
  const were = moving.flatMap((id) => nodeOf(before, id) ?? []);
  const places = were.map((n): Suggestion => ({
    kind: 'point',
    at: { x: n.x, y: n.y },
    heading: n.th,
    rule: 'previous',
    from: [],
    rank: RANK.previous,
  }));
  // The node that is dragged keeps its snap lines: sideways, or further along its heading (^300).
  const own = were.filter((n) => n.id === press.id).flatMap((n) => nodeRules(n, LANE_WIDTH_M));
  const lines = own
    .filter((s): s is SnapCurve => s.kind === 'curve')
    .map((s) => ({
      ...s,
      from: [],
      gives: s.gives?.map((g) => ({ ...g, from: [], origin: undefined })),
    }));
  // And the places one lane width to either side of where it was: to move it over by a lane (^882).
  const sides = own.flatMap((s) =>
    s.kind === 'point' && s.node === undefined ? [{ ...s, from: [], origin: undefined }] : [],
  );
  return [
    ...suggestionsOfGraph(without(before, moving)),
    ...places,
    ...lines,
    ...sides,
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
  return [
    { kind: 'point', at: { x, y }, heading: null, rule: 'previous', from: [], rank: RANK.previous },
  ];
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
  /** The part of a graph in the window on the map (^941); all of it if not given. */
  partOf?: Part;
}

/** Where a node is placed in draw mode: over empty canvas, a curve or a node. */
const placing = (hover: Hover | null) =>
  hover?.kind === 'preview' ||
  hover?.kind === 'candidate' ||
  (hover?.kind === 'handle' && ['node', 'rad'].includes(hover.handle.type));

/** Whether the pointer places or moves a node now: in draw mode, or dragging a node. */
export function snaps({ press, hover, drawing }: SnapArgs): 'place' | 'move' | 'turn' | null {
  if (turningNode(press) !== null) return press!.moved ? 'turn' : null;
  if (press) return movedIds(press).length || controlEdge(press) !== null ? 'move' : null;
  return drawing && placing(hover) ? 'place' : null;
}

/** What a node that is hovered already is as a snap suggestion, to show it like the others (^101). */
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
  return null;
}

/**
 * On the curve of a segment (to split or merge there), the pointer is pulled to what is on the curve
 * (where a line crosses it, a point on it), not to anything beside it, which would take a click off
 * the curve; else it stays where it is on the curve (^802).
 */
function slidingHit(base: Suggestion[], on: RoadHit, q: SnapQuery): SnapHit | null {
  const onIt = (at: Vec) => (nearestOnPieces(on.ref.E.pieces, at)?.d ?? 1) < 1e-3;
  const hit = snapTo(base, { ...q, reach: { curve: () => true, point: onIt } });
  const here = hit?.by.some((s) => s.kind === 'point' || s.rule === 'curve');
  const at = on.at;
  const stay = { pt: { x: at.x, y: at.y }, heading: Math.atan2(at.ty, at.tx) };
  return here ? hit : curveOf(base, on.edge, stay);
}

/** The curve of a segment as a snap suggestion, at a place on it. */
function curveOf(
  base: Suggestion[],
  edge: number,
  at: { pt: Vec; heading: number },
): SnapHit | null {
  const curve = base.find((x) => x.kind === 'curve' && x.rule === 'curve' && x.edge === edge);
  return curve ? { ...at, by: [curve] } : null;
}

/** What a node that is placed is pulled to, by what is hovered (^296, ^802). */
function placeHit(base: Suggestion[], hover: Hover | null, q: SnapQuery): SnapHit | null {
  if (hover?.kind === 'handle') return hoveredHit(base, hover, q);
  return hover?.kind === 'candidate' ? slidingHit(base, hover.hit, q) : snapTo(base, q);
}

/**
 * What the pointer is pulled to, if it places or moves a node and `Ctrl` is not held (^101, ^112).
 * Over a node that is hovered already, that is it (^296). Over the curve of a segment it is pulled
 * to what is on the curve too, such as where a line crosses it: splitting and merging use the same
 * suggestions as everything else, not a hit test of their own (^802).
 */
export function snapFor(base: Suggestion[], a: SnapArgs): SnapHit | null {
  const { info } = a;
  const what = snaps(a);
  if (!info || info.ctrl || !what) return null;
  const query = {
    pt: info.pt,
    scale: info.scale,
    touch: info.touch,
    pinned: a.pinned,
    reach: reachOf(a.press, a.partOf),
  };
  const hit = what === 'place' ? placeHit(base, a.hover, query) : snapTo(base, query);
  return hit && withoutExtendAtTip(hit, a, base);
}

/**
 * Snapped to the place of the node being drawn from, its extend lines are not shown (^325, ^839):
 * whatever the first suggestion there is (the node itself, or a crossing that is at the same place).
 */
export function withoutExtendAtTip(hit: SnapHit, a: SnapArgs, base: Suggestion[]): SnapHit {
  const tip = a.drawing ? a.pinned.at(-1) : undefined;
  const at = base.find((s) => s.kind === 'point' && s.node !== undefined && s.node === tip);
  if (at?.kind !== 'point' || dist(at.at, hit.pt) > TIP_M) return hit;
  return { ...hit, by: hit.by.filter((s) => !s.rule.startsWith('extend')) };
}

/** How near (meters) the pointer's snap is to the node it extends from, for its extend lines to hide (^839). */
const TIP_M = 0.02;

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
  if (!snap || !placesAt(hover)) return hover;
  const w = world();
  return (
    nodeHover(snap, w) ??
    curveHover(snap, w) ??
    previewOf(w.drawn, placement(snap, w.info, tipWays(w.drawn)))
  );
}

/** Whether a click would place a node where the pointer is: on the empty canvas or on a curve (^802). */
const placesAt = (hover: Hover | null) => hover?.kind === 'preview' || hover?.kind === 'candidate';

/** Where the node goes at the snap and with what heading: `Shift` keeps only the position, `Alt` inverts (^358, ^301). */
const placement = (snap: SnapHit, info: PointerInfo | null, tip: number[]) => ({
  pt: snap.pt,
  th: info?.shift ? null : placedHeading(snap, info?.alt ?? false, tip),
});

/** The node the pointer snapped to, as a hovered handle. */
function nodeHover(snap: SnapHit, w: SnapWorld): Hover | null {
  // Wherever a node is, it is that node: never a second one on top of it (^248, ^296).
  const at = (h: RoadHandle) => h.type === 'node' && dist(h, snap.pt) < SAME_PLACE_M;
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
  const hit = onCurve ? nearestOnChains(w.chains, snap.pt, SAME_PLACE_M) : null;
  return hit && !nearNode(hit) ? { kind: 'candidate', hit } : null;
}
