import { sweeps } from '../curves/piece';
import type { SnapHit } from '../snap/types';

/** The radii of the arcs of the curves a hit snapped to (^830). */
export const arcRadii = (hit: SnapHit): number[] =>
  hit.by.flatMap((s) =>
    s.kind === 'curve' ? s.pieces.flatMap((p) => (sweeps(p) ? [p.r] : [])) : [],
  );

/** Whether the snap is a snap line, not the curve of a segment or its offset (^319). */
export const onLine = (hit: SnapHit): boolean => {
  const s = hit.by[0];
  return s?.kind === 'curve' && s.straight && s.rule !== 'curve' && s.rule !== 'offset';
};
