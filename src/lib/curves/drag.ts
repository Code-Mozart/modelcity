import { buildEdge, type Edge } from './edge';
import type { Handle } from './handles';
import { clearShapes, releaseMiddles, withNode, withRadius, type Path } from './path';
import { pointOn, sweeps } from './piece';
import { AUTO_SNAP, RMIN } from './radius';
import { angleOf, dist, dot, len, mul, sub, toRad, type Vec } from './vec';

/** Drag state captured when a handle is grabbed. */
export interface DragState {
  handle: Handle;
}

export interface DragModifiers {
  /** Snap headings to 15 degrees (^11). */
  snap: boolean;
}

/** Closest the blue point may get to a node, meters. */
const CTRL_MIN_DIST = 0.7;
const SNAP_STEP = toRad(15);
const RADIUS_SEARCH_STEPS = 160;

const edgeAt = (path: Path, i: number) =>
  buildEdge(path.nodes[i]!, path.nodes[i + 1]!, path.radii[i] ?? null, path.shapes[i] ?? null);

export const startDrag = (_path: Path, handle: Handle): DragState => ({ handle });

/** Radius of the bend whose circle is tangent to both heading lines and passes through `pt`. */
export function radiusFromCursor(E: Edge & { kind: 'C' }, pt: Vec): number {
  const e0 = sub(E.T2, E.T1);
  const e = mul(e0, 1 / (len(e0) || 1));
  const h = Math.abs(E.turn) / 2;
  const c2 = Math.sin(h) ** 2;
  const m = sub(pt, E.C);
  const me = dot(m, e);
  const disc = Math.max(0, me * me - dot(m, m) * c2);
  return ((me + Math.sqrt(disc)) / c2) * Math.cos(h);
}

const toRequested = (R: number, Rmax: number) => (R >= AUTO_SNAP * Rmax ? null : R);

function dragNode(path: Path, i: number, pt: Vec): Path {
  return releaseMiddles(withNode(path, i, { x: pt.x, y: pt.y }), [i - 1, i]);
}

export function dragHeading(path: Path, i: number, pt: Vec, snap: boolean): Path {
  let th = angleOf(sub(pt, path.nodes[i]!));
  if (snap) th = Math.round(th / SNAP_STEP) * SNAP_STEP;
  return clearShapes(withNode(path, i, { th }), [i - 1, i]);
}

/** Dragging the blue point sets both headings so their lines meet at the pointer (^9). */
function dragCorner(path: Path, i: number, C: Vec): Path {
  const p = path.nodes[i]!;
  const q = path.nodes[i + 1]!;
  if (dist(C, p) <= CTRL_MIN_DIST || dist(C, q) <= CTRL_MIN_DIST) return path;
  const moved = withNode(withNode(path, i, { th: angleOf(sub(C, p)) }), i + 1, {
    th: angleOf(sub(q, C)),
  });
  return clearShapes(moved, [i - 1, i, i + 1]);
}

/** The turquoise corner (1 or 2) of the hook the nodes form at radius R, if it is still a hook. */
function hookCorner(path: Path, i: number, R: number, which: 1 | 2): Vec | null {
  const E = buildEdge(path.nodes[i]!, path.nodes[i + 1]!, R, path.shapes[i] ?? null);
  if (E.kind !== 'H') return null;
  return which === 1 ? E.k1 : E.k2;
}

/** Dragging a hook's turquoise point: pick the radius whose corner is nearest to the pointer. */
function dragHookCorner(path: Path, i: number, which: 1 | 2, pt: Vec): Path {
  const E0 = edgeAt(path, i);
  if (E0.kind !== 'H') return path;
  let best: number | null = null;
  let bd = Infinity;
  for (let n = 0; n <= RADIUS_SEARCH_STEPS; n++) {
    const R = RMIN * Math.pow(E0.Rmax / RMIN, n / RADIUS_SEARCH_STEPS);
    const c = hookCorner(path, i, R, which);
    if (c && dist(c, pt) < bd) {
      bd = dist(c, pt);
      best = R;
    }
  }
  return best == null ? path : withRadius(path, i, toRequested(best, E0.Rmax));
}

/** The midpoint of arc k of edge i when the edge has radius R, if it is still an arc of the same kind. */
function arcMidpoint(
  path: Path,
  at: { i: number; k: number },
  R: number,
  kind: Edge['kind'],
): Vec | null {
  const E = buildEdge(path.nodes[at.i]!, path.nodes[at.i + 1]!, R, path.shapes[at.i] ?? null);
  const piece = E.kind === kind ? E.pieces[at.k] : undefined;
  return piece && sweeps(piece) ? pointOn(piece, 0.5) : null;
}

/**
 * The radius at which the arc's midpoint (where the orange ring sits) is nearest to the pointer,
 * so the ring follows the cursor whichever way the geometry moves it (^17).
 */
function radiusNearest(path: Path, at: { i: number; k: number }, pt: Vec): number | null {
  const E0 = edgeAt(path, at.i);
  if (E0.kind === 'line') return null;
  let best: number | null = null;
  let bd = Infinity;
  for (let n = 0; n <= RADIUS_SEARCH_STEPS; n++) {
    const R = RMIN * Math.pow(E0.Rmax / RMIN, n / RADIUS_SEARCH_STEPS);
    const m = arcMidpoint(path, at, R, E0.kind);
    if (m && dist(m, pt) < bd) {
      bd = dist(m, pt);
      best = R;
    }
  }
  return best;
}

function dragRadius(path: Path, drag: DragState, pt: Vec): Path {
  const { i, k = -1 } = drag.handle;
  const E = edgeAt(path, i);
  if (E.kind === 'line') return path;
  if (k === -1) {
    if (E.kind !== 'C') return path;
    const R = radiusFromCursor(E, pt);
    return withRadius(path, i, R >= AUTO_SNAP * E.Rmax ? null : Math.max(R, RMIN));
  }
  const R = radiusNearest(path, { i, k }, pt);
  if (R == null) return path;
  return withRadius(path, i, E.kind === 'S' ? toRequested(R, E.Rmax) : R);
}

/** The path after dragging the grabbed handle to `pt`. Headings never change when radii do (^8). */
export function applyDrag(path: Path, drag: DragState, pt: Vec, mod: DragModifiers): Path {
  const { type, i } = drag.handle;
  switch (type) {
    case 'node':
      return dragNode(path, i, pt);
    case 'head':
      return dragHeading(path, i, pt, mod.snap);
    case 'ctrl':
      return dragCorner(path, i, pt);
    case 's1':
      return dragHookCorner(path, i, 1, pt);
    case 's2':
      return dragHookCorner(path, i, 2, pt);
    case 'rad':
      return dragRadius(path, drag, pt);
  }
}

/** Radius back to auto: the largest that fits (^8). */
export const resetRadius = (path: Path, i: number): Path => withRadius(path, i, null);
