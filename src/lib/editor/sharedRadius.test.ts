import { describe, expect, it } from 'vitest';
import { edgeOfId, withRadius, type Graph } from '../model/graph';
import { threeBends, twoBends } from '../testing/graphHelpers';
import { chainsOf } from './chains';
import { parallelLinks } from './parallel';
import { shareConcentric, sharedWith } from './sharedRadius';

const lanes = twoBends;

const arcCenter = (g: Graph, edge: number) => {
  const ch = chainsOf(g).find((c) => c.edgeIds.includes(edge))!;
  const piece = ch.edges[ch.edgeIds.indexOf(edge)]!.E.pieces.find((p) => p.type === 'arc')!;
  return piece.type === 'arc' ? piece.c : null;
};

const ids = (plan: { id: number }[]) => plan.map((p) => p.id);

describe('shared radius of parallel segments (^77, ^282)', () => {
  it('parallel segments get the concentric radius, not the same one', () => {
    const g = lanes();
    const plan = sharedWith(g, [], 0);
    const shared = shareConcentric(withRadius(g, 0, 25), 0, plan);
    expect(edgeOfId(shared, 0)!.radius).toBe(25);
    expect(edgeOfId(shared, 1)!.radius).toBeCloseTo(22, 6);
    const [c0, c1] = [arcCenter(shared, 0)!, arcCenter(shared, 1)!];
    expect(c1.x).toBeCloseTo(c0.x, 6);
    expect(c1.y).toBeCloseTo(c0.y, 6);
  });

  it('segments that are not parallel get the same radius, as before', () => {
    const g = lanes(5, 14);
    const shared = shareConcentric(g, 0, sharedWith(g, [0, 1, 2, 3], 0));
    expect(edgeOfId(shared, 1)!.radius).toBe(20);
  });

  it('segments that touch but are not concentric are not parallel: they get the same value (^334)', () => {
    const g = lanes(3, 10);
    expect(sharedWith(g, [0, 1, 2, 3], 0).every((p) => p.delta === 0)).toBe(true);
    expect(edgeOfId(shareConcentric(g, 0, sharedWith(g, [0, 1, 2, 3], 0)), 1)!.radius).toBe(20);
  });
});

describe('parallel segments stay concentric unless the segment alone is selected (^302)', () => {
  const g = lanes();
  it('nothing selected, or one node of the other segment as well: both change', () => {
    expect(ids(sharedWith(g, [], 0))).toEqual([0, 1]);
    expect(ids(sharedWith(g, [0, 1, 2], 0))).toEqual([0, 1]);
  });
  it('only its own two nodes selected: it changes alone', () => {
    expect(ids(sharedWith(g, [0, 1], 0))).toEqual([0]);
  });
});

describe('more than two lanes on top of each other (^302)', () => {
  it('all lanes follow, whichever is dragged, and keep their offsets', () => {
    for (const own of [0, 1, 2]) {
      const g = threeBends();
      const was = g.edges.map((e) => e.radius!);
      const next = withRadius(g, own, was[own]! + 7);
      const shared = shareConcentric(next, own, sharedWith(g, [], own));
      shared.edges.forEach((e, i) => expect(e.radius).toBeCloseTo(was[i]! + 7, 6));
    }
  });
});

describe('the link between parallel segments (^344)', () => {
  it('a short line through their middles, on the bisector, one lane width long', () => {
    const g = lanes();
    const links = parallelLinks(g, [0]);
    expect(links).toHaveLength(1);
    expect(Math.hypot(links[0]!.p.x - links[0]!.q.x, links[0]!.p.y - links[0]!.q.y)).toBeCloseTo(
      3,
      1,
    );
    expect(parallelLinks(lanes(5, 14), [0])).toHaveLength(0);
  });
});
