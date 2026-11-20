import { describe, expect, it } from 'vitest';
import { coordinatesText, hoverText } from './pointerText';

describe('the debug lines of the pointer (^833, ^871)', () => {
  it('say where the pointer is to the millimeter, dashes when it is not over the map', () => {
    expect(coordinatesText({ x: -12.3456, y: 8 })).toBe('x -12.346 m, y 8.000 m');
    expect(coordinatesText(null)).toBe('x - m, y - m');
  });

  it('say what it is on: a node, a segment with its nodes (also for its control points), or nothing', () => {
    expect(hoverText({ kind: 'node', id: 4 })).toBe('node 4');
    expect(hoverText({ kind: 'segment', edge: 2, nodes: [4, 5] })).toBe(
      'segment 2 (start node 4, end node 5)',
    );
    const rad = {
      type: 'rad' as const,
      edge: 2,
      nodes: [4, 5] as [number, number],
      k: 1,
      t: 0.5,
      x: 0,
      y: 0,
    };
    expect(hoverText({ kind: 'handle', handle: rad })).toBe('segment 2 (start node 4, end node 5)');
    expect(hoverText({ kind: 'handle', handle: { type: 'head', node: 4, x: 0, y: 0 } })).toBe(
      'node 4',
    );
    expect(hoverText(null)).toBe('-');
  });
});
