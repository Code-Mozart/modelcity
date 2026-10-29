import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  MIN_SCALE,
  PAN_LIMIT,
  gridStep,
  initialView,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './view';

const size = { width: 800, height: 600 };

describe('view transform', () => {
  it('maps the world origin to the viewport center initially', () => {
    expect(worldToScreen(initialView(), size, { x: 0, y: 0 })).toEqual({ x: 400, y: 300 });
  });

  it('round-trips world <-> screen', () => {
    const view = { cx: 12.5, cy: -3, scale: 7.3 };
    const p = { x: 40, y: -22 };
    const back = screenToWorld(view, size, worldToScreen(view, size, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it('keeps the world point under the cursor fixed while zooming', () => {
    const view = { cx: 30, cy: 10, scale: 20 };
    const anchor = { x: 650, y: 120 };
    const before = screenToWorld(view, size, anchor);
    const zoomed = zoomAt(view, size, anchor, 1.7);
    const after = screenToWorld(zoomed, size, anchor);
    expect(zoomed.scale).toBeCloseTo(34);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps zoom', () => {
    const c = { x: 400, y: 300 };
    expect(zoomAt(initialView(), size, c, 1e9).scale).toBe(MAX_SCALE);
    expect(zoomAt(initialView(), size, c, 1e-9).scale).toBe(MIN_SCALE);
  });

  it('pans so content follows the pointer, and clamps', () => {
    const v = panBy({ cx: 0, cy: 0, scale: 10 }, 50, -20);
    expect(v.cx).toBeCloseTo(-5);
    expect(v.cy).toBeCloseTo(2);
    expect(panBy(initialView(), -1e12, 1e12)).toMatchObject({ cx: PAN_LIMIT, cy: -PAN_LIMIT });
  });
});

describe('gridStep', () => {
  it('picks 1-2-5 steps at least minPx wide', () => {
    expect(gridStep(100, 50)).toBe(0.5);
    expect(gridStep(100, 60)).toBe(1);
    expect(gridStep(1, 50)).toBe(50);
    expect(gridStep(1, 51)).toBe(100);
  });
});
