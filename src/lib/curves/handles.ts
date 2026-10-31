import { sweeps, pointOn } from './piece';
import type { Edge, Piece } from './types';
import type { EdgeRef, Path } from './path';
import { dist, fromAngle, mul, add, type Vec } from './vec';

/**
 * Draggable handles (^9). `k` is the piece index for radius handles.
 * Sizes are in screen pixels so handles keep their look at any zoom.
 */
export type HandleType = 'node' | 'head' | 'ctrl' | 's1' | 's2' | 'mid1' | 'mid2' | 'rad';

export interface Handle extends Vec {
  type: HandleType;
  i: number;
  k?: number;
  /** Where on arc k a radius handle sits: 0 start, 1 end, 0.5 middle (^128). */
  t?: number;
}

export const ARROW_PX = 40;
const HIT_PX = { mouse: 11, touch: 20 };
const NODE_HIT_PX = { mouse: 9, touch: 16 };

/** The corner points of a hook (they set the radius) or of an S with a stored middle line (they move it). */
function cornerHandles(i: number, E: Exclude<Edge, { kind: 'line' | 'C' }>): Handle[] {
  const [t1, t2] = (E.kind === 'H' ? ['s1', 's2'] : ['mid1', 'mid2']) as [HandleType, HandleType];
  if (E.kind === 'S' && !E.mid) return [];
  return [...(E.k1 ? [{ type: t1, i, ...E.k1 }] : []), ...(E.k2 ? [{ type: t2, i, ...E.k2 }] : [])];
}

function edgeHandles({ i, p, q, E }: EdgeRef): Handle[] {
  if (E.kind === 'line') return [];
  const out: Handle[] = E.kind === 'C' ? [{ type: 'ctrl', i, ...E.C }] : cornerHandles(i, E);
  E.pieces.forEach((piece, k) => out.push(...radiusHandles(i, k, piece, [p, q])));
  return out;
}

/** Closer than this (meters) to a node, a point on a curve counts as at the node. */
const AT_NODE = 1e-3;

/**
 * The radius control points of an arc: both of its ends, where the straight pieces touch it
 * (^128), so dragging them along the heading lines changes the radius. An end at a node is not
 * offered (the node is there); an arc with both ends at nodes, a single arc between two nodes, is
 * grabbed at its middle instead, so that its radius can always be reached.
 */
function radiusHandles(i: number, k: number, piece: Piece, nodes: Vec[]): Handle[] {
  if (!sweeps(piece)) return [];
  const at = (t: number): Handle => ({ type: 'rad', i, k, t, ...pointOn(piece, t) });
  const free = [0, 1].map(at).filter((h) => nodes.every((n) => dist(n, h) > AT_NODE));
  return free.length ? free : [at(0.5)];
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
const PRIORITY: HandleType[] = ['head', 'ctrl', 's1', 's2', 'mid1', 'mid2', 'rad'];

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
