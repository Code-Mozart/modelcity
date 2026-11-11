import { describe, expect, it } from 'vitest';
import { loopLength } from '../curves/along';
import { dist } from '../curves/vec';
import { junctionGround } from '../testing/junctionGround';
import { laneChangeLines } from './laneChanges';

const g = junctionGround();
const near = (a: { x: number; y: number }, x: number, y: number) => dist(a, { x, y }) < 0.01;

describe('the dashed lines through extensions and merges (^1057)', () => {
  const lines = laneChangeLines(g);

  it('an extension on curves (^1055): the line starts at the node where the lanes part, half a lane left of the lane that goes on', () => {
    const line = lines.find((l) => near(l.pieces[0]!.P, 260 - 10.165, 1440 + 2.365 - 1.5));
    expect(line?.kind).toBe('dashed');
    // It ends where the added lane touches the lane that goes on, about 11 m on.
    expect(loopLength(line!.pieces)).toBeGreaterThan(10);
    expect(loopLength(line!.pieces)).toBeLessThan(13);
  });

  it('the ramps (^992): one line where the on-ramp merges and one where the off-ramp leaves', () => {
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});
