import type { Vec } from '../curves/vec';
import { roundToMm, type Graph } from '../model/graph';
import type { GroundCase } from './junctionGround';
import { junction, type ArmSpec, Sketch } from './junctionKit';

/**
 * The testing ground of the small junctions, *rechts vor links* (^1078): one project with small T
 * and X junctions (each arm 1+1 or one way with a single lane, ^1072), each in its own cell of a
 * grid, and cases where a turn is not there (^1076). `docs/junctions.md` says what is where; the
 * project file `docs/mocks/hat1078.json` is made from this (`priorityGround.test`).
 */
const [E, S, W, N] = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
const CELL: Vec = { x: 260, y: 240 };
const cell = (col: number, row: number): Vec => ({ x: col * CELL.x, y: row * CELL.y });

/** An arm with lanes in and out (the same number of both, by default: a 1+1 road). */
const arm = (angle: number, lanesIn = 1, lanesOut = lanesIn, skip?: number[]): ArmSpec => ({
  angle,
  in: lanesIn,
  out: lanesOut,
  skip,
});

/** Row 0: T-junctions of 1+1 roads: square, at 60 degrees, with a one-way side road towards the junction and one away from it. */
function tJunctions(s: Sketch) {
  junction(s, cell(0, 0), [arm(W), arm(E), arm(S)]);
  junction(s, cell(1, 0), [arm(W), arm(E), arm(Math.PI / 3)]);
  junction(s, cell(2, 0), [arm(W), arm(E), arm(S, 1, 0)]);
  junction(s, cell(3, 0), [arm(W), arm(E), arm(S, 0, 1)]);
}

/** Row 1: X-junctions: 1+1 with 1+1, a one-way street across a 1+1 road, two one-way streets. */
function xJunctions(s: Sketch) {
  junction(s, cell(0, 1), [arm(W), arm(E), arm(S), arm(N)]);
  junction(s, cell(1, 1), [arm(W, 1, 0), arm(E, 0, 1), arm(S), arm(N)]);
  junction(s, cell(2, 1), [arm(W, 1, 0), arm(E, 0, 1), arm(N, 1, 0), arm(S, 0, 1)]);
}

/**
 * Row 2: turns that are not there (^1076). Arms are numbered in the order given: a lane that does
 * not lead to an arm is listed in `skip`. A T where the side road cannot turn right, one where it
 * cannot turn left, an X where one road cannot turn left, one where it can only turn, and a T with
 * a main road of 2+2, which is not small.
 */
function missingTurns(s: Sketch) {
  junction(s, cell(0, 2), [arm(W), arm(E), arm(S, 1, 1, [1])]);
  junction(s, cell(1, 2), [arm(W), arm(E), arm(S, 1, 1, [0])]);
  junction(s, cell(2, 2), [arm(W, 1, 1, [3]), arm(E), arm(S), arm(N)]);
  junction(s, cell(3, 2), [arm(W, 1, 1, [1]), arm(E), arm(S), arm(N)]);
  junction(s, cell(0, 3), [arm(W, 2), arm(E, 2), arm(S)]);
}

export function priorityGround(): Graph {
  const s = new Sketch();
  tJunctions(s);
  xJunctions(s);
  missingTurns(s);
  return roundToMm(s.graph);
}

const named = (hat: number, at: [number, number], name: string, span = 45): GroundCase => ({
  hat,
  name,
  views: [{ center: cell(...at), span }],
});

export const PRIORITY_CASES: GroundCase[] = [
  named(1080, [0, 0], 'T-junction, three 1+1 arms'),
  named(1081, [1, 0], 'T-junction at 60 degrees'),
  named(1082, [2, 0], 'T-junction, the side road one-way towards the junction'),
  named(1083, [3, 0], 'T-junction, the side road one-way away from the junction'),
  named(1084, [0, 1], 'X-junction, 1+1 with 1+1'),
  named(1085, [1, 1], 'X-junction, a one-way street across a 1+1 road'),
  named(1086, [2, 1], 'X-junction, two one-way streets'),
  named(1087, [0, 2], 'T-junction where the side road cannot turn right'),
  named(1088, [1, 2], 'T-junction where the side road cannot turn left'),
  named(1089, [2, 2], 'X-junction where one road cannot turn left'),
  named(1090, [3, 2], 'X-junction where one road cannot go straight on'),
  named(1091, [0, 3], 'T-junction with a main road of 2+2: not small', 55),
];
