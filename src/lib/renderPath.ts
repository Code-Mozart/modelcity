import type { Hover } from './editor.svelte';
import { revealed, type Focus, type Reveal } from './focus';
import { nearEdge, nearHandle, type Pointer } from './proximity';
import { ARROW_PX } from './curves/handles';
import { buildEdge } from './curves/edge';
import type { EdgeRef, Path } from './curves/path';
import type { NodeRef, RoadHandle } from './curves/roads';
import { fromAngle } from './curves/vec';
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

function drawArrow(
  f: Frame,
  node: { x: number; y: number; th: number },
  color: string,
  width: number,
) {
  const a = toScreen(f, node);
  const t = screenDir(f, fromAngle(node.th));
  const tip = { x: a.x + t.x * ARROW_PX, y: a.y + t.y * ARROW_PX };
  segment(f.ctx, a, tip, { color, width });
  for (const side of [-1, 1]) {
    const ang = node.th + f.view.rot + Math.PI + side * 0.5;
    const barb = {
      x: tip.x + HEAD_BARB_PX * Math.cos(ang),
      y: tip.y + HEAD_BARB_PX * Math.sin(ang),
    };
    segment(f.ctx, tip, barb, { color, width });
  }
  return tip;
}

function drawNodes(f: Frame, { path }: RoadScene, selected: number | null, pal: Palette) {
  path.nodes.forEach((n, i) => {
    drawArrow(f, n, pal.ink, 2.2);
    const a = toScreen(f, n);
    if (i === selected) ring(f.ctx, a, 11, { color: pal.blue, width: 2.2 });
    dot(f.ctx, a, 5.5, pal.ink);
  });
}

/** Preview of the node a click would create, with the curve to it from the last node (^40). */
function drawGhost(f: Frame, hover: Extract<Hover, { kind: 'ghost' }>, pal: Palette) {
  if (hover.ref) {
    for (const piece of buildEdge(hover.ref, hover.node, null, null).pieces) {
      strokePiece(f, piece, { color: pal.curve, width: 3, dash: [6, 6] });
    }
  }
  f.ctx.globalAlpha = 0.6;
  drawArrow(f, hover.node, pal.ink, 2);
  dot(f.ctx, toScreen(f, hover.node), 5, pal.ink);
  f.ctx.globalAlpha = 1;
}

function drawHover(f: Frame, hover: Hover | null, pal: Palette) {
  if (hover?.kind === 'ghost') drawGhost(f, hover, pal);
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

/** One road; each edge shows its construction only while it is worked on (^51). */
function drawRoad(f: Frame, road: RoadScene, shown: Reveal[], pal: Palette) {
  road.edges.forEach((ref, k) => {
    if (!shown[k]!.guides) return;
    drawGuides(f, ref, pal);
    drawCircles(f, ref, pal);
  });
  for (const { E } of road.edges) {
    for (const piece of E.pieces) strokePiece(f, piece, { color: pal.curve, width: CURVE_PX });
  }
  road.edges.forEach((ref, k) => {
    if (shown[k]!.guides) drawCorners(f, ref, pal);
    if (shown[k]!.labels) drawRadiusLabels(f, ref, pal);
  });
}

/** The heading tip of a node, where its arrow ends. */
function tipOf(f: Frame, scene: Scene, h: RoadHandle) {
  const n = scene.roads[h.road]!.path.nodes[h.i]!;
  const a = toScreen(f, n);
  const t = screenDir(f, fromAngle(n.th));
  return { x: a.x + t.x * ARROW_PX, y: a.y + t.y * ARROW_PX };
}

/** Which focus on the same node or edge counts as hovering or dragging this handle. */
const OWN_FOCUS: Record<RoadHandle['type'], RoadHandle['type'][]> = {
  node: [],
  head: ['head', 'node'],
  ctrl: ['ctrl'],
  s1: ['s1'],
  s2: ['s2'],
  rad: ['rad'],
};

const isFocused = ({ focus }: Scene, h: RoadHandle) =>
  focus?.road === h.road && focus.i === h.i && OWN_FOCUS[h.type].includes(focus.type);

/**
 * Handles are shown only when needed (^55): a heading tip (blue), the blue point of a bend and a
 * hook's turquoise points when the pointer is near (a hook's also with the guides of its edge);
 * the orange rings when the pointer is near their curve. Whatever is hovered or dragged is
 * always shown. All are filled, because they can be dragged.
 */
function handleShown(scene: Scene, h: RoadHandle, guides: boolean): boolean {
  if (isFocused(scene, h)) return true;
  if (h.type === 'rad') return nearEdge(scene.roads[h.road]!.edges[h.i]!.E, scene.pointer);
  const hook = h.type === 's1' || h.type === 's2';
  return nearHandle(h, scene.pointer) || (hook && guides);
}

function drawHandles(f: Frame, scene: Scene, pal: Palette) {
  const colors = { head: pal.blue, ctrl: pal.blue, s1: pal.teal, s2: pal.teal, rad: pal.orange };
  for (const h of scene.handles) {
    if (h.type === 'node') continue;
    const guides = revealed(scene.focus, h.road, h.type === 'head' ? -1 : h.i).guides;
    if (!handleShown(scene, h, guides)) continue;
    const at = h.type === 'head' ? tipOf(f, scene, h) : toScreen(f, h);
    dot(f.ctx, at, h.type === 'rad' ? 6.5 : 5.5, colors[h.type]);
  }
}

/** Draw all roads with construction geometry, handles and the current hover feedback. */
export function drawScene(f: Frame, scene: Scene, pal: Palette) {
  scene.roads.forEach((road, i) => {
    const shown = road.edges.map((ref) => revealed(scene.focus, i, ref.i));
    drawRoad(f, road, shown, pal);
  });
  drawHandles(f, scene, pal);
  drawHover(f, scene.hover, pal);
  scene.roads.forEach((road, i) => {
    drawNodes(f, road, scene.sel?.road === i ? scene.sel.node : null, pal);
  });
}
