import { describe, expect, it } from 'vitest';
import { ARROW_PX } from './curves/handles';
import { MIN_VISIBLE_PX, constrainView, isVisible, screenBox, type Anchor } from './bounds';
import { initialView, worldToScreen, type View } from './view';

const size = { width: 800, height: 600 };
const at = (v: Partial<View>): View => ({ ...initialView(), ...v });
const anchors: Anchor[] = [
  { x: -20, y: -10, r: 7 },
  { x: 30, y: 15, r: 9 },
];

describe('screenBox', () => {
  it('is tight and includes the size of each handle, not only its center', () => {
    const view = at({ scale: 10 });
    const box = screenBox(view, size, anchors);
    expect(box.minX).toBeCloseTo(400 - 200 - 7);
    expect(box.maxX).toBeCloseTo(400 + 300 + 9);
    expect(box.minY).toBeCloseTo(300 - 100 - 7);
    expect(box.maxY).toBeCloseTo(300 + 150 + 9);
  });

  it('is axis-aligned with the screen at any rotation', () => {
    const view = at({ scale: 10, rot: Math.PI / 4 });
    const box = screenBox(view, size, anchors);
    for (const a of anchors) {
      const c = worldToScreen(view, size, a);
      expect(c.x - a.r).toBeGreaterThanOrEqual(box.minX - 1e-9);
      expect(c.x + a.r).toBeLessThanOrEqual(box.maxX + 1e-9);
      expect(c.y - a.r).toBeGreaterThanOrEqual(box.minY - 1e-9);
      expect(c.y + a.r).toBeLessThanOrEqual(box.maxY + 1e-9);
    }
  });

  it('places a heading handle ARROW_PX from its node, turning with the view', () => {
    const heading: Anchor = { x: 0, y: 0, r: 0, heading: 0 };
    const east = screenBox(at({ scale: 1 }), size, [heading]);
    expect(east.minX).toBeCloseTo(400 + ARROW_PX);
    const turned = screenBox(at({ scale: 1, rot: Math.PI / 2 }), size, [heading]);
    expect(turned.minX).toBeCloseTo(400);
    expect(turned.minY).toBeCloseTo(300 + ARROW_PX);
  });
});

describe('constrainView (^37)', () => {
  it('leaves a view alone that already shows the content', () => {
    const v = at({ cx: 5, cy: 0, scale: 6 });
    expect(constrainView(v, size, anchors)).toBe(v);
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
    expect(isVisible(view, size, anchors)).toBe(false);
    expect(isVisible(constrainView(view, size, anchors), size, anchors)).toBe(true);
  });

  it('moves only as far as needed: the box peeks exactly MIN_VISIBLE_PX into the screen', () => {
    const view = constrainView(at({ cx: 1800, scale: 6 }), size, anchors);
    expect(screenBox(view, size, anchors).maxX).toBeCloseTo(MIN_VISIBLE_PX, 6);
    const other = constrainView(at({ cy: -1800, scale: 6 }), size, anchors);
    expect(screenBox(other, size, anchors).minY).toBeCloseTo(size.height - MIN_VISIBLE_PX, 6);
  });

  it('keeps the same zoom and rotation', () => {
    const view = constrainView(at({ cx: -1500, cy: 900, scale: 7, rot: 1.1 }), size, anchors);
    expect(view).toMatchObject({ scale: 7 });
    expect(view.rot).toBeCloseTo(1.1);
  });

  it('keeps a lone node findable through its arrow tip too', () => {
    const lone: Anchor[] = [
      { x: 0, y: 0, r: 7 },
      { x: 0, y: 0, r: 7, heading: 0 },
    ];
    expect(isVisible(constrainView(at({ cx: 900 }), size, lone), size, lone)).toBe(true);
  });
});

describe('nothing drawn (^38)', () => {
  it('does not pan at all: the view stays centered on the origin', () => {
    const far = at({ cx: 400, cy: -250, gx: 5, gy: 6, scale: 9, rot: 0.4 });
    const still = constrainView(far, size, []);
    expect(still).toMatchObject({ cx: 0, cy: 0, gx: 0, gy: 0, scale: 9, rot: 0.4 });
    expect(constrainView(initialView(), size, [])).toEqual(initialView());
    expect(isVisible(far, size, [])).toBe(true);
  });
});
