import { buildEdge } from './curves/edge';
import { ARROW_PX } from './curves/handles';
import type { EdgeRef, Path } from './curves/path';
import type { NodeRef, RoadHandle } from './curves/roads';
import { fromAngle } from './curves/vec';
import type { Hover } from './editor.svelte';
import type { Focus } from './focus';
import { drawCircles, drawCorners, drawGuides, drawRadiusLabels } from './guides';
import {
  dot,
  ring,
  screenDir,
  segment,
  strokePiece,
  toScreen,
  type Frame,
  type Palette,
} from './paint';
import type { Pointer } from './proximity';
import { activeFlags, arrowShown } from './scaffold';

/** A road and its edges. */
export interface RoadScene {
  path: Path;
  edges: EdgeRef[];
}

/** Everything the path renderer needs to know about the editor. */
export interface Scene {
  roads: RoadScene[];
  handles: RoadHandle[];
  sel: NodeRef | null;
  hover: Hover | null;
  focus: Focus | null;
  pointer: Pointer | null;
}

const CURVE_PX = 4;
const HEAD_BARB_PX = 11;
const ARROW_STROKE_PX = 2;

/**
 * Two levels of gizmo (^60): the skeleton (curves and node dots) is always drawn; the scaffold of
 * a segment (everything else) only while it is needed, all or nothing, see `scaffold.ts`.
 */
function drawArrow(f: Frame, node: { x: number; y: number; th: number }, color: string) {
  const a = toScreen(f, node);
  const t = screenDir(f, fromAngle(node.th));
  const tip = { x: a.x + t.x * ARROW_PX, y: a.y + t.y * ARROW_PX };
  segment(f.ctx, a, tip, { color, width: ARROW_STROKE_PX });
  for (const side of [-1, 1]) {
    const ang = node.th + f.view.rot + Math.PI + side * 0.5;
    const barb = {
      x: tip.x + HEAD_BARB_PX * Math.cos(ang),
      y: tip.y + HEAD_BARB_PX * Math.sin(ang),
    };
    segment(f.ctx, tip, barb, { color, width: ARROW_STROKE_PX });
  }
}

/** Which segments of a road show their scaffold, and which node is selected. */
interface NodeState {
  active: boolean[];
  sel: number | null;
}

/** The node dots (skeleton) and, with the scaffold, the heading arrows. */
function drawNodes(f: Frame, road: RoadScene, state: NodeState, pal: Palette) {
  const { active, sel } = state;
  road.path.nodes.forEach((n, i) => {
    if (arrowShown(active, i)) drawArrow(f, n, pal.blue);
    const a = toScreen(f, n);
    if (i === sel) ring(f.ctx, a, 11, { color: pal.blue, width: 2.2 });
    dot(f.ctx, a, 5.5, pal.ink);
  });
}

/** Preview of the node a click would create, with the curve to it from the last node (^40). */
function drawPreview(f: Frame, hover: Extract<Hover, { kind: 'preview' }>, pal: Palette) {
  if (hover.ref) {
    const [from, to] = hover.end === 'end' ? [hover.ref, hover.node] : [hover.node, hover.ref];
    for (const piece of buildEdge(from, to, null, null).pieces) {
      strokePiece(f, piece, { color: pal.curve, width: 3, dash: [6, 6] });
    }
  }
  f.ctx.globalAlpha = 0.6;
  drawArrow(f, hover.node, pal.blue);
  dot(f.ctx, toScreen(f, hover.node), 5, pal.ink);
  f.ctx.globalAlpha = 1;
}

function drawHover(f: Frame, hover: Hover | null, pal: Palette) {
  if (hover?.kind === 'preview') drawPreview(f, hover, pal);
  if (hover?.kind === 'candidate') {
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

/** One road: the curves always, the construction of the segments whose scaffold is shown. */
function drawRoad(f: Frame, road: RoadScene, active: boolean[], pal: Palette) {
  road.edges.forEach((ref, k) => {
    if (!active[k]) return;
    drawGuides(f, ref, pal);
    drawCircles(f, ref, pal);
  });
  for (const { E } of road.edges) {
    for (const piece of E.pieces) strokePiece(f, piece, { color: pal.curve, width: CURVE_PX });
  }
  road.edges.forEach((ref, k) => {
    if (!active[k]) return;
    drawCorners(f, ref, pal);
    drawRadiusLabels(f, ref, pal);
  });
}

const HANDLE_COLOR = (pal: Palette) => ({
  head: pal.blue,
  ctrl: pal.blue,
  s1: pal.teal,
  s2: pal.teal,
  rad: pal.orange,
});

/** The control points of the scaffolds that are shown, all filled because they can be dragged. */
function drawHandles(f: Frame, scene: Scene, active: boolean[][], pal: Palette) {
  const colors = HANDLE_COLOR(pal);
  for (const h of scene.handles) {
    if (h.type === 'node') continue;
    const segs = active[h.road] ?? [];
    const shown = h.type === 'head' ? arrowShown(segs, h.i) : segs[h.i] === true;
    if (shown) dot(f.ctx, toScreen(f, h), h.type === 'rad' ? 6.5 : 5.5, colors[h.type]);
  }
}

/** Draw all roads with the scaffolds that are needed and the current hover feedback. */
export function drawScene(f: Frame, scene: Scene, pal: Palette) {
  const { handles, focus, pointer } = scene;
  const active = activeFlags({ roads: scene.roads, handles, focus, pointer });
  scene.roads.forEach((road, i) => drawRoad(f, road, active[i]!, pal));
  drawHandles(f, scene, active, pal);
  drawHover(f, scene.hover, pal);
  scene.roads.forEach((road, i) => {
    drawNodes(
      f,
      road,
      { active: active[i]!, sel: scene.sel?.road === i ? scene.sel.node : null },
      pal,
    );
  });
}
