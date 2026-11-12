import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loopLength } from '../curves/along';
import { distanceToPiece } from '../curves/piece';
import { fromFile, type ProjectFile } from '../project/file';
import { derivedNodes, withDerived } from './derived';
import { junctionEdgeIds, laneFactsOf } from './laneFacts';
import { markingsOf } from './markings';
import { surfaceOf } from './surface';

/** The user's project *t-junction-bugs* (^1105): three T and Y junctions, one on a bend with arcs of 209 m. */
const file = JSON.parse(
  readFileSync(new URL('../../../docs/mocks/hat1105.json', import.meta.url), 'utf8'),
) as ProjectFile;
const { graph: g } = fromFile(file);
const facts = laneFactsOf(g);
const has = (id: number) => facts.some((f) => f.node.id === id);

describe('the road surface of a bend with big arcs (^1107)', () => {
  const loops = surfaceOf(g);

  it('has no stray piece and no loop that is cut in two', () => {
    expect(loops.every((l) => l.length > 2)).toBe(true);
    // The road of segments 105 to 117 is one outline of more than 20 pieces.
    expect(loops.filter((l) => l.length > 20)).toHaveLength(1);
  });

  it('every loop closes: each piece begins where the one before it ends', () => {
    for (const loop of loops) {
      loop.forEach((p, i) => {
        const next = loop[(i + 1) % loop.length]!;
        expect(Math.hypot(p.Q.x - next.P.x, p.Q.y - next.P.y)).toBeLessThan(0.01);
      });
    }
    expect(loops.map(loopLength).every((n) => n > 2)).toBe(true);
  });
});

describe('the lanes in of the T junctions (^1105, ^1106)', () => {
  it('the leaf nodes of a road (76, 78, 104, 111) are not lanes in: nothing comes before them', () => {
    for (const id of [76, 78, 104, 111]) expect(has(id)).toBe(false);
  });

  it('the nodes where lanes merge (80, 113) are not lanes in: lanes arrive there', () => {
    for (const id of [80, 113]) expect(has(id)).toBe(false);
  });

  it('a junction drawn with nodes of its own (83, 84 of the left T) has all its turns: no arrow', () => {
    expect(
      facts.filter((f) => [83, 84, 112, 108].includes(f.node.id)).map((f) => f.incomplete),
    ).toEqual([null, null, null, null]);
  });
});

describe('the lines between lanes (^1104, ^1106)', () => {
  const d = withDerived(g, derivedNodes(g));
  const lines = markingsOf(d, { physical: false, inside: junctionEdgeIds(g) });
  const onLine = (x: number, y: number) =>
    lines.some((m) => m.pieces.some((p) => distanceToPiece(p, { x, y }) < 0.05));

  it('run between the two lanes of an arm that is not inside the junction: 76 and 78, 101 and 103', () => {
    expect(onLine(-60, -80.252)).toBe(true);
    // Between the nodes 110 and 111 at the end of the arm, four meters towards the junction.
    expect(onLine(71.85, -85.17)).toBe(true);
  });

  it('none through the junction itself: the lanes of 83 to 85, a place in the middle of the left T', () => {
    expect(onLine(-72, -79.5)).toBe(false);
  });
});
