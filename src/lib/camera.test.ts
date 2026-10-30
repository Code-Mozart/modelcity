import { describe, expect, it } from 'vitest';
import { cardinalForKey, chipAt, chipOffset, CARDINALS } from './compass';
import { RAD_PER_PX, movePivot, setRotation, startPivot } from './pivotDrag';
import { applyTwoFinger } from './twoFinger';
import { initialView, screenToWorld, worldToScreen } from './view';

const size = { width: 800, height: 600 };

describe('pivot drag (^30, ^31)', () => {
  const start = { x: 200, y: 150 };

  it('rotates clockwise when dragging right, at a constant rate, keeping the pivot fixed', () => {
    const world = screenToWorld(initialView(), size, start);
    const drag = movePivot(startPivot(initialView(), start), size, { x: 300, y: 150 });
    expect(drag.view.rot).toBeCloseTo(100 * RAD_PER_PX);
    const on = worldToScreen(drag.view, size, world);
    expect(on.x).toBeCloseTo(start.x);
    expect(on.y).toBeCloseTo(start.y);
    const higher = movePivot(startPivot(initialView(), start), size, { x: 300, y: 50 });
    expect(higher.view.rot).toBeCloseTo(100 * RAD_PER_PX);
  });

  it('zooms about the pivot: 1% per pixel, up zooms in, down zooms out', () => {
    const world = screenToWorld(initialView(), size, start);
    const up = movePivot(startPivot(initialView(), start), size, { x: 200, y: 50 });
    expect(up.view.scale).toBeCloseTo(initialView().scale * Math.exp(1));
    const down = movePivot(startPivot(initialView(), start), size, { x: 200, y: 250 });
    expect(down.view.scale).toBeCloseTo(initialView().scale / Math.exp(1));
    const on = worldToScreen(up.view, size, world);
    expect(on.x).toBeCloseTo(start.x);
    expect(on.y).toBeCloseTo(start.y);
  });

  it('returns to the starting zoom when the pointer returns to the starting height', () => {
    let drag = startPivot(initialView(), start);
    drag = movePivot(drag, size, { x: 230, y: 60 });
    drag = movePivot(drag, size, { x: 260, y: 150 });
    expect(drag.view.scale).toBeCloseTo(initialView().scale);
  });
});

describe('pivot drag accumulation', () => {
  const start = { x: 200, y: 150 };

  it('accumulates rotation and can jump to a cardinal direction', () => {
    let drag = startPivot(initialView(), start);
    drag = movePivot(drag, size, { x: 210, y: 150 });
    drag = movePivot(drag, size, { x: 220, y: 150 });
    expect(drag.view.rot).toBeCloseTo(20 * RAD_PER_PX);
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
    expect(chipAt(center, { x: 100, y: 100 - 40 }, 0)?.label).toBe('N');
    expect(chipAt(center, { x: 100 - 38, y: 102 }, 0)?.label).toBe('W');
    expect(chipAt(center, center, 0)).toBeUndefined();
  });

  it('places each chip in the on-screen direction of its world direction', () => {
    const north = CARDINALS[0]!;
    expect(chipOffset(north, 0).y).toBeCloseTo(-40);
    const turned = chipOffset(north, Math.PI / 2);
    expect(turned.x).toBeCloseTo(40);
    expect(chipAt({ x: 0, y: 0 }, turned, Math.PI / 2)?.label).toBe('N');
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
