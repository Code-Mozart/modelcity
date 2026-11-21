import type { Vec } from '../curves/vec';
import { roundToMm, type Graph } from '../model/graph';
import { junction, lane, place, roundabout, Sketch, type ArmSpec } from './junctionKit';

/**
 * The testing ground of the junctions (^984): one project with the common kinds of junction, each
 * in its own cell of a grid. `docs/junctions.md` says what is where; the project file
 * `docs/mocks/hat984.json` is made from this (`junctionGround.test`).
 */
const [E, S, W, N] = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
const CELL: Vec = { x: 260, y: 240 };
const cell = (col: number, row: number): Vec => ({ x: col * CELL.x, y: row * CELL.y });

const arm = (angle: number, lanesIn = 1, lanesOut = lanesIn): ArmSpec => ({
  angle,
  in: lanesIn,
  out: lanesOut,
});

/** Row 0: T-junctions. A plain one, a main road of 2+2, one with a left-turn pocket and two lanes out of the side road. */
function tJunctions(s: Sketch) {
  junction(s, cell(0, 0), [arm(W), arm(E), arm(S)]);
  junction(s, cell(1, 0), [arm(W, 2), arm(E, 2), arm(S)]);
  junction(s, cell(2, 0), [
    { ...arm(W), outShift: true },
    { ...arm(E), pocket: true },
    arm(S, 2, 1),
  ]);
}

/** Row 1: X-junctions. 1+1 with 1+1, 2+2 with 1+1, and 2+2 with 2+2 with a left-turn pocket on every arm. */
function xJunctions(s: Sketch) {
  junction(s, cell(0, 1), [arm(W), arm(E), arm(S), arm(N)]);
  junction(s, cell(1, 1), [arm(W, 2), arm(E, 2), arm(S), arm(N)]);
  const pocket = (angle: number): ArmSpec => ({ ...arm(angle, 2), pocket: true, outShift: true });
  junction(s, cell(2, 1), [pocket(W), pocket(E), pocket(S), pocket(N)]);
}

/** Row 2, cell 0: a one-way road of two lanes that loses its outer lane and gets it back. */
function laneDropAndGain(s: Sketch, c: Vec) {
  const inner = [-110, -30, 30, 110].map((x) => s.node(place(c, E, x, 0), E));
  s.chain(inner);
  s.edge(lane(s, { c, h: E }, [-110, -70], 3)[1]!, inner[1]!);
  s.edge(inner[2]!, lane(s, { c, h: E }, [70, 110], 3)[0]!);
}

/** Row 2, cell 1: a one-way road of two lanes with an on-ramp (a lane alongside that merges) and an off-ramp. */
function ramps(s: Sketch, c: Vec) {
  lane(s, { c, h: E }, [-120, 120], 0);
  const outer = [-120, -20, 20, 120].map((x) => s.node(place(c, E, x, 3), E));
  s.chain(outer);
  const on = [s.node(place(c, E, -125, 30), -0.4), ...lane(s, { c, h: E }, [-80, -50], 6)];
  s.edge(on[0]!, on[1]!);
  s.edge(on[2]!, outer[1]!);
  const off = lane(s, { c, h: E }, [50, 80], 6);
  s.edge(outer[2]!, off[0]!);
  s.edge(off[1]!, s.node(place(c, E, 125, 30), 0.4));
}

/** Row 2: lanes that merge and split, and a fork of a 1+1 road. */
function mergesAndSplits(s: Sketch) {
  laneDropAndGain(s, cell(0, 2));
  ramps(s, cell(1, 2));
  junction(s, cell(2, 2), [arm(W), arm(-0.5), arm(0.5)]);
}

/** Row 3: roads that cross without a node (one lane each; three lanes over a 2+2 road at an angle, as in ^959), and a roundabout. */
function crossingsAndRoundabout(s: Sketch) {
  lane(s, { c: cell(0, 3), h: E }, [-80, 80]);
  lane(s, { c: cell(0, 3), h: S }, [-80, 80]);
  const c = cell(1, 3);
  for (const side of [1.5, 4.5]) {
    lane(s, { c, h: E }, [-90, 90], side);
    lane(s, { c, h: W }, [-90, 90], side);
  }
  for (const side of [-3, 0, 3]) lane(s, { c, h: 1 }, [-80, 80], side);
  roundabout(s, cell(2, 3), { r: 14 }, [E, S, W, N]);
}

/** Row 4: a T at 60 degrees, a one-way street across a 1+1 road, a junction of five arms. */
function others(s: Sketch) {
  junction(s, cell(0, 4), [arm(W), arm(E), arm(Math.PI / 3)]);
  junction(s, cell(1, 4), [arm(W, 1, 0), arm(E, 0, 1), arm(S), arm(N)]);
  junction(s, cell(2, 4), [arm(W), arm(-0.3), arm(1.1), arm(2.2), arm(N)], 12);
}

/** Row 5: a staggered junction (two T-junctions 40 m apart, the side roads on opposite sides) and a roundabout of two lanes with 2+2 arms. */
function more(s: Sketch) {
  const c = cell(0, 5);
  const link = (angle: number): ArmSpec => ({ ...arm(angle), stub: true });
  const [, east] = junction(s, { x: c.x - 20, y: c.y }, [arm(W), link(E), arm(N)]);
  const [west] = junction(s, { x: c.x + 20, y: c.y }, [link(W), arm(E), arm(S)]);
  s.edge(east!.outs[0]!, west!.ins[0]!);
  s.edge(west!.outs[0]!, east!.ins[0]!);
  roundabout(s, cell(1, 5), { r: 18, lanes: 2 }, [E, S, W, N]);
}

/** Nodes `[x, y, heading]` around `c` and the segments between them, by index: a layout drawn by hand. */
function drawn(s: Sketch, c: Vec, nodes: [number, number, number][], edges: [number, number][]) {
  const ids = nodes.map(([x, y, th]) => s.node({ x: c.x + x, y: c.y + y }, th));
  for (const [a, b] of edges) s.edge(ids[a]!, ids[b]!);
}

/**
 * The user's special cases (^1019). A winding lane that splits into two lanes that both turn
 * left, one of them an S-curve; and a node that is a merge and a split at once: a lane from the
 * left and one from below that turns right into it, going on into a sharp left turn and a gentle
 * right bend.
 */
function special(s: Sketch) {
  const winding: [number, number, number][] = [
    [-29.138, 20.684, -1.3962634015954636],
    [-4.932, 3.734, 0.1745329251993757],
    [3.822, 2.522, -0.44966727589695693],
    [11.738, -7.938, -1.3962634015950905],
    [28.975, -20.008, 3.4033920413889094],
    [12.154, -0.971, -0.9951632041902941],
    [29.87, -11.691, -0.09316777843712643],
  ];
  drawn(s, cell(2, 5), winding, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 5],
    [5, 6],
  ]);
  const both: [number, number, number][] = [
    [-18.824, 0, 0],
    [-4.423, 0, 0],
    [7.095, -11.518, -Math.PI / 2],
    [18.605, 6.17, Math.PI / 6],
    [-10.802, 9.835, -Math.PI / 2],
  ];
  drawn(s, cell(0, 6), both, [
    [0, 1],
    [1, 2],
    [1, 3],
    [4, 1],
  ]);
}

/**
 * The user's curved extension (^1055): a lane that runs on, and beside it a lane added on the left
 * that bends away and back, its nodes a degree off the heading of the lane (^1056).
 */
function curvedExtension(s: Sketch) {
  drawn(
    s,
    cell(1, 6),
    [
      [-18.836, 2.365, 0],
      [18.826, 2.983, 0.03441068807615733],
      [-10.165, 2.365, 0],
      [0.93, -0.54, 6.300390651217665],
      [7.976, -0.38, 6.3113186364332865],
      [17.731, -2.702, -6.778650753524812],
    ],
    [
      [0, 2],
      [2, 1],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  );
}

/** The user's two lanes that merge (^1060): the lane on the right shifts left into the one on the left, and both end in the node where they merge. */
function twoMerges(s: Sketch) {
  drawn(
    s,
    cell(2, 6),
    [
      [-21.192, -1.192, 0],
      [-21.192, 1.808, 0],
      [21.255, -1.192, 6.283185307179586],
      [1.764, -1.192, 0],
    ],
    [
      [0, 3],
      [1, 3],
      [3, 2],
    ],
  );
}

/** The user's lane that merges beside a lane that other lanes touch (^1063): its start node is in a tower with nodes that cut the lane it merges into in pieces. */
function mergeBesideCut(s: Sketch) {
  drawn(
    s,
    cell(0, 7),
    [
      [-23.192, -1.192, Math.PI],
      [32.464, 1.808, 0],
      [19.796, -1.192, Math.PI],
      [10.407, -4.192, Math.PI],
      [-11.714, -4.192, Math.PI],
      [-32.659, 1.808, 2 * Math.PI],
      [-23.192, 4.808, 0],
      [-1.698, 1.808, 0],
      [-32.659, 4.808, 2 * Math.PI],
    ],
    [
      [5, 7],
      [2, 0],
      [3, 4],
      [7, 1],
      [6, 7],
      [8, 6],
    ],
  );
}

/** The top of the user's project *noses* (^1066): a lane that leaves a lane and one that arrives, crossing, with segments cut in pieces by derived nodes where they cross. */
function noses(s: Sketch) {
  drawn(
    s,
    cell(1, 7),
    [
      [-55.473, -2.135, 6.283185307179586],
      [20.54, -1.389, 0.03441068807615733],
      [-12.165, -2.135, 6.123233995736766e-17],
      [-1.07, -5.04, 6.300390651217665],
      [5.976, -4.88, 6.3113186364332865],
      [36.38, -18.362, -0.49546544634522566],
      [-27.147, 21.054, 5.672320068981571],
      [7.309, 1.162, 0.03050413446830908],
      [44.832, -0.553, 0.03441068807615733],
    ],
    [
      [0, 2],
      [2, 1],
      [2, 3],
      [3, 4],
      [4, 5],
      [6, 7],
      [7, 1],
      [1, 8],
    ],
  );
}

export function junctionGround(): Graph {
  const s = new Sketch();
  tJunctions(s);
  xJunctions(s);
  mergesAndSplits(s);
  crossingsAndRoundabout(s);
  others(s);
  more(s);
  special(s);
  curvedExtension(s);
  twoMerges(s);
  mergeBesideCut(s);
  noses(s);
  return roundToMm(s.graph);
}

/** A case of the ground (`docs/junctions.md`): its hat, what it is, and the pictures to take of it: where each looks and how many meters across it shows. */
export interface GroundCase {
  hat: number;
  name: string;
  views: { center: Vec; span: number }[];
}

/** A case in a cell, with pictures of the given spans around its center, or around places `[x, y, span]` from it. */
function named(
  hat: number,
  at: [number, number],
  name: string,
  views: (number | [number, number, number])[] = [70],
): GroundCase {
  const c = cell(...at);
  return {
    hat,
    name,
    views: views.map((v) =>
      typeof v === 'number'
        ? { center: c, span: v }
        : { center: { x: c.x + v[0], y: c.y + v[1] }, span: v[2] },
    ),
  };
}

export const GROUND_CASES: GroundCase[] = [
  named(985, [0, 0], 'T-junction, 1+1 with 1+1', [45]),
  named(986, [1, 0], 'T-junction, main road 2+2, side road 1+1', [50]),
  named(987, [2, 0], 'T-junction with a left-turn pocket, two lanes out of the side road', [
    150,
    50,
    [45, 0, 60],
  ]),
  named(988, [0, 1], 'X-junction, 1+1 with 1+1', [45]),
  named(989, [1, 1], 'X-junction, 2+2 with 1+1', [50]),
  named(990, [2, 1], 'X-junction, 2+2 with 2+2, pockets on every arm', [150, 55, [-50, 0, 60]]),
  named(991, [0, 2], 'lane drop and lane gain', [240, [-50, 0, 60], [50, 0, 60]]),
  named(992, [1, 2], 'on-ramp and off-ramp', [270, [-55, 5, 90], [55, 5, 90]]),
  named(993, [2, 2], 'fork (Y)', [50]),
  named(994, [0, 3], '1 x 1 crossing without a node', [60]),
  named(995, [1, 3], 'three lanes across a 2+2 road, without nodes', [80]),
  named(996, [2, 3], 'roundabout, one lane', [70]),
  named(997, [0, 4], 'T-junction at 60 degrees', [50]),
  named(998, [1, 4], 'one-way street across a 1+1 road', [45]),
  named(999, [2, 4], 'five arms', [60]),
  named(1000, [0, 5], 'staggered junction', [90]),
  named(1001, [1, 5], 'roundabout, two lanes', [90]),
  named(1020, [2, 5], 'a winding lane that splits into two left turns', [80]),
  named(1021, [0, 6], 'a merge and a split at one node', [50]),
  named(1055, [1, 6], 'a lane added on the left, on curves', [60]),
  named(1060, [2, 6], 'two lanes that merge', [60]),
  named(
    1066,
    [1, 7],
    'a lane that leaves and one that arrives, crossing: gores, not slivers',
    [90],
  ),
  named(1063, [0, 7], 'a lane that merges, the lane it merges into cut by other lanes', [70]),
];
