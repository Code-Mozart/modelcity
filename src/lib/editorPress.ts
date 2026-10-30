import { startDrag } from './curves/drag';
import {
  placed,
  shareRadius,
  type NodeRef,
  type RoadHandle,
  type RoadHit,
  type Roads,
} from './curves/roads';
import { isActiveEnd, isLeaf, targetOf, type Drawn } from './editorTargets';
import type { PointerInfo, Press } from './editorTypes';
import { curveNodes, isSelected, pressNode, roadNodes, selectedSegments } from './selection';

type DragPress = Extract<Press, { kind: 'drag' }>;

/** Which presses select: nodes always, heading tips only without a modifier; never in draw mode (^74, ^75). */
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
  const rule = pressNode(drawn.selection, ref, roadNodes(roads, ref.road), info);
  const selection = picks ? rule.selection : drawn.selection;
  const others =
    picks && handle.type === 'node' ? selection.filter((r) => !isSelected([ref], r)) : [];
  const active = isActiveEnd(drawn, handle);
  const press: DragPress = {
    kind: 'drag',
    road: handle.road,
    drag: startDrag(path, handle),
    start: info.pt,
    moved: false,
    finishes: active && !info.shift,
    extend: drawing && isLeaf(roads, handle) && !active && !info.shift,
    group: placed(roads, others),
    origin: { x: path.nodes[handle.i]!.x, y: path.nodes[handle.i]!.y },
    click: picks ? rule.click : 'keep',
    undo: drawn,
    target: targetOf(drawn, { kind: 'handle', handle }),
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
    curve: !hit ? [] : lane ? roadNodes(drawn.roads, hit.road) : curveNodes(hit.road, hit.ref.i),
    moved: false,
    target: targetOf(drawn, hit ? { kind: 'candidate', hit } : null),
  };
}

/** The dragged segment and all selected segments, while a radius is dragged between selected nodes (^77). */
export function sharing(roads: Roads, selection: NodeRef[], press: Press | null) {
  if (press?.kind !== 'drag' || press.drag.handle.type !== 'rad') return null;
  const own = { road: press.road, i: press.drag.handle.i };
  const all = selectedSegments(roads, selection);
  return all.some((s) => s.road === own.road && s.i === own.i) ? { own, all } : null;
}

/** The radius of the dragged segment is given to all selected segments. */
export function withSharedRadius(roads: Roads, selection: NodeRef[], press: Press): Roads {
  const s = sharing(roads, selection, press);
  return s ? shareRadius(roads, s.own, s.all) : roads;
}
