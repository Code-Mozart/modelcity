import { describe, expect, it } from 'vitest';
import { edgesOf } from './curves/path';
import { roadHandles } from './curves/roads';
import { fixture } from './curves/testing/paths';
import { activeSegments, arrowShown } from './scaffold';
import { CURVE_NEAR_PX, HANDLE_NEAR_PX } from './proximity';

const path = fixture('H');
const edges = edgesOf(path);
const handles = roadHandles([path], [edges], 4);
const input = (pointer: { x: number; y: number } | null, focus = null) => ({
  road: 0,
  edges,
  handles,
  focus,
  pointer: pointer && { pt: pointer, scale: 4 },
});
/** A point this far (px) from the given world point. */
const away = (p: { x: number; y: number }, px: number) => ({ x: p.x, y: p.y + px / 4 });

describe('activeSegments (^60)', () => {
  it('shows nothing when the pointer is far from everything', () => {
    expect(activeSegments(input({ x: 0, y: 500 }))).toEqual([false, false, false]);
    expect(activeSegments(input(null))).toEqual([false, false, false]);
  });

  it('shows a segment when the pointer is near its curve', () => {
    const mid = edges[1]!.E.pieces.find((p) => p.type === 'arc')!;
    const at = {
      x: mid.c.x + mid.r * Math.cos(mid.a0 + mid.da / 2),
      y: mid.c.y + mid.r * Math.sin(mid.a0 + mid.da / 2),
    };
    const far = { x: at.x, y: at.y };
    const active = activeSegments(input(away(far, CURVE_NEAR_PX - 2)));
    expect(active[1]).toBe(true);
  });

  it('shows the segments on both sides of a node when the pointer is near the node', () => {
    const node = path.nodes[2]!;
    expect(activeSegments(input(away(node, HANDLE_NEAR_PX - 4)))).toEqual([false, true, true]);
  });

  it('shows a segment when the pointer is near one of its control points only (a blue point)', () => {
    const ctrl = handles.find((h) => h.type === 'ctrl' && h.i === 0)!;
    expect(activeSegments(input(away(ctrl, HANDLE_NEAR_PX - 4)))[0]).toBe(true);
  });

  it('shows the segments touched by the focus, wherever the pointer is', () => {
    const active = activeSegments(input({ x: 0, y: 500 }, { road: 0, type: 'rad', i: 2 } as never));
    expect(active).toEqual([false, false, true]);
  });
});

describe('arrowShown (^60)', () => {
  it('belongs to the segments on both sides of the node', () => {
    const active = [false, true, false];
    expect([0, 1, 2, 3].map((n) => arrowShown(active, n))).toEqual([false, true, true, false]);
  });

  it('a node without any segment always shows its arrow', () => {
    expect(arrowShown([], 0)).toBe(true);
  });
});
