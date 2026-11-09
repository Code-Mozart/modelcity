import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { alongLoop, loopLength } from '../curves/along';
import { dist } from '../curves/vec';
import { fromFile } from '../project/file';
import { graphOf } from '../testing/graphHelpers';
import { dotsOf, surfaceOf } from './surface';
import { SAME_PLACE_M } from '../curves/tolerance';

const H = Math.PI / 2;
const STEP_M = 0.05;

const hat944 = JSON.parse(
  readFileSync(new URL('../../../docs/mocks/hat944.json', import.meta.url), 'utf8'),
);
const straight = graphOf(
  [
    [0, 0, 0],
    [20, 0, 0],
  ],
  [[0, 1, null]],
);
const cross = graphOf(
  [
    [-10, 0, 0],
    [10, 0, 0],
    [0, -10, H],
    [0, 10, H],
  ],
  [
    [0, 1, null],
    [2, 3, null],
  ],
);

describe('a dot walking the skin of every polygon proves it proper (^948)', () => {
  const maps = { straight, cross, hat944: fromFile(hat944).graph };

  for (const [name, graph] of Object.entries(maps)) {
    it(`${name}: each loop is closed, joined end to start, and has a length`, () => {
      for (const loop of surfaceOf(graph)) {
        expect(loopLength(loop)).toBeGreaterThan(0);
        loop.forEach((p, i) => {
          const next = loop[(i + 1) % loop.length]!;
          expect(dist(p.Q, next.P)).toBeLessThan(SAME_PLACE_M);
        });
      }
    });

    it(`${name}: the dot never jumps and comes back to where it began after one round`, () => {
      for (const loop of surfaceOf(graph)) {
        const total = loopLength(loop);
        let before = alongLoop(loop, 0)!;
        for (let s = STEP_M; s <= total + STEP_M; s += STEP_M) {
          const now = alongLoop(loop, s)!;
          expect(dist(before, now)).toBeLessThan(STEP_M + SAME_PLACE_M);
          before = now;
        }
        expect(dist(alongLoop(loop, total)!, alongLoop(loop, 0)!)).toBeLessThan(SAME_PLACE_M);
      }
    });
  }

  it('goes round: past the end it starts again, and backwards from the start it comes to the end', () => {
    const [loop] = surfaceOf(straight);
    const total = loopLength(loop!);
    expect(dist(alongLoop(loop!, total + 1)!, alongLoop(loop!, 1)!)).toBeLessThan(1e-9);
    expect(dist(alongLoop(loop!, -1)!, alongLoop(loop!, total - 1)!)).toBeLessThan(1e-9);
  });

  it('one dot per polygon: one for a crossing, none for an empty map', () => {
    expect(dotsOf(surfaceOf(cross), 3)).toHaveLength(1);
    expect(dotsOf([], 3)).toEqual([]);
  });
});
