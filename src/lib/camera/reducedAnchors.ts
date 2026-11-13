import type { Anchor } from './bounds';
import { isDegenerate } from '../curves/piece';
import type { Piece } from '../curves/types';
import type { Chain } from '../editor/chains';
import { pointOn } from '../curves/piece';
import type { Vec } from '../curves/vec';

/** Half the drawn size of a node dot and of a curve, pixels (as in `skeletonAnchors`). */
const NODE_RADIUS_PX = 7;
const CURVE_HALF_PX = 2.5;
/** The size of a chunk of the map (meters): the hull of the chains of a chunk is kept while they are the same objects. */
const CHUNK_M = 256;
/** How far (meters) the box of an arc may be off: an arc is looked at at steps that keep it within this. */
const OFF_M = 0.02;

interface Hull {
  nodes: Vec[];
  curves: Vec[];
}

/** The corners of the convex hull of points (monotone chain). */
export const hullOf = (points: Vec[]): Vec[] => monotone(outside(points));

function monotone(points: Vec[]): Vec[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Vec[]) => {
    const out: Vec[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, q) <= 0)
        out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half([...p].reverse())];
}

/**
 * The points that are not inside the octagon of the points that are farthest in eight directions:
 * those cannot be corners of the hull (Akl and Toussaint), and for a big map they are nearly all.
 */
function outside(points: Vec[]): Vec[] {
  if (points.length < 64) return points;
  const along = [
    (p: Vec) => p.x,
    (p: Vec) => -p.x,
    (p: Vec) => p.y,
    (p: Vec) => -p.y,
    (p: Vec) => p.x + p.y,
    (p: Vec) => -p.x - p.y,
    (p: Vec) => p.x - p.y,
    (p: Vec) => p.y - p.x,
  ];
  const far = along.map((f) => points.reduce((best, p) => (f(p) > f(best) ? p : best)));
  const ring = monotone([...new Set(far)]);
  if (ring.length < 3) return points;
  return points.filter((q) => !insideRing(ring, q));
}

/** Whether a point is strictly inside a convex ring of corners (any direction round). */
function insideRing(ring: Vec[], q: Vec): boolean {
  let sign = 0;
  for (let i = 0; i < ring.length; i++) {
    const [a, b] = [ring[i]!, ring[(i + 1) % ring.length]!];
    const c = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
    if (c === 0) return false;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

/** The places of a piece that can bound the content: its ends, and along an arc every degree. */
function pointsOfPiece(piece: Piece): Vec[] {
  if (piece.type === 'line') return [piece.P, piece.Q];
  const step = 2 * Math.acos(Math.max(0, 1 - OFF_M / piece.r));
  const n = Math.max(1, Math.ceil(Math.abs(piece.da) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const at = pointOn(piece, i / n);
    return { x: at.x, y: at.y };
  });
}

const ofChain = new WeakMap<Chain, Hull>();
function hullOfChain(c: Chain): Hull {
  let h = ofChain.get(c);
  if (!h) {
    const pieces = c.edges.flatMap((r) => r.E.pieces).filter((p) => !isDegenerate(p));
    h = {
      nodes: hullOf(c.path.nodes.map((n) => ({ x: n.x, y: n.y }))),
      curves: hullOf(pieces.flatMap(pointsOfPiece)),
    };
    ofChain.set(c, h);
  }
  return h;
}

const chunks = new Map<string, { chains: Chain[]; hull: Hull }>();

/**
 * What bounds the content, as anchors (^62), without one for every node and piece (^941): the
 * convex hull of the node dots and the convex hull of the curves, found chain by chain and chunk by
 * chunk and kept while the chains are the same objects. The box of the hull is the box of all of
 * them, at any zoom and turn, so the camera has about the same few anchors for a map of any size.
 * (An arc is looked at in steps that keep the box within `OFF_M`.)
 */
export function reducedAnchors(chains: Chain[]): Anchor[] {
  const groups = chunksOf(chains);
  const regions = new Map<string, Hull[]>();
  for (const [key, list] of groups) {
    const [ix, iy] = key.split(',').map(Number);
    const region = `${Math.floor(ix! / REGION_CHUNKS)},${Math.floor(iy! / REGION_CHUNKS)}`;
    regions.set(region, [...(regions.get(region) ?? []), hullOfChunk(key, list)]);
  }
  for (const key of chunks.keys()) if (!groups.has(key)) chunks.delete(key);
  for (const key of ofRegion.keys()) if (!regions.has(key)) ofRegion.delete(key);
  const hulls = [...regions].map(([key, parts]) => hullOfRegion(key, parts));
  return [
    ...hullOf(hulls.flatMap((h) => h.nodes)).map((p): Anchor => ({
      kind: 'point',
      x: p.x,
      y: p.y,
      r: NODE_RADIUS_PX,
    })),
    ...hullOf(hulls.flatMap((h) => h.curves)).map((p): Anchor => ({
      kind: 'point',
      x: p.x,
      y: p.y,
      r: CURVE_HALF_PX,
    })),
  ];
}

/** How many chunks wide a region is: the hulls of the chunks in it are joined once, and again only when one of them changed. */
const REGION_CHUNKS = 8;
const ofRegion = new Map<string, { parts: Hull[]; hull: Hull }>();

function hullOfRegion(key: string, parts: Hull[]): Hull {
  const was = ofRegion.get(key);
  if (was && was.parts.length === parts.length && parts.every((h, i) => h === was.parts[i])) {
    return was.hull;
  }
  const hull = {
    nodes: hullOf(parts.flatMap((h) => h.nodes)),
    curves: hullOf(parts.flatMap((h) => h.curves)),
  };
  ofRegion.set(key, { parts, hull });
  return hull;
}

/** The chains by the chunk of the map their first node is in. */
function chunksOf(chains: Chain[]): Map<string, Chain[]> {
  const groups = new Map<string, Chain[]>();
  for (const c of chains) {
    const at = c.path.nodes[0];
    if (!at) continue;
    const key = `${Math.floor(at.x / CHUNK_M)},${Math.floor(at.y / CHUNK_M)}`;
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }
  return groups;
}

/** The hulls of a chunk: the ones of the last time if its chains are the same objects. */
function hullOfChunk(key: string, list: Chain[]): Hull {
  const was = chunks.get(key);
  if (was && was.chains.length === list.length && list.every((c, i) => c === was.chains[i])) {
    return was.hull;
  }
  const hull = {
    nodes: hullOf(list.flatMap((c) => hullOfChain(c).nodes)),
    curves: hullOf(list.flatMap((c) => hullOfChain(c).curves)),
  };
  chunks.set(key, { chains: list, hull });
  return hull;
}
