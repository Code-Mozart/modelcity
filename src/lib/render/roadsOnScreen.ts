import { boxAround, boxesMeet, type Box } from '../curves/hull';
import type { RoadScene, Scene } from './scene';
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

/** Which roads reach the screen, a little more than the canvas (^939): the others are not drawn and not looked at. A road that is being worked with (`keep`: its scaffold is shown, it is selected, focused or turned) is drawn whole, for its guides and circles reach far from its curve. */
export const roadsOnScreen = (f: Frame, roads: RoadScene[], keep: (road: number) => boolean) => {
  const shown = viewBox(f, 60 / f.view.scale);
  return roads.map((r, i) => keep(i) || boxesMeet(roadBoxOf(r), shown));
};

/** Which segments show their scaffold, and which roads are drawn (^939): those that reach the screen and those that are being worked with. */
export function shownOf(f: Frame, scene: Scene, active: boolean[][]): Shown {
  const working = (i: number) =>
    active[i]!.some(Boolean) ||
    [...scene.selection, ...scene.pinned].some((n) => n.road === i) ||
    scene.focus?.road === i ||
    scene.turning?.road === i;
  return { active, on: roadsOnScreen(f, scene.roads, working) };
}
