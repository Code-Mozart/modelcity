import type { Hover } from './editor.svelte';
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
  text,
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
    const tip = drawArrow(f, n, pal.ink, 2.2);
    ring(f.ctx, tip, 5.5, { color: pal.ink, width: 1.6 });
    const a = toScreen(f, n);
    if (i === selected) ring(f.ctx, a, 11, { color: pal.blue, width: 2.2 });
    dot(f.ctx, a, 5.5, pal.ink);
    text(f.ctx, String(i + 1), { x: a.x - 18, y: a.y + 24 }, { color: pal['red-ink'], size: 15 });
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

function drawRoad(f: Frame, road: RoadScene, pal: Palette) {
  for (const ref of road.edges) {
    drawGuides(f, ref, pal);
    drawCircles(f, ref, pal);
  }
  for (const { E } of road.edges) {
    for (const piece of E.pieces) strokePiece(f, piece, { color: pal.curve, width: CURVE_PX });
  }
  for (const ref of road.edges) {
    drawCorners(f, ref, pal);
    drawRadiusLabels(f, ref, pal);
  }
}

/** Draw all roads with construction geometry, handles and the current hover feedback. */
export function drawScene(f: Frame, scene: Scene, pal: Palette) {
  scene.roads.forEach((road) => drawRoad(f, road, pal));
  for (const h of scene.handles) {
    if (h.type === 'rad') ring(f.ctx, toScreen(f, h), 7, { color: pal.orange, width: 2.2 });
  }
  drawHover(f, scene.hover, pal);
  scene.roads.forEach((road, i) => {
    drawNodes(f, road, scene.sel?.road === i ? scene.sel.node : null, pal);
  });
}
