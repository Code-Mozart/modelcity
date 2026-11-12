import { describe, expect, it } from 'vitest';
import { loopLength } from '../curves/along';
import { dist } from '../curves/vec';
import { junctionGround } from '../testing/junctionGround';
import { derivedNodes, withDerived } from './derived';
import { laneChangeLines, laneChangesOf } from './laneChanges';

const g = junctionGround();
const d = withDerived(g, derivedNodes(g));
const changes = laneChangesOf(d);
const near = (a: { x: number; y: number }, x: number, y: number) => dist(a, { x, y }) < 0.01;
const at = (x: number, y: number) => changes.filter((c) => near(c.node, x, y));

describe('extensions and merges (^1056)', () => {
  it('the curved extension (^1055): a lane added on the left, the other lane cut at the tower', () => {
    const [c] = at(260 - 10.165, 1440 + 2.365);
    expect(c).toMatchObject({ kind: 'extension', side: 'left' });
    expect(c!.going.every((e) => e.id < 0)).toBe(true);
  });

  it('two merges (^1060): one lane ends, once', () => {
    const found = at(520 + 1.764, 1440 - 1.192);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'merge', side: 'left' });
  });
});

describe('the dashed lines through them (^1057)', () => {
  it('the curved extension: from the node where the lanes part, half a lane to the left, as far as the tower', () => {
    const lines = laneChangeLines(d, at(260 - 10.165, 1440 + 2.365));
    expect(lines).toHaveLength(1);
    expect(near(lines[0]!.pieces[0]!.P, 260 - 10.165, 1440 + 2.365 - 1.5)).toBe(true);
    expect(loopLength(lines[0]!.pieces)).toBeGreaterThan(10);
    expect(loopLength(lines[0]!.pieces)).toBeLessThan(13);
  });

  it('one line for each piece of the lane that goes on, from the node to the tower', () => {
    expect(laneChangeLines(d, changes)).toHaveLength(
      changes.reduce((n, c) => n + c.going.length, 0),
    );
  });
});
