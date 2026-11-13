import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { junctionGround } from '../testing/junctionGround';
import { derivedNodes } from './derived';

describe('the derived nodes of the testing ground of the junctions (^940)', () => {
  it('are the ones, in the order, that they were before the grids: a derived node does not touch (^822)', () => {
    const d = derivedNodes(junctionGround());
    const sum = createHash('sha1')
      .update(
        JSON.stringify(
          d.map((n) => [n.id, n.edge, n.kind, Math.round(n.x * 1000), Math.round(n.y * 1000)]),
        ),
      )
      .digest('hex');
    // Made by the code of main before the performance milestone (PR #57).
    expect([sum, d.length]).toEqual(['a1adcfc2c016bb0e4a1f81505bf5820c615c908a', 125]);
  });
});
