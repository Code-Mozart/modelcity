import { autoHeading, autoHeadingBefore } from './curves/path';
import { removeRoad, type NodeRef, type RoadHandle, type Roads } from './curves/roads';
import type { Vec } from './curves/vec';
import { curveNodes, isSelected, pickedCount } from './selection';
import type { Hover } from './editorTypes';
import type { HintTarget } from './hints';

/** The road being drawn and the end new nodes attach to (^65). */
export interface Drawn {
  roads: Roads;
  active: number | null;
  end: 'start' | 'end';
  selection: NodeRef[];
}

/** The node of the road being drawn that new nodes attach to (clicking it finishes the road). */
export function isActiveEnd({ roads, active, end }: Drawn, handle: RoadHandle): boolean {
  const nodes = roads[handle.road]?.nodes ?? [];
  if (handle.type !== 'node' || handle.road !== active) return false;
  return nodes.length === 1 || handle.i === (end === 'end' ? nodes.length - 1 : 0);
}

/** A node at either end of its road: drawing can extend the road from it (^65). */
export function isLeaf(roads: Roads, handle: RoadHandle): boolean {
  const nodes = roads[handle.road]?.nodes ?? [];
  return handle.type === 'node' && (handle.i === 0 || handle.i === nodes.length - 1);
}

/** What the control hints are about (^49). */
export function targetOf(drawn: Drawn, hover: Hover | null): HintTarget {
  const { selection } = drawn;
  if (hover?.kind === 'handle') {
    const { handle } = hover;
    return {
      kind: 'handle',
      type: handle.type,
      last: isActiveEnd(drawn, handle),
      leaf: isLeaf(drawn.roads, handle),
      selected: isSelected(selection, { road: handle.road, node: handle.i }),
    };
  }
  if (hover?.kind !== 'candidate') return { kind: 'empty' };
  const { road, ref } = hover.hit;
  return { kind: 'curve', picked: pickedCount(selection, curveNodes(road, ref.i)) };
}

/**
 * Make a leaf node the one the next node attaches to (^65): the road it belongs to becomes the
 * road being drawn, at that end. A road being drawn with one node only is dropped, since a road
 * needs two.
 */
const nodeCount = (roads: Roads, road: number) => roads[road]?.nodes.length ?? 0;

export function extendTo(drawn: Drawn, ref: NodeRef): Drawn {
  const { roads, active } = drawn;
  const lone = active !== null && active !== ref.road && nodeCount(roads, active) < 2;
  const kept = lone ? removeRoad(roads, active, active).roads : roads;
  const road = lone && active < ref.road ? ref.road - 1 : ref.road;
  const backwards = ref.node === 0 && nodeCount(kept, road) > 1;
  const end = backwards ? 'start' : 'end';
  return { roads: kept, active: road, end, selection: [{ road, node: ref.node }] };
}

export function cursorOf(hover: Hover | null, drawing: boolean): string {
  if (hover?.kind === 'handle') return 'grab';
  if (hover?.kind === 'candidate') return drawing ? 'copy' : 'pointer';
  return drawing ? 'crosshair' : 'default';
}

/** The preview of the node a click would add: where, its heading, and the node it attaches to. */
export function previewOf({ roads, active, end }: Drawn, pt: Vec): Hover {
  const nodes = active === null ? undefined : roads[active]?.nodes;
  const ref = (end === 'end' ? nodes?.[nodes.length - 1] : nodes?.[0]) ?? null;
  const heading = end === 'end' ? autoHeading : autoHeadingBefore;
  return { kind: 'preview', ref, end, node: { x: pt.x, y: pt.y, th: ref ? heading(ref, pt) : 0 } };
}
