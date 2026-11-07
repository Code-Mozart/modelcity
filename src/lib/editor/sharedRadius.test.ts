import { describe, expect, it } from 'vitest';
import { edgeOfId, withRadius, type Graph } from '../model/graph';
import { bendsBothWays, threeBends, twoBends } from '../testing/graphHelpers';
import { chainsOf } from './chains';
import { controlTower } from './parallel';
import { followingTower, shareConcentric, sharedWith } from './sharedRadius';

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

describe('what follows when a radius point is dragged, with any selection (^832)', () => {
  const g = threeBends();
  const nodesOf = (edge: number) => [2 * edge, 2 * edge + 1];

  it('only the dragged segment itself selected: it changes alone', () => {
    for (const own of [0, 1, 2]) expect(ids(sharedWith(g, nodesOf(own), own))).toEqual([own]);
  });

  it('any other segment selected, one of the middle ones too: all of them change, as with nothing selected', () => {
    for (const own of [0, 1, 2]) {
      for (const other of [0, 1, 2].filter((x) => x !== own)) {
        expect(ids(sharedWith(g, nodesOf(other), own)).sort()).toEqual([0, 1, 2]);
      }
      expect(ids(sharedWith(g, [...nodesOf(0), ...nodesOf(2)], own)).sort()).toEqual([0, 1, 2]);
    }
  });

  it('after the middle lane (segment 0) changed alone it is not parallel to its neighbours: they are two groups', () => {
    const own = 0;
    const alone = shareConcentric(withRadius(g, own, 25), own, sharedWith(g, nodesOf(own), own));
    expect(ids(sharedWith(alone, [], 1))).toEqual([1]);
    expect(ids(sharedWith(alone, [], 2))).toEqual([2]);
  });
});

describe('the line through interlocked control points (^344)', () => {
  const length = (l: { p: { x: number; y: number }; q: { x: number; y: number } } | null) =>
    Math.hypot(l!.p.x - l!.q.x, l!.p.y - l!.q.y);

  it('through the middle radius points: from the outermost to the innermost, one lane width', () => {
    expect(length(controlTower(lanes(), 0, 1, 0.5))).toBeCloseTo(3, 1);
  });

  it('through the end radius points, across the lanes on that side (a vertical or horizontal line)', () => {
    for (const t of [0, 1]) expect(length(controlTower(threeBends(), 0, 1, t))).toBeCloseTo(6, 1);
  });

  it('across the end points at the same end, also for a segment that runs the other way (^360)', () => {
    const g = bendsBothWays();
    for (const [t, axis] of [
      [0, 'x'],
      [1, 'y'],
    ] as const) {
      const line = controlTower(g, 0, 1, t)!;
      expect(length(line)).toBeCloseTo(6, 1);
      expect(line.p[axis]).toBeCloseTo(line.q[axis], 6); // vertical at the start, horizontal at the end
      expect(line.others).toHaveLength(2);
    }
  });

  it('none without a parallel segment', () => {
    expect(controlTower(lanes(5, 14), 0, 1, 0.5)).toBeNull();
  });
});

describe('the line through the radius points shows only when the parallels follow (^832)', () => {
  const g = twoBends();
  const chains = chainsOf(g);
  const road = chains.findIndex((c) => c.edgeIds.includes(0));
  const focus = { road, type: 'rad' as const, i: chains[road]!.edgeIds.indexOf(0), k: 1, t: 0.5 };

  it('nothing selected, or other nodes as well: it shows', () => {
    expect(followingTower(g, chains, focus, [])).not.toBeNull();
    expect(followingTower(g, chains, focus, [0, 1, 2])).not.toBeNull();
  });

  it('only the two nodes of its own segment selected: it changes alone, no line', () => {
    expect(followingTower(g, chains, focus, [0, 1])).toBeNull();
  });

  it('a segment without parallels has none either way', () => {
    const lone = twoBends(5, 14);
    const c = chainsOf(lone);
    expect(
      followingTower(lone, c, { ...focus, road: c.findIndex((x) => x.edgeIds.includes(0)) }, []),
    ).toBeNull();
  });

  it('a selected segment that is not parallel gets the radius but is no point of the line', () => {
    const apart = twoBends(5, 14);
    const c = chainsOf(apart);
    const road = c.findIndex((x) => x.edgeIds.includes(0));
    const own = { ...focus, road, i: c[road]!.edgeIds.indexOf(0) };
    expect(followingTower(apart, c, own, [0, 1, 2, 3])).toBeNull();
  });

  it('three lanes: the line runs through all that follow, from a selected one or not', () => {
    const three = threeBends();
    const c = chainsOf(three);
    const road = c.findIndex((x) => x.edgeIds.includes(0));
    const own = { ...focus, road, i: c[road]!.edgeIds.indexOf(0) };
    const some = followingTower(three, c, own, [])!;
    expect(some.others).toHaveLength(2);
    expect(followingTower(three, c, own, [2, 3])!.others).toHaveLength(2);
  });
});
