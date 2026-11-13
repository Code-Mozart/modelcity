import { describe, expect, it } from 'vitest';
import { Memo } from '../curves/memo';
import { unionOutline, UnionMemory } from '../curves/union';
import { moveNodes, placed, removeNodes, type Graph } from '../model/graph';
import { connectedMap } from '../testing/samples';
import { clipToSurface } from './clip';
import { hullsOf } from './corners';
import { derivedNodes, withDerived } from './derived';
import { junctionEdgeIds } from './laneFacts';
import { markingsOf } from './markings';
import { hullPieces, surfaceFrom } from './surface';

/** A deterministic sequence of numbers in [0, 1). */
const random = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** What the union and the clipped lines are after an edit with what they remember from before, and without (^941). */
function both(g: Graph, memo: UnionMemory, clip: Memo<[number, number][]>) {
  const hulls = hullsOf(g);
  const regions = hulls.map((h) => hullPieces(h.hull));
  const fast = unionOutline(regions, memo);
  const fresh = unionOutline(regions);
  const seen = withDerived(g, derivedNodes(g));
  const inside = junctionEdgeIds(g);
  const lines = markingsOf(seen, { physical: false, extra: [], inside });
  return {
    fast,
    fresh,
    clipped: clipToSurface(lines, fresh, clip),
    plain: clipToSurface(lines, fresh, new Memo()),
  };
}

describe('what is remembered from the last edit gives what a run without memory gives (^941)', () => {
  it.each([7, 11, 23])(
    'on random edits of a connected map (seed %i)',
    (seed) => {
      const [memo, clip] = [new UnionMemory(), new Memo<[number, number][]>()];
      const next = random(seed);
      let g = connectedMap(4);
      for (let step = 0; step < 12; step++) {
        const r = both(g, memo, clip);
        expect(r.fast).toEqual(r.fresh);
        expect(r.clipped).toEqual(r.plain);
        const n = g.nodes[Math.floor(next() * g.nodes.length)]!;
        g =
          step % 4 === 3
            ? removeNodes(g, [n.id], null)
            : moveNodes(g, placed(g, [n.id]), { x: (next() - 0.5) * 20, y: (next() - 0.5) * 20 });
      }
    },
    60_000,
  );

  it('surfaceFrom is the same with and without memory', () => {
    const g = connectedMap(4);
    expect(surfaceFrom(hullsOf(g))).toEqual(
      unionOutline(hullsOf(g).map((h) => hullPieces(h.hull))),
    );
  });
});
