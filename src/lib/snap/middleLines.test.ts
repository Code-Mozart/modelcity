import { describe, expect, it } from 'vitest';
import { suggestionsOfGraph } from '../editor/snapping';
import { mapOf } from '../testing/snapHelpers';
import type { Suggestion } from './types';

const gift = (s: Suggestion | undefined) => (s?.kind === 'curve' ? s.gives?.[0] : undefined);

describe('the lines across the middle of a segment (^798, ^799)', () => {
  it('a straight segment has a line across its middle, with the heading of the segment', () => {
    const list = suggestionsOfGraph(
      mapOf([
        [
          [0, 0],
          [30, 0],
        ],
      ]),
    );
    const middle = list.filter((s) => s.rule === 'middle');
    expect(middle).toHaveLength(1);
    const line = middle[0]!;
    expect(line.kind === 'curve' && line.origins[0]).toMatchObject({ x: 15, y: 0 });
    expect(gift(line)?.heading).toBeCloseTo(0);
  });

  it('the bisector of a bend gives the heading of the curve there, its tangent line goes along itself', () => {
    const g = mapOf([
      [
        [0, 0],
        [50, 30],
      ],
    ]);
    const bent = { ...g, nodes: g.nodes.map((n) => ({ ...n, th: n.id === 0 ? 0 : Math.PI / 2 })) };
    const [bisector, tangent] = suggestionsOfGraph(bent).filter((s) => s.rule === 'bend');
    expect(gift(bisector)?.heading).toBeDefined();
    expect(gift(tangent)?.along).toBe(true);
    expect(gift(tangent)?.heading).toBeUndefined();
  });
});
