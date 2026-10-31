import { startDrag } from './curves/drag';
import {
  placed,
  shareRadius,
  type NodeRef,
  type RoadHandle,
  type RoadHit,
  type Roads,
} from './curves/roads';
import { branchOfEdge, branchOfNode } from './curves/branches';
import { closeOver } from './curves/junctions';
import { nodeAction } from './curves/junctions';
import { targetOf, type Drawn } from './editorTargets';
import type { PointerInfo, Press } from './editorTypes';
import { curveNodes, isSelected, pressNode, selectedSegments } from './selection';

const edgeOf = (hit: RoadHit) => ({ road: hit.road, i: hit.ref.i });

type DragPress = Extract<Press, { kind: 'drag' }>;

/** Which presses select: nodes always, heading control points only without a modifier; never in draw mode (^74, ^75). */
function selects(handle: RoadHandle, drawing: boolean, { shift, alt }: PointerInfo): boolean {
  if (drawing) return false;
  return handle.type === 'node' || (handle.type === 'head' && !shift && !alt);
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
  const { roads } = drawn;
  const ref = { road: handle.road, node: handle.i };
  const path = roads[handle.road]!;
  const picks = selects(handle, drawing, info);
  const rule = pressNode(drawn.selection, ref, branchOfNode(roads, ref), info);
  const selection = picks ? closeOver(roads, rule.selection) : drawn.selection;
  const others =
    picks && handle.type === 'node' ? selection.filter((r) => !isSelected([ref], r)) : [];
  const node = handle.type === 'node' && drawing;
  const act = node && !info.shift ? nodeAction(drawn, ref) : null;
  const press: DragPress = {
    kind: 'drag',
    road: handle.road,
    drag: startDrag(path, handle),
    start: info.pt,
    moved: false,
    act,
    group: placed(roads, others),
    origin: { x: path.nodes[handle.i]!.x, y: path.nodes[handle.i]!.y },
    click: picks ? rule.click : 'keep',
    undo: drawn,
    target: targetOf(drawn, { kind: 'handle', handle }, drawing),
  };
  return { press, selection };
}

/** Select mode, nothing grabbed: a click enters draw mode or, on a curve, selects; a drag spans a box. */
export function emptyPress(drawn: Drawn, info: PointerInfo, hit: RoadHit | null): Press {
  const lane = hit && info.alt;
  return {
    kind: 'empty',
    screen: info.screen,
    base: info.shift ? drawn.selection : [],
    shift: info.shift && !info.alt,
    alt: !!lane,
    curve: !hit
      ? []
      : lane
        ? branchOfEdge(drawn.roads, edgeOf(hit))
        : curveNodes(hit.road, hit.ref.i),
    moved: false,
    undo: drawn,
    target: targetOf(drawn, hit ? { kind: 'candidate', hit } : null, false),
  };
}

/**
 * The segment of the radius point that is dragged and all selected segments (both nodes selected),
 * if it is one of them: they all get its radius (^77).
 */
export function sharing(roads: Roads, selection: NodeRef[], press: Press) {
  if (press.kind !== 'drag' || press.drag.handle.type !== 'rad') return null;
  const own = { road: press.road, i: press.drag.handle.i };
  const all = selectedSegments(roads, selection);
  return all.some((s) => s.road === own.road && s.i === own.i) ? { own, all } : null;
}

/** The radius of the dragged segment is given to all selected segments. */
export function withSharedRadius(roads: Roads, selection: NodeRef[], press: Press): Roads {
  const s = sharing(roads, selection, press);
  return s ? shareRadius(roads, s.own, s.all) : roads;
}
