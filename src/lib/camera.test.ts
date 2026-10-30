import { describe, expect, it } from 'vitest';
import { cardinalForKey, chipAt } from './compass';
import { moveRotate, sensitivity, setRotation, startRotate } from './rotateDrag';
import { applyTwoFinger } from './twoFinger';
import { initialView, screenToWorld, worldToScreen } from './view';

const size = { width: 800, height: 600 };

describe('rotate drag (^30, ^31)', () => {
  const start = { x: 200, y: 150 };

  it('rotates clockwise when dragging right and keeps the pivot fixed', () => {
    const world = screenToWorld(initialView(), size, start);
    const drag = moveRotate(startRotate(initialView(), start), size, { x: 300, y: 150 });
    expect(drag.view.rot).toBeCloseTo((100 * 0.4 * Math.PI) / 180);
    const on = worldToScreen(drag.view, size, world);
    expect(on.x).toBeCloseTo(start.x);
    expect(on.y).toBeCloseTo(start.y);
  });

  it('is faster when the cursor is above the start and finer below it', () => {
    expect(sensitivity(0)).toBeCloseTo((0.4 * Math.PI) / 180);
    expect(sensitivity(-150)).toBeCloseTo(2 * sensitivity(0));
    expect(sensitivity(150)).toBeCloseTo(sensitivity(0) / 2);
    expect(sensitivity(1e6)).toBeCloseTo(sensitivity(0) / 16);
  });
});

describe('rotate drag accumulation', () => {
  const start = { x: 200, y: 150 };

  it('accumulates movements and can jump to a cardinal direction', () => {
    let drag = startRotate(initialView(), start);
    drag = moveRotate(drag, size, { x: 210, y: 150 });
    drag = moveRotate(drag, size, { x: 220, y: 150 });
    expect(drag.view.rot).toBeCloseTo((20 * 0.4 * Math.PI) / 180);
    expect(setRotation(drag, size, 0).view.rot).toBeCloseTo(0);
    expect(drag.view0).toEqual(initialView());
  });
});

describe('compass', () => {
  it('maps keys to rotations that put the direction up', () => {
    expect(cardinalForKey('N')?.rot).toBe(0);
    expect(cardinalForKey('e')?.rot).toBeCloseTo(-Math.PI / 2);
    expect(cardinalForKey('x')).toBeUndefined();
  });

  it.each([
    ['n', { x: 0, y: -1 }],
    ['e', { x: 1, y: 0 }],
    ['s', { x: 0, y: 1 }],
    ['w', { x: -1, y: 0 }],
  ])('rotation for %s puts that direction at the top of the screen', (key, dir) => {
    const c = cardinalForKey(key)!;
    const on = worldToScreen({ ...initialView(), rot: c.rot, scale: 1 }, size, dir);
    expect(on.x).toBeCloseTo(400);
    expect(on.y).toBeCloseTo(299);
  });

  it('finds the chip under a point', () => {
    const center = { x: 100, y: 100 };
    expect(chipAt(center, { x: 100, y: 100 - 46 })?.label).toBe('N');
    expect(chipAt(center, { x: 100 - 44, y: 102 })?.label).toBe('W');
    expect(chipAt(center, center)).toBeUndefined();
  });
});

describe('two-finger gesture (^30)', () => {
  const prev: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: 300, y: 300 },
    { x: 500, y: 300 },
  ];

  it('twisting rotates about the midpoint and pinching zooms', () => {
    const view = initialView();
    const mid = screenToWorld(view, size, { x: 400, y: 300 });
    const next: typeof prev = [
      { x: 400, y: 200 },
      { x: 400, y: 400 },
    ];
    const v = applyTwoFinger(view, size, prev, next);
    expect(v.rot).toBeCloseTo(Math.PI / 2);
    expect(v.scale).toBeCloseTo(view.scale);
    const on = worldToScreen(v, size, mid);
    expect(on.x).toBeCloseTo(400);
    expect(on.y).toBeCloseTo(300);
    const zoomed = applyTwoFinger(view, size, prev, [
      { x: 200, y: 300 },
      { x: 600, y: 300 },
    ]);
    expect(zoomed.scale).toBeCloseTo(view.scale * 2);
  });

  it('moving both fingers pans', () => {
    const view = initialView();
    const p = screenToWorld(view, size, { x: 400, y: 300 });
    const v = applyTwoFinger(view, size, prev, [
      { x: 350, y: 340 },
      { x: 550, y: 340 },
    ]);
    const on = worldToScreen(v, size, p);
    expect(on.x).toBeCloseTo(450);
    expect(on.y).toBeCloseTo(340);
  });
});
