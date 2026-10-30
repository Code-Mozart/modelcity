import { afterEach, describe, expect, it, vi } from 'vitest';
import { Camera, SCALE_BAR_HOLD_MS } from './camera.svelte';
import { isVisible, type Anchor } from './bounds';
import { screenToWorld } from './view';

/** A camera over a big piece of content, so the bounds do not get in the way of the tests. */
const camera = () => {
  const c = new Camera();
  c.size = { width: 800, height: 600 };
  c.setAnchors([
    { kind: 'point', x: -5000, y: -5000, r: 7 },
    { kind: 'point', x: 5000, y: 5000, r: 7 },
  ]);
  return c;
};

describe('Camera rotation', () => {
  it('rotates while dragging, keeping the pivot, and keeps the result on release', () => {
    const c = camera();
    const world = screenToWorld(c.view, c.size, { x: 300, y: 200 });
    c.startRotate({ x: 300, y: 200 });
    expect(c.rotating).toBe(true);
    c.moveRotate({ x: 400, y: 200 });
    const rot = c.view.rot;
    expect(rot).toBeGreaterThan(0);
    const pivot = screenToWorld(c.view, c.size, { x: 300, y: 200 });
    expect(pivot.x).toBeCloseTo(world.x);
    expect(pivot.y).toBeCloseTo(world.y);
    c.endRotate();
    expect(c.rotating).toBe(false);
    expect(c.view.rot).toBe(rot);
  });

  it('Esc cancels and restores the view from before the drag', () => {
    const c = camera();
    c.startRotate({ x: 300, y: 200 });
    c.moveRotate({ x: 500, y: 260 });
    expect(c.key('Escape')).toBe(true);
    expect(c.rotating).toBe(false);
    expect(c.view.rot).toBe(0);
    expect(c.view.cx).toBe(0);
  });
});

describe('Camera rotation keys', () => {
  it('N, E, S, W set the direction during a rotation and are ignored otherwise', () => {
    const c = camera();
    expect(c.key('e')).toBe(false);
    c.startRotate({ x: 300, y: 200 });
    c.moveRotate({ x: 362, y: 200 });
    expect(c.key('E')).toBe(true);
    expect(c.view.rot).toBeCloseTo(-Math.PI / 2);
    expect(c.pressed).toBe('e');
    c.keyUp('E');
    expect(c.pressed).toBeNull();
    c.key('s');
    expect(c.view.rot).toBeCloseTo(Math.PI);
    c.key('n');
    expect(c.view.rot).toBeCloseTo(0);
    expect(c.key('q')).toBe(false);
  });
});

describe('Camera compass', () => {
  it('clicking a compass chip sets the direction', () => {
    const c = camera();
    c.startRotate({ x: 300, y: 200 });
    c.cursor = { x: 300, y: 200 };
    expect(c.compassClick({ x: 362, y: 200 })).toBe(true);
    expect(c.pressed).toBe('e');
    c.releaseChip();
    expect(c.pressed).toBeNull();
    expect(c.view.rot).toBeCloseTo(-Math.PI / 2);
    expect(c.compassClick({ x: 500, y: 500 })).toBe(false);
  });
});

describe('Camera pan and touch', () => {
  it('tells a right-click from a right-drag', () => {
    const c = camera();
    c.startPan({ x: 100, y: 100 });
    expect(c.endPan()).toBe(false);
    c.startPan({ x: 100, y: 100 });
    c.movePan({ x: 160, y: 100 });
    expect(c.endPan()).toBe(true);
    expect(c.view.cx).toBeCloseTo(-15);
    expect(c.panning).toBe(false);
  });

  it('two fingers twist the view, one finger does not use the gesture', () => {
    const c = camera();
    expect(c.touchDown(1, { x: 300, y: 300 })).toBe(1);
    expect(c.touchMove(1, { x: 310, y: 300 })).toBe(false);
    expect(c.touchDown(2, { x: 500, y: 300 })).toBe(2);
    expect(c.touchMove(2, { x: 400, y: 400 })).toBe(true);
    expect(c.view.rot).not.toBe(0);
    c.touchUp(2);
    expect(c.touchMove(1, { x: 320, y: 300 })).toBe(false);
  });

  it('zooms with the wheel', () => {
    const c = camera();
    c.zoomWheel(-300, { x: 400, y: 300 });
    expect(c.view.scale).toBeGreaterThan(4);
  });
});

describe('Camera scale bar visibility (^34)', () => {
  afterEach(() => vi.useRealTimers());

  it('is hidden by default and shown during a middle drag', () => {
    const c = camera();
    expect(c.scaleBarVisible).toBe(false);
    c.startRotate({ x: 300, y: 200 });
    expect(c.scaleBarVisible).toBe(true);
    c.endRotate();
    expect(c.scaleBarVisible).toBe(false);
  });

  it('stays visible for a while after wheel zoom, and the timer restarts on each zoom', () => {
    vi.useFakeTimers();
    const c = camera();
    c.zoomWheel(-100, { x: 400, y: 300 });
    expect(c.scaleBarVisible).toBe(true);
    vi.advanceTimersByTime(SCALE_BAR_HOLD_MS - 100);
    c.zoomWheel(-100, { x: 400, y: 300 });
    vi.advanceTimersByTime(SCALE_BAR_HOLD_MS - 100);
    expect(c.scaleBarVisible).toBe(true);
    vi.advanceTimersByTime(200);
    expect(c.scaleBarVisible).toBe(false);
  });

  it('is shown after a pinch but not after a plain pan', () => {
    vi.useFakeTimers();
    const c = camera();
    c.startPan({ x: 100, y: 100 });
    c.movePan({ x: 160, y: 100 });
    c.endPan();
    expect(c.scaleBarVisible).toBe(false);
    c.touchDown(1, { x: 300, y: 300 });
    c.touchDown(2, { x: 500, y: 300 });
    c.touchMove(2, { x: 600, y: 300 });
    expect(c.scaleBarVisible).toBe(true);
  });
});

describe('Camera stays on the content (^37)', () => {
  const content: Anchor[] = [
    { kind: 'point', x: -20, y: -10, r: 7 },
    { kind: 'point', x: 30, y: 15, r: 9 },
  ];
  const withContent = () => {
    const c = camera();
    c.setAnchors(content);
    return c;
  };

  it('cannot be panned away from the content', () => {
    const c = withContent();
    c.startPan({ x: 400, y: 300 });
    c.movePan({ x: 400 - 5000, y: 300 });
    c.movePan({ x: 400 - 90000, y: 300 + 90000 });
    expect(isVisible(c.view, c.size, content)).toBe(true);
    expect(c.endPan()).toBe(true);
  });
});

describe('Camera bounds while zooming and rotating (^37)', () => {
  const content: Anchor[] = [
    { kind: 'point', x: -20, y: -10, r: 7 },
    { kind: 'point', x: 30, y: 15, r: 9 },
  ];
  const withContent = () => {
    const c = camera();
    c.setAnchors(content);
    return c;
  };

  it('keeps the content visible when zooming and rotating far from it', () => {
    const c = withContent();
    c.view = { ...c.view, cx: 1500, cy: -1500 };
    c.zoomWheel(500, { x: 700, y: 100 });
    expect(isVisible(c.view, c.size, content)).toBe(true);
    c.startRotate({ x: 700, y: 100 });
    c.moveRotate({ x: 900, y: 40 });
    expect(isVisible(c.view, c.size, content)).toBe(true);
    c.key('s');
    expect(isVisible(c.view, c.size, content)).toBe(true);
  });

  it('pulls the view back when the content moves away or shrinks', () => {
    const c = withContent();
    c.view = { ...c.view, cx: 100 };
    const moved: Anchor[] = [{ kind: 'point', x: 900, y: 900, r: 7 }];
    c.setAnchors(moved);
    expect(isVisible(c.view, c.size, moved)).toBe(true);
  });

  it('does not pan while nothing is drawn, but still zooms', () => {
    const c = camera();
    c.setAnchors([]);
    c.startPan({ x: 400, y: 300 });
    c.movePan({ x: 100, y: 300 });
    expect(c.view.cx).toBe(0);
    c.zoomWheel(-300, { x: 700, y: 100 });
    expect(c.view.scale).toBeGreaterThan(4);
    expect(c.view.cx).toBe(0);
    expect(c.view.cy).toBe(0);
  });
});
