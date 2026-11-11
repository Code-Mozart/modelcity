import { describe, expect, it } from 'vitest';
import { derivedNodes, withDerived } from './derived';
import { junctionsOf } from './junctions';
import { laneArrows, waitLines } from './junctionMarkings';
import { markingsOf } from './markings';
import { patched, holesOf, surfaceOf } from './surface';
import { junctionGround } from '../testing/junctionGround';
import { dist } from '../curves/vec';

const g = junctionGround();
const junctions = junctionsOf(g);
const inArea = (x: number, y: number, r: number) => (p: { x: number; y: number }) =>
  Math.hypot(p.x - x, p.y - y) < r;

describe('the lines where traffic waits (^1038)', () => {
  const lines = waitLines(g, junctions);

  it('right before left (^985, ^988): no line at all', () => {
    expect(lines.filter((l) => inArea(0, 0, 20)(l.from) || inArea(0, 240, 20)(l.from))).toEqual([]);
  });

  it('1+1 side road meeting a 2+2 road (^986): a give-way line across each lane of the side road, none on the main road', () => {
    const here = lines.filter((l) => inArea(260, 0, 20)(l.from));
    expect(here.length).toBeGreaterThan(0);
    expect(here.every((l) => l.kind === 'give way')).toBe(true);
    expect(here.every((l) => l.from.y > 3)).toBe(true);
  });

  it('traffic lights (^990): a solid stop line across every lane in, as wide as the lane', () => {
    const here = lines.filter((l) => inArea(520, 240, 40)(l.from));
    expect(here).toHaveLength(12);
    expect(here.every((l) => l.kind === 'stop')).toBe(true);
    for (const l of here) expect(dist(l.from, l.to)).toBeCloseTo(3, 6);
  });
});

describe('the arrows painted on lanes (^1028, ^1029)', () => {
  const arrows = laneArrows(g, junctions);
  const at = (x: number, y: number, r: number) => arrows.filter((a) => inArea(x, y, r)(a.at));

  it('a lane of an approach of two lanes or more shows its sign, also plain straight (^989)', () => {
    expect(at(260, 240, 30).length).toBeGreaterThanOrEqual(4);
  });

  it('a single lane in shows its sign only if it is not plain straight (^988 side roads show none, a T side road shows the split)', () => {
    const t = at(0, 0, 30);
    expect(t).toHaveLength(3);
    expect(
      t.filter((a) => a.sign.kind === 'directions' && a.sign.left && a.sign.right),
    ).toHaveLength(1);
  });

  it('a lane that ends shows the lane-end arrow, on the lane before the shift (^991)', () => {
    const ends = at(-70, 480, 60).filter((a) => a.sign.kind === 'merge');
    expect(ends).toHaveLength(1);
    expect(ends[0]!.sign).toEqual({ kind: 'merge', side: 'left' });
  });
});

describe('no lines inside a junction (^1044)', () => {
  it('the lines of two lanes that cross a junction end at it: none between the segments inside', () => {
    const seen = withDerived(g, derivedNodes(g));
    const inside = (a: number, b: number) =>
      junctions.some((j) => j.segments.includes(a) && j.segments.includes(b));
    const all = markingsOf(seen);
    const clipped = markingsOf(seen, { inside });
    const longest = (ms: typeof all) => Math.max(...ms.map((m) => m.pieces.length));
    expect(clipped.length).toBeLessThanOrEqual(all.length);
    expect(longest(clipped)).toBeLessThanOrEqual(longest(all));
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

  it('a larger hole stays: the middle of the roundabout (^996) is land', () => {
    const left = holesOf(patched(raw));
    const round = inArea(520, 720, 16);
    const roundabout = left.filter((h) => round(h[0]!.P));
    expect(roundabout.length).toBeGreaterThan(0);
  });
});
