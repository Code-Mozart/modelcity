import { describe, expect, it } from 'vitest';
import { FEATURES } from '../features';
import { DebugTools, coordinatesText, hoverText, isCoordinatesKey } from './debugTools.svelte';
import { graphOf } from '../testing/graphHelpers';

const key = (extra: Partial<Parameters<typeof isCoordinatesKey>[0]> = {}) => ({
  key: '.',
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...extra,
});

describe('the mouse coordinates (^833)', () => {
  it('are off by default, and Ctrl+Period toggles them', () => {
    expect(FEATURES.debugCoordinates).toBe(false);
    const debug = new DebugTools();
    expect(debug.coordinates).toBe(false);
    debug.toggleCoordinates();
    expect(debug.coordinates).toBe(true);
    debug.toggleCoordinates();
    expect(debug.coordinates).toBe(false);
  });

  it('only Ctrl (or Cmd) and the period key', () => {
    expect(isCoordinatesKey(key())).toBe(true);
    expect(isCoordinatesKey(key({ ctrlKey: false, metaKey: true }))).toBe(true);
    expect(isCoordinatesKey(key({ ctrlKey: false }))).toBe(false);
    expect(isCoordinatesKey(key({ shiftKey: true }))).toBe(false);
    expect(isCoordinatesKey(key({ altKey: true }))).toBe(false);
    expect(isCoordinatesKey(key({ key: ',' }))).toBe(false);
  });

  it('show the world position in meters, or dashes with no pointer', () => {
    expect(coordinatesText({ x: -12.3456, y: 8 })).toBe('x -12.346 m, y 8.000 m');
    expect(coordinatesText(null)).toBe('x -, y -');
  });
});

describe('what the pointer is on (^871)', () => {
  const g = graphOf(
    [
      [0, 0, 0],
      [20, 0, 0],
    ],
    [[0, 1, null]],
  );
  const e = g.edges[0]!;
  it('names a node, a segment with its nodes, and nothing', () => {
    const handle = { type: 'node', id: g.nodes[1]!.id, road: 0, i: 1 } as never;
    expect(hoverText(g, { kind: 'handle', handle })).toBe(`node ${g.nodes[1]!.id}`);
    const hit = { edge: e.id } as never;
    expect(hoverText(g, { kind: 'candidate', hit })).toBe(
      `segment ${e.id} (start node ${e.start}, end node ${e.end})`,
    );
    expect(hoverText(g, null)).toBe('-');
  });
});
