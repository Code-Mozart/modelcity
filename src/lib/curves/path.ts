import { buildEdge, type Edge, type PathNode } from './edge';
import { distanceToPiece, isDegenerate, nearestParam, pointOn, type Sample } from './piece';
import { angleOf, dist, sub, type Vec } from './vec';

/**
 * A chain of nodes. Edge i joins nodes[i] and nodes[i+1] and has its own requested radius
 * (null = auto, ^8) and shape tag (null = automatic, ^7). Always replaced, never mutated.
 */
export interface Path {
  nodes: PathNode[];
  radii: (number | null)[];
}

export interface EdgeRef {
  i: number;
  p: PathNode;
  q: PathNode;
  E: Edge;
}

const edgeCache = new WeakMap<Path, EdgeRef[]>();

/**
 * The edges of a path. Paths are never mutated, so the result is kept per path object: building an
 * edge is the expensive part, and a pointer move would otherwise rebuild every road several times.
 */
export function edgesOf(path: Path): EdgeRef[] {
  const cached = edgeCache.get(path);
  if (cached) return cached;
  const built = buildEdges(path);
  edgeCache.set(path, built);
  return built;
}

function buildEdges(path: Path): EdgeRef[] {
  const out: EdgeRef[] = [];
  for (let i = 0; i < path.nodes.length - 1; i++) {
    const p = path.nodes[i]!;
    const q = path.nodes[i + 1]!;
    out.push({ i, p, q, E: buildEdge(p, q, path.radii[i] ?? null) });
  }
  return out;
}

export function withNode(path: Path, i: number, patch: Partial<PathNode>): Path {
  return { ...path, nodes: path.nodes.map((n, j) => (j === i ? { ...n, ...patch } : n)) };
}

export function withRadius(path: Path, i: number, R: number | null): Path {
  return { ...path, radii: path.radii.map((r, j) => (j === i ? R : r)) };
}

/** New heading so that the edge from `prev` to `pt` is a single circular arc (a hook beyond 180 degrees). */
export const autoHeading = (prev: PathNode, pt: Vec) => 2 * angleOf(sub(pt, prev)) - prev.th;

/** Heading of a node placed before `next` so that the edge to it is a single circular arc (^65). */
export const autoHeadingBefore = (next: PathNode, pt: Vec) => 2 * angleOf(sub(next, pt)) - next.th;

export interface CurveHit {
  ref: EdgeRef;
  /** Index of the piece within the edge. */
  k: number;
  at: Sample;
  d: number;
}

/**
 * The point of the path nearest to `pt` if it is within `maxDist` meters. Exact on every piece,
 * so a point that follows the pointer along the curve moves continuously.
 */
export function nearestOnCurve(path: Path, pt: Vec, maxDist: number): CurveHit | null {
  return nearestOnEdges(edgesOf(path), pt, maxDist);
}

/** The same for edges that are already built. */
export function nearestOnEdges(edges: EdgeRef[], pt: Vec, maxDist: number): CurveHit | null {
  let best: CurveHit | null = null;
  for (const ref of edges) {
    ref.E.pieces.forEach((piece, k) => {
      if (isDegenerate(piece) || distanceToPiece(piece, pt) > maxDist) return;
      const at = pointOn(piece, nearestParam(piece, pt));
      const d = dist(at, pt);
      if (!best || d < best.d) best = { ref, k, at, d };
    });
  }
  const hit = best as CurveHit | null;
  return hit && hit.d < maxDist ? hit : null;
}
