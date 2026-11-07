import { LANE_WIDTH_M } from '../curves/lane';
import { RMIN } from '../curves/radius';
import { reverseEdge, twoRadiiEdge } from '../curves/reverse';
import { SAME_PLACE_M } from '../curves/tolerance';
import type { Arc, Edge, MidLine, PathNode, TwoArcEdge } from '../curves/types';
import { add, dist, dot, fromAngle, mul, perp, sub, type Vec } from '../curves/vec';
import type { GEdge, Graph } from '../model/graph';
import type { Chain } from './chains';
import type { EdgeRef } from '../curves/path';
import { touching } from './parallel';

/** An S-curve with its end nodes and the curve the curve code built for it alone (two equal arcs, ^6). */
interface Lane {
  edge: GEdge;
  p: PathNode;
  q: PathNode;
  E: TwoArcEdge;
}

const isS = (E: Edge): E is TwoArcEdge => E.kind === 'S';
const arcOf = (E: TwoArcEdge, i: 1 | 3): Arc | null => {
  const piece = E.pieces[i];
  return piece?.type === 'arc' ? piece : null;
};

/** The S-curve reversed, so that it runs the other way (the nodes keep their places). */
function reversed(E: TwoArcEdge): TwoArcEdge {
  const flip = (p: Edge['pieces'][number]) =>
    p.type === 'line'
      ? { ...p, P: p.Q, Q: p.P }
      : { ...p, P: p.Q, Q: p.P, a0: p.a0 + p.da, da: -p.da };
  const mid = E.mid && { ...E.mid, ux: -E.mid.ux, uy: -E.mid.uy };
  return {
    ...E,
    mid,
    k1: E.k2,
    k2: E.k1,
    axis: { a: E.axis.b, b: E.axis.a },
    pieces: [...E.pieces].reverse().map(flip),
  };
}

/** Which way the lane `b` runs, compared with `a`: the nodes at its start and end seen in the direction of `a`. */
function inDirectionOf(a: Lane, b: Lane): { p: PathNode; q: PathNode; against: boolean } {
  const near = (u: Vec, v: Vec) => Math.abs(dist(u, v) - LANE_WIDTH_M) < SAME_PLACE_M;
  if (near(a.p, b.p) || !near(a.p, b.q)) return { p: b.p, q: b.q, against: false };
  const turned = (n: PathNode): PathNode => ({ x: n.x, y: n.y, th: n.th + Math.PI });
  return { p: turned(b.q), q: turned(b.p), against: true };
}

/** The middle line of `a` moved sideways by `d` (to the right of the way it runs, ^279). */
const movedMiddle = (M: MidLine, d: number): MidLine => {
  const n = mul(perp({ x: M.ux, y: M.uy }), d);
  return { ...M, x: M.x + n.x, y: M.y + n.y };
};

/** Where a lane runs, in the direction of the lane it is compared with. */
interface Place {
  p: PathNode;
  q: PathNode;
  against: boolean;
}

/**
 * The S-curve at `at` if it is the curve of `a` moved sideways (^828): the same middle line moved,
 * the arcs concentric, with the radii `R - d` and `R + d`, so the one that turns inside is the
 * smaller. The nodes of `at` are its ends. Null if it does not fit.
 */
function besideAt(a: Lane, at: Place): TwoArcEdge | null {
  const [arc1, arc2] = [arcOf(a.E, 1), arcOf(a.E, 3)];
  if (!arc1 || !arc2 || !a.E.mid) return null;
  const { p, q, against } = at;
  const d = dot({ x: p.x - a.p.x, y: p.y - a.p.y }, perp(fromAngle(a.p.th)));
  const R1 = arc1.r - Math.sign(arc1.da) * d;
  const R2 = arc2.r - Math.sign(arc2.da) * d;
  if (Math.min(R1, R2) < RMIN) return null;
  const Rmax = a.E.Rmax - Math.abs(d);
  const E = twoRadiiEdge(
    p,
    q,
    { mid: movedMiddle(a.E.mid, d), s1: a.E.s1 },
    { R1, R2, Rmax, auto: false },
  );
  return E && (against ? reversed(E) : E);
}

const beside = (a: Lane, b: Lane) => besideAt(a, inDirectionOf(a, b));

/** The radius a lane has: what is stored, or the largest that fits (auto, ^8). */
const valueOf = (l: Lane) => l.edge.radius ?? l.E.Rmax;

/** The S-curves of the chains with their end nodes, by edge id. */
function lanesOf(g: Graph, chains: Chain[]): Map<number, Lane> {
  const lanes = new Map<number, Lane>();
  for (const c of chains) {
    c.edges.forEach((ref, i) => {
      const edge = g.edges.find((e) => e.id === c.edgeIds[i]);
      if (edge && isS(ref.E)) lanes.set(edge.id, { edge, p: ref.p, q: ref.q, E: ref.E });
    });
  }
  return lanes;
}

/** What the search for lanes that follow another one works on: the lanes with the curves found so far. */
interface Context {
  g: Graph;
  lanes: Map<number, Lane>;
  shapes: Map<number, TwoArcEdge>;
  /** Whether an auto lane takes the radius the group gives it. */
  lenient: boolean;
}

/** The curve of the lane `b` if it is beside one of the lanes in `shapes` (their current curves, else their own) and its radius fits. */
function followed(cx: Context, b: Lane) {
  const { g, lanes, shapes, lenient } = cx;
  for (const a of lanes.values()) {
    if (a.edge.id === b.edge.id || !touching(g, a.edge, b.edge)) continue;
    const E = beside({ ...a, E: shapes.get(a.edge.id) ?? a.E }, b);
    // An auto lane takes the radius the group gives it, beside a lane that is in the group already.
    const takes = lenient && b.edge.radius == null && shapes.has(a.edge.id);
    if (E && (takes || Math.abs(E.R - valueOf(b)) <= SAME_PLACE_M))
      return { ...E, auto: b.edge.radius == null };
  }
  return null;
}

/** The curves of the lanes that follow another one, found until no lane is left that does (a chain of lanes, in any order). */
function followers(cx: Context): void {
  const { lanes, shapes } = cx;
  for (let pass = 0, changed = true; changed && pass < lanes.size; pass++) {
    changed = false;
    for (const b of lanes.values()) {
      const E = shapes.has(b.edge.id) ? null : followed(cx, b);
      if (E) shapes.set(b.edge.id, E);
      changed ||= E !== null;
    }
  }
}

/** The group of two lanes around the curve between them: its centre line, the radius that fits, and the lanes' offsets from it. */
interface Pair {
  a: Lane;
  at: Place;
  /** Where the centre line is, as the part of the way from `a` to `b`. */
  t: number;
  /** The distance between the lanes. */
  D: number;
}

/** The centre line of a pair as a lane of its own (two equal arcs of the radius `Rs`, null: the widest). */
function centre({ a, at, t }: Pair, Rs: number | null, Rmax?: number): Lane | null {
  const mix = (u: PathNode, v: PathNode): PathNode => ({
    ...add(u, mul(sub(v, u), t)),
    th: u.th,
  });
  const [p, q] = [mix(a.p, at.p), mix(a.q, at.q)];
  const E = reverseEdge({ p, q, Rs }, a.E.s1);
  return E && { edge: a.edge, p, q, E: Rmax ? { ...E, Rmax } : E };
}

/** Both lanes of a pair around a centre line of the radius `Rc`, if they fit. */
function around(pair: Pair, Rc: number | null, Rmax?: number): [TwoArcEdge, TwoArcEdge] | null {
  const c = centre(pair, Rc, Rmax);
  const ea = c && besideAt(c, { p: pair.a.p, q: pair.a.q, against: false });
  const eb = c && besideAt(c, pair.at);
  return ea && eb ? [ea, eb] : null;
}

/** The largest radius of the centre line at which both lanes fit (bisection, the fit is monotone). */
function widest(pair: Pair): number | null {
  const open = centre(pair, null);
  if (!open) return null;
  const lo = RMIN + Math.max(pair.t, 1 - pair.t) * pair.D + SAME_PLACE_M;
  if (around(pair, open.E.Rmax)) return open.E.Rmax;
  if (!around(pair, lo)) return null;
  let [fits, over] = [lo, open.E.Rmax];
  for (let i = 0; i < 40; i++) {
    const m = (fits + over) / 2;
    if (around(pair, m)) fits = m;
    else over = m;
  }
  return fits;
}

/** The pair of two lanes beside each other and where the centre line between them is, from their radii (the smaller arc of each): a lane `x` from the centre has `Rc - |x|`. */
function pairOf(a: Lane, b: Lane): { pair: Pair; Rc: number | null } | null {
  const at = inDirectionOf(a, b);
  const D = Math.abs(dot(sub(at.p, a.p), perp(fromAngle(a.p.th))));
  const [ra, rb] = [a.edge.radius, b.edge.radius];
  if (D < SAME_PLACE_M) return null;
  const diff = ra != null && rb != null ? ra - rb : 0;
  if (Math.abs(diff) > D - SAME_PLACE_M) return null;
  const u = (D - diff) / 2;
  const Rc = ra != null ? ra + u : rb != null ? rb + (D - u) : null;
  return { pair: { a, at, t: ra == null && rb == null ? 0.5 : u / D, D }, Rc };
}

/** The curves of two lanes around the curve between them, at the radius their own radii give (at most the largest that fits). */
function around2(a: Lane, b: Lane): [TwoArcEdge, TwoArcEdge] | null {
  const found = pairOf(a, b);
  const Rmax = found && widest(found.pair);
  return found && Rmax ? around(found.pair, Math.min(found.Rc ?? Rmax, Rmax), Rmax) : null;
}

/**
 * Two lanes that touch at both ends and are not beside each other as a lane and the curve it
 * follows (the radii do not differ by a lane width) are the two lanes around one curve between
 * them: the smaller arcs are equal when the radii are (^828). An auto radius is the largest that
 * fits both, a stored one beside an auto one is shared by both, and a radius that is too big is
 * the largest that fits, as for a lone S-curve.
 */
function sharing({ g, lanes, shapes }: Context) {
  const list = [...lanes.values()];
  list.forEach((a, i) => {
    for (const b of list.slice(i + 1)) {
      const free = !shapes.has(a.edge.id) && !shapes.has(b.edge.id);
      const E = free && touching(g, a.edge, b.edge) ? around2(a, b) : null;
      if (!E) continue;
      shapes.set(a.edge.id, { ...E[0], auto: a.edge.radius == null });
      shapes.set(b.edge.id, { ...E[1], auto: b.edge.radius == null });
    }
  });
}

/**
 * The chains with the S-curves that run beside another one derived from it (^828): a lane that
 * touches another S-curve at both ends (^817) and whose radius is the smaller of the arcs of the
 * curve beside it moved by one lane width is that curve moved, not an S-curve of two equal arcs of
 * its own (^826, option c: the stored radius is the smaller one, the other arc follows the group).
 * So the curves are concentric, parallel (^334), and their inflection points are one tower (^819).
 * Only S-curves; the bigger radius is the one the others follow, so no lane follows a smaller one.
 */
export function withParallelS(g: Graph, chains: Chain[]): Chain[] {
  const lanes = lanesOf(g, chains);
  const shapes = new Map<number, TwoArcEdge>();
  if (lanes.size >= 2) {
    followers({ g, lanes, shapes, lenient: false });
    sharing({ g, lanes, shapes, lenient: false });
    followers({ g, lanes, shapes, lenient: true });
  }
  if (!shapes.size) return chains;
  return chains.map((c) => ({
    ...c,
    edges: c.edges.map((ref, i): EdgeRef => ({ ...ref, E: shapes.get(c.edgeIds[i]!) ?? ref.E })),
  }));
}
