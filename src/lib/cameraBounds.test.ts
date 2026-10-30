import { describe, expect, it } from 'vitest';
import { type Anchor } from './bounds';
import { Camera } from './camera.svelte';
import { worldToScreen } from './view';

/** Independent of bounds.ts: at least 12 px of the anchors' screen box must be inside the viewport. */
function onScreen(c: Camera, anchors: Anchor[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const a of anchors) {
    const s = worldToScreen(c.view, c.size, a);
    const dx = a.heading === undefined ? 0 : Math.cos(a.heading + c.view.rot) * 40;
    const dy = a.heading === undefined ? 0 : Math.sin(a.heading + c.view.rot) * 40;
    xs.push(s.x + dx - a.r, s.x + dx + a.r);
    ys.push(s.y + dy - a.r, s.y + dy + a.r);
  }
  const { width, height } = c.size;
  const near = (v: number) => v - 12 >= -1e-3;
  return (
    near(Math.max(...xs)) &&
    near(width - Math.min(...xs)) &&
    near(Math.max(...ys)) &&
    near(height - Math.min(...ys))
  );
}

/** A small deterministic random source. */
const random = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function randomCamera(rnd: () => number, anchors: Anchor[]) {
  const c = new Camera();
  c.size = { width: 300 + rnd() * 1500, height: 200 + rnd() * 900 };
  c.setAnchors(anchors);
  const spread = 400;
  const scale = Math.pow(10, rnd() * 4.3 - 1.7);
  c.view = {
    ...c.view,
    cx: (rnd() - 0.5) * spread,
    cy: (rnd() - 0.5) * spread,
    scale,
    rot: (rnd() - 0.5) * 7,
  };
  c.setAnchors(anchors);
  return c;
}

describe('the camera never leaves the content (^37, ^61)', () => {
  const rnd = random(5);
  const anchors: Anchor[] = [
    { x: -60, y: -20, r: 7 },
    { x: -20, y: 10, r: 7, heading: 0.3 },
    { x: 40, y: -30, r: 9 },
    { x: 70, y: 30, r: 7 },
  ];

  it('holds for zooming toward any cursor position, at any zoom level and rotation', () => {
    for (let n = 0; n < 400; n++) {
      const c = randomCamera(rnd, anchors);
      for (let k = 0; k < 6; k++) {
        c.zoomWheel((rnd() - 0.5) * 3000, { x: rnd() * c.size.width, y: rnd() * c.size.height });
        expect(onScreen(c, anchors)).toBe(true);
      }
    }
  });

  it('holds for a middle-button drag that zooms and rotates, and for pinching', () => {
    for (let n = 0; n < 300; n++) {
      const c = randomCamera(rnd, anchors);
      const at = { x: rnd() * c.size.width, y: rnd() * c.size.height };
      c.startRotate(at);
      c.moveRotate({ x: at.x + (rnd() - 0.5) * 600, y: at.y + (rnd() - 0.5) * 900 });
      expect(onScreen(c, anchors)).toBe(true);
      c.endRotate();
      c.touchDown(1, at);
      c.touchDown(2, { x: at.x + 100, y: at.y });
      c.touchMove(2, { x: at.x + (rnd() - 0.5) * 900, y: at.y + (rnd() - 0.5) * 900 });
      expect(onScreen(c, anchors)).toBe(true);
    }
  });
});
