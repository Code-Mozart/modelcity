import { hitHandle, NODE_HIT_PX } from './curves/handles';
import {
  nearestOnRoads,
  nearNode,
  roadHandles,
  type RoadHandle,
  type RoadHit,
  type Roads,
} from './curves/roads';
import type { EdgeRef } from './curves/path';
import { placementAt } from './editorOps';
import { previewOf, type Drawn } from './editorTargets';
import type { Hover, PointerInfo, Press } from './editorTypes';
import type { Focus } from './focus';

/** The handle being hovered or dragged, or the node being placed (reveals its gizmos, ^51). */
export function focusOf(press: Press | null, hover: Hover | null): Focus | null {
  if (press?.kind === 'drag') {
    const { type, i, k, t } = press.drag.handle;
    return { road: press.road, type, i, k, t };
  }
  if (press?.kind === 'place') return { road: press.ref.road, type: 'node', i: press.ref.node };
  const h = hover?.kind === 'handle' ? hover.handle : null;
  return h ? { road: h.road, type: h.type, i: h.i, k: h.k, t: h.t } : null;
}

export function handleAt(roads: Roads, edges: EdgeRef[][], info: PointerInfo): RoadHandle | null {
  const { pt, scale, touch } = info;
  return hitHandle(roadHandles(roads, edges, scale), pt, scale, touch);
}

/** The curve under the pointer, as near as a node is, but not within a node's gap (^137). */
export function curveAt(roads: Roads, { pt, scale, touch }: PointerInfo): RoadHit | null {
  const hit = nearestOnRoads(roads, pt, NODE_HIT_PX[touch ? 'touch' : 'mouse'] / scale);
  return hit && !nearNode(hit) ? hit : null;
}

export function hoverAt(
  drawn: Drawn,
  edges: EdgeRef[][],
  info: PointerInfo,
  drawing: boolean,
): Hover | null {
  const handle = handleAt(drawn.roads, edges, info);
  if (handle) return { kind: 'handle', handle };
  const hit = curveAt(drawn.roads, info);
  if (hit) return { kind: 'candidate', hit };
  return drawing ? previewOf(drawn, placementAt(info.pt)) : null;
}
