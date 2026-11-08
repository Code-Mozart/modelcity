import { hitHandle, NODE_HIT_PX } from '../curves/handles';
import { dist } from '../curves/vec';
import type { DerivedNode } from './derived';
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
} from './chains';
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

/** A derived node under the pointer, as a place on its segment, in select mode (^824). */
function derivedAt(
  hits: { chains: Chain[]; derived: DerivedNode[] },
  { pt, scale, touch }: PointerInfo,
): Extract<Hover, { kind: 'candidate' }> | null {
  const reach = NODE_HIT_PX[touch ? 'touch' : 'mouse'] / scale;
  const d = hits.derived.find((x) => dist(x, pt) < reach);
  const hit = d && nearestOnChains(hits.chains, d, reach);
  return hit ? { kind: 'candidate', hit, derived: true } : null;
}

export function hoverAt(
  drawn: Drawn,
  hits: { handles: RoadHandle[]; chains: Chain[]; derived: DerivedNode[] },
  info: PointerInfo,
  drawing: boolean,
): Hover | null {
  const handle = handleAt(hits.handles, info);
  const derived = drawing ? null : derivedAt(hits, info);
  // A control point always wins over a derived node at the same place (^862): the derived node can still be reached another way.
  if (handle) return { kind: 'handle', handle };
  if (derived) return derived;
  const hit = curveAt(hits.chains, info);
  if (hit) return { kind: 'candidate', hit };
  return drawing ? previewOf(drawn, placementAt(info.pt)) : null;
}
