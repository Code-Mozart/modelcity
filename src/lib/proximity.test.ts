import { describe, expect, it } from 'vitest';
import { buildEdge } from './curves/edge';
import { CURVE_NEAR_PX, HANDLE_NEAR_PX, nearEdge, nearHandle } from './proximity';

const at = (x: number, y: number, scale = 4) => ({ pt: { x, y }, scale });

describe('proximity (^55)', () => {
  it('a handle is near within a fixed number of pixels, whatever the zoom', () => {
    const handle = { x: 0, y: 0 };
    expect(nearHandle(handle, at(HANDLE_NEAR_PX / 4 - 0.1, 0, 4))).toBe(true);
    expect(nearHandle(handle, at(HANDLE_NEAR_PX / 4 + 0.1, 0, 4))).toBe(false);
    expect(nearHandle(handle, at(HANDLE_NEAR_PX / 40 - 0.01, 0, 40))).toBe(true);
    expect(nearHandle(handle, at(HANDLE_NEAR_PX / 40 + 0.01, 0, 40))).toBe(false);
    expect(nearHandle(handle, null)).toBe(false);
  });

  it('an edge is near when the pointer is close to its curve, not to its handles', () => {
    const edge = buildEdge({ x: 0, y: 0, th: 0 }, { x: 40, y: 0, th: 0 }, null, null);
    expect(nearEdge(edge, at(20, CURVE_NEAR_PX / 4 - 0.2))).toBe(true);
    expect(nearEdge(edge, at(20, CURVE_NEAR_PX / 4 + 0.5))).toBe(false);
    expect(nearEdge(edge, null)).toBe(false);
  });
});
