import { buildEdge, type Edge } from './edge';
import type { Handle } from './handles';
import { edgesOf, withNode, withRadius, type Path } from './path';
import { pointOn, sweeps } from './piece';
import { AUTO_SNAP, RMIN } from './radius';
import { snapAngle } from '../snap/angles';
import { angleOf, dist, dot, len, mul, sub, type Vec } from './vec';

/** Drag state captured when a handle is grabbed. */
export interface DragState {
  handle: Handle;
}

export interface DragModifiers {
  /** Pixels per meter when headings snap to angles (^251), null when snapping is off. */
  angleScale: number | null;
}

/** Closest the blue point may get to a node, meters. */
const CTRL_MIN_DIST = 0.7;
const RADIUS_SEARCH_STEPS = 160;
/** Refinement steps after the coarse search of a radius. */
const RADIUS_REFINE_STEPS = 40;

const edgeAt = (path: Path, i: number) => edgesOf(path)[i]!.E;

export const startDrag = (handle: Handle): DragState => ({ handle });

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
  return withNode(path, i, { x: pt.x, y: pt.y });
}

/** The heading of the node `i` turned towards `pt`, snapped to angles that get finer farther out (^251). */
export function dragHeading(path: Path, i: number, pt: Vec, angleScale: number | null): Path {
  const from = path.nodes[i]!;
  const th = angleOf(sub(pt, from));
  return withNode(path, i, {
    th: angleScale === null ? th : snapAngle(th, dist(pt, from) * angleScale),
  });
}

/** Dragging the blue point sets both headings so their lines meet at the pointer (^9). */
function dragCorner(path: Path, i: number, C: Vec): Path {
  const p = path.nodes[i]!;
  const q = path.nodes[i + 1]!;
  if (dist(C, p) <= CTRL_MIN_DIST || dist(C, q) <= CTRL_MIN_DIST) return path;
  return withNode(withNode(path, i, { th: angleOf(sub(C, p)) }), i + 1, {
    th: angleOf(sub(q, C)),
  });
}

/**
 * The radius, between the smallest and `Rmax`, at which the point `pointAt(R)` is nearest to `pt`:
 * a coarse search over the radii (on a log scale), then a refinement around the best one, so that
 * the radius follows the pointer smoothly instead of in steps. Null if there is no such point.
 */
function nearestRadius(Rmax: number, pointAt: (R: number) => Vec | null, pt: Vec): number | null {
  const cost = (R: number) => {
    const m = pointAt(R);
    return m ? dist(m, pt) : Infinity;
  };
  const at = (n: number) => RMIN * Math.pow(Rmax / RMIN, n / RADIUS_SEARCH_STEPS);
  let best = -1;
  let bd = Infinity;
  for (let n = 0; n <= RADIUS_SEARCH_STEPS; n++) {
    const c = cost(at(n));
    if (c < bd) [bd, best] = [c, n];
  }
  if (best < 0) return null;
  let [lo, hi] = [at(Math.max(best - 1, 0)), at(Math.min(best + 1, RADIUS_SEARCH_STEPS))];
  for (let k = 0; k < RADIUS_REFINE_STEPS; k++) {
    const [a1, a2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
    if (cost(a1) <= cost(a2)) hi = a2;
    else lo = a1;
  }
  const R = (lo + hi) / 2;
  return cost(R) <= bd ? R : at(best);
}

/**
 * Dragging a corner of an S-curve, where a heading line meets the middle line (^132, experiment):
 * the heading of the corner's node turns so that its heading line passes through the pointer.
 */
function dragMiddle(path: Path, i: number, which: 1 | 2, pt: Vec): Path {
  if (edgeAt(path, i).kind !== 'S') return path;
  const at = which === 1 ? i : i + 1;
  const node = path.nodes[at]!;
  const th = which === 1 ? angleOf(sub(pt, node)) : angleOf(sub(node, pt));
  return withNode(path, at, { th });
}

/** Where the radius handle sits on arc k of edge i when the edge has radius R, if it is still an arc of that kind. */
function handlePoint(
  path: Path,
  at: { i: number; k: number; t: number },
  R: number,
  kind: Edge['kind'],
): Vec | null {
  const E = buildEdge(path.nodes[at.i]!, path.nodes[at.i + 1]!, R);
  const piece = E.kind === kind ? E.pieces[at.k] : undefined;
  return piece && sweeps(piece) ? pointOn(piece, at.t) : null;
}

/**
 * The radius at which the handle (an end or the middle of an arc, ^128) is nearest to the pointer,
 * so the handle follows the cursor whichever way the geometry moves it (^17).
 */
function radiusNearest(path: Path, at: { i: number; k: number; t: number }, pt: Vec) {
  const E0 = edgeAt(path, at.i);
  if (E0.kind === 'line') return null;
  return nearestRadius(E0.Rmax, (R) => handlePoint(path, at, R, E0.kind), pt);
}

function dragRadius(path: Path, drag: DragState, pt: Vec): Path {
  const { i, k = 0, t = 0.5 } = drag.handle;
  const E = edgeAt(path, i);
  const R = E.kind === 'line' ? null : radiusNearest(path, { i, k, t }, pt);
  if (R == null || E.kind === 'line') return path;
  return withRadius(path, i, toRequested(R, E.Rmax));
}

/** The path after dragging the grabbed handle to `pt`. Headings never change when radii do (^8). */
export function applyDrag(path: Path, drag: DragState, pt: Vec, mod: DragModifiers): Path {
  const { type, i } = drag.handle;
  switch (type) {
    case 'node':
      return dragNode(path, i, pt);
    case 'head':
      return dragHeading(path, i, pt, mod.angleScale);
    case 'ctrl':
      return dragCorner(path, i, pt);
    case 'mid1':
      return dragMiddle(path, i, 1, pt);
    case 'mid2':
      return dragMiddle(path, i, 2, pt);
    case 'rad':
      return dragRadius(path, drag, pt);
  }
}
