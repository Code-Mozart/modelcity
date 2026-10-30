import { cornerArc } from './piece';
import type { PathNode, Piece } from './types';
import { dot, fromAngle, mul, sub, add, unitOr } from './vec';

/**
 * Two arcs meeting tangentially halfway: used only to tell whether two nodes need a bend, an
 * S-curve or a hook (the sweep signs of the two arcs).
 */
export function biarc(p: PathNode, q: PathNode): [Piece, Piece] {
  const T1 = fromAngle(p.th);
  const T2 = fromAngle(q.th);
  const w = sub(q, p);
  const m = mul(add(T1, T2), 0.5);
  const A = dot(m, m) - 1;
  const wm = dot(w, m);
  const C = dot(w, w);
  const S = Math.sqrt(Math.max(0, wm * wm - A * C));
  let L = wm + S > 1e-9 ? C / (wm + S) : Math.sqrt(C) / 2;
  if (!(L > 1e-9)) L = Math.sqrt(C) / 2;
  const d = L / 2;
  const s1 = add(p, mul(T1, d));
  const s2 = sub(q, mul(T2, d));
  const u = unitOr(sub(s2, s1), T1);
  const J = add(s1, mul(u, d));
  return [cornerArc(p, T1, u, d), cornerArc(J, u, T2, d)];
}
