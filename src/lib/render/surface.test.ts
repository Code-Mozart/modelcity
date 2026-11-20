import { describe, expect, it, vi } from 'vitest';
import { curveOf } from '../map/curve';
import { edge, node } from '../testing/loadedMap';
import { drawSurface } from './surface';
import type { Frame, Palette } from './paint';

class FakePath {
  moves = 0;
  moveTo() {
    this.moves++;
  }
  lineTo() {}
  arc() {}
}

/** A frame whose context records the strokes: their style, width and path. */
function frame(scale: number) {
  const strokes: { style: string; width: number; moves: number }[] = [];
  const ctx = {
    lineCap: '',
    lineJoin: '',
    strokeStyle: '',
    lineWidth: 0,
    stroke(path: FakePath) {
      strokes.push({ style: this.strokeStyle, width: this.lineWidth, moves: path.moves });
    },
  };
  const f = {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    view: { cx: 0, cy: 0, scale, rot: 0, gx: 0, gy: 0 },
    size: { width: 400, height: 400 },
  } as Frame;
  return { f, strokes };
}

const pal = { road: 'R', 'road-edge': 'E' } as Palette;
const near = curveOf(edge(1, 1, 2), node(1, -10, 0), node(2, 10, 0));
const far = curveOf(edge(2, 3, 4), node(3, 5000, 0), node(4, 5010, 0));

describe('the road surface (^945, ^946)', () => {
  it('is the outline stroked wide under the road colour, for the segments in view only', () => {
    vi.stubGlobal('Path2D', FakePath);
    const { f, strokes } = frame(10);
    drawSurface(
      f,
      [
        { edge: near, width: 3 },
        { edge: far, width: 3 },
      ],
      pal,
    );
    // The outline: 30 px of road and 2 px on each side; the road: 30 px; one path of the one segment in view.
    expect(strokes).toEqual([
      { style: 'E', width: 34, moves: 1 },
      { style: 'R', width: 30, moves: 1 },
    ]);
    vi.unstubAllGlobals();
  });

  it('draws each width as one path, the outlines of all before the roads of all; a narrow road has a thinner outline', () => {
    vi.stubGlobal('Path2D', FakePath);
    const { f, strokes } = frame(1);
    drawSurface(
      f,
      [
        { edge: near, width: 3 },
        { edge: near, width: 6 },
      ],
      pal,
    );
    expect(strokes.map((s) => s.style)).toEqual(['E', 'E', 'R', 'R']);
    expect(strokes[0]!.width).toBeCloseTo(3 + 2 * 0.3);
    vi.unstubAllGlobals();
  });
});
