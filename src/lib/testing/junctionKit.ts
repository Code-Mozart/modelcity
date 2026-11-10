import { LANE_WIDTH_M } from '../curves/lane';
import { add, fromAngle, mul, type Vec } from '../curves/vec';
import { addEdge, addNode, emptyGraph, type Graph } from '../model/graph';

/**
 * A kit for drawing junctions as a graph, for the testing ground of the junctions (^984): arms
 * with lanes, joined lane by lane. Right-hand traffic; y is down, so the right of a heading `h`
 * is `(-sin h, cos h)`.
 */
export class Sketch {
  graph: Graph = emptyGraph();

  node(at: Vec, th: number): number {
    const r = addNode(this.graph, { x: at.x, y: at.y, th });
    this.graph = r.graph;
    return r.id;
  }

  edge(from: number, to: number) {
    this.graph = addEdge(this.graph, from, to, null);
  }

  /** Nodes joined in a row. */
  chain(ids: number[]) {
    ids.slice(1).forEach((id, i) => this.edge(ids[i]!, id));
  }
}

const W = LANE_WIDTH_M;
export const rightOf = (h: number): Vec => ({ x: -Math.sin(h), y: Math.cos(h) });

/** A point `along` meters down a heading from `from` and `side` meters to its right. */
export const place = (from: Vec, h: number, along: number, side: number): Vec =>
  add(add(from, mul(fromAngle(h), along)), mul(rightOf(h), side));

/** An arm of a junction: `angle` points away from the center. */
export interface ArmSpec {
  angle: number;
  /** Lanes towards the junction that go straight on (or turn, without a pocket). */
  in: number;
  /** Lanes away from the junction. */
  out: number;
  /** A lane only for turning left, on the inside of the lanes in, that begins shortly before the junction. */
  pocket?: boolean;
  /** The lanes out begin one lane further out, opposite an arm with a pocket, and come back in. */
  outShift?: boolean;
}

/** The nodes of an arm at the junction, innermost lane first. */
export interface Arm {
  spec: ArmSpec;
  ins: number[];
  outs: number[];
}

/** How far the taper of a pocket and the straight before it reach (meters). */
const TAPER_M = 25;
const FAR_M = 55;

/** The lanes towards the junction of an arm: from the far end to the stop node, with the pocket splitting off the inner lane. */
function lanesIn(s: Sketch, c: Vec, spec: ArmSpec, d: number): number[] {
  const h = spec.angle + Math.PI;
  const at = (dist: number, side: number) => s.node(place(c, h, -dist, side), h);
  const shift = spec.pocket ? W : 0;
  const stops: number[] = [];
  for (let i = 0; i < spec.in; i++) {
    const side = W / 2 + W * i;
    const far = at(d + FAR_M + TAPER_M, side);
    const stop = at(d, side + shift);
    if (!spec.pocket) s.chain([far, stop]);
    else {
      const split = at(d + 2 * TAPER_M, side);
      s.chain([far, split, at(d + TAPER_M, side + shift), stop]);
      if (i === 0) {
        const pocket = at(d, side);
        s.edge(split, pocket);
        stops.push(pocket);
      }
    }
    stops.push(stop);
  }
  return stops;
}

/** The lanes away from the junction of an arm. */
function lanesOut(s: Sketch, c: Vec, spec: ArmSpec, d: number): number[] {
  const h = spec.angle;
  const at = (dist: number, side: number) => s.node(place(c, h, dist, side), h);
  const shift = spec.outShift ? W : 0;
  const stops: number[] = [];
  for (let i = 0; i < spec.out; i++) {
    const side = W / 2 + W * i;
    const stop = at(d, side + shift);
    const far = at(d + FAR_M + TAPER_M, side);
    if (!spec.outShift) s.chain([stop, far]);
    else s.chain([stop, at(d + TAPER_M, side + shift), at(d + 2 * TAPER_M, side), far]);
    stops.push(stop);
  }
  return stops;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const TURN = 0.35;

/** The lanes of `a` joined to the lanes of `b`: left from the innermost, right from the outermost, straight on lane by lane. */
function join(s: Sketch, a: Arm, b: Arm) {
  if (!a.ins.length || !b.outs.length) return;
  const turn = wrap(b.spec.angle - (a.spec.angle + Math.PI));
  if (turn < -TURN) return s.edge(a.ins[0]!, b.outs[0]!);
  if (turn > TURN) return s.edge(a.ins.at(-1)!, b.outs.at(-1)!);
  const through = a.spec.pocket ? a.ins.slice(1) : a.ins;
  through.slice(0, b.outs.length).forEach((id, i) => s.edge(id, b.outs[i]!));
}

/** The widest half of the arms (meters), and with it how far from the center the lanes stop. */
function reach(arms: ArmSpec[]): number {
  const half = (a: ArmSpec) =>
    W * Math.max(a.in + (a.pocket ? 1 : 0), a.out + (a.outShift ? 1 : 0));
  return Math.max(...arms.map(half)) + W;
}

/** A junction at `c`: its arms, and every lane in joined to the lanes out of the other arms. `stop` is how far from the center the lanes stop, if not the width of the widest arm. */
export function junction(s: Sketch, c: Vec, specs: ArmSpec[], stop?: number): Arm[] {
  const d = stop ?? reach(specs);
  const arms = specs.map((spec) => ({
    spec,
    ins: lanesIn(s, c, spec, d),
    outs: lanesOut(s, c, spec, d),
  }));
  for (const a of arms) for (const b of arms) if (a !== b) join(s, a, b);
  return arms;
}

/** A straight lane along the axis through `c` with the heading `h`: from `span[0]` to `span[1]` meters along it, `side` meters to its right. */
export function lane(
  s: Sketch,
  axis: { c: Vec; h: number },
  span: [number, number],
  side = 0,
): number[] {
  const ids = span.map((along) => s.node(place(axis.c, axis.h, along, side), axis.h));
  s.chain(ids);
  return ids;
}

/**
 * A roundabout at `c` with one lane of radius `r` and 1+1 arms at the angles: traffic runs
 * counter-clockwise on the screen (the angle falls). Each arm enters `gap` radians after its
 * axis and leaves `gap` before it.
 */
export function roundabout(s: Sketch, c: Vec, r: number, angles: number[]) {
  const gap = 0.5;
  const ring = (a: number) => s.node(add(c, mul(fromAngle(a), r)), a - Math.PI / 2);
  const stops = [...angles]
    .sort((a, b) => b - a)
    .map((a) => ({ a, exit: ring(a + gap), entry: ring(a - gap) }));
  stops.forEach((stop, i) => {
    const next = stops[(i + 1) % stops.length]!;
    s.edge(stop.exit, stop.entry);
    s.edge(stop.entry, next.exit);
    const far = r + FAR_M;
    s.edge(s.node(place(c, stop.a + Math.PI, -far, W / 2), stop.a + Math.PI), stop.entry);
    s.edge(stop.exit, s.node(place(c, stop.a, far, W / 2), stop.a));
  });
}
