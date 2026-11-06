import { startDrag } from '../curves/drag';
import type { RoadHandle, RoadHit } from './chains';
import { edgeOfId, nodeOf, placed, type Graph } from '../model/graph';
import { branchOfEdge, branchOfNode, curveAction, nodeAction } from '../model/junction';
import { targetOf, type Drawn } from './targets';
import type { ControlId } from '../hints/hints';
import type { PointerInfo, Press } from './types';
import { shareConcentric, sharedWith } from './sharedRadius';
import { pressNode } from './selection';

type DragPress = Extract<Press, { kind: 'drag' }>;

/** Which presses select: nodes always, heading control points only without a modifier; never in draw mode (^74, ^75). */
function selects(handle: RoadHandle, drawing: boolean, { shift, alt }: PointerInfo): boolean {
  if (drawing) return false;
  return handle.type === 'node' || (handle.type === 'head' && !shift && !alt);
}

/** The select operation a press on a node used: Alt a branch, Shift adding, else a plain select (^110). */
const selectUse = ({ shift, alt }: PointerInfo): ControlId => {
  if (alt) return 'select-lane';
  return shift ? 'select-add' : 'select';
};

/** The selection after a press on a handle, and what a click without moving does to it. */
function pressSelection(drawn: Drawn, drawing: boolean, handle: RoadHandle, info: PointerInfo) {
  const rule = pressNode(drawn.selection, handle.id, branchOfNode(drawn.graph, handle.id), info);
  const picks = selects(handle, drawing, info);
  const selection = picks ? rule.selection : drawn.selection;
  const group = picks && handle.type === 'node' ? selection.filter((s) => s !== handle.id) : [];
  const use = picks ? selectUse(info) : null;
  return { selection, group, click: picks ? rule.click : ('keep' as const), use };
}

/** What a click on a handle does to the roads in draw mode: on a node, finish, extend, split or merge; on a radius point, split or merge there (^23, ^65, ^278). */
function actOf(drawn: Drawn, drawing: boolean, handle: RoadHandle) {
  if (drawing && handle.type === 'rad') return curveAction(drawn);
  return handle.type === 'node' && drawing ? nodeAction(drawn, handle.id) : null;
}

/**
 * The left button went down on a handle: the press, and the selection after it. In select mode a
 * node press selects (^71, ^72, ^76) and drags the other selected nodes along.
 */
export function dragPress(
  drawn: Drawn,
  drawing: boolean,
  handle: RoadHandle,
  info: PointerInfo,
): { press: DragPress; selection: Drawn['selection'] } {
  const { graph } = drawn;
  const id = handle.id;
  const { selection, group, click, use } = pressSelection(drawn, drawing, handle, info);
  const n = nodeOf(graph, id);
  const press: DragPress = {
    kind: 'drag',
    road: handle.road,
    id,
    drag: startDrag(handle),
    start: info.pt,
    moved: false,
    act: actOf(drawn, drawing, handle),
    group: placed(graph, group),
    origin: { x: n?.x ?? 0, y: n?.y ?? 0 },
    click,
    use,
    flip: handle.type === 'head' && info.alt,
    curve: null,
    undo: drawn,
    target: targetOf(drawn, { kind: 'handle', handle }, drawing),
  };
  return { press, selection };
}

/** Select mode, nothing grabbed: a click enters draw mode or, on a curve, selects; a drag spans a box. */
export function emptyPress(drawn: Drawn, info: PointerInfo, hit: RoadHit | null): Press {
  const lane = hit && info.alt;
  const e = hit ? edgeOfId(drawn.graph, hit.edge) : undefined;
  const ends = e ? [e.start, e.end] : [];
  return {
    kind: 'empty',
    screen: info.screen,
    base: info.shift ? drawn.selection : [],
    shift: info.shift,
    alt: !!lane,
    curve: hit && lane ? branchOfEdge(drawn.graph, hit.edge) : ends,
    moved: false,
    undo: drawn,
    target: targetOf(drawn, hit ? { kind: 'candidate', hit } : null, false),
  };
}

/**
 * The radius of the dragged segment is given to all selected segments and its parallels (^77, ^302),
 * who is parallel taken from the graph before the drag (^334).
 */
export function withSharedRadius(g: Graph, selection: number[], press: Press): Graph {
  if (press.kind !== 'drag' || press.drag.handle.type !== 'rad') return g;
  return shareConcentric(g, press.id, sharedWith(press.undo.graph, selection, press.id));
}
