import { alongLoop, between, lengthTo, loopLength } from '../curves/along';
import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M } from '../curves/tolerance';
import { offsetPiece } from '../curves/offset';
import {
  arcAround,
  isDegenerate,
  line,
  nearestParam,
  pieceLength,
  pointOn,
  reversePiece,
} from '../curves/piece';
import type { Piece } from '../curves/types';
import type { Loop } from '../curves/union';
import { add, angleOf, dist, mod, mul, perp, sub, TAU, type Vec } from '../curves/vec';
import {
  edgesIn,
  edgesOut,
  nodeOf,
  widthOf,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
import { curveOfEdge } from './chains';
import { walk, type LaneChange } from './laneChanges';
import type { Marking } from './markings';
import { parallel } from './parallel';

/**
 * The radius of the circle that fits in a wedge where it ends (meters, half a lane; ^1065,
 * assumed): the wedge is filled up to the place where a circle of this radius touches both of its
 * sides, and closed by the arc of that circle.
 */
export const WEDGE_RADIUS_M = LANE_WIDTH_M / 2;
/** The distance of the chevrons along a wedge, and how far their arms reach along it (meters). */
const CHEVRON_STEP_M = 3;
const CHEVRON_ARM_M = WEDGE_RADIUS_M;
/** The steps in which a wedge is looked at to find where it ends (meters). */
const SCAN_M = 0.25;

/**
 * The surface and the markings a wedge between two lanes gets (^1065): the loop of the added
 * surface (the notch between the lanes, up to the circle of `WEDGE_RADIUS_M`), a solid line round
 * it and chevrons whose apex points against the traffic.
 */
export interface Wedge {
  loop: Loop;
  markings: Marking[];
}

type Way = 'out' | 'in';

const edgesOf = (d: Graph, n: GNode, way: Way) =>
  way === 'out' ? edgesOut(d, n.id) : edgesIn(d, n.id);
const farNode = (d: Graph, e: GEdge, way: Way) => nodeOf(d, way === 'out' ? e.end : e.start);

/** The nodes where the lanes of a pair of tower nodes stop being parallel, going on (`out`) or back (`in`). */
function stretchEnd(d: Graph, pair: [GNode, GNode], way: Way): [GNode, GNode] {
  let [x, y] = pair;
  const seen = new Set<number>();
  for (;;) {
    const step = edgesOf(d, x, way).flatMap((ex) =>
      edgesOf(d, y, way)
        .filter((ey) => parallel(d, ex, ey))
        .map((ey) => [ex, ey] as const),
    )[0];
    const next = step && [farNode(d, step[0], way), farNode(d, step[1], way)];
    if (!next?.[0] || !next[1] || seen.has(next[0].id)) return [x, y];
    seen.add(next[0].id);
    [x, y] = [next[0], next[1]];
  }
}

/** The side of a lane (the segments of it, from the tip on) facing the other lane of the pair, as a curve running away from the tip. */
function facingEdge(d: Graph, lane: GEdge[], towards: 'left' | 'right', way: Way): Piece[] {
  return lane.flatMap((e) => {
    const pieces = (curveOfEdge(d, e.id)?.pieces ?? []).filter((p) => !isDegenerate(p));
    const h = (towards === 'right' ? 1 : -1) * (widthOf(d, e) / 2);
    const moved = pieces.map((p) => offsetPiece(p, h)).filter((p) => p !== null) as Piece[];
    return way === 'out' ? moved : moved.map(reversePiece).reverse();
  });
}

const nearestPoint = (curve: Piece[], p: Vec): Vec => {
  let best: Vec = curve[0]!.P;
  for (const piece of curve) {
    const q = pointOn(piece, nearestParam(piece, p));
    if (dist(q, p) < dist(best, p)) best = { x: q.x, y: q.y };
  }
  return best;
};

/** Where a wedge ends: how far along its first side (meters), and the centre of the circle that closes it. */
interface WedgeEnd {
  s: number;
  centre: Vec;
}

/**
 * Where the circle of `WEDGE_RADIUS_M` that touches both sides touches the first one, by looking
 * along it and halving; null if the lanes end before they are that far apart (within the one
 * tolerance for places, ^865): then there is no wedge, only a sliver.
 */
function endOfWedge(first: Piece[], second: Piece[]): WedgeEnd | null {
  const centreAt = (s: number): Vec => {
    const p = alongLoop(first, s)!;
    const toSecond = sub(nearestPoint(second, p), p);
    const n = perp({ x: p.tx, y: p.ty });
    const side = n.x * toSecond.x + n.y * toSecond.y >= 0 ? 1 : -1;
    return add(p, mul(n, side * WEDGE_RADIUS_M));
  };
  const reaches = (s: number) => {
    const [p, c] = [alongLoop(first, s)!, centreAt(s)];
    // The circle is between the sides, not beyond the second one, when they are more than its radius apart.
    const between = dist(p, nearestPoint(second, p)) > WEDGE_RADIUS_M;
    return between && dist(c, nearestPoint(second, c)) >= WEDGE_RADIUS_M - SAME_PLACE_M;
  };
  const total = loopLength(first);
  const looks = Array.from({ length: Math.floor(total / SCAN_M) }, (_, i) => (i + 1) * SCAN_M);
  // Not exactly the end: past it a loop starts again.
  for (const s of [...looks, total - 1e-6]) {
    if (!reaches(s)) continue;
    let [lo, hi] = [Math.max(0, s - SCAN_M), s];
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (reaches(m)) hi = m;
      else lo = m;
    }
    return { s: hi, centre: centreAt(hi) };
  }
  return null;
}

/** The closed loop of the wedge: along the first side, round the circle, back along the second. */
function loopOf(first: Piece[], second: Piece[], end: WedgeEnd): Loop {
  const along = between(first, 0, end.s);
  const touch = nearestPoint(second, end.centre);
  const back = between(second, 0, lengthTo(second, touch)).map(reversePiece).reverse();
  const [from, to] = [along.at(-1)!.Q, back[0]!.P];
  const turn =
    mod(angleOf(sub(to, end.centre)) - angleOf(sub(from, end.centre)) + Math.PI, TAU) - Math.PI;
  const arc = arcAround({ c: end.centre, r: WEDGE_RADIUS_M }, from, to, turn);
  const loop = [...along, arc, ...back];
  const [first0, last] = [loop[0]!, loop.length - 1];
  loop[last] = { ...loop[last]!, Q: first0.P } as Piece;
  return loop;
}

/** The chevrons in a wedge: their apex against the traffic, their arms open the way the traffic goes (^1065). */
function chevrons(first: Piece[], second: Piece[], reach: number, way: Way): Marking[] {
  const arm = CHEVRON_ARM_M;
  const [lo, hi] = way === 'out' ? [0.5, reach - arm] : [arm + 0.5, reach - arm];
  const found: Marking[] = [];
  for (let s = lo; s <= hi; s += CHEVRON_STEP_M) {
    const at = (t: number) => {
      const p = alongLoop(first, t)!;
      return { p: { x: p.x, y: p.y }, q: nearestPoint(second, p) };
    };
    const [apex, tail] = [at(s), at(way === 'out' ? s + arm : s - arm)];
    const middle = mul(add(apex.p, apex.q), 0.5);
    found.push({ kind: 'solid', pieces: [line(tail.p, middle), line(middle, tail.q)] });
  }
  return found;
}

/** The wedge at the end of the parallel stretch of a lane change, where the two lanes part (an extension) or have come from (a merge); null where they do not part in two. */
function wedgeOf(d: Graph, c: LaneChange): Wedge | null {
  const way: Way = c.kind === 'extension' ? 'out' : 'in';
  const [x, y] = stretchEnd(d, [c.from, c.beside], way);
  const [ox, oy] = [edgesOf(d, x, way), edgesOf(d, y, way)];
  if (ox.length !== 1 || oy.length !== 1 || parallel(d, ox[0]!, oy[0]!)) return null;
  const left = (a: GNode, b: GNode) =>
    (a.x - b.x) * -Math.sin(b.th) + (a.y - b.y) * Math.cos(b.th) < 0;
  const lane = (e: GEdge) => walk(d, e, way).at(-1)!.edges;
  const first = facingEdge(d, lane(ox[0]!), left(y, x) ? 'left' : 'right', way);
  const second = facingEdge(d, lane(oy[0]!), left(x, y) ? 'left' : 'right', way);
  const end = first.length && second.length ? endOfWedge(first, second) : null;
  if (!end) return null;
  const loop = loopOf(first, second, end);
  return {
    loop,
    markings: [{ kind: 'solid', pieces: loop }, ...chevrons(first, second, end.s, way)],
  };
}

/** The wedges of a graph with its derived nodes in it: one at each end of the parallel stretch of an extension or a merge (^1065). */
export function wedgesOf(d: Graph, changes: LaneChange[]): Wedge[] {
  const found = new Map<string, Wedge>();
  for (const c of changes) {
    const w = wedgeOf(d, c);
    if (w)
      found.set(
        `${pieceLength(w.loop[0]!).toFixed(3)}:${w.loop[0]!.P.x.toFixed(3)},${w.loop[0]!.P.y.toFixed(3)}`,
        w,
      );
  }
  return [...found.values()];
}
