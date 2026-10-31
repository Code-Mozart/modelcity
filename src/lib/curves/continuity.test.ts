import { describe, expect, it } from 'vitest';
import { applyDrag, startDrag } from './drag';
import { handlesOf } from './handles';
import { edgesOf, nearestOnCurve } from './path';
import { fixture } from './testing/paths';

describe('points that follow the pointer move continuously (^140)', () => {
  it('the nearest point on a curve is exact, so it moves as little as the pointer does', () => {
    const path = fixture('H');
    let last: { x: number; y: number } | null = null;
    let jump = 0;
    for (let n = 0; n <= 200; n++) {
      const x = -20 + n * 0.1;
      const hit = nearestOnCurve(path, { x, y: 3 }, 50);
      if (!hit) continue;
      if (last) jump = Math.max(jump, Math.hypot(hit.at.x - last.x, hit.at.y - last.y));
      last = hit.at;
      // exactly on the curve: no farther than any neighbour on it
      expect(hit.d).toBeLessThanOrEqual(Math.hypot(hit.at.x - x, hit.at.y - 3) + 1e-9);
    }
    // 0.1 m of pointer travel moves the point by less than 0.2 m (before: steps of curve length / 160)
    expect(jump).toBeLessThan(0.2);
  });
});

describe('a radius point follows the pointer smoothly (^140)', () => {
  it('dragging a radius point changes the radius smoothly, not in steps', () => {
    const path = {
      nodes: [
        { x: 0, y: 0, th: 0 },
        { x: 80, y: -60, th: -Math.PI / 2 },
      ],
      radii: [20],
      shapes: [null],
    };
    const handle = handlesOf(path, edgesOf(path), 4).find((h) => h.type === 'rad' && h.t === 0.5)!;
    const radii: number[] = [];
    for (let n = 0; n < 40; n++) {
      // towards the corner where the heading lines meet, at (80, 0): the arc gets tighter
      const d = Math.hypot(80 - handle.x, 0 - handle.y);
      const to = {
        x: handle.x + ((80 - handle.x) / d) * n * 0.05,
        y: handle.y + ((0 - handle.y) / d) * n * 0.05,
      };
      const next = applyDrag(path, startDrag(path, handle), to, { snap: false });
      radii.push(next.radii[0] ?? NaN);
    }
    const steps = radii.slice(1).map((r, i) => Math.abs(r - radii[i]!));
    const sorted = [...steps].sort((a, b) => a - b);
    // all steps are about the same size: the largest is not many times the median
    expect(sorted.at(-1)!).toBeLessThan(sorted[Math.floor(sorted.length / 2)]! * 3 + 1e-6);
    expect(new Set(radii.map((r) => r.toFixed(6))).size).toBe(radii.length);
  });
});

describe('the radius is continuous near the largest radius too (^140)', () => {
  it('dragging the middle point towards the largest radius moves the radius in small, even steps', () => {
    const base = {
      nodes: [
        { x: 0, y: 0, th: 0 },
        { x: 80, y: -60, th: -Math.PI / 2 },
      ],
      radii: [null as number | null],
      shapes: [null],
    };
    const E = edgesOf(base)[0]!.E;
    if (E.kind !== 'C') throw new Error('expected a bend');
    const path = { ...base, radii: [E.Rmax * 0.8] };
    const handle = handlesOf(path, edgesOf(path), 4).find((h) => h.type === 'rad' && h.t === 0.5)!;
    const full = handlesOf(
      { ...base, radii: [E.Rmax * 0.995] },
      edgesOf({ ...base, radii: [E.Rmax * 0.995] }),
      4,
    ).find((h) => h.type === 'rad' && h.t === 0.5)!;
    const radii: number[] = [];
    for (let n = 0; n <= 40; n++) {
      const f = n / 40;
      const to = { x: handle.x + (full.x - handle.x) * f, y: handle.y + (full.y - handle.y) * f };
      const next = applyDrag(path, startDrag(path, handle), to, { snap: false });
      radii.push(next.radii[0] ?? E.Rmax);
    }
    const steps = radii.slice(1).map((r, i) => Math.abs(r - radii[i]!));
    const sorted = [...steps].sort((a, b) => a - b);
    expect(sorted.at(-1)!).toBeLessThan(sorted[Math.floor(sorted.length / 2)]! * 3 + 1e-6);
  });
});
