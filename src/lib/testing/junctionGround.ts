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
  roundabout(s, cell(2, 3), 14, [E, S, W, N]);
}

/** Row 4: a T at 60 degrees, a one-way street across a 1+1 road, a junction of five arms. */
function others(s: Sketch) {
  junction(s, cell(0, 4), [arm(W), arm(E), arm(Math.PI / 3)]);
  junction(s, cell(1, 4), [arm(W, 1, 0), arm(E, 0, 1), arm(S), arm(N)]);
  junction(s, cell(2, 4), [arm(W), arm(-0.3), arm(1.1), arm(2.2), arm(N)], 12);
}

export function junctionGround(): Graph {
  const s = new Sketch();
  tJunctions(s);
  xJunctions(s);
  mergesAndSplits(s);
  crossingsAndRoundabout(s);
  others(s);
  return roundToMm(s.graph);
}
