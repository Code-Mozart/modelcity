import { describe, expect, it } from 'vitest';
import { suggestionsOfGraph } from '../editor/snapping';
import { mapOf } from '../testing/snapHelpers';
import { snapTo } from './engine';
import { headingSources, snapOrigins } from './heading';
import type { SnapCurve, Suggestion } from './types';

/** A bend: heading east at the origin, 60° up to the right at the second node. */
const bend = () => {
  const g = mapOf([
    [
      [0, 0],
      [40, -23],
    ],
  ]);
  return suggestionsOfGraph({
    ...g,
    nodes: g.nodes.map((n) => ({ ...n, th: n.id === 0 ? 0 : -Math.PI / 3 })),
  });
};
const at = (list: Suggestion[], x: number, y: number) =>
  snapTo(list, { pt: { x, y }, scale: 10, pinned: [] });
const places = (os: { at: { x: number; y: number } }[]) =>
  os.map((o) => `${o.at.x.toFixed(2)},${o.at.y.toFixed(2)}`).sort();

describe('the origins of a snap (^803)', () => {
  it('only the node whose line it is, not the other node of a segment that has a line there too', () => {
    // Above the first node, on its normal line (the arc of the bend starts a little further along).
    const hit = at(bend(), 0, -12);
    expect(places(snapOrigins(hit))).toEqual(['0.00,0.00']);
    expect(places(headingSources(hit, false))).toEqual(['0.00,0.00']);
  });

  it('the radius points are origins too: their points and the lines at their ticks', () => {
    const list = bend();
    const ticks = list.filter((s): s is SnapCurve => s.rule === 'tick');
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    for (const t of ticks) {
      const origin = t.gives![0]!.origin!;
      expect(origin.th).toBeDefined();
      // A snap made of the line has the point it comes from as its origin, and its heading arrow too.
      const hit = { pt: origin.at, heading: null, by: [t] };
      expect(places(snapOrigins(hit))).toEqual(places([origin]));
      expect(places(headingSources(hit, false))).toEqual(places([origin]));
    }
    const radius = list.filter((s) => s.rule === 'radius-point');
    expect(radius.length).toBeGreaterThanOrEqual(2);
    expect(radius.every((s) => s.origin !== undefined)).toBe(true);
  });

  it('the bisector of a bend comes from the middle radius point', () => {
    const [bisector] = bend().filter((s) => s.rule === 'bend');
    expect(bisector?.kind === 'curve' && bisector.gives?.[0]?.origin).toBeTruthy();
  });
});
