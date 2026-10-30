import { buildEdge, edgeRadius, tagOf, type Edge, type PathNode, type ShapeTag } from './edge';
import { isDegenerate, pointOn, type Sample } from './piece';
import { angleOf, dist, sub, type Vec } from './vec';

/**
 * A chain of nodes. Edge i joins nodes[i] and nodes[i+1] and has its own requested radius
 * (null = auto, ^8) and shape tag (null = automatic, ^7). Always replaced, never mutated.
 */
export interface Path {
  nodes: PathNode[];
  radii: (number | null)[];
  shapes: (ShapeTag | null)[];
}

export interface EdgeRef {
  i: number;
  p: PathNode;
  q: PathNode;
  E: Edge;
}

export const emptyPath = (): Path => ({ nodes: [], radii: [], shapes: [] });

export function edgesOf(path: Path): EdgeRef[] {
  const out: EdgeRef[] = [];
  for (let i = 0; i < path.nodes.length - 1; i++) {
    const p = path.nodes[i]!;
    const q = path.nodes[i + 1]!;
    out.push({ i, p, q, E: buildEdge(p, q, path.radii[i] ?? null, path.shapes[i] ?? null) });
  }
  return out;
}

/** Replace `count` entries at `at` in each of the parallel edge arrays. */
interface EdgeData {
  radii: (number | null)[];
  shapes: (ShapeTag | null)[];
}
const NONE: EdgeData = { radii: [], shapes: [] };
const FRESH: EdgeData = { radii: [null], shapes: [null] };

const spliceEdges = (path: Path, at: number, count: number, add: EdgeData): EdgeData => ({
  radii: path.radii.toSpliced(at, count, ...add.radii),
  shapes: path.shapes.toSpliced(at, count, ...add.shapes),
});

export function withNode(path: Path, i: number, patch: Partial<PathNode>): Path {
  return { ...path, nodes: path.nodes.map((n, j) => (j === i ? { ...n, ...patch } : n)) };
}

/** Clear stored shape tags of the given edges (a heading changed, ^7). */
export function clearShapes(path: Path, edges: number[]): Path {
  const shapes = path.shapes.map((s, i) => (edges.includes(i) ? null : s));
  return { ...path, shapes };
}

export function withRadius(path: Path, i: number, R: number | null): Path {
  return { ...path, radii: path.radii.map((r, j) => (j === i ? R : r)) };
}

/** Drop the fixed middle line of S-curves around a moved node, keeping the S shape (^7). */
export function releaseMiddles(path: Path, edges: number[]): Path {
  const shapes = path.shapes.map((s, i) =>
    s && s.kind === 'S' && s.mid && edges.includes(i) ? { kind: 'S' as const, s: s.s } : s,
  );
  return { ...path, shapes };
}

/* ---------- append ---------- */

/** New heading so that the edge from `prev` to `pt` is a single circular arc (a hook beyond 180 degrees). */
export const autoHeading = (prev: PathNode, pt: Vec) => 2 * angleOf(sub(pt, prev)) - prev.th;

/** Add a node after the last one; returns the new path and the new node's index (^40). */
export function appendNode(path: Path, pt: Vec): { path: Path; sel: number } {
  const { nodes } = path;
  const th = nodes.length ? autoHeading(nodes[nodes.length - 1]!, pt) : 0;
  const added = spliceEdges(path, path.radii.length, 0, nodes.length ? FRESH : NONE);
  return { path: { nodes: [...nodes, { x: pt.x, y: pt.y, th }], ...added }, sel: nodes.length };
}

/* ---------- insert ---------- */

export interface CurveHit {
  ref: EdgeRef;
  /** Index of the piece within the edge. */
  k: number;
  at: Sample;
  d: number;
}

const SAMPLES = 160;

/** The point of the path nearest to `pt` if it is within `maxDist` meters. */
export function nearestOnCurve(path: Path, pt: Vec, maxDist: number): CurveHit | null {
  let best: CurveHit | null = null;
  for (const ref of edgesOf(path)) {
    ref.E.pieces.forEach((piece, k) => {
      if (isDegenerate(piece)) return;
      for (let n = 0; n <= SAMPLES; n++) {
        const at = pointOn(piece, n / SAMPLES);
        const d = dist(at, pt);
        if (!best || d < best.d) best = { ref, k, at, d };
      }
    });
  }
  const hit = best as CurveHit | null;
  return hit && hit.d < maxDist ? hit : null;
}

type Tags = [ShapeTag | null, ShapeTag | null];

/** Shape tags for the two halves of an edge split inside piece k, so the curve stays the same. */
function halfTags(E: Edge, k: number): Tags {
  const bend: ShapeTag = { kind: 'C' };
  const own = tagOf(E);
  if (E.kind === 'C') return [k === 0 ? null : bend, k === 2 ? null : bend];
  if (E.kind === 'S') {
    return [[null, bend, bend, own, own][k] ?? null, [own, own, bend, bend, null][k] ?? null];
  }
  if (E.kind === 'H') return [[bend, bend, own][k] ?? null, [own, bend, bend][k] ?? null];
  return [null, null];
}

/** Insert a node on the curve; both halves keep radius and shape, so the curve does not change (^10). */
export function insertNode(path: Path, hit: CurveHit): { path: Path; sel: number } {
  const { ref, k, at } = hit;
  const R = edgeRadius(ref.E);
  const node = { x: at.x, y: at.y, th: Math.atan2(at.ty, at.tx) };
  const nodes = path.nodes.toSpliced(ref.i + 1, 0, node);
  const e = spliceEdges(path, ref.i, 1, { radii: [R, R], shapes: halfTags(ref.E, k) });
  return { path: { nodes, ...e }, sel: ref.i + 1 };
}

/* ---------- remove ---------- */

export function removeNode(path: Path, i: number): Path {
  const n = path.nodes.length;
  if (i < 0 || i >= n) return path;
  const nodes = path.nodes.toSpliced(i, 1);
  if (n === 1) return emptyPath();
  if (i === 0) return { nodes, ...spliceEdges(path, 0, 1, NONE) };
  if (i === n - 1) return { nodes, ...spliceEdges(path, n - 2, 1, NONE) };
  return { nodes, ...spliceEdges(path, i - 1, 2, FRESH) };
}
