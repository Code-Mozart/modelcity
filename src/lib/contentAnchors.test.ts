import { describe, expect, it } from 'vitest';
import { contentAnchors } from './contentAnchors';
import { edgesOf } from './curves/path';
import { preset } from './curves/presets';

describe('contentAnchors (^38)', () => {
  it('covers every node, its heading tip, and the edge handles', () => {
    const path = preset('H');
    const anchors = contentAnchors(path, edgesOf(path));
    expect(anchors.filter((a) => a.heading !== undefined)).toHaveLength(path.nodes.length);
    // 4 nodes + 4 heading tips + per bend edge: the blue point and the radius ring.
    expect(anchors).toHaveLength(4 + 4 + 3 * 2);
    expect(anchors.every((a) => a.r > 0)).toBe(true);
  });

  it('is empty for an empty path', () => {
    expect(contentAnchors({ nodes: [], radii: [], shapes: [] }, [])).toEqual([]);
  });

  it('includes the turquoise points of a hook', () => {
    const path = preset('hook');
    const kinds = contentAnchors(path, edgesOf(path)).length;
    expect(kinds).toBeGreaterThan(2 + 2 + 2);
  });
});
