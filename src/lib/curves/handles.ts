import { sweeps, pointOn } from './piece';
import type { EdgeRef, Path } from './path';
import { dist, fromAngle, mul, add, type Vec } from './vec';

/**
 * Draggable handles (^9). `k` is the piece index for radius handles, -1 for the bend gesture.
 * Sizes are in screen pixels so handles keep their look at any zoom.
 */
export type HandleType = 'node' | 'head' | 'ctrl' | 's1' | 's2' | 'rad';

export interface Handle extends Vec {
  type: HandleType;
  i: number;
  k?: number;
}

export const ARROW_PX = 40;
const HIT_PX = { mouse: 11, touch: 20 };
const NODE_HIT_PX = { mouse: 9, touch: 16 };

function edgeHandles({ i, E }: EdgeRef): Handle[] {
  if (E.kind === 'line') return [];
  const out: Handle[] = [];
  if (E.kind === 'C') out.push({ type: 'ctrl', i, ...E.C });
  if (E.kind === 'H' && E.k1) out.push({ type: 's1', i, ...E.k1 });
  if (E.kind === 'H' && E.k2) out.push({ type: 's2', i, ...E.k2 });
  E.pieces.forEach((piece, k) => {
    if (sweeps(piece))
      out.push({ type: 'rad', i, k: E.kind === 'C' ? -1 : k, ...pointOn(piece, 0.5) });
  });
  return out;
}

export function handlesOf(path: Path, edges: EdgeRef[], scale: number): Handle[] {
  const arrow = ARROW_PX / scale;
  const nodes = path.nodes.map((n, i): Handle => ({ type: 'node', i, x: n.x, y: n.y }));
  const heads = path.nodes.map((n, i): Handle => ({
    type: 'head',
    i,
    ...add(n, mul(fromAngle(n.th), arrow)),
  }));
  return [...nodes, ...heads, ...edges.flatMap(edgeHandles)];
}

/** Non-node handles in tie-break order: the earlier type wins when equally near. */
const PRIORITY: HandleType[] = ['head', 'ctrl', 's1', 's2', 'rad'];

function nearest(list: Handle[], pt: Vec, within: number): Handle | null {
  let best: Handle | null = null;
  let bd = within;
  for (const h of list) {
    const d = dist(h, pt);
    if (d < bd - 1e-9) {
      bd = d;
      best = h;
    }
  }
  return best;
}

/** The handle under the cursor: nodes win when the cursor is right on them, else the nearest. */
export function hitHandle(
  handles: Handle[],
  pt: Vec,
  scale: number,
  touch: boolean,
): Handle | null {
  const kind = touch ? 'touch' : 'mouse';
  const node = nearest(
    handles.filter((h) => h.type === 'node'),
    pt,
    NODE_HIT_PX[kind] / scale,
  );
  if (node) return node;
  const others = PRIORITY.flatMap((t) => handles.filter((h) => h.type === t));
  return nearest(others, pt, HIT_PX[kind] / scale);
}

/** World positions of everything the user can grab, except the heading tips (those depend on zoom). */
export function contentPoints(path: Path, edges: EdgeRef[]): Vec[] {
  return handlesOf(path, edges, 1).filter((h) => h.type !== 'head');
}
