import { describe, expect, it } from 'vitest';
import { derivedNodes, withDerived } from './derived';
import { junctionsOf } from './junctions';
import { hullsOf } from './corners';
import { guideLines } from './guides';
import { laneArrows, waitLines } from './junctionMarkings';
import { markingsOf } from './markings';
import { patched, holesOf, surfaceOf } from './surface';
import { junctionGround } from '../testing/junctionGround';

const g = junctionGround();
const junctions = junctionsOf(g);
const inArea = (x: number, y: number, r: number) => (p: { x: number; y: number }) =>
  Math.hypot(p.x - x, p.y - y) < r;

const hulls = hullsOf(g);

describe('the lines where traffic waits (^1038, ^1051)', () => {
  const lines = waitLines(g, junctions, hulls);
  const within = (x: number, y: number, r: number) => lines.filter((l) => inArea(x, y, r)(l.at));

  it('equal 1+1 roads (^985, ^988): a give-way line across the lane in of every arm', () => {
    expect(within(0, 0, 20)).toHaveLength(3);
    expect(within(0, 240, 20)).toHaveLength(4);
    expect(within(0, 240, 20).every((l) => l.kind === 'give way')).toBe(true);
  });

  it('priority (^986): no line, the dashed lines of the major direction mark it (^1048)', () => {
    expect(within(260, 0, 20)).toEqual([]);
  });

  it('traffic lights (^990): a solid stop line across every lane in, as wide as the lane', () => {
    const here = within(520, 240, 40);
    expect(here).toHaveLength(12);
    expect(here.every((l) => l.kind === 'stop' && l.width === 3)).toBe(true);
  });

  it('a line stands where its lane first meets another segment, not at its node (^1051)', () => {
    const [stop] = within(0, 240, 20);
    const node = g.nodes.find((n) => Math.hypot(n.x - stop!.at.x, n.y - stop!.at.y) < 0.01);
    expect(node).toBeUndefined();
  });
});

describe('the arrows painted on lanes (^1028, ^1029)', () => {
  const arrows = laneArrows(g, junctions, hulls);
  const at = (x: number, y: number, r: number) => arrows.filter((a) => inArea(x, y, r)(a.at));

  it('a lane of an arm of two lanes or more shows its sign, also plain straight (^989)', () => {
    expect(at(260, 240, 30).length).toBeGreaterThanOrEqual(4);
  });

  it('a single lane in shows its sign only if it is not plain straight; the split of the side road of a T is not painted (^1052)', () => {
    const t = at(0, 0, 30);
    expect(t).toHaveLength(2);
    expect(t.filter((a) => a.sign.kind === 'directions' && a.sign.left && a.sign.right)).toEqual(
      [],
    );
  });

  it('a lane that ends shows the lane-end arrow, on the lane before the shift (^991)', () => {
    const ends = at(-70, 480, 60).filter((a) => a.sign.kind === 'merge');
    expect(ends).toHaveLength(1);
    expect(ends[0]!.sign).toEqual({ kind: 'merge', side: 'left' });
  });
});

describe('the guide lines of junctions (^1048 to ^1050)', () => {
  const guides = guideLines(g, junctions);
  const near = (x: number, y: number, r: number) =>
    guides.filter((m) => m.pieces.some((p) => inArea(x, y, r)(p.P)));

  it('priority (^986): dashed lines along both sides of the major direction and none for the minor', () => {
    expect(near(260, 0, 14).length).toBeGreaterThanOrEqual(2);
    expect(near(260, 0, 14).every((m) => m.kind === 'dashed')).toBe(true);
  });

  it('equal roads (^985, ^988): none on the sides', () => {
    expect(near(0, 0, 14)).toEqual([]);
  });

  it('a junction of four ways or more: the left turns get a line on their left (^1049)', () => {
    expect(near(0, 240, 14).length).toBeGreaterThanOrEqual(4);
    expect(near(520, 960, 14).length).toBeGreaterThanOrEqual(1);
  });

  it('a lane beside another inside a junction keeps its centerline (^1050)', () => {
    const seen = withDerived(g, derivedNodes(g));
    const lines = markingsOf(seen, { extra: guides });
    const centre = inArea(520, 240, 25);
    const startsNear = (m: (typeof lines)[number]) => centre(m.pieces[0]!.P);
    expect(lines.filter(startsNear).length).toBeGreaterThan(0);
  });
});

describe('holes of the surface (^1042)', () => {
  const raw = surfaceOf(g);

  it('holes are found, and the tiny ones in the middle of a big junction are patched', () => {
    const holes = holesOf(raw);
    expect(holes.length).toBeGreaterThan(0);
    const after = holesOf(patched(raw));
    expect(after.length).toBeLessThan(holes.length);
  });

  it('a hole that a circle of 1.5 m across does not fit in is patched, a wider one stays: the middle of the roundabout (^996) is land (^1054)', () => {
    const left = holesOf(patched(raw));
    const round = inArea(520, 720, 16);
    const roundabout = left.filter((h) => round(h[0]!.P));
    expect(roundabout.length).toBeGreaterThan(0);
  });
});
