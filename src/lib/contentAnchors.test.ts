import { describe, expect, it } from 'vitest';
import { contentAnchors } from './contentAnchors';
import { fixture } from './curves/testing/paths';
import { edgesOfRoads } from './curves/roads';

const anchorsOf = (roads: ReturnType<typeof fixture>[]) =>
  contentAnchors(roads, edgesOfRoads(roads));

describe('contentAnchors (^38)', () => {
  it('covers every node, its heading tip, and the edge handles', () => {
    const path = fixture('H');
    const anchors = anchorsOf([path]);
    expect(anchors.filter((a) => a.heading !== undefined)).toHaveLength(path.nodes.length);
    // 4 nodes + 4 heading tips + per bend edge: the blue point and the radius ring.
    expect(anchors).toHaveLength(4 + 4 + 3 * 2);
    expect(anchors.every((a) => a.r > 0)).toBe(true);
  });

  it('is empty without roads', () => {
    expect(anchorsOf([])).toEqual([]);
  });

  it('covers all roads', () => {
    const one = anchorsOf([fixture('G')]).length;
    expect(anchorsOf([fixture('G'), fixture('G')])).toHaveLength(2 * one);
  });

  it('includes the turquoise points of a hook', () => {
    expect(anchorsOf([fixture('hook')]).length).toBeGreaterThan(2 + 2 + 2);
  });
});
