import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pieceLength, pointOn } from '../curves/piece';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist } from '../curves/vec';
import { insideLoops } from '../curves/union';
import { fromFile } from '../project/file';
import { derivedNodes, withDerived } from './derived';
import { markingsOf } from './markings';
import { surfaceOf } from './surface';

/** The project of the user with six lanes, splits, merges and bends (^959). */
const graph = fromFile(
  JSON.parse(readFileSync(new URL('../../../docs/mocks/hat959.json', import.meta.url), 'utf8')),
).graph;
const seen = withDerived(graph, derivedNodes(graph));
const markings = markingsOf(seen);

describe('the markings of the project 6-lanes (^959)', () => {
  it('has eight lines, two of them solid', () => {
    const kinds = markings.map((m) => m.kind).sort();
    // 3+3 lanes: four dashed and one solid; the west: one solid (W|E) and two dashed (E|E) that go on from the 6 lanes or from the lanes of the south.
    expect(kinds.filter((k) => k === 'solid')).toHaveLength(2);
    expect(kinds).toHaveLength(8);
  });

  it('every line is made of pieces with a length that follow each other (^960)', () => {
    for (const m of markings) {
      m.pieces.forEach((p, i) => {
        expect(pieceLength(p)).toBeGreaterThan(1e-3);
        const next = m.pieces[i + 1];
        if (next) expect(dist(p.Q, next.P)).toBeLessThan(SAME_PLACE_M);
      });
    }
  });

  it('every line lies on the road surface (^960: no ticks across or beside the road)', () => {
    const loops = surfaceOf(graph);
    for (const m of markings) {
      for (const p of m.pieces) {
        for (const t of [0.05, 0.25, 0.5, 0.75, 0.95]) {
          expect(insideLoops(loops, pointOn(p, t))).toBe(true);
        }
      }
    }
  });

  it('a line that goes on across a node is one line, whichever end it was found from (^961)', () => {
    const xs = (m: (typeof markings)[number]) => m.pieces.flatMap((p) => [p.P.x, p.Q.x]);
    const west = markings.filter((m) => Math.min(...xs(m)) < -180);
    expect(west.map((m) => m.kind).sort()).toEqual(['dashed', 'solid']);
    // The dashed line of the two westbound lanes runs from the 6 lanes in the east to the end in the west.
    const dashed = west.find((m) => m.kind === 'dashed')!;
    expect(Math.max(...xs(dashed))).toBeGreaterThan(40);
    // The solid one from the tower of five nodes to the end in the west.
    const solid = west.find((m) => m.kind === 'solid')!;
    expect(Math.max(...xs(solid))).toBeLessThan(-60);
    expect(Math.max(...xs(solid))).toBeGreaterThan(-70);
  });
});
