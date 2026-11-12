import { LANE_WIDTH_M } from '../curves/lane';
import { add, mul, type Vec } from '../curves/vec';
import { roundToMm, type Graph } from '../model/graph';
import type { GroundCase } from './junctionGround';
import { place, rightOf, Sketch } from './junctionKit';

/**
 * The testing ground of the small T-junctions (^1109): the happy path and the edge cases, one case
 * to a cell (^1109 to the end of `T_CASES`; `docs/junctions.md` says what each shows): other
 * angles and bends, stop nodes at other places, roads with nothing behind them, one-way arms, every
 * connection that can be missing, and junctions next to each other. A T is three arms, W and E of
 * the main road and a side road, each with a lane in and a lane out: numbered 0, 1 and 2. The
 * project file `docs/mocks/hat1109.json` is made from this (`tGround.test`).
 */
const [E, S, W] = [0, Math.PI / 2, Math.PI];
const CELL: Vec = { x: 260, y: 240 };
const COLUMNS = 7;
const cell = (n: number): Vec => ({
  x: (n % COLUMNS) * CELL.x,
  y: Math.floor(n / COLUMNS) * CELL.y,
});

/** How one T is drawn, and where it differs from the plain one. */
interface Options {
  /** The heading of the side road away from the junction (default south). */
  side?: number;
  /** Connections that are not there, as [arm of the lane in, arm of the lane out]. */
  skip?: [number, number][];
  /** Arms with a lane in only or a lane out only. */
  oneWay?: { arm: number; lane: 'in' | 'out' }[];
  /** Nothing behind the stop nodes: the road ends there. */
  bare?: boolean;
  /** How far the road reaches behind the stop nodes (meters). */
  behind?: number;
  /** The main road bends with this radius (positive: the side road is on the inside). */
  bend?: number;
  /** How far from the center the stop nodes of an arm are: lane in, lane out (default 6 m each). */
  stops?: Partial<Record<number, [number, number]>>;
  /** How far the side road is moved along the main road (meters). */
  shift?: number;
  /** A second T on the main road this far from the first (meters), joined to it. */
  next?: number;
}

/** One arm: where its lanes stop, and the heading away from the junction there. */
export interface Placed {
  at: Vec;
  h: number;
}

/** The three arms of a T at `c`, 6 m from it: the main road to the west and east, bent by `bend`, and the side road. */
function armsOf(c: Vec, o: Options): Placed[] {
  const bendAt = (east: boolean): Placed => {
    if (!o.bend) return { at: place(c, east ? E : W, 6, 0), h: east ? E : W };
    const [r, k] = [Math.abs(o.bend), Math.sign(o.bend)];
    const phi = 6 / r;
    const at = {
      x: c.x + (east ? 1 : -1) * r * Math.sin(phi),
      y: c.y + k * r * (1 - Math.cos(phi)),
    };
    return { at, h: east ? k * phi : W - k * phi };
  };
  const side = o.side ?? S;
  return [
    bendAt(false),
    bendAt(true),
    { at: place(add(c, { x: o.shift ?? 0, y: 0 }), side, 6, 0), h: side },
  ];
}

/** The nodes of the lanes of an arm: the lane in (heading into the junction) and the lane out, and the far ends of the roads behind them. */
export interface Lanes {
  in: number | null;
  out: number | null;
  inFar: number | null;
  outFar: number | null;
}

/** How the lanes of one arm are drawn. */
export interface ArmLanes {
  stop: [number, number];
  which: 'in' | 'out' | 'both';
  bare?: boolean;
  behind?: number;
}

export function lanesOf(s: Sketch, p: Placed, a: ArmLanes): Lanes {
  const inward = p.h + Math.PI;
  // `dist` meters out along the arm from where it is, on the right of a lane that runs the way `h`.
  const at = (dist: number, h: number) =>
    add(place(p.at, p.h, dist, 0), mul(rightOf(h), LANE_WIDTH_M / 2));
  const [{ stop, which }, length] = [a, a.behind ?? 60];
  const found: Lanes = { in: null, out: null, inFar: null, outFar: null };
  if (which !== 'out') {
    found.in = s.node(at(stop[0] - 6, inward), inward);
    if (!a.bare) {
      found.inFar = s.node(at(length, inward), inward);
      s.edge(found.inFar, found.in);
    }
  }
  if (which !== 'in') {
    found.out = s.node(at(stop[1] - 6, p.h), p.h);
    if (!a.bare) {
      found.outFar = s.node(at(length, p.h), p.h);
      s.edge(found.out, found.outFar);
    }
  }
  return found;
}

/** A T at `c` as the options say (^1109): its lanes. */
function t(s: Sketch, c: Vec, o: Options = {}): Lanes[] {
  const stops = (i: number): [number, number] => o.stops?.[i] ?? [6, 6];
  const lanes = armsOf(c, o).map((p, i) => {
    const way = o.oneWay?.find((w) => w.arm === i);
    return lanesOf(s, p, {
      stop: stops(i),
      which: way ? way.lane : 'both',
      bare: o.bare,
      behind: o.behind,
    });
  });
  lanes.forEach((from, i) =>
    lanes.forEach((to, j) => {
      const skipped = o.skip?.some(([a, b]) => a === i && b === j);
      if (i !== j && from.in !== null && to.out !== null && !skipped) s.edge(from.in, to.out);
    }),
  );
  return lanes;
}

/** Two T-junctions of one main road, `gap` meters apart, joined by their east and west arms. */
function pair(s: Sketch, c: Vec, gap: number, o: Options) {
  const [first, second] = [t(s, c, o), t(s, add(c, { x: gap, y: 0 }), o)];
  const [e, w] = [first[1]!, second[0]!];
  if (e.outFar !== null && w.inFar !== null) s.edge(e.outFar, w.inFar);
  if (w.outFar !== null && e.inFar !== null) s.edge(w.outFar, e.inFar);
}

/** A case of the ground: what it is, how it is drawn, and what it shows. */
interface Case {
  name: string;
  shows: string;
  options: Options;
}

const OW = (arm: number, lane: 'in' | 'out') => ({ arm, lane });
const cases: Case[] = [
  {
    name: 'T-junction, three 1+1 arms',
    shows: 'the plain T: two give-way lines, no arrows',
    options: {},
  },
  {
    name: 'T-junction with nothing behind the stop nodes',
    shows: 'a road that ends at the junction: nothing is drawn over the void',
    options: { bare: true },
  },
  {
    name: 'T-junction with short roads behind the stop nodes',
    shows: 'a line and an arrow need road behind the node: 2 m of it',
    options: { behind: 2 },
  },
  {
    name: 'T-junction, the lane out of the side road further away',
    shows: 'lanes in and out of one arm that do not touch',
    options: { stops: { 2: [6, 14] } },
  },
  {
    name: 'T-junction, the lane out of the east arm further away',
    shows: 'a main road with unequal stop nodes',
    options: { stops: { 1: [6, 13] } },
  },
  {
    name: 'T-junction, the side road moved 3 m east',
    shows: 'a side road that is not in the middle',
    options: { shift: 3 },
  },
  {
    name: 'T-junction, the side road at 45 degrees',
    shows: 'a T that is nearly a Y: the sides of the nodes',
    options: { side: Math.PI / 4 },
  },
  {
    name: 'T-junction, the side road at 120 degrees',
    shows: 'a side road that leans away',
    options: { side: (2 * Math.PI) / 3 },
  },
  {
    name: 'Y-junction, the main road to the west, two arms at 30 degrees',
    shows: 'a fork where no arm goes straight on',
    options: { side: Math.PI / 6 },
  },
  {
    name: 'T-junction on a bend, the side road on the inside',
    shows: 'headings that differ at every stop node (radius 60 m)',
    options: { bend: 60 },
  },
  {
    name: 'T-junction on a bend, the side road on the outside',
    shows: 'the same bent the other way',
    options: { bend: -60 },
  },
  {
    name: 'T-junction on a tight bend',
    shows: 'a main road that turns 22 degrees on each side of the junction (radius 25 m)',
    options: { bend: 25 },
  },
  {
    name: 'T-junction, the main road one way',
    shows: 'lanes in on one side, lanes out on the other',
    options: { oneWay: [OW(0, 'in'), OW(1, 'out')] },
  },
  {
    name: 'T-junction, the side road one way in',
    shows: 'an arm that only brings traffic',
    options: { oneWay: [OW(2, 'in')] },
  },
  {
    name: 'T-junction, the side road one way out',
    shows: 'an arm that only takes traffic away',
    options: { oneWay: [OW(2, 'out')] },
  },
  {
    name: 'T-junction, main road and side road one way',
    shows: 'every arm a single lane',
    options: { oneWay: [OW(0, 'in'), OW(1, 'out'), OW(2, 'in')] },
  },
  {
    name: 'T-junction without west to east',
    shows: 'the west lane cannot go straight: a right arrow',
    options: { skip: [[0, 1]] },
  },
  {
    name: 'T-junction without west to the side road',
    shows: 'the west lane cannot turn right: a straight arrow',
    options: { skip: [[0, 2]] },
  },
  {
    name: 'T-junction without east to west',
    shows: 'the east lane cannot go straight: a left arrow',
    options: { skip: [[1, 0]] },
  },
  {
    name: 'T-junction without east to the side road',
    shows: 'the east lane cannot turn left: a straight arrow',
    options: { skip: [[1, 2]] },
  },
  {
    name: 'T-junction without side road to west',
    shows: 'the side road cannot turn left: a right arrow',
    options: { skip: [[2, 0]] },
  },
  {
    name: 'T-junction without side road to east',
    shows: 'the side road cannot turn right: a left arrow',
    options: { skip: [[2, 1]] },
  },
  {
    name: 'T-junction where the west lane leads nowhere',
    shows: 'a lane in with no connection at all: no arrow, nothing to show',
    options: {
      skip: [
        [0, 1],
        [0, 2],
      ],
    },
  },
  {
    name: 'T-junction where the east lane leads nowhere',
    shows: 'the same for the other arm of the main road',
    options: {
      skip: [
        [1, 0],
        [1, 2],
      ],
    },
  },
  {
    name: 'T-junction where the side road leads nowhere',
    shows: 'the same for the side road',
    options: {
      skip: [
        [2, 0],
        [2, 1],
      ],
    },
  },
  {
    name: 'T-junction without the side road turns right and the east lane turns left',
    shows: 'two connections missing at two arms',
    options: {
      skip: [
        [2, 1],
        [1, 2],
      ],
    },
  },
  {
    name: 'Two T-junctions 34 m apart on one road, joined',
    shows: 'two junctions near each other: each reads only its own lanes',
    options: { next: 34, behind: 5 },
  },
  {
    name: 'T-junction, a bend and an angle',
    shows: 'the two edge cases at once: on a bend, side road at 60 degrees',
    options: { bend: 60, side: Math.PI / 3 },
  },
  {
    name: 'T-junction, a bare T with a missing turn',
    shows: 'a lane that needs an arrow but has no road behind it: none is drawn',
    options: { bare: true, skip: [[2, 1]] },
  },
  {
    name: 'T-junction with an extra-wide stop distance',
    shows: 'long junction segments: all stop nodes 12 m out',
    options: { stops: { 0: [12, 12], 1: [12, 12], 2: [12, 12] } },
  },
  {
    name: 'T-junction with an extra-small stop distance',
    shows: 'segments of 3 m: the lines and the arrows are close to each other',
    options: { stops: { 0: [3, 3], 1: [3, 3], 2: [3, 3] } },
  },
];

export function tGround(): Graph {
  const s = new Sketch();
  cases.forEach((c, n) =>
    c.options.next ? pair(s, cell(n), c.options.next, c.options) : t(s, cell(n), c.options),
  );
  return roundToMm(s.graph);
}

const T_FIRST_HAT = 1109;

export const T_CASES: GroundCase[] = cases.map((c, n) => ({
  hat: T_FIRST_HAT + n,
  name: c.name,
  views: [{ center: cell(n), span: 50 }],
}));
