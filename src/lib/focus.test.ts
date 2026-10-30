import { describe, expect, it } from 'vitest';
import { revealed, type Focus } from './focus';
import type { HandleType } from './curves/handles';

const at = (type: HandleType, i: number, road = 0): Focus => ({ road, type, i });
const both = { guides: true, labels: true };
const none = { guides: false, labels: false };

describe('revealed (^51)', () => {
  it('shows nothing without focus or on another road', () => {
    expect(revealed(null, 0, 0)).toEqual(none);
    expect(revealed(at('node', 0, 1), 0, 0)).toEqual(none);
  });

  it('a hovered node or heading reveals both edges that meet at it', () => {
    expect(revealed(at('node', 2), 0, 1)).toEqual(both);
    expect(revealed(at('node', 2), 0, 2)).toEqual(both);
    expect(revealed(at('head', 2), 0, 2)).toEqual(both);
    expect(revealed(at('node', 2), 0, 0)).toEqual(none);
    expect(revealed(at('node', 2), 0, 3)).toEqual(none);
  });

  it('the blue and turquoise points reveal the guides of their edge only', () => {
    for (const type of ['ctrl', 's1', 's2'] as const) {
      expect(revealed(at(type, 1), 0, 1)).toEqual({ guides: true, labels: false });
      expect(revealed(at(type, 1), 0, 0)).toEqual(none);
    }
  });

  it('the orange ring reveals the radius labels of its edge only', () => {
    expect(revealed(at('rad', 1), 0, 1)).toEqual({ guides: false, labels: true });
    expect(revealed(at('rad', 1), 0, 2)).toEqual(none);
  });
});
