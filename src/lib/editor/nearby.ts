import { SAME_PLACE_M } from '../curves/tolerance';
import { dist, type Vec } from '../curves/vec';
import { nearbyPoints } from '../snap/engine';
import type { SnapHit, Suggestion } from '../snap/types';
import { reachOf, snaps, type SnapArgs } from './snapping';

/** The snap points to show around the pointer while it places or moves a node (^890): not the one it is snapped to, drawn anyway, nor the places the moved nodes were (^113). */
export function pointsAround(base: Suggestion[], a: SnapArgs, snapped: SnapHit | null): Vec[] {
  const { info } = a;
  if (!info || info.ctrl || !snaps(a)) return [];
  const q = {
    pt: info.pt,
    scale: info.scale,
    touch: info.touch,
    pinned: a.pinned,
    reach: reachOf(a.press, a.partOf),
  };
  return nearbyPoints(base, q)
    .filter((s) => s.rule !== 'previous' && !(snapped && dist(snapped.pt, s.at) < SAME_PLACE_M))
    .map((s) => s.at);
}
