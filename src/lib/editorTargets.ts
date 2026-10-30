import { autoHeading, autoHeadingBefore } from './curves/path';
import type { NodeRef, Roads } from './curves/roads';
import { curveAction, nodeAction } from './curves/junctions';
import { curveNodes, isSelected, pickedCount } from './selection';
import type { Hover, Placement } from './editorTypes';
import type { HintTarget } from './hints';

/** The road being drawn and the end new nodes attach to (^65). */
export interface Drawn {
  roads: Roads;
  active: number | null;
  end: 'start' | 'end';
  selection: NodeRef[];
}

/** What the control hints are about (^49). */
export function targetOf(drawn: Drawn, hover: Hover | null, drawing: boolean): HintTarget {
  const { selection } = drawn;
  if (hover?.kind === 'handle') {
    const { handle } = hover;
    const ref = { road: handle.road, node: handle.i };
    const node = handle.type === 'node';
    return {
      kind: 'handle',
      type: handle.type,
      act: node && drawing ? nodeAction(drawn, ref) : null,
      selected: isSelected(selection, ref),
    };
  }
  if (hover?.kind !== 'candidate') return { kind: 'empty' };
  const { road, ref } = hover.hit;
  return {
    kind: 'curve',
    picked: pickedCount(selection, curveNodes(road, ref.i)),
    act: drawing ? curveAction(drawn, road) : null,
  };
}

/**
 * Make an end node of the road being drawn, or of any road when none is, the one the next node
 * attaches to (^65): the road becomes the road being drawn, at that end.
 */
export function extendTo(drawn: Drawn, ref: NodeRef): Drawn {
  const nodes = drawn.roads[ref.road]?.nodes.length ?? 0;
  const end = ref.node === 0 && nodes > 1 ? 'start' : 'end';
  return { ...drawn, active: ref.road, end, selection: [ref] };
}

export function cursorOf(hover: Hover | null, drawing: boolean): string {
  if (hover?.kind === 'handle') return 'grab';
  if (hover?.kind === 'candidate') return drawing ? 'copy' : 'pointer';
  return drawing ? 'crosshair' : 'default';
}

/** The preview of the node a click would add: where, its heading, and the node it attaches to. */
export function previewOf({ roads, active, end }: Drawn, at: Placement): Hover {
  const nodes = active === null ? undefined : roads[active]?.nodes;
  const ref = (end === 'end' ? nodes?.[nodes.length - 1] : nodes?.[0]) ?? null;
  const heading = end === 'end' ? autoHeading : autoHeadingBefore;
  const th = at.th ?? (ref ? heading(ref, at.pt) : 0);
  return { kind: 'preview', ref, end, node: { x: at.pt.x, y: at.pt.y, th } };
}
