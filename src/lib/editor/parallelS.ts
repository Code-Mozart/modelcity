import { LANE_WIDTH_M } from '../curves/lane';
import { RMIN } from '../curves/radius';
import { reverseEdge, twoRadiiEdge } from '../curves/reverse';
import { SAME_PLACE_M, SAME_RADIUS_M } from '../curves/tolerance';
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
    if (E && (takes || Math.abs(E.R - valueOf(b)) <= SAME_RADIUS_M))
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

/** Where a lane of a group is: its nodes in the direction of the first lane, and how far it is from it (to the right of that way). */
interface Member {
  lane: Lane;
  at: Place;
  x: number;
}

/** Lanes that touch one another in a row, the first one and the others seen in its direction. */
interface Group {
  members: Member[];
  /** The member farthest from the first, and the centre line between them (as a part of the way to it). */
  far: Member;
  t: number;
}

/** The members of a group around a centre line `c` (offsets from the first lane), as one lane of its own with the radius `Rs` (null: the widest). */
function centre({ members, far, t }: Group, Rs: number | null, Rmax?: number): Lane | null {
  const first = members[0]!;
  const mix = (u: PathNode, v: PathNode): PathNode => ({
    ...add(u, mul(sub(v, u), t)),
    th: u.th,
  });
  const [p, q] = [mix(first.lane.p, far.at.p), mix(first.lane.q, far.at.q)];
  const E = reverseEdge({ p, q, Rs }, first.lane.E.s1);
  return E && { edge: first.lane.edge, p, q, E: Rmax ? { ...E, Rmax } : E };
}

/** The curves of all the lanes of a group around a centre line of the radius `Rc`, if they all fit. */
function around(group: Group, Rc: number | null, Rmax?: number): Map<number, TwoArcEdge> | null {
  const c = centre(group, Rc, Rmax);
  const shapes = new Map<number, TwoArcEdge>();
  for (const m of group.members) {
    const E = c && besideAt(c, m.at);
    if (!E) return null;
    shapes.set(m.lane.edge.id, E);
  }
  return shapes;
}

/** The farthest a lane of the group is from the centre line, as a distance. */
const reach = ({ members, far, t }: Group) =>
  Math.max(...members.map((m) => Math.abs(m.x - t * far.x)));

/** The largest radius of the centre line at which all the lanes fit (bisection, the fit is monotone). */
function widest(group: Group): number | null {
  const open = centre(group, null);
  if (!open) return null;
  if (around(group, open.E.Rmax)) return open.E.Rmax;
  const lo = RMIN + reach(group) + SAME_PLACE_M;
  if (!around(group, lo)) return null;
  let [fits, over] = [lo, open.E.Rmax];
  for (let i = 0; i < 40; i++) {
    const m = (fits + over) / 2;
    if (around(group, m)) fits = m;
    else over = m;
  }
  return fits;
}

/** The lanes of `from` that touch `lane`, with their places in the direction of the first lane. */
function membersOf(g: Graph, from: Lane[]): Member[] {
  const first = from[0]!;
  const dir = perp(fromAngle(first.p.th));
  const members: Member[] = [{ lane: first, at: { p: first.p, q: first.q, against: false }, x: 0 }];
  for (const m of members) {
    for (const lane of from) {
      if (members.some((o) => o.lane === lane) || !touching(g, m.lane.edge, lane.edge)) continue;
      const placed = { ...m.lane, p: m.at.p, q: m.at.q };
      const at = inDirectionOf(placed, lane);
      members.push({ lane, at, x: dot(sub(at.p, first.p), dir) });
    }
  }
  return members;
}

/**
 * Where the centre line is and its radius, from the stored radii: a lane at the distance `x`
 * from it has the smaller arc `Rc - |x|` (^828). Null if the stored radii do not fit that.
 * Without a stored radius the centre line is in the middle and as wide as can be; with one
 * it is in the middle and the others share the radius; with more it is where they say, and if
 * they only go up (or down) the biggest lane is the centre line and the biggest one in the group.
 */
function centreOf(members: Member[]): { c: number; Rc: number | null } | null {
  const xs = members.map((m) => m.x);
  const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
  const stored = members.filter((m) => m.lane.edge.radius != null).sort((u, v) => u.x - v.x);
  const [a, b] = [stored[0], stored[stored.length - 1]];
  if (!a || !b) return { c: (lo + hi) / 2, Rc: null };
  const mid = (lo + hi) / 2;
  const raw = a === b ? mid : (a.x + b.x - (a.lane.edge.radius! - b.lane.edge.radius!)) / 2;
  const c =
    raw <= a.x + SAME_RADIUS_M && a !== b ? lo : raw >= b.x - SAME_RADIUS_M && a !== b ? hi : raw;
  const Rc = a.lane.edge.radius! + Math.abs(a.x - c);
  const tent = stored.every(
    (m) => Math.abs(Rc - Math.abs(m.x - c) - m.lane.edge.radius!) < SAME_RADIUS_M,
  );
  return tent ? { c, Rc } : null;
}

/** The curves of a row of lanes that touch, around one centre line, at the radius their own radii give (at most the largest that fits). */
function groupShapes(g: Graph, from: Lane[]): Map<number, TwoArcEdge> | null {
  const members = membersOf(g, from);
  const found = members.length > 1 ? centreOf(members) : null;
  const far = members.reduce((u, v) => (Math.abs(v.x) > Math.abs(u.x) ? v : u));
  const group = found && { members, far, t: found.c / far.x };
  const Rmax = group && widest(group);
  return group && Rmax ? around(group, Math.min(found.Rc ?? Rmax, Rmax), Rmax) : null;
}

/**
 * Lanes that touch one another and are not beside each other as a lane and the curve it follows
 * are the lanes around one curve between or among them (^851): the smaller arcs are equal when
 * the radii are (also both automatic), an auto radius is the largest that fits all, a stored one
 * beside an auto one is shared by all, and radii that are too big for the group are cut down
 * together, as for a lone S-curve (^854, any number of lanes).
 */
function sharing({ g, lanes, shapes }: Context) {
  const left = [...lanes.values()].filter((l) => !shapes.has(l.edge.id));
  while (left.length > 1) {
    const found = groupShapes(g, left);
    const done = [...(found?.keys() ?? [])];
    for (const [id, E] of found ?? []) {
      shapes.set(id, { ...E, auto: lanes.get(id)!.edge.radius == null });
    }
    // The lanes of the row are done; if there was none, drop the first lane and look again.
    const gone = done.length ? done : [left[0]!.edge.id];
    for (const id of gone)
      left.splice(
        left.findIndex((l) => l.edge.id === id),
        1,
      );
  }
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
