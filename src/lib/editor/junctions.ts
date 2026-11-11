import { sameWay } from '../curves/tolerance';
import { edgesIn, nodeOf, widthOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { hullOf } from '../curves/hull';
import { LANE_WIDTH_M } from '../curves/lane';
import { unionOutline, type Loop } from '../curves/union';
import { crossAcross } from './corners';
import { curveOfEdge } from './chains';
import { hullPieces } from './surface';
import { boxesMeet } from '../curves/hull';
import { curvesOf } from './derived';
import { manoeuvreOf } from './manoeuvres';
import { towersOf } from './towers';

/**
 * A junction (^1005, ^1032): segments that cross, with all segments that start and end in the
 * towers those start or end in. Derived from the graph, never stored (^1003).
 */
export interface Junction {
  /** The segments inside the junction. */
  segments: number[];
  arms: Arm[];
  control: Control;
}

/**
 * An arm of a junction (^1035): the nodes on its edge that lead the same way out of it; a lane in
 * heads into the junction there, a lane out heads away. `direction` numbers the arms that go on
 * into each other (^1036); `lanes` is how many lanes it has at the junction, both ways together.
 */
export interface Arm {
  ins: GNode[];
  outs: GNode[];
  direction: number;
  lanes: number;
  /** Of the larger direction (major) or a smaller one (minor); null where all are as large (^1037). */
  role: 'major' | 'minor' | null;
  /** Its lanes in wait at a line: give way, or stop (^1038). */
  waits: 'give way' | 'stop' | null;
}

/** How a junction is ruled (^1037): decided by the lanes of its roads. `stop` is not given out yet. */
export type Control = 'right before left' | 'priority' | 'traffic lights' | 'stop';

type Curve = ReturnType<typeof curvesOf>[number];

/** Whether two segments cross: their curves meet at a place where they run across each other (not where they part or join at a node, or only touch, ^924). */
function crosses(a: Curve, b: Curve): boolean {
  if (!boxesMeet(a.box, b.box)) return false;
  return a.pieces.some((p) => b.pieces.some((q) => crossAcross(p, q).length > 0));
}

/** Sets that are joined as their members turn out to belong together. */
class Groups {
  private parent = new Map<number, number>();

  find(x: number): number {
    const p = this.parent.get(x) ?? x;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  join(a: number, b: number) {
    this.parent.set(this.find(a), this.find(b));
  }
}

/** The tower of every node, by number: a node in no tower is one of its own (^819). */
function towerNumbers(g: Graph): Map<number, number> {
  const of = new Map<number, number>();
  towersOf(g).forEach((t, i) => t.forEach((n) => of.set(n.id, i)));
  g.nodes.forEach((n, i) => {
    if (!of.has(n.id)) of.set(n.id, -1 - i);
  });
  return of;
}

/** The segments of each junction (^1032). */
function memberships(g: Graph): number[][] {
  const curves = curvesOf(g);
  const tower = towerNumbers(g);
  const towers = (e: GEdge) => [tower.get(e.start)!, tower.get(e.end)!];
  const groups = new Groups();
  const crossing = new Set<number>();
  curves.forEach((a, i) => {
    for (const b of curves.slice(i + 1)) {
      if (!crosses(a, b)) continue;
      groups.join(a.edge.id, b.edge.id);
      crossing.add(a.edge.id).add(b.edge.id);
    }
  });
  // Segments that cross and start or end in the same tower are one junction (^1005).
  const first = new Map<number, number>();
  for (const { edge } of curves.filter((c) => crossing.has(c.edge.id))) {
    for (const t of towers(edge)) {
      if (first.has(t)) groups.join(edge.id, first.get(t)!);
      else first.set(t, edge.id);
    }
  }
  // A segment that starts and ends in the towers of one junction is inside it, though it crosses nothing.
  const of = (t: number) => (first.has(t) ? groups.find(first.get(t)!) : null);
  const found = new Map<number, number[]>();
  for (const { edge } of curves) {
    const [s, e] = [of(tower.get(edge.start)!), of(tower.get(edge.end)!)];
    const root = crossing.has(edge.id) ? groups.find(edge.id) : s !== null && s === e ? s : null;
    if (root !== null) found.set(root, [...(found.get(root) ?? []), edge.id]);
  }
  return [...found.values()];
}

/** The way a node on the edge of a junction leads out of it: its heading if a segment of the junction ends there, the opposite if one starts there. */
const outward = (n: GNode, lane: 'in' | 'out') => ({ th: lane === 'in' ? n.th + Math.PI : n.th });

/** The arms of a junction (^1035), without roads and waiting yet. */
function armsOf(g: Graph, segments: GEdge[]): Arm[] {
  const arms: Arm[] = [];
  const seen = new Set<string>();
  const add = (id: number, lane: 'in' | 'out') => {
    const n = nodeOf(g, id);
    if (!n || seen.has(`${lane}${id}`)) return;
    seen.add(`${lane}${id}`);
    const way = outward(n, lane);
    const arm = arms.find((a) =>
      sameWay(way, outward(a.ins[0] ?? a.outs[0]!, a.ins[0] ? 'in' : 'out')),
    );
    const into: Arm = arm ?? {
      ins: [],
      outs: [],
      direction: arms.length,
      lanes: 0,
      role: null,
      waits: null,
    };
    (lane === 'in' ? into.ins : into.outs).push(n);
    if (!arm) arms.push(into);
  };
  for (const e of segments) {
    add(e.start, 'in');
    add(e.end, 'out');
  }
  for (const a of arms) a.lanes = a.ins.length + a.outs.length;
  return arms;
}

/** Arms that a segment of the junction goes on between without a turn are one direction (^1036): they get one number. */
function joinDirections(g: Graph, segments: GEdge[], arms: Arm[]) {
  const armOf = (id: number, lane: 'ins' | 'outs') =>
    arms.find((a) => a[lane].some((n) => n.id === id));
  for (const e of segments) {
    const m = manoeuvreOf(g, e);
    const [from, to] = [armOf(e.start, 'ins'), armOf(e.end, 'outs')];
    if (!from || !to || m === 'left turn' || m === 'right turn' || m === 'u-turn') continue;
    const [keep, drop] = [from.direction, to.direction];
    for (const a of arms) if (a.direction === drop) a.direction = keep;
  }
}

/** The most lanes an arm of each direction has (^1036). */
function lanesOfDirections(arms: Arm[]): Map<number, number> {
  const lanes = new Map<number, number>();
  for (const a of arms) lanes.set(a.direction, Math.max(lanes.get(a.direction) ?? 0, a.lanes));
  return lanes;
}

/** Lanes of a 1+1 arm, or of one that is one-way with two lanes: a junction of directions as large as this is not wide (^1037). */
const NARROW_LANES = 2;

/** An arm that is small (^1037): at most one lane in and one out, so no turn lanes side by side. */
const isSmall = (a: Arm) => a.ins.length <= 1 && a.outs.length <= 1;

/**
 * How the junction is ruled, and which arms wait (^1037, ^1038). Directions as large as each
 * other (the lanes of both ways together): when that is a 1+1 or a one-way road, give way at
 * every arm, else traffic lights with a stop line at every arm. Else the larger direction is
 * major; if every arm of the others is small, the junction is *priority* (marked by the dashed lines
 * of the major direction, ^1048), else traffic lights.
 */
function rule(arms: Arm[]): Control {
  const lanes = lanesOfDirections(arms);
  const most = Math.max(...lanes.values());
  const tie = [...lanes.values()].every((n) => n === most);
  const lights = (waits: Arm['waits']) => {
    for (const a of arms) a.waits = waits;
    return waits === 'stop' ? 'traffic lights' : 'right before left';
  };
  if (tie) return lights(most <= NARROW_LANES ? 'give way' : 'stop');
  for (const a of arms) a.role = lanes.get(a.direction) === most ? 'major' : 'minor';
  if (arms.every((a) => a.role === 'major' || isSmall(a))) return 'priority';
  return lights('stop');
}

/** The junctions of a graph (^1005, ^1032), with their arms and how they are ruled. */
export function junctionsOf(g: Graph): Junction[] {
  const byId = new Map(g.edges.map((e) => [e.id, e]));
  return memberships(g).map((ids) => {
    const segments = ids.map((id) => byId.get(id)!);
    const arms = armsOf(g, segments);
    joinDirections(g, segments, arms);
    return { segments: ids, arms, control: rule(arms) };
  });
}

/** The lanes in of an arm: the stop node of each with the segment from outside that leads to it, where a line or an arrow can stand (^1038). */
export function lanesIn(g: Graph, j: Junction, arm: Arm): { node: GNode; from: GEdge }[] {
  const inside = new Set(j.segments);
  return arm.ins.flatMap((node) =>
    edgesIn(g, node.id)
      .filter((e) => !inside.has(e.id))
      .map((from) => ({ node, from })),
  );
}

/** How far the debug hull of a junction reaches beyond its segments, on each side (meters): half a lane (^1039). */
const HULL_PADDING_M = LANE_WIDTH_M / 2;

/** The outline round all segments of a junction with some padding (^1039), for the debug layer: where traffic lights would reach. */
export function junctionHull(g: Graph, j: Junction): Loop[] {
  const hulls = g.edges
    .filter((e) => j.segments.includes(e.id))
    .flatMap((e) => {
      const pieces = curveOfEdge(g, e.id)?.pieces;
      const hull = pieces && hullOf(pieces, widthOf(g, e) + 2 * HULL_PADDING_M);
      return hull ? [hullPieces(hull)] : [];
    });
  return unionOutline(hulls);
}

/** The junction a segment is in, if any. */
export const junctionOfSegment = (junctions: Junction[], id: number | null): Junction | null =>
  junctions.find((j) => id !== null && j.segments.includes(id)) ?? null;
