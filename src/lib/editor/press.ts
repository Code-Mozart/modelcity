import { startDrag } from '../curves/drag';
import type { RoadHandle, RoadHit } from '../model/chains';
import { edgeOfId, nodeOf, placed, shareRadius, type Graph } from '../model/graph';
import { branchOfEdge, branchOfNode, nodeAction } from '../model/junction';
import { targetOf, type Drawn } from './targets';
import type { PointerInfo, Press } from './types';
import { pressNode, selectedSegments } from './selection';

type DragPress = Extract<Press, { kind: 'drag' }>;

/** Which presses select: nodes always, heading control points only without a modifier; never in draw mode (^74, ^75). */
function selects(handle: RoadHandle, drawing: boolean, { shift, alt }: PointerInfo): boolean {
  if (drawing) return false;
  return handle.type === 'node' || (handle.type === 'head' && !shift && !alt);
}

/** The selection after a press on a handle, and what a click without moving does to it. */
function pressSelection(drawn: Drawn, drawing: boolean, handle: RoadHandle, info: PointerInfo) {
  const rule = pressNode(drawn.selection, handle.id, branchOfNode(drawn.graph, handle.id), info);
  const picks = selects(handle, drawing, info);
  const selection = picks ? rule.selection : drawn.selection;
  const group = picks && handle.type === 'node' ? selection.filter((s) => s !== handle.id) : [];
  return { selection, group, click: picks ? rule.click : ('keep' as const) };
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
  const { selection, group, click } = pressSelection(drawn, drawing, handle, info);
  const node = handle.type === 'node' && drawing;
  const n = nodeOf(graph, id);
  const press: DragPress = {
    kind: 'drag',
    road: handle.road,
    id,
    drag: startDrag(handle),
    start: info.pt,
    moved: false,
    act: node && !info.shift ? nodeAction(drawn, id) : null,
    group: placed(graph, group),
    origin: { x: n?.x ?? 0, y: n?.y ?? 0 },
    click,
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
    shift: info.shift && !info.alt,
    alt: !!lane,
    curve: hit && lane ? branchOfEdge(drawn.graph, hit.edge) : ends,
    moved: false,
    undo: drawn,
    target: targetOf(drawn, hit ? { kind: 'candidate', hit } : null, false),
  };
}

/**
 * The segment of the radius point that is dragged and all selected segments (both nodes selected),
 * if it is one of them: they all get its radius (^77).
 */
function sharing(g: Graph, selection: number[], press: Press) {
  if (press.kind !== 'drag' || press.drag.handle.type !== 'rad') return null;
  const all = selectedSegments(g, selection);
  return all.includes(press.id) ? { own: press.id, all } : null;
}

/** The radius of the dragged segment is given to all selected segments. */
export function withSharedRadius(g: Graph, selection: number[], press: Press): Graph {
  const s = sharing(g, selection, press);
  return s ? shareRadius(g, s.own, s.all) : g;
}
