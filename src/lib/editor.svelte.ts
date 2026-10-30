import { applyDrag, resetRadius, startDrag, type DragState } from './curves/drag';
import { buildEdge } from './curves/edge';
import { hitHandle, handlesOf, type Handle } from './curves/handles';
import {
  appendNode,
  edgesOf,
  insertNode,
  nearestEnd,
  nearestOnCurve,
  removeNode,
  autoHeading,
  type CurveHit,
  type Path,
} from './curves/path';
import { preset, type PresetName } from './curves/presets';
import { readoutLines } from './curves/readout';
import type { PathNode } from './curves/types';
import type { Vec } from './curves/vec';
import { KEYMAP, type Action } from './keymap';

export type Tool = 'move' | 'append' | 'insert';

/** What the pointer is doing, as seen by the editor. Positions are world meters. */
export interface PointerInfo {
  pt: Vec;
  /** Pixels per meter, for screen-sized hit areas. */
  scale: number;
  touch: boolean;
  shift: boolean;
}

export type Hover =
  | { kind: 'handle'; handle: Handle }
  | { kind: 'ghost'; node: PathNode; ref: PathNode; end: 'start' | 'end' }
  | { kind: 'candidate'; hit: CurveHit };

/** Distance in screen pixels within which "insert" snaps to a curve. */
const INSERT_REACH_PX = 18;

const CURSORS: Record<Tool, string> = { move: 'default', append: 'crosshair', insert: 'crosshair' };

/**
 * The curve editor: document, tool, selection and pointer interaction. No drawing and no view
 * (zoom/pan) logic: the canvas component feeds it pointer events in world coordinates (^12).
 */
export class Editor {
  path = $state.raw<Path>(preset('H'));
  tool = $state<Tool>('move');
  sel = $state(-1);
  hover = $state.raw<Hover | null>(null);
  showCircles = $state(true);
  showLines = $state(true);
  equidistant = $state(false);

  edges = $derived(edgesOf(this.path));
  readout = $derived(readoutLines(this.path, this.edges, this.sel).join('\n'));
  cursor = $derived(
    this.hover?.kind === 'handle'
      ? 'grab'
      : this.hover?.kind === 'candidate'
        ? 'copy'
        : CURSORS[this.tool],
  );

  private drag: DragState | null = null;

  handles(scale: number): Handle[] {
    return handlesOf(this.path, this.edges, scale);
  }

  private handleAt({ pt, scale, touch }: PointerInfo): Handle | null {
    return hitHandle(this.handles(scale), pt, scale, touch);
  }

  setTool(tool: Tool) {
    this.tool = tool;
    this.hover = null;
  }

  loadPreset(name: PresetName) {
    this.path = preset(name);
    this.sel = -1;
  }

  run(action: Action) {
    if (action === 'toolMove') this.setTool('move');
    else if (action === 'toolAppend') this.setTool('append');
    else if (action === 'toolInsert') this.setTool('insert');
    else this.deleteSelected();
  }

  /** Handle a key; true if it was bound. */
  key(key: string): boolean {
    const action = KEYMAP[key];
    if (action) this.run(action);
    return action !== undefined;
  }

  deleteSelected() {
    this.path = removeNode(this.path, this.sel);
    this.sel = -1;
  }

  /** Pointer pressed. False means the editor did not use it, so the canvas may pan. */
  pointerDown(info: PointerInfo): boolean {
    if (this.tool === 'append') return this.append(info.pt);
    if (this.tool === 'insert') return this.insert(info);
    const handle = this.handleAt(info);
    if (!handle) {
      this.sel = -1;
      return false;
    }
    if (handle.type === 'node' || handle.type === 'head') this.sel = handle.i;
    this.drag = startDrag(this.path, handle);
    this.hover = null;
    return true;
  }

  private append(pt: Vec): boolean {
    const r = appendNode(this.path, pt);
    this.path = r.path;
    this.sel = r.sel;
    return true;
  }

  private insert(info: PointerInfo): boolean {
    const hit = nearestOnCurve(this.path, info.pt, INSERT_REACH_PX / info.scale);
    if (!hit) return true;
    const r = insertNode(this.path, hit);
    this.path = r.path;
    this.sel = r.sel;
    this.hover = null;
    return true;
  }

  pointerMove(info: PointerInfo) {
    if (this.drag) {
      const mods = { snap: info.shift, equidistant: this.equidistant };
      this.path = applyDrag(this.path, this.drag, info.pt, mods);
    } else this.hover = this.hoverAt(info);
  }

  private hoverAt(info: PointerInfo): Hover | null {
    if (this.tool === 'move') {
      const handle = this.handleAt(info);
      return handle ? { kind: 'handle', handle } : null;
    }
    if (this.tool === 'insert') {
      const hit = nearestOnCurve(this.path, info.pt, INSERT_REACH_PX / info.scale);
      return hit ? { kind: 'candidate', hit } : null;
    }
    return this.ghostAt(info.pt);
  }

  /** Preview of the node that Append would add. */
  private ghostAt(pt: Vec): Hover {
    const end = nearestEnd(this.path, pt);
    const { nodes } = this.path;
    const ref = end === 'end' ? nodes[nodes.length - 1] : nodes[0];
    const th = ref ? autoHeading(ref, pt) : 0;
    return {
      kind: 'ghost',
      node: { x: pt.x, y: pt.y, th },
      ref: ref ?? { x: pt.x, y: pt.y, th },
      end,
    };
  }

  pointerUp() {
    this.drag = null;
  }

  pointerLeave() {
    if (!this.drag) this.hover = null;
  }

  /** Right-click removes a node under the pointer. */
  removeAt(info: PointerInfo) {
    const handle = this.handleAt(info);
    if (handle?.type !== 'node') return;
    this.path = removeNode(this.path, handle.i);
    this.sel = -1;
  }

  /** Double-click on a radius ring resets the radius to auto (^8). */
  resetRadiusAt(info: PointerInfo) {
    const handle = this.handleAt(info);
    if (handle?.type === 'rad') this.path = resetRadius(this.path, handle.i);
  }
}

/** Preview edge for the Append ghost. */
export function ghostEdge(h: Extract<Hover, { kind: 'ghost' }>) {
  const { node, ref, end } = h;
  return end === 'end' ? buildEdge(ref, node, null, null) : buildEdge(node, ref, null, null);
}
