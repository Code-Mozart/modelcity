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
import { insideLoops, type Loop } from '../curves/union';
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
import { crossPieces } from '../snap/geometry';
import { curveOfEdge } from './chains';
import type { EdgeHull } from './corners';
import { originalOf } from './derived';
import { hullPieces } from './surface';
import { walk, type LaneChange } from './laneChanges';
import type { Marking } from './markings';
import { parallel } from './parallel';

/**
 * The radius of the circle that fits in a gore where it ends (meters, half a lane; ^1065,
 * assumed): the gore is filled up to the place where a circle of this radius touches both of its
 * sides, and closed by the arc of that circle.
 */
export const GORE_RADIUS_M = LANE_WIDTH_M / 2;
/** The distance of the chevrons along a gore, and how far their arms reach along it (meters). */
const CHEVRON_STEP_M = 3;
const CHEVRON_ARM_M = GORE_RADIUS_M;
/** The steps in which a gore is looked at to find where it ends (meters). */
const SCAN_M = 0.25;

/**
 * The surface and the markings a gore between two lanes gets (^1065): the loop of the added
 * surface (the notch between the lanes, up to the circle of `GORE_RADIUS_M`), a solid line round
 * it and chevrons whose apex points against the traffic.
 */
export interface Gore {
  loop: Loop;
  markings: Marking[];
}

type Way = 'out' | 'in';

const edgesOf = (d: Graph, n: GNode, way: Way) =>
  way === 'out' ? edgesOut(d, n.id) : edgesIn(d, n.id);
const farNode = (d: Graph, e: GEdge, way: Way) => nodeOf(d, way === 'out' ? e.end : e.start);

/** The nodes where the lanes of a pair of tower nodes stop being parallel, going on (`out`) or back (`in`). */
function stretchEnd(
  d: Graph,
  pair: [GNode, GNode],
  way: Way,
): { nodes: [GNode, GNode]; lanes: GEdge[] } {
  let [x, y] = pair;
  const [seen, lanes] = [new Set<number>(), [] as GEdge[]];
  for (;;) {
    const step = edgesOf(d, x, way).flatMap((ex) =>
      edgesOf(d, y, way)
        .filter((ey) => parallel(d, ex, ey))
        .map((ey) => [ex, ey] as const),
    )[0];
    const next = step && [farNode(d, step[0], way), farNode(d, step[1], way)];
    if (!next?.[0] || !next[1] || seen.has(next[0].id)) return { nodes: [x, y], lanes };
    seen.add(next[0].id);
    lanes.push(...(step ?? []));
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

/** Where a gore ends: how far along its first side (meters), and the centre of the circle that closes it. */
interface GoreEnd {
  s: number;
  centre: Vec;
}

/**
 * Where the circle of `GORE_RADIUS_M` that touches both sides touches the first one, by looking
 * along it and halving; null if the lanes end before they are that far apart (within the one
 * tolerance for places, ^865): then there is no gore, only a sliver.
 */
function endOfGore(first: Piece[], second: Piece[]): GoreEnd | null {
  const centreAt = (s: number): Vec => {
    const p = alongLoop(first, s)!;
    const toSecond = sub(nearestPoint(second, p), p);
    const n = perp({ x: p.tx, y: p.ty });
    const side = n.x * toSecond.x + n.y * toSecond.y >= 0 ? 1 : -1;
    return add(p, mul(n, side * GORE_RADIUS_M));
  };
  const reaches = (s: number) => {
    const [p, c] = [alongLoop(first, s)!, centreAt(s)];
    // The circle is between the sides, not beyond the second one, when they are more than its radius apart.
    const between = dist(p, nearestPoint(second, p)) > GORE_RADIUS_M;
    return between && dist(c, nearestPoint(second, c)) >= GORE_RADIUS_M - SAME_PLACE_M;
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

/** The closed loop of the gore: along the first side, round the circle, back along the second. */
function loopOf(first: Piece[], second: Piece[], end: GoreEnd): Loop {
  const along = between(first, 0, end.s);
  const touch = nearestPoint(second, end.centre);
  const back = between(second, 0, lengthTo(second, touch)).map(reversePiece).reverse();
  const [from, to] = [along.at(-1)!.Q, back[0]!.P];
  const turn =
    mod(angleOf(sub(to, end.centre)) - angleOf(sub(from, end.centre)) + Math.PI, TAU) - Math.PI;
  const arc = arcAround({ c: end.centre, r: GORE_RADIUS_M }, from, to, turn);
  const loop = [...along, arc, ...back];
  const [first0, last] = [loop[0]!, loop.length - 1];
  loop[last] = { ...loop[last]!, Q: first0.P } as Piece;
  return loop;
}

/** The chevrons in a gore: their apex against the traffic, their arms open the way the traffic goes (^1065). */
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

/** The places in a gore to look at for something in the way: across it every half meter, at a quarter, a half and three quarters. */
function samples(first: Piece[], second: Piece[], reach: number): Vec[] {
  const found: Vec[] = [];
  for (let s = SCAN_M; s < reach; s += 2 * SCAN_M) {
    const p = alongLoop(first, s)!;
    const q = nearestPoint(second, p);
    for (const t of [0.25, 0.5, 0.75]) found.push(add(p, mul(sub(q, p), t)));
  }
  return found;
}

/** Whether another hull is in the gore: its outline crosses the gore's, or it covers a place in it. */
function covers(h: EdgeHull, loop: Loop, places: Vec[]): boolean {
  const outline = hullPieces(h.hull);
  const crossing = loop.some((p) => outline.some((q) => crossPieces(p, q).length > 0));
  const mine = places.filter(
    (p) => p.x >= h.box.x0 && p.x <= h.box.x1 && p.y >= h.box.y0 && p.y <= h.box.y1,
  );
  return crossing || mine.some((p) => insideLoops([outline], p));
}

/** Whether another lane or road than the lanes of the gore is in it, in the way (^1065). */
function inTheWay(hulls: EdgeHull[], own: Set<number>, loop: Loop, places: Vec[]): boolean {
  return hulls.filter((h) => !own.has(h.edge)).some((h) => covers(h, loop, places));
}

/** Whether the node `a` is to the left of the node `b`, seen along the heading of `b`. */
const isLeftOf = (a: GNode, b: GNode) =>
  (a.x - b.x) * -Math.sin(b.th) + (a.y - b.y) * Math.cos(b.th) < 0;

/** The side of the node `b` the node `a` is on. */
const sideOf = (a: GNode, b: GNode): 'left' | 'right' => (isLeftOf(a, b) ? 'left' : 'right');

/** The two facing sides of the lanes that part at the end of a stretch, and the segments of the graph that are those lanes. */
function sidesOf(d: Graph, [x, y]: [GNode, GNode], way: Way) {
  const [ox, oy] = [edgesOf(d, x, way), edgesOf(d, y, way)];
  if (ox.length !== 1 || oy.length !== 1 || parallel(d, ox[0]!, oy[0]!)) return null;
  const lane = (e: GEdge) => walk(d, e, way).at(-1)!.edges;
  const [laneX, laneY] = [lane(ox[0]!), lane(oy[0]!)];
  return {
    first: facingEdge(d, laneX, sideOf(y, x), way),
    second: facingEdge(d, laneY, sideOf(x, y), way),
    own: new Set([...laneX, ...laneY].map(originalOf)),
  };
}

/** The loop of the gore between two sides and where it ends, if the circle fits. */
function closedGore(first: Piece[], second: Piece[]): { loop: Loop; end: GoreEnd } | null {
  const end = first.length && second.length ? endOfGore(first, second) : null;
  return end && { loop: loopOf(first, second, end), end };
}

/** The gore at the end of the parallel stretch of a lane change, where the two lanes part (an extension) or have come from (a merge); null where they do not part in two, or where another lane is in the way (^1065). */
function goreOf(d: Graph, c: LaneChange, hulls: EdgeHull[]): Gore | null {
  const way: Way = c.kind === 'extension' ? 'out' : 'in';
  const stretch = stretchEnd(d, [c.from, c.beside], way);
  const sides = sidesOf(d, stretch.nodes, way);
  const closed = sides && closedGore(sides.first, sides.second);
  if (!sides || !closed) return null;
  const { loop, end } = closed;
  const own = new Set([
    ...sides.own,
    ...[...stretch.lanes, ...c.shifting, ...c.going].map(originalOf),
  ]);
  if (inTheWay(hulls, own, loop, samples(sides.first, sides.second, end.s))) return null;
  return {
    loop,
    markings: [{ kind: 'solid', pieces: loop }, ...chevrons(sides.first, sides.second, end.s, way)],
  };
}

/** The gores of a graph with its derived nodes in it: one at each end of the parallel stretch of an extension or a merge (^1065). */
export function goresOf(d: Graph, changes: LaneChange[], hulls: EdgeHull[]): Gore[] {
  const found = new Map<string, Gore>();
  for (const c of changes) {
    const w = goreOf(d, c, hulls);
    if (w)
      found.set(
        `${pieceLength(w.loop[0]!).toFixed(3)}:${w.loop[0]!.P.x.toFixed(3)},${w.loop[0]!.P.y.toFixed(3)}`,
        w,
      );
  }
  return [...found.values()];
}
