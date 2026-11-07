import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { violationsOf } from './violations';

describe('violations (^827)', () => {
  it('nodes side by side with the same or the opposite heading are fine', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [0, 3, 0],
        [0, 6, Math.PI],
      ],
      [],
    );
    expect(violationsOf(g)).toEqual([]);
  });

  it('touching nodes with another heading are a violation (^254)', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [0, 3, 0.5],
      ],
      [],
    );
    expect(violationsOf(g)).toEqual([{ kind: 'nodes', node: 0, other: 1 }]);
  });

  it('nodes that merely are not a lane width apart are fine, whatever they head', () => {
    expect(
      violationsOf(
        graphOf(
          [
            [0, 0, 0],
            [0, 3.01, 0.5],
          ],
          [],
        ),
      ),
    ).toEqual([]);
  });
});

describe('violations of a node and a segment (^827)', () => {
  it('a node on the offset curve of a segment that heads another way is a violation (^818)', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [30, 0, 0],
        [10, 3, 0.5],
        [10, 20, 0.5],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(violationsOf(g).map((v) => v.kind)).toEqual(['segment']);
  });

  it('the same node heading along the segment is fine', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [30, 0, 0],
        [10, 3, 0],
        [20, 3, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(violationsOf(g)).toEqual([]);
  });
});
