import { boxAround, boxesMeet, type Box } from '../curves/hull';
import type { RoadScene } from './scene';
import { viewBox, type Frame } from './paint';

/** Which segments show their scaffold, and which roads reach the screen (^939). */
export interface Shown {
  active: boolean[][];
  on: boolean[];
}

/** The box of a road: all the pieces of its segments, found once for each road scene (^939). */
const roadBoxes = new WeakMap<RoadScene, Box>();
function roadBoxOf(road: RoadScene): Box {
  let box = roadBoxes.get(road);
  if (!box) roadBoxes.set(road, (box = boxAround(road.edges.flatMap(({ E }) => E.pieces))));
  return box;
}

/** Which roads reach the screen, a little more than the canvas (their gizmos are a few pixels wide) (^939): the others are not drawn and not looked at. */
export const roadsOnScreen = (f: Frame, roads: RoadScene[]) => {
  const shown = viewBox(f, 60 / f.view.scale);
  return roads.map((r) => boxesMeet(roadBoxOf(r), shown));
};
