import { worldToScreen } from '../camera/view';
import type { Vec } from '../curves/vec';
import type { NodeRow } from '../project/storage';
import type { Frame, Palette } from './paint';

const NODE_DOT_PX = 5.5;
const DERIVED_LINE_PX = 1.25;
/** Two dots closer than this (pixels) overlap. */
const CELL = 2 * NODE_DOT_PX;

const onCanvas = (f: Frame, p: Vec) =>
  p.x >= -CELL && p.y >= -CELL && p.x <= f.size.width + CELL && p.y <= f.size.height + CELL;

/** The node dots on the screen in cells of `CELL` pixels: which of them is near a point is a look at nine cells. */
class DotGrid {
  private cells = new Map<string, Vec[]>();
  private key = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;

  add(p: Vec) {
    const k = this.key(p.x, p.y);
    (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push(p);
  }

  near(p: Vec): boolean {
    const near = (q: Vec) => Math.hypot(q.x - p.x, q.y - p.y) < CELL;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (this.cells.get(this.key(p.x + dx * CELL, p.y + dy * CELL))?.some(near)) return true;
    return false;
  }
}

/**
 * The derived nodes (^821): hollow circles as large as the node dots, in the ink, not where one
 * would overlap the dot of a real node on the screen (^899). The dots of the real nodes are put in a
 * grid of the screen once, so that this is one look per derived node, not one per pair.
 */
export function drawDerived(
  f: Frame,
  derived: readonly Vec[],
  nodes: readonly (readonly NodeRow[])[],
  pal: Palette,
) {
  if (!derived.length) return;
  const at = (p: Vec) => worldToScreen(f.view, f.size, p);
  const dots = new DotGrid();
  for (const list of nodes)
    for (const n of list) {
      const p = at({ x: n[1] / 1000, y: n[2] / 1000 });
      if (onCanvas(f, p)) dots.add(p);
    }
  const { ctx } = f;
  ctx.beginPath();
  for (const p of derived.map(at)) {
    if (!onCanvas(f, p) || dots.near(p)) continue;
    ctx.moveTo(p.x + NODE_DOT_PX, p.y);
    ctx.arc(p.x, p.y, NODE_DOT_PX, 0, 2 * Math.PI);
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = DERIVED_LINE_PX;
  ctx.stroke();
}
