import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  MIN_SCALE,
  gridStep,
  initialView,
  panBy,
  rotateAt,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type View,
} from './view';

const size = { width: 800, height: 600 };
const view = (v: Partial<View>): View => ({ ...initialView(), ...v });

describe('view transform', () => {
  it('maps the world origin to the viewport center initially', () => {
    expect(worldToScreen(initialView(), size, { x: 0, y: 0 })).toEqual({ x: 400, y: 300 });
  });

  it.each([0, 0.7, -2.4, Math.PI])('round-trips world <-> screen at rotation %f', (rot) => {
    const v = view({ cx: 12.5, cy: -3, scale: 7.3, rot });
    const p = { x: 40, y: -22 };
    const back = screenToWorld(v, size, worldToScreen(v, size, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it('keeps the world point under the cursor fixed while zooming', () => {
    const v = view({ cx: 30, cy: 10, scale: 20, rot: 0.9 });
    const anchor = { x: 650, y: 120 };
    const before = screenToWorld(v, size, anchor);
    const zoomed = zoomAt(v, size, anchor, 1.7);
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
});

describe('view panning', () => {
  it('pans so content follows the pointer', () => {
    const v = panBy(view({ scale: 10 }), 50, -20);
    expect(v.cx).toBeCloseTo(-5);
    expect(v.cy).toBeCloseTo(2);
  });

  it('pans along the screen axes even when rotated', () => {
    const v = view({ cx: 50, cy: 50, scale: 10, rot: Math.PI / 2 });
    const p = { x: 3, y: 4 };
    const before = worldToScreen(v, size, p);
    const after = worldToScreen(panBy(v, 30, -10), size, p);
    expect(after.x - before.x).toBeCloseTo(30);
    expect(after.y - before.y).toBeCloseTo(-10);
  });
});

describe('rotation', () => {
  it('rotates the world clockwise on screen: north (-y) up at rot 0, east up at -90 degrees', () => {
    const north = worldToScreen(initialView(), size, { x: 0, y: -1 });
    expect(north.y).toBeLessThan(300);
    const east = worldToScreen(view({ rot: -Math.PI / 2 }), size, { x: 1, y: 0 });
    expect(east.x).toBeCloseTo(400);
    expect(east.y).toBeLessThan(300);
  });

  it('keeps the pivot point fixed on screen', () => {
    const v = view({ cx: 7, cy: -9, scale: 12, rot: 0.3 });
    const anchor = { x: 123, y: 456 };
    const world = screenToWorld(v, size, anchor);
    const turned = rotateAt(v, size, anchor, 2.1);
    expect(turned.rot).toBeCloseTo(2.1);
    const after = worldToScreen(turned, size, world);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
  });

  it('wraps the rotation into (-PI, PI]', () => {
    expect(rotateAt(initialView(), size, { x: 0, y: 0 }, 3 * Math.PI).rot).toBeCloseTo(Math.PI);
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

describe('grid pinned to the camera (^30)', () => {
  const base = view({ cx: 10, cy: 20, scale: 8, gx: 3, gy: -4 });
  const anchor = { x: 250, y: 120 };

  it('does not move at all when rotating about any pivot', () => {
    const turned = rotateAt(base, size, anchor, 1.3);
    expect(turned.cx).not.toBeCloseTo(base.cx);
    expect(turned).toMatchObject({ gx: 3, gy: -4, scale: 8 });
  });

  it('follows panning exactly like the content, in screen directions', () => {
    const panned = panBy(view({ ...base, rot: 0.8 }), 40, -16);
    expect(panned.gx).toBeCloseTo(3 - 40 / 8);
    expect(panned.gy).toBeCloseTo(-4 + 16 / 8);
  });

  it('keeps the grid point under the cursor fixed while zooming', () => {
    const gridPoint = (v: View, p: { x: number; y: number }) => ({
      x: v.gx + (p.x - size.width / 2) / v.scale,
      y: v.gy + (p.y - size.height / 2) / v.scale,
    });
    const zoomed = zoomAt(base, size, anchor, 2.5);
    const [a, b] = [gridPoint(base, anchor), gridPoint(zoomed, anchor)];
    expect(b.x).toBeCloseTo(a.x);
    expect(b.y).toBeCloseTo(a.y);
  });
});
