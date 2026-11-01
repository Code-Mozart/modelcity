import { sweeps, pointOn } from './piece';
import type { Edge, Piece } from './types';
import type { EdgeRef, Path } from './path';
import { dist, fromAngle, mul, add, type Vec } from './vec';

/**
 * Draggable handles (^9). `k` is the piece index for radius handles.
 * Sizes are in screen pixels so handles keep their look at any zoom.
 */
export type HandleType = 'node' | 'head' | 'ctrl' | 'mid1' | 'mid2' | 'rad';

export interface Handle extends Vec {
  type: HandleType;
  i: number;
  k?: number;
  /** Where on arc k a radius handle sits: 0 start, 1 end, 0.5 middle (^128). */
  t?: number;
}

export const ARROW_PX = 40;
const HIT_PX = { mouse: 11, touch: 20 };
/** How near (screen pixels) the pointer must be to a node, and to a curve (^137). */
export const NODE_HIT_PX = { mouse: 9, touch: 16 };

/** The corner points of an S-curve: they turn the heading of their node. A hook's are derived (^105). */
function cornerHandles(i: number, E: Exclude<Edge, { kind: 'line' | 'C' }>): Handle[] {
  if (E.kind !== 'S') return [];
  return [
    ...(E.k1 ? [{ type: 'mid1' as const, i, ...E.k1 }] : []),
    ...(E.k2 ? [{ type: 'mid2' as const, i, ...E.k2 }] : []),
  ];
}

function edgeHandles({ i, p, q, E }: EdgeRef, scale: number): Handle[] {
  if (E.kind === 'line') return [];
  const out: Handle[] = E.kind === 'C' ? [{ type: 'ctrl', i, ...E.C }] : cornerHandles(i, E);
  E.pieces.forEach((piece, k) => out.push(...radiusHandles(i, k, piece, { nodes: [p, q], scale })));
  return out;
}

/** Closer than this (screen pixels) to a node, the radius point at the end of an arc is hidden (^139). */
const AT_NODE_PX = 14;

/**
 * The radius control points of an arc (^128, ^139): one in the middle, on the bisector of the
 * corner, and one at each end, where the straight pieces touch the arc, so that dragging them
 * along the heading lines changes the radius. An end that is at a node, or within a few pixels
 * of it, is not offered, since the node dot would cover it.
 */
function radiusHandles(
  i: number,
  k: number,
  piece: Piece,
  { nodes, scale }: { nodes: Vec[]; scale: number },
): Handle[] {
  if (!sweeps(piece)) return [];
  const at = (t: number): Handle => ({ type: 'rad', i, k, t, ...pointOn(piece, t) });
  const ends = [0, 1].map(at).filter((h) => nodes.every((n) => dist(n, h) * scale > AT_NODE_PX));
  return [...ends, at(0.5)];
}

export function handlesOf(path: Path, edges: EdgeRef[], scale: number): Handle[] {
  const arrow = ARROW_PX / scale;
  const nodes = path.nodes.map((n, i): Handle => ({ type: 'node', i, x: n.x, y: n.y }));
  const heads = path.nodes.map((n, i): Handle => ({
    type: 'head',
    i,
    ...add(n, mul(fromAngle(n.th), arrow)),
  }));
  return [...nodes, ...heads, ...edges.flatMap((e) => edgeHandles(e, scale))];
}

/** Non-node handles in tie-break order: the earlier type wins when equally near. */
const PRIORITY: HandleType[] = ['head', 'ctrl', 'mid1', 'mid2', 'rad'];

function nearest<H extends Handle>(list: H[], pt: Vec, within: number): H | null {
  let best: H | null = null;
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
export function hitHandle<H extends Handle>(
  handles: H[],
  pt: Vec,
  scale: number,
  touch: boolean,
): H | null {
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

/** Every handle of the path (heading handles at scale 1: their world position is not used). */
export const contentHandles = (path: Path, edges: EdgeRef[]): Handle[] => handlesOf(path, edges, 1);
