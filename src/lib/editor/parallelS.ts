import { LANE_WIDTH_M } from '../curves/lane';
import { RMIN } from '../curves/radius';
import { twoRadiiEdge } from '../curves/reverse';
import { SAME_PLACE_M } from '../curves/tolerance';
import type { Arc, Edge, MidLine, PathNode, TwoArcEdge } from '../curves/types';
import { dist, dot, fromAngle, mul, perp, type Vec } from '../curves/vec';
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

/**
 * The S-curve of the lane `b` if it is the curve of `a` moved sideways (^828): the same middle
 * line moved, the arcs concentric, with the radii `R - d` and `R + d`, so the one that turns inside
 * is the smaller. The lane's own nodes are its ends. Null if it does not fit.
 */
function beside(a: Lane, b: Lane): TwoArcEdge | null {
  const [arc1, arc2] = [arcOf(a.E, 1), arcOf(a.E, 3)];
  if (!arc1 || !arc2 || !a.E.mid) return null;
  const { p, q, against } = inDirectionOf(a, b);
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

/** The curve of the lane `b` if it is beside one of the lanes in `shapes` (their current curves, else their own) and its radius fits. */
function followed(g: Graph, lanes: Map<number, Lane>, shapes: Map<number, TwoArcEdge>, b: Lane) {
  for (const a of lanes.values()) {
    if (a.edge.id === b.edge.id || !touching(g, a.edge, b.edge)) continue;
    const E = beside({ ...a, E: shapes.get(a.edge.id) ?? a.E }, b);
    if (E && Math.abs(E.R - valueOf(b)) <= SAME_PLACE_M)
      return { ...E, auto: b.edge.radius == null };
  }
  return null;
}

/** The curves of the lanes that follow another one, found until no lane is left that does (a chain of lanes, in any order). */
function followers(g: Graph, lanes: Map<number, Lane>): Map<number, TwoArcEdge> {
  const shapes = new Map<number, TwoArcEdge>();
  for (let pass = 0, changed = true; changed && pass < lanes.size; pass++) {
    changed = false;
    for (const b of lanes.values()) {
      const E = shapes.has(b.edge.id) ? null : followed(g, lanes, shapes, b);
      if (E) shapes.set(b.edge.id, E);
      changed ||= E !== null;
    }
  }
  return shapes;
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
  const shapes = lanes.size < 2 ? new Map<number, TwoArcEdge>() : followers(g, lanes);
  if (!shapes.size) return chains;
  return chains.map((c) => ({
    ...c,
    edges: c.edges.map((ref, i): EdgeRef => ({ ...ref, E: shapes.get(c.edgeIds[i]!) ?? ref.E })),
  }));
}
