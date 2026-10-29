import { ghostEdge, type Hover } from './editor.svelte';
import { ARROW_PX, type Handle } from './curves/handles';
import type { EdgeRef, Path } from './curves/path';
import { fromAngle } from './curves/vec';
import { drawCircles, drawCorners, drawGuides, drawRadiusLabels } from './guides';
import { dot, ring, segment, strokePiece, text, toScreen, type Frame, type Palette } from './paint';

/** Everything the path renderer needs to know about the editor. */
export interface Scene {
  path: Path;
  edges: EdgeRef[];
  handles: Handle[];
  sel: number;
  hover: Hover | null;
  tool: 'move' | 'append' | 'insert';
  showCircles: boolean;
  showLines: boolean;
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
  const t = fromAngle(node.th);
  const tip = { x: a.x + t.x * ARROW_PX, y: a.y + t.y * ARROW_PX };
  segment(f.ctx, a, tip, { color, width });
  for (const side of [-1, 1]) {
    const ang = node.th + Math.PI + side * 0.5;
    const barb = {
      x: tip.x + HEAD_BARB_PX * Math.cos(ang),
      y: tip.y + HEAD_BARB_PX * Math.sin(ang),
    };
    segment(f.ctx, tip, barb, { color, width });
  }
  return tip;
}

function drawNodes(f: Frame, { path, sel }: Scene, pal: Palette) {
  path.nodes.forEach((n, i) => {
    const tip = drawArrow(f, n, pal.ink, 2.2);
    ring(f.ctx, tip, 5.5, { color: pal.ink, width: 1.6 });
    const a = toScreen(f, n);
    if (i === sel) ring(f.ctx, a, 11, { color: pal.blue, width: 2.2 });
    dot(f.ctx, a, 5.5, pal.ink);
    text(f.ctx, String(i + 1), { x: a.x - 18, y: a.y + 24 }, { color: pal.red, size: 15 });
  });
}

function drawGhost(f: Frame, scene: Scene, hover: Extract<Hover, { kind: 'ghost' }>, pal: Palette) {
  if (scene.path.nodes.length) {
    for (const piece of ghostEdge(hover).pieces)
      strokePiece(f, piece, { color: pal.curve, width: 3, dash: [6, 6] });
  }
  f.ctx.globalAlpha = 0.6;
  drawArrow(f, hover.node, pal.ink, 2);
  dot(f.ctx, toScreen(f, hover.node), 5, pal.ink);
  f.ctx.globalAlpha = 1;
}

function drawHover(f: Frame, scene: Scene, pal: Palette) {
  const { hover } = scene;
  if (hover?.kind === 'ghost' && scene.tool === 'append') drawGhost(f, scene, hover, pal);
  if (hover?.kind === 'candidate') {
    const at = toScreen(f, hover.hit.at);
    const { tx, ty } = hover.hit.at;
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

/** Draw the edited path with construction geometry, handles and the current hover feedback. */
export function drawScene(f: Frame, scene: Scene, pal: Palette) {
  for (const ref of scene.edges) {
    if (scene.showLines) drawGuides(f, ref, pal);
    if (scene.showCircles) drawCircles(f, ref, pal);
  }
  for (const { E } of scene.edges) {
    for (const piece of E.pieces) strokePiece(f, piece, { color: pal.curve, width: CURVE_PX });
  }
  for (const ref of scene.edges) {
    drawCorners(f, ref, pal);
    drawRadiusLabels(f, ref, pal);
  }
  for (const h of scene.handles) {
    if (h.type === 'rad') ring(f.ctx, toScreen(f, h), 7, { color: pal.orange, width: 2.2 });
  }
  drawHover(f, scene, pal);
  drawNodes(f, scene, pal);
}
