import { describe, expect, it, vi } from 'vitest';
import type { EdgeRow, NodeRow } from '../project/storage';
import type { Palette } from './paint';
import { curveOf, drawCurves } from './skeleton';

const p: NodeRow = [0, 0, 0, 0];
const q: NodeRow = [1, 40_000, 0, 0];
const edge: EdgeRow = [7, 0, 1, null, 1];
const pal = { ink: '#000' } as Palette;

/** A canvas that only counts what is asked of it. */
function recorder() {
  const calls: Record<string, number> = {};
  const count = (name: string) => () => (calls[name] = (calls[name] ?? 0) + 1);
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => (key in target ? target[key] : count(key)),
    set: (target, key: string, value) => ((target[key] = value), true),
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const frame = (cx: number, ctx: CanvasRenderingContext2D) => ({
  ctx,
  view: { cx, cy: 0, scale: 4, rot: 0, gx: 0, gy: 0 },
  size: { width: 800, height: 600 },
});

describe('the curves of the segments (^1247, ^80)', () => {
  it('a segment from two nodes on a line is that line, in meters, with its box', () => {
    const e = curveOf(edge, p, q);
    expect(e.id).toBe(7);
    expect(e.box).toMatchObject({ x0: 0, x1: 40, y0: 0, y1: 0 });
    expect(e.pieces).toHaveLength(1);
  });

  it('is made once for the same row and the same nodes, again when a node is another row', () => {
    const first = curveOf(edge, p, q);
    expect(curveOf(edge, p, q)).toBe(first);
    expect(curveOf(edge, p, [1, 50_000, 0, 0])).not.toBe(first);
  });

  it('draws the curves in one stroke and the chevrons in another', () => {
    const { ctx, calls } = recorder();
    drawCurves(frame(20, ctx), [curveOf(edge, p, q)], pal);
    expect(calls.stroke).toBe(2);
    expect(calls.moveTo).toBeGreaterThan(1);
  });

  it('draws nothing of a curve that is off the screen', () => {
    const { ctx, calls } = recorder();
    drawCurves(frame(5000, ctx), [curveOf(edge, p, q)], pal);
    expect(calls.moveTo ?? 0).toBe(0);
    expect(vi.isMockFunction(ctx.stroke)).toBe(false);
  });
});
