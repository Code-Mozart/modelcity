import { describe, expect, it } from 'vitest';
import type { Frame } from './paint';
import { barsOn, shownTowers, type TowerCapsule } from './towerGizmo';

const frame = (scale: number) =>
  ({
    ctx: null as never,
    view: { cx: 0, cy: 0, scale, rot: 0, gx: 0, gy: 0 },
    size: { width: 800, height: 600 },
  }) as unknown as Frame;

const tower = (x: number, derived: boolean): TowerCapsule => ({
  nodes: [
    { x, y: 0 },
    { x, y: 3 },
  ],
  derived,
});

describe('a tower of derived nodes is hidden where a tower with a real node overlaps it (^897)', () => {
  const real = tower(0, false);
  const derived = tower(2, true);

  it('zoomed out the capsules overlap, so the derived one is left out', () => {
    expect(shownTowers(frame(2), [real, derived])).toEqual([real]);
  });

  it('zoomed in they are apart, so both are drawn', () => {
    expect(shownTowers(frame(20), [real, derived])).toEqual([real, derived]);
  });

  it('a derived tower alone, and a tower with a real node near another one, are always drawn', () => {
    expect(shownTowers(frame(2), [derived])).toEqual([derived]);
    expect(shownTowers(frame(2), [real, tower(2, false)])).toHaveLength(2);
  });

  it('the bars on a hidden tower go with it', () => {
    const bars = [
      { from: { x: 2, y: 0 }, to: { x: 2, y: 3 }, side: { x: 1, y: 0 } },
      { from: { x: 0, y: 0 }, to: { x: 0, y: 3 }, side: { x: 1, y: 0 } },
    ];
    const all = [real, derived];
    expect(barsOn(bars, all, shownTowers(frame(2), all))).toEqual([bars[1]]);
  });
});
