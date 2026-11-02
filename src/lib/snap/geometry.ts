import { nearestParam, pointOn } from '../curves/piece';
import type { Arc, Piece } from '../curves/types';
import { TAU, add, angleOf, dist, dot, mod, mul, sub, unitOr, type Vec } from '../curves/vec';

const EPS = 1e-9;

/** A long line piece through `p` along `dir` (a snap line has no ends, ^263). */
export const LINE_REACH_M = 1e5;
export function infiniteLine(p: Vec, dir: Vec): Piece {
  const u = unitOr(dir, { x: 1, y: 0 });
  return { type: 'line', P: sub(p, mul(u, LINE_REACH_M)), Q: add(p, mul(u, LINE_REACH_M)) };
}

export interface Nearest {
  pt: Vec;
  /** Unit tangent of the curve there. */
  tx: number;
  ty: number;
  d: number;
}

/** The point of a curve (pieces) nearest to `p`. */
export function nearestOnPieces(pieces: Piece[], p: Vec): Nearest | null {
  let best: Nearest | null = null;
  for (const piece of pieces) {
    const s = pointOn(piece, nearestParam(piece, p));
    const d = dist(s, p);
    if (!best || d < best.d) best = { pt: { x: s.x, y: s.y }, tx: s.tx, ty: s.ty, d };
  }
  return best;
}

/** Whether a point on the circle of an arc is on the arc itself. */
function onArc(arc: Arc, p: Vec): boolean {
  const sweep = Math.abs(arc.da);
  const along = mod(Math.sign(arc.da) * (angleOf(sub(p, arc.c)) - arc.a0), TAU);
  return along <= sweep + 1e-7 || along >= TAU - 1e-7;
}

/** Whether a point on the line of a piece is on the piece. */
function onLine(piece: Piece & { type: 'line' }, p: Vec): boolean {
  const d = sub(piece.Q, piece.P);
  const t = dot(sub(p, piece.P), d) / (dot(d, d) || 1);
  return t >= -1e-9 && t <= 1 + 1e-9;
}

function lineLine(a: Piece & { type: 'line' }, b: Piece & { type: 'line' }): Vec[] {
  const [r, s] = [sub(a.Q, a.P), sub(b.Q, b.P)];
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < EPS) return [];
  const q = sub(b.P, a.P);
  const [t, u] = [(q.x * s.y - q.y * s.x) / den, (q.x * r.y - q.y * r.x) / den];
  const inside = (v: number) => v >= -1e-9 && v <= 1 + 1e-9;
  return inside(t) && inside(u) ? [add(a.P, mul(r, t))] : [];
}

function lineArc(l: Piece & { type: 'line' }, arc: Arc): Vec[] {
  const d = sub(l.Q, l.P);
  const f = sub(l.P, arc.c);
  const [a, b, c] = [dot(d, d), 2 * dot(f, d), dot(f, f) - arc.r * arc.r];
  const disc = b * b - 4 * a * c;
  if (a < EPS || disc < 0) return [];
  const roots =
    disc === 0
      ? [-b / (2 * a)]
      : [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)];
  return roots.map((t) => add(l.P, mul(d, t))).filter((p) => onLine(l, p) && onArc(arc, p));
}

function arcArc(a: Arc, b: Arc): Vec[] {
  const d = dist(a.c, b.c);
  if (d < EPS || d > a.r + b.r + EPS || d < Math.abs(a.r - b.r) - EPS) return [];
  const x = (d * d + a.r * a.r - b.r * b.r) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.r * a.r - x * x));
  const u = mul(sub(b.c, a.c), 1 / d);
  const m = add(a.c, mul(u, x));
  const n = { x: -u.y, y: u.x };
  const pts = h < 1e-9 ? [m] : [add(m, mul(n, h)), add(m, mul(n, -h))];
  return pts.filter((p) => onArc(a, p) && onArc(b, p));
}

/** The points where two pieces cross. */
export function crossPieces(a: Piece, b: Piece): Vec[] {
  if (a.type === 'line' && b.type === 'line') return lineLine(a, b);
  if (a.type === 'line' && b.type === 'arc') return lineArc(a, b);
  if (a.type === 'arc' && b.type === 'line') return lineArc(b, a);
  return a.type === 'arc' && b.type === 'arc' ? arcArc(a, b) : [];
}

/** The points where two curves cross. */
export const crossings = (a: Piece[], b: Piece[]): Vec[] =>
  a.flatMap((p) => b.flatMap((q) => crossPieces(p, q)));
