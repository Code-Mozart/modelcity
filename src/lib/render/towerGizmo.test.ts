import { describe, expect, it } from 'vitest';
import type { Frame } from './paint';
import { barsOn, shownDerived, shownTowers, type TowerCapsule } from './towerGizmo';

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

describe('a derived node under a real one is hidden (^899)', () => {
  const real = [{ x: 0, y: 0 }];
  const derived = [
    { x: 0.5, y: 0 },
    { x: 5, y: 0 },
  ];
  it('when their circles overlap on the screen, which depends on the zoom', () => {
    expect(shownDerived(frame(10), derived, real, 5.5)).toEqual([derived[1]]);
    expect(shownDerived(frame(50), derived, real, 5.5)).toEqual(derived);
    // A derived node off the canvas is not looked at and not drawn (^939).
    expect(shownDerived(frame(500), derived, real, 5.5)).toEqual([derived[0]]);
  });
});
