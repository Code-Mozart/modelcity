import { describe, expect, it } from 'vitest';
import { at, editing } from '../testing/editHarness';
import { edge, node } from '../testing/loadedMap';

describe('delete branch (^160)', () => {
  /** A road of five nodes along the x axis, 100 m apart, and a node beside it that is not on it. */
  const road = [1, 2, 3, 4, 5].map((i) => node(i, (i - 3) * 100, 0));
  const chain = [edge(10, 1, 2), edge(11, 2, 3), edge(12, 3, 4), edge(13, 4, 5)];

  it('takes all segments of a branch that is longer than the one under the pointer, and the nodes', async () => {
    const { editor, rows, press } = await editing(road, chain);
    await editor.rightClick(press.pickAt(at(-130, 0)), true);
    const now = await rows();
    expect([now.nodes.length, now.edges.length]).toEqual([0, 0]);
    expect(editor.history.past.at(-1)?.name).toBe('delete branch');
  });

  it('stops at a split, and says when the branch goes on beyond what is loaded', async () => {
    const told: string[] = [];
    const split = [...road, node(6, 100, 100)];
    const { editor, rows, press } = await editing(split, [...chain, edge(14, 4, 6)], told);
    await editor.rightClick(press.pickAt(at(-130, 0)), true);
    // The branch is 1 - 2 - 3 - 4, where the road splits: node 4 stays with its two other segments.
    expect((await rows()).edges.map((e) => e[0])).toEqual([13, 14]);
    expect(told).toEqual([]);
  });
});

describe('a branch longer than what is loaded is deleted whole (^160, ^1260)', () => {
  it('the storage is followed, not the chunks in memory', async () => {
    const road = Array.from({ length: 12 }, (_, i) => node(i + 1, i * 300, 0));
    const chain = Array.from({ length: 11 }, (_, i) => edge(i + 10, i + 1, i + 2));
    const { editor, rows, press } = await editing(road, chain);
    await editor.rightClick(press.pickAt(at(150, 0)), true);
    const now = await rows();
    expect([now.nodes.length, now.edges.length]).toEqual([0, 0]);
  });
});
