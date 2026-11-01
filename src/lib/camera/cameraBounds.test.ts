import { describe, expect, it } from 'vitest';
import { type Anchor } from './bounds';
import { Camera } from './camera.svelte';
import { pointOn } from '../curves/piece';
import type { Arc } from '../curves/types';
import { worldToScreen } from './view';

/** Screen points that stand for an anchor: its center, or samples along the piece. */
function samples(c: Camera, a: Anchor): { x: number; y: number }[] {
  if (a.kind === 'point') return [worldToScreen(c.view, c.size, a)];
  return Array.from({ length: 201 }, (_, i) =>
    worldToScreen(c.view, c.size, pointOn(a.piece, i / 200)),
  );
}

/** Independent of bounds.ts: at least 12 px of the anchors' screen box must be inside the viewport. */
function onScreen(c: Camera, anchors: Anchor[]) {
  const pts = anchors.flatMap((a) => samples(c, a).map((p) => ({ p, r: a.r })));
  const { width, height } = c.size;
  // Samples of an arc fall slightly inside its true extent (at most about half a pixel at 400 px/m).
  const near = (v: number) => v - 12 >= -1;
  return (
    near(Math.max(...pts.map(({ p, r }) => p.x + r))) &&
    near(width - Math.min(...pts.map(({ p, r }) => p.x - r))) &&
    near(Math.max(...pts.map(({ p, r }) => p.y + r))) &&
    near(height - Math.min(...pts.map(({ p, r }) => p.y - r)))
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
  const arc: Arc = {
    type: 'arc',
    P: { x: 0, y: -30 },
    Q: { x: 0, y: 30 },
    c: { x: 0, y: 0 },
    r: 30,
    a0: -Math.PI / 2,
    da: Math.PI,
  };
  const anchors: Anchor[] = [
    { kind: 'point', x: -60, y: -20, r: 7 },
    { kind: 'point', x: 70, y: 30, r: 7 },
    { kind: 'piece', piece: arc, r: 2.5 },
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
