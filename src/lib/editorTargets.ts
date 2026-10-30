import type { RoadHandle, Roads } from './curves/roads';
import type { Hover } from './editorTypes';
import type { HintTarget } from './hints';

/** The road being drawn and the end new nodes attach to (^65). */
export interface Drawn {
  roads: Roads;
  active: number | null;
  end: 'start' | 'end';
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
  if (hover?.kind === 'handle') {
    const { handle } = hover;
    return {
      kind: 'handle',
      type: handle.type,
      last: isActiveEnd(drawn, handle),
      leaf: isLeaf(drawn.roads, handle),
    };
  }
  return hover?.kind === 'candidate' ? { kind: 'curve' } : { kind: 'empty' };
}
