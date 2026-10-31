import { describe, expect, it } from 'vitest';
import { appendNode, edgesOf } from './path';
import { startRoad } from './roads';

describe('edges are kept per path (performance)', () => {
  it('returns the same edges for the same path object, new ones for a changed path', () => {
    const road = appendNode(startRoad([], { x: 0, y: 0 }).roads[0]!, { x: 10, y: 5 }).path;
    expect(edgesOf(road)).toBe(edgesOf(road));
    const longer = appendNode(road, { x: 20, y: 0 }).path;
    expect(edgesOf(longer)).not.toBe(edgesOf(road));
    expect(edgesOf(longer)).toHaveLength(2);
  });
});
