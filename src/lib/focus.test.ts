import { describe, expect, it } from 'vitest';
import { touchesEdge, type Focus } from './focus';
import type { HandleType } from './curves/handles';

const at = (type: HandleType, i: number, road = 0): Focus => ({ road, type, i });

describe('touchesEdge (^60)', () => {
  it('is false without focus or on another road', () => {
    expect(touchesEdge(null, 0, 0)).toBe(false);
    expect(touchesEdge(at('node', 0, 1), 0, 0)).toBe(false);
  });

  it('a node or heading touches both edges that meet at it', () => {
    expect(touchesEdge(at('node', 2), 0, 1)).toBe(true);
    expect(touchesEdge(at('node', 2), 0, 2)).toBe(true);
    expect(touchesEdge(at('head', 2), 0, 2)).toBe(true);
    expect(touchesEdge(at('node', 2), 0, 0)).toBe(false);
    expect(touchesEdge(at('node', 2), 0, 3)).toBe(false);
  });

  it('the blue, turquoise and orange points touch their own edge only', () => {
    for (const type of ['ctrl', 's1', 's2', 'rad'] as const) {
      expect(touchesEdge(at(type, 1), 0, 1)).toBe(true);
      expect(touchesEdge(at(type, 1), 0, 0)).toBe(false);
      expect(touchesEdge(at(type, 1), 0, 2)).toBe(false);
    }
  });
});
