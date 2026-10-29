import { limitRadius } from './radius';
import { cornerArc, line } from './piece';
import type { Classification } from './classify';
import type { BendEdge, EdgeInput } from './types';
import { add, cross, dot, fromAngle, mul, sub } from './vec';

/** The single-bend edge (^6): straight, arc, straight. Null unless the heading lines meet. */
export function bendEdge({ p, q, Rs }: EdgeInput, cls: Classification): BendEdge | null {
  if (cls.kind !== 'C') return null;
  const T1 = fromAngle(p.th);
  const T2 = fromAngle(q.th);
  const turn = Math.atan2(cross(T1, T2), dot(T1, T2));
  const tn = Math.tan(Math.abs(turn) / 2);
  const Rmax = Math.min(Math.min(cls.a, cls.b) / tn, 1e6);
  const R = limitRadius(Rs, Rmax);
  const t = R * tn;
  const A1 = sub(cls.C, mul(T1, t));
  const A2 = add(cls.C, mul(T2, t));
  return {
    kind: 'C',
    C: cls.C,
    turn,
    T1,
    T2,
    R,
    Rmax,
    auto: Rs == null,
    ticks: [
      { at: A1, dir: T1, role: 'blue' },
      { at: A2, dir: T2, role: 'blue' },
    ],
    pieces: [line(p, A1), cornerArc(A1, T1, T2, t), line(A2, q)],
  };
}
