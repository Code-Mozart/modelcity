import type { PathNode } from './types';
import { add, cross, fromAngle, len, mul, sub, type Vec } from './vec';

export type Classification = { kind: 'C'; a: number; b: number; C: Vec } | { kind: 'S' };

/**
 * Whether the two heading lines meet ahead of p and behind q, i.e. a single bend can join the
 * nodes ('C'); otherwise an S-curve or hook is needed ('S').
 */
export function classify(p: PathNode, q: PathNode): Classification {
  const T1 = fromAngle(p.th);
  const T2 = fromAngle(q.th);
  const w = sub(q, p);
  const den = cross(T1, T2);
  if (Math.abs(den) < 1e-4) return { kind: 'S' };
  const a = cross(w, T2) / den;
  const b = cross(T1, w) / den;
  const wl = len(w);
  const meets = a > 1e-3 && b > 1e-3 && a < 8 * wl && b < 8 * wl;
  return meets ? { kind: 'C', a, b, C: add(p, mul(T1, a)) } : { kind: 'S' };
}
