import { describe, expect, it } from 'vitest';
import { CHUNK_M, chunkOf, chunksOf, countOf, idsOf } from './chunks';
import { chunksInView } from './inView';

describe('the chunks of a box (^1231)', () => {
  it('a chunk holds its left and top edge, not its right and bottom one', () => {
    expect(chunkOf(0, 0)).toEqual([0, 0]);
    expect(chunkOf(CHUNK_M - 0.001, CHUNK_M)).toEqual([0, 1]);
    expect(chunkOf(-0.001, -CHUNK_M)).toEqual([-1, -1]);
  });

  it('a box touches the chunks it overlaps, also with negative coordinates', () => {
    const r = chunksOf({ x0: -10, x1: 300, y0: 5, y1: 20 });
    expect(r).toEqual({ cx0: -1, cx1: 1, cy0: 0, cy1: 0 });
    expect([...idsOf(r)]).toEqual(['-1,0', '0,0', '1,0']);
  });
});

describe('the chunks in view (^1231)', () => {
  const size = { width: 1000, height: 600 };
  const at = (cx: number, cy: number, scale: number, rot = 0) => ({
    cx,
    cy,
    scale,
    rot,
    gx: 0,
    gy: 0,
  });

  it('a screen at 2 pixels a meter shows 500 by 300 meters round its center', () => {
    expect(chunksInView(at(0, 0, 2), size)).toEqual({ cx0: -1, cx1: 0, cy0: -1, cy1: 0 });
  });

  it('room round the screen asks for more chunks, zooming out for many more', () => {
    expect(chunksInView(at(0, 0, 2), size, 300)).toEqual({ cx0: -3, cx1: 2, cy0: -2, cy1: 1 });
    expect(countOf(chunksInView(at(0, 0, 0.1), size))).toBeGreaterThan(300);
  });

  it('a rotated screen touches the chunks of its bounding box', () => {
    const turned = chunksInView(at(0, 0, 2, Math.PI / 4), size);
    expect(countOf(turned)).toBeGreaterThan(countOf(chunksInView(at(0, 0, 2), size)));
  });
});
