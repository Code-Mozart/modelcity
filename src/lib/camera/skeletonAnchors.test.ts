import { describe, expect, it } from 'vitest';
import { skeletonAnchors } from './skeletonAnchors';
import { isDegenerate } from '../curves/piece';
import { chainsOf } from '../model/chains';
import { graphOfPaths } from '../testing/graphs';
import { fixture } from '../curves/testing/paths';

const anchorsOf = (roads: ReturnType<typeof fixture>[]) =>
  skeletonAnchors(chainsOf(graphOfPaths(roads)));

describe('skeletonAnchors (^62)', () => {
  it('covers the node dots and the pieces of the curves, and nothing else', () => {
    const path = fixture('H');
    const anchors = anchorsOf([path]);
    expect(anchors.filter((a) => a.kind === 'point')).toHaveLength(path.nodes.length);
    const pieces = chainsOf(graphOfPaths([path]))[0]!
      .edges.flatMap((e) => e.E.pieces)
      .filter((p) => !isDegenerate(p));
    expect(anchors.filter((a) => a.kind === 'piece')).toHaveLength(pieces.length);
    expect(anchors).toHaveLength(path.nodes.length + pieces.length);
  });

  it('is empty without roads', () => {
    expect(anchorsOf([])).toEqual([]);
  });

  it('covers all roads', () => {
    const one = anchorsOf([fixture('G')]).length;
    expect(anchorsOf([fixture('G'), fixture('hook')]).length).toBeGreaterThan(one);
  });

  it('does not grow with far-away control points: a bend with a distant corner is just its curve', () => {
    const wide = {
      ...fixture('G'),
      nodes: fixture('G').nodes.map((n) => ({ ...n, th: n.th + 0.02 })),
    };
    const box = anchorsOf([wide]).filter((a) => a.kind === 'point');
    expect(box).toHaveLength(2);
  });
});
