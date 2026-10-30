import { describe, expect, it } from 'vitest';
import {
  MIN_VISIBLE_PX,
  boundsOf,
  constrainView,
  isVisible,
  screenCorners,
  type Rect,
} from './bounds';
import { initialView, worldToScreen, type View } from './view';

const size = { width: 800, height: 600 };
const rect: Rect = { minX: -20, minY: -10, maxX: 30, maxY: 15 };
const at = (v: Partial<View>): View => ({ ...initialView(), ...v });

describe('boundsOf', () => {
  it('wraps all points and is null without points', () => {
    expect(boundsOf([])).toBeNull();
    expect(
      boundsOf([
        { x: 3, y: -2 },
        { x: -1, y: 8 },
        { x: 5, y: 1 },
      ]),
    ).toEqual({ minX: -1, minY: -2, maxX: 5, maxY: 8 });
  });
});

describe('constrainView (^37)', () => {
  it('leaves a view alone that already shows the content', () => {
    const v = at({ cx: 5, cy: 0, scale: 6 });
    expect(constrainView(v, size, rect)).toBe(v);
    expect(constrainView(v, size, null)).toBe(v);
  });

  it.each([
    ['far right', { cx: 1800 }],
    ['far left', { cx: -1800 }],
    ['far up', { cy: -1800 }],
    ['far down', { cy: 1800 }],
    ['far diagonal', { cx: 1500, cy: 1500 }],
    ['far and rotated', { cx: 900, cy: -1200, rot: 0.7 }],
    ['far, rotated and zoomed in', { cx: -2000, cy: 700, rot: 2.4, scale: 80 }],
  ])('brings the content back from %s', (_name, patch) => {
    const view = at(patch);
    expect(isVisible(view, size, rect)).toBe(false);
    expect(isVisible(constrainView(view, size, rect), size, rect)).toBe(true);
  });

  it('moves only as far as needed: exactly the minimum of the bounds stays on screen', () => {
    const view = constrainView(at({ cx: 1800, scale: 6 }), size, rect);
    const corners = screenCorners(view, size, rect);
    // The content is to the left of the viewport: its right edge ends up MIN_VISIBLE_PX inside.
    expect(Math.max(...corners.map((c) => c.x))).toBeCloseTo(MIN_VISIBLE_PX, 3);
  });

  it('keeps the same zoom and rotation', () => {
    const view = constrainView(at({ cx: -1500, cy: 900, scale: 7, rot: 1.1 }), size, rect);
    expect(view).toMatchObject({ scale: 7 });
    expect(view.rot).toBeCloseTo(1.1);
  });

  it('ignores a viewport too small to inset', () => {
    const view = at({ cx: 1800 });
    expect(constrainView(view, { width: 20, height: 20 }, rect)).toBe(view);
  });

  it('has bounds that still show some area when the content is a single point', () => {
    const point = boundsOf([{ x: 0, y: 0 }])!;
    const corners = screenCorners(at({ scale: 100 }), size, point).map((c) => c.x);
    expect(Math.max(...corners) - Math.min(...corners)).toBeGreaterThan(MIN_VISIBLE_PX);
    expect(worldToScreen(initialView(), size, { x: 0, y: 0 }).x).toBe(400);
  });
});
