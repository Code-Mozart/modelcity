import { hitHandle, NODE_HIT_PX } from '../curves/handles';
import { placementAt } from './ops';
import { previewOf, type Drawn } from './targets';
import type { Hover, PointerInfo, Press } from './types';
import {
  nearestOnChains,
  nearNode,
  positionOf,
  type Chain,
  type RoadHandle,
  type RoadHit,
} from '../model/chains';
import type { Focus } from './focus';

/** The handle being hovered or dragged, or the node being placed (reveals its gizmos, ^51). */
export function focusOf(chains: Chain[], press: Press | null, hover: Hover | null): Focus | null {
  if (press?.kind === 'drag') {
    const { type, i, k, t } = press.drag.handle;
    return { road: press.road, type, i, k, t };
  }
  if (press?.kind === 'place') {
    const at = positionOf(chains, press.id);
    return at && { road: at.road, type: 'node', i: at.node };
  }
  const h = hover?.kind === 'handle' ? hover.handle : null;
  return h ? { road: h.road, type: h.type, i: h.i, k: h.k, t: h.t } : null;
}

export function handleAt(handles: RoadHandle[], info: PointerInfo): RoadHandle | null {
  const { pt, scale, touch } = info;
  return hitHandle(handles, pt, scale, touch) as RoadHandle | null;
}

/** The curve under the pointer, as near as a node is, but not within a node's gap (^137). */
export function curveAt(chains: Chain[], { pt, scale, touch }: PointerInfo): RoadHit | null {
  const hit = nearestOnChains(chains, pt, NODE_HIT_PX[touch ? 'touch' : 'mouse'] / scale);
  return hit && !nearNode(hit) ? hit : null;
}

export function hoverAt(
  drawn: Drawn,
  hits: { handles: RoadHandle[]; chains: Chain[] },
  info: PointerInfo,
  drawing: boolean,
): Hover | null {
  const handle = handleAt(hits.handles, info);
  if (handle) return { kind: 'handle', handle };
  const hit = curveAt(hits.chains, info);
  if (hit) return { kind: 'candidate', hit };
  return drawing ? previewOf(drawn, placementAt(info.pt)) : null;
}
