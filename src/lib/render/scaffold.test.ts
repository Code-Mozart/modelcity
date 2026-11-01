import { describe, expect, it } from 'vitest';
import { edgesOf } from '../curves/path';
import { pointOn } from '../curves/piece';
import { chainHandles, chainsOf } from '../editor/chains';
import { graphOfPaths } from '../testing/graphs';
import { fixture } from '../curves/testing/paths';
import {
  activeFlags,
  activeSegment,
  arrowShown,
  withSelectedTogether,
  type ScaffoldInput,
} from './scaffold';
import { CURVE_NEAR_PX, HANDLE_NEAR_PX } from '../editor/proximity';
import type { Focus } from '../editor/focus';

const path = fixture('H');
const edges = edgesOf(path);
const scale = 4;

const inputFor = (
  pointer: { x: number; y: number } | null,
  focus: Focus | null = null,
): ScaffoldInput => {
  const chains = chainsOf(graphOfPaths([path]));
  return {
    roads: chains.map((c) => ({ edges: c.edges })),
    handles: chainHandles(chains, scale),
    focus,
    pointer: pointer && { pt: pointer, scale },
  };
};
const away = (p: { x: number; y: number }, px: number) => ({ x: p.x, y: p.y + px / scale });
/** A point on the curve of edge `i`, at fraction `t` of its first arc or line. */
const onCurve = (i: number, t = 0.5) => {
  const piece = edges[i]!.E.pieces.find((p) => p.type === 'arc')!;
  return pointOn(piece, t);
};

describe('activeSegment (^60, ^66)', () => {
  it('shows nothing when the pointer is far from everything or absent', () => {
    expect(activeSegment(inputFor({ x: 0, y: 500 }))).toBeNull();
    expect(activeSegment(inputFor(null))).toBeNull();
  });

  it('shows the segment the pointer is on (within 20 px of its curve)', () => {
    const p = onCurve(1);
    expect(activeSegment(inputFor(away(p, CURVE_NEAR_PX - 5)))).toEqual({ road: 0, edge: 1 });
    expect(activeSegment(inputFor(p))).toEqual({ road: 0, edge: 1 });
  });

  it('near a node, the segment whose curve is closer to the pointer wins', () => {
    const behind = pointOn(edges[1]!.E.pieces.filter((p) => p.type === 'arc').at(-1)!, 0.98);
    expect(activeSegment(inputFor(behind))).toEqual({ road: 0, edge: 1 });
    const ahead = pointOn(edges[2]!.E.pieces.filter((p) => p.type === 'arc')[0]!, 0.02);
    expect(activeSegment(inputFor(ahead))).toEqual({ road: 0, edge: 2 });
  });

  it('prefers the curve under the pointer over a segment with a nearer control point', () => {
    const p = onCurve(0, 0.3);
    const seg = activeSegment(inputFor(p));
    expect(seg).toEqual({ road: 0, edge: 0 });
  });
});

describe('only a single segment at a time (^66)', () => {
  it('shows only one segment even when the pointer is close to several', () => {
    const node = path.nodes[1]!;
    const flags = activeFlags(inputFor(away(node, HANDLE_NEAR_PX - 8))).flat();
    expect(flags.filter(Boolean)).toHaveLength(1);
  });

  it('shows only one segment over several roads', () => {
    const roads = [path, { ...path, nodes: path.nodes.map((n) => ({ ...n, y: n.y + 3 })) }];
    const chains = chainsOf(graphOfPaths(roads));
    const flags = activeFlags({
      roads: chains.map((c) => ({ edges: c.edges })),
      handles: chainHandles(chains, scale),
      focus: null,
      pointer: { pt: away(path.nodes[1]!, 4), scale },
    });
    expect(flags.flat().filter(Boolean)).toHaveLength(1);
  });
});

describe('a hovered or dragged handle decides (^66)', () => {
  const far = { x: 0, y: 500 };

  it('the orange and yellow points keep their own segment wherever the pointer is', () => {
    for (const type of ['ctrl', 'rad'] as const) {
      expect(activeSegment(inputFor(far, { road: 0, type, i: 2 }))).toEqual({ road: 0, edge: 2 });
    }
  });

  it('a node picks the closer of its two segments, else the one that starts at it', () => {
    const focus: Focus = { road: 0, type: 'node', i: 1 };
    expect(activeSegment(inputFor(null, focus))).toEqual({ road: 0, edge: 1 });
    const before = pointOn(edges[0]!.E.pieces.filter((p) => p.type === 'arc').at(-1)!, 0.9);
    expect(activeSegment(inputFor(before, focus))).toEqual({ road: 0, edge: 0 });
  });

  it('the last node only has the segment that ends at it, and a lone node has none', () => {
    expect(activeSegment(inputFor(far, { road: 0, type: 'node', i: 3 }))).toEqual({
      road: 0,
      edge: 2,
    });
    const lone = {
      roads: [{ edges: [] }],
      handles: [],
      focus: { road: 0, type: 'node' as const, i: 0 },
      pointer: null,
    };
    expect(activeSegment(lone)).toBeNull();
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

describe('selected segments show their scaffold together (^133)', () => {
  const grid = (on: [number, number][]) => {
    const rows = [0, 1].map(() => [false, false, false]);
    for (const [road, i] of on) rows[road]![i] = true;
    return rows;
  };
  const selected = [
    { road: 0, i: 0 },
    { road: 0, i: 2 },
  ];

  it('all of them when the shown segment is one of them', () => {
    expect(withSelectedTogether(grid([[0, 2]]), selected)).toEqual(
      grid([
        [0, 0],
        [0, 2],
      ]),
    );
  });

  it('none of them when another segment is shown, and nothing changes for a single selected segment', () => {
    expect(withSelectedTogether(grid([[1, 1]]), selected)).toEqual(grid([[1, 1]]));
    expect(withSelectedTogether(grid([[0, 0]]), [selected[0]!])).toEqual(grid([[0, 0]]));
  });
});
