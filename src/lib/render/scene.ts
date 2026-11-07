import { samplesAlong } from '../curves/arrows';
import { outlinePx } from '../curves/lane';
import { buildEdge } from '../curves/edge';
import { ARROW_PX } from '../curves/handles';
import type { EdgeRef, Path } from '../curves/path';
import type { RoadHandle } from '../editor/chains';
import { ordered } from '../model/junction';
import { fromAngle, type Vec } from '../curves/vec';
import type { Hover } from '../editor/editor.svelte';
import type { Focus } from '../editor/focus';
import { drawCircles, drawCorners, drawGuides, drawTowerLine, type TowerShape } from './guides';
import { drawBars, drawCapsules, type BarShape, type TowerCapsule } from './towerGizmo';
import { drawMeasures } from './measures';
import { drawCompass, drawOffset, type Turning } from './compass';
import {
  dot,
  ring,
  barbs,
  screenDir,
  segment,
  strokeChain,
  strokePiece,
  toScreen,
  type Frame,
  type Palette,
} from './paint';
import type { Band } from '../editor/selection';
import type { Pointer } from '../editor/proximity';
import { drawOutlines } from './outline';
import { drawSnap, drawSnapPoint } from './snapGuides';
import type { Origin, SnapHit } from '../snap/types';
import type { Piece } from '../curves/types';
import { activeFlags, arrowShown, withSelectedTogether } from './scaffold';

/** A node of a chain (the index in the chain), where it is drawn. */
export interface NodeRef {
  road: number;
  node: number;
}

/** A chain of the graph and its edges, with the lane width in meters. */
export interface RoadScene {
  path: Path;
  edges: EdgeRef[];
  width: number;
}

/** Everything the path renderer needs to know about the editor. */
export interface Scene {
  roads: RoadScene[];
  handles: RoadHandle[];
  selection: NodeRef[];
  band: Band | null;
  drawing: boolean;
  /** View mode (^104): only the generated geometry is drawn, no skeleton and no scaffold. */
  viewing: boolean;
  /** The segments (road, index) whose two nodes are selected: they show their scaffold together (^133). */
  selectedSegments: { road: number; i: number }[];
  /** The segments (road, index) under the pointer that get a blue outline, a whole branch with Alt (^99). */
  outline: { road: number; i: number }[];
  /** All scaffolds are hidden while several nodes are moved (^78). */
  hideScaffold: boolean;
  hover: Hover | null;
  /** The curve a merge would add, drawn dashed like the preview of a new node (^125). */
  mergePreview: Extract<Hover, { kind: 'preview' }> | null;
  focus: Focus | null;
  pointer: Pointer | null;
  /** What the placed or moved node is pulled to (^101), and the nodes whose suggestions are pinned (^258). */
  snap: SnapHit | null;
  pinned: NodeRef[];
  /** The nodes whose heading the snap suggests: their arrows are turquoise, with no control point (^795). */
  headingFrom: Origin[];
  /** The nodes whose points or lines the pointer is snapped to: the snap point of the node is shown (^803). */
  snapFrom: Origin[];
  /** The bars on the skin of the capsules, along runs of parallel segments (^350, ^820). */
  bars: BarShape[];
  /** The towers, each drawn as a hollow capsule around its nodes (^820). */
  towers: TowerCapsule[];
  /** The derived nodes: hollow circles of the size and colour of a node (^821, ^822, ^823). */
  derived: Vec[];
  /** The line through the control points that are interlocked with the hovered or dragged one (^344). */
  tower: TowerShape | null;
  /** The heading being set, with the arrow following the cursor, and the compass for the first node of an arm (^314, ^316). */
  turning: Turning | null;
  /** Where the nodes that are moved were, shown as snap points while they move (^113). */
  previous: Vec[];
  /** The curves a dragged node's segments would have if it were dropped now: dashed, like the curve of an extend (^284). */
  dropPreview: Piece[][];
}

const CURVE_PX = 2;
const ARROW_STROKE_PX = 2;
/** The heads of the heading arrows and of the direction chevrons (^80). */
const HEAD = { size: 11, spread: 0.5, width: ARROW_STROKE_PX };
const CHEVRON = { size: 6, spread: 0.7, width: ARROW_STROKE_PX };
/** Distance between the direction arrows along a curve, and their size (^80). */
const DIRECTION_SPACING_PX = 72;
const NODE_DOT_PX = 5.5;
/** Selected nodes are blue and 150% larger (^70). */
const SELECTED_DOT_PX = NODE_DOT_PX * 1.5;

function drawArrow(f: Frame, node: { x: number; y: number; th: number }, color: string) {
  const a = toScreen(f, node);
  const t = screenDir(f, fromAngle(node.th));
  // The control point sits on the stem, half way: the arrow reaches as far beyond it as it is before it (^126).
  const tip = { x: a.x + t.x * 2 * ARROW_PX, y: a.y + t.y * 2 * ARROW_PX };
  segment(f.ctx, a, tip, { color, width: ARROW_STROKE_PX });
  barbs(f.ctx, tip, node.th + f.view.rot, { ...HEAD, color });
}

/** Which segments of a road show their scaffold, and which node is selected. */
interface NodeState {
  active: boolean[];
  selected: number[];
  pinned: number[];
  /** The heading of one of its nodes is being set (^314). */
  turning: Turning | null;
}

/** What says how far the heading of a node is turned: its degrees with the compass, or the offset (^316, ^341). */
function drawTurning(
  f: Frame,
  n: { x: number; y: number; th: number },
  turning: Turning,
  pal: Palette,
) {
  if (turning.compass) drawCompass(f, n, pal);
  else if (turning.offset !== null) drawOffset(f, n, turning.offset, pal);
}

/** The node dots (skeleton) and, with the scaffold, the heading arrows. */
function drawNodes(f: Frame, road: RoadScene, state: NodeState, pal: Palette) {
  const { active, selected } = state;
  road.path.nodes.forEach((n, i) => {
    const turning = state.turning?.i === i ? state.turning : null;
    if (turning || arrowShown(active, i)) drawArrow(f, n, pal.orange);
    if (turning) drawTurning(f, n, turning, pal);
    drawDot(f, n, { picked: selected.includes(i), pinned: state.pinned.includes(i) }, pal);
  });
}

/** A node dot: blue and larger if selected, turquoise if pinned, with the snap point of the node shown if the snap is made of it (^70, ^258, ^803). */
function drawDot(
  f: Frame,
  n: { x: number; y: number },
  is: { picked: boolean; pinned: boolean },
  pal: Palette,
) {
  const color = is.picked ? pal.blue : is.pinned ? pal.turquoise : pal.ink;
  const radius = is.picked ? SELECTED_DOT_PX : NODE_DOT_PX;
  dot(f.ctx, toScreen(f, n), radius, color);
}

/** Preview of the node a click would create, with the curve to it from the last node (^40). */
function drawPreview(
  f: Frame,
  hover: Extract<Hover, { kind: 'preview' }>,
  pal: Palette,
  curveOnly = false,
) {
  if (hover.ref) {
    const [from, to] = ordered(hover.ref, hover.node, hover.end);
    const E = buildEdge(from, to, hover.radius ?? null);
    // Extend mode shows what a segment shows: its heading lines, dashed like the curve, and the measurements (^321, ^303).
    drawGuides(f, { i: -1, p: from, q: to, E }, pal, [6, 6]);
    for (const piece of E.pieces)
      strokePiece(f, piece, { color: pal.ink, width: 1.5, dash: [6, 6] });
    drawMeasures(f, { i: -1, p: from, q: to, E }, pal);
  }
  if (curveOnly) return;
  f.ctx.globalAlpha = 0.6;
  drawArrow(f, hover.node, pal.orange);
  dot(f.ctx, toScreen(f, hover.node), 5, pal.ink);
  f.ctx.globalAlpha = 1;
}

function drawHover(f: Frame, hover: Hover | null, drawing: boolean, pal: Palette) {
  if (hover?.kind === 'preview') drawPreview(f, hover, pal);
  // The mark for inserting a node only exists in draw mode (^79).
  if (hover?.kind === 'candidate' && drawing) {
    const at = toScreen(f, hover.hit.at);
    const { x: tx, y: ty } = screenDir(f, { x: hover.hit.at.tx, y: hover.hit.at.ty });
    ring(f.ctx, at, 8, { color: pal.ink, width: 2 });
    segment(
      f.ctx,
      { x: at.x - 14 * tx, y: at.y - 14 * ty },
      { x: at.x + 14 * tx, y: at.y + 14 * ty },
      { color: pal.ink, width: 2 },
    );
  }
  if (hover?.kind === 'handle')
    ring(f.ctx, toScreen(f, hover.handle), 10, { color: pal.blue, width: 1.6 });
}

/** Small chevrons along the curves at regular pixel distances, pointing the way the road runs (^80). */
function drawDirection(f: Frame, road: RoadScene, selected: boolean[], pal: Palette) {
  const pieces = road.edges.flatMap((e) => e.E.pieces);
  const owner = road.edges.flatMap((e, k) => e.E.pieces.map(() => k));
  for (const s of samplesAlong(pieces, DIRECTION_SPACING_PX / f.view.scale)) {
    const at = toScreen(f, s);
    const t = screenDir(f, { x: s.tx, y: s.ty });
    const color = selected[owner[s.piece]!] ? pal.blue : pal.ink;
    barbs(f.ctx, at, Math.atan2(t.y, t.x), { ...CHEVRON, color });
  }
}

/** What is shown of a road: which segments show their scaffold, and the radius handle in focus. */
interface RoadShown {
  active: boolean[];
  /** The selected segments: their curve and direction arrows are blue (^231). */
  selected: boolean[];
  rad: Focus | null;
}

/** One road: the curves always, the construction of the segments whose scaffold is shown. */
function drawRoad(f: Frame, road: RoadScene, shown: RoadShown, pal: Palette) {
  const { active, selected, rad } = shown;
  road.edges.forEach((ref, k) => {
    if (!active[k]) return;
    drawGuides(f, ref, pal);
    drawCircles(f, ref, pal);
  });
  road.edges.forEach(({ E }, k) => {
    const color = selected[k] ? pal.blue : pal.ink;
    for (const piece of E.pieces) strokePiece(f, piece, { color, width: CURVE_PX });
  });
  drawDirection(f, road, selected, pal);
  road.edges.forEach((ref, k) => {
    if (!active[k]) return;
    drawCorners(f, ref, pal);
    drawMeasures(f, ref, pal, rad?.i === ref.i ? { k: rad.k ?? 0, t: rad.t ?? 0.5 } : null);
  });
}

/** The control points of the scaffolds that are shown, all filled because they can be dragged. */
const isFocused = (h: RoadHandle, focus: Focus | null) =>
  focus !== null &&
  [h.road, h.type, h.i, h.k, h.t].every(
    (v, n) => v === [focus.road, focus.type, focus.i, focus.k, focus.t][n],
  );

function drawHandles(f: Frame, scene: Scene, active: boolean[][], pal: Palette) {
  for (const h of scene.handles) {
    if (h.type === 'node') continue;
    const segs = active[h.road] ?? [];
    const shown = h.type === 'head' ? arrowShown(segs, h.i) : segs[h.i] === true;
    // The point that is hovered or dragged is as large as a selected node (^230).
    const size = isFocused(h, scene.focus) ? SELECTED_DOT_PX : h.type === 'rad' ? 6.5 : 5.5;
    if (shown) dot(f.ctx, toScreen(f, h), size, pal.orange);
  }
}

const selectedIn = (selection: NodeRef[], road: number) =>
  selection.filter((s) => s.road === road).map((s) => s.node);

/** The selection box, in screen pixels. */
function drawBand(f: Frame, { a, b }: Band, pal: Palette) {
  const { ctx } = f;
  ctx.fillStyle = pal.blue;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.blue;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
}

/** Which segments show their scaffold: the one by proximity, with the selected ones together, or none while moving a group. */
function shownFlags(scene: Scene): boolean[][] {
  const { roads, handles, focus, pointer } = scene;
  const flags = withSelectedTogether(
    activeFlags({ roads, handles, focus, pointer }),
    scene.selectedSegments,
  );
  return flags.map((row) => row.map((on) => on && !scene.hideScaffold));
}

/**
 * The surface of all roads, 3 m wide with an outline (^90): all outlines first, then all surfaces,
 * so that roads that cross or touch merge into one shape.
 */
function drawLanes(f: Frame, roads: RoadScene[], pal: Palette) {
  const px = (r: RoadScene) => r.width * f.view.scale;
  const pieces = (r: RoadScene) => r.edges.flatMap((e) => e.E.pieces);
  for (const r of roads) {
    const edge = { color: pal['road-edge'], width: px(r) + 2 * outlinePx(px(r)) };
    strokeChain(f, pieces(r), edge);
  }
  for (const r of roads) strokeChain(f, pieces(r), { color: pal.road, width: px(r) });
}

/** The nodes, real ones with their state and derived ones as hollow circles, as large and as coloured, no arrow (^821, ^805). */
function drawAllNodes(f: Frame, scene: Scene, active: boolean[][], pal: Palette) {
  scene.roads.forEach((road, i) => {
    const turning = scene.turning?.road === i ? scene.turning : null;
    const state = {
      active: active[i]!,
      selected: selectedIn(scene.selection, i),
      pinned: selectedIn(scene.pinned, i),
      turning,
    };
    drawNodes(f, road, state, pal);
  });
  for (const d of scene.derived)
    ring(f.ctx, toScreen(f, d), NODE_DOT_PX, { color: pal.ink, width: 2 });
}

/**
 * Two levels of gizmo (^60): the skeleton (curves and node dots) is always drawn; the scaffold of
 * a segment (everything else) only while it is needed, all or nothing, see `scaffold.ts`.
 * Draw all roads with the scaffolds that are needed and the current hover feedback. */
export function drawScene(f: Frame, scene: Scene, pal: Palette) {
  const active = shownFlags(scene);
  const selected = scene.roads.map((r, road) =>
    r.edges.map((_, k) => scene.selectedSegments.some((s) => s.road === road && s.i === k)),
  );
  drawLanes(f, scene.roads, pal);
  if (scene.viewing) return;
  scene.roads.forEach((road, i) => {
    const rad = scene.focus?.type === 'rad' && scene.focus.road === i ? scene.focus : null;
    drawRoad(f, road, { active: active[i]!, selected: selected[i]!, rad }, pal);
  });
  drawHandles(f, scene, active, pal);
  drawHover(f, scene.hover, scene.drawing, pal);
  if (scene.tower) drawTowerLine(f, scene.tower, pal);
  drawSnap(f, scene.snap, pal);
  for (const at of scene.previous) drawSnapPoint(f, at, pal);
  for (const pieces of scene.dropPreview) {
    for (const piece of pieces) strokePiece(f, piece, { color: pal.ink, width: 1.5, dash: [6, 6] });
  }
  if (scene.mergePreview) drawPreview(f, scene.mergePreview, pal, true);
  if (scene.band) drawBand(f, scene.band, pal);
  // The capsules and the bars on their skin are below the nodes, so that selected nodes stay blue (^350, ^820).
  drawCapsules(f, scene.towers, pal);
  drawBars(f, scene.bars, pal);
  // The arrows of what the snap takes its heading from are under the dots, the snap points of what it is made of over them (^795, ^803).
  for (const o of scene.headingFrom) drawArrow(f, { ...o.at, th: o.th }, pal.turquoise);
  drawAllNodes(f, scene, active, pal);
  for (const o of scene.snapFrom) drawSnapPoint(f, o.at, pal);
  // The outline of the hovered segment (or branch) is on top of everything (^99).
  drawOutlines(f, scene.roads, scene.outline, pal.blue);
}
