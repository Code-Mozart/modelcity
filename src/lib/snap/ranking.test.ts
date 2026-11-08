import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/editor.svelte';
import { chainHandles } from '../editor/chains';
import { snapBase, suggestionsOfGraph } from '../editor/snapping';
import { graphOf } from '../testing/graphHelpers';
import { at } from '../testing/editorHelpers';
import { snapTo, MERGE_PX } from './engine';
import { RANK, type SnapCurve, type SnapPoint } from './types';

const pt = (x: number, y: number, rank: number): SnapPoint => ({
  kind: 'point',
  at: { x, y },
  heading: null,
  rule: 'crossing',
  from: [],
  rank,
});
const query = (x: number, y: number, scale: number) => ({ pt: { x, y }, scale, pinned: [] });

describe('the ranking of snap points (^880)', () => {
  it('at one place the best ranked wins', () => {
    const list = [pt(0, 0, RANK.corner), pt(0.0005, 0, RANK.offset), pt(0, 0.0005, RANK.node)];
    expect(snapTo(list, query(0, 0, 10))?.pt).toEqual({ x: 0.0005, y: 0 });
  });

  it('within the pixels of ^883 a better ranked point wins over the nearest, farther it does not', () => {
    const scale = 10;
    const within = (MERGE_PX.mouse - 1) / scale;
    const beyond = (MERGE_PX.mouse + 1) / scale;
    const near = pt(0, 0, RANK.crossing);
    expect(snapTo([near, pt(within, 0, RANK.node)], query(0.01, 0, scale))?.pt.x).toBe(within);
    expect(snapTo([near, pt(beyond, 0, RANK.node)], query(0.01, 0, scale))?.pt.x).toBe(0);
  });

  it('a finger merges over more pixels than a mouse', () => {
    expect(MERGE_PX.touch).toBeGreaterThan(MERGE_PX.mouse);
    const scale = 10;
    const x = (MERGE_PX.touch - 1) / scale;
    const list = [pt(0, 0, RANK.crossing), pt(x, 0, RANK.node)];
    expect(snapTo(list, { ...query(0.01, 0, scale), touch: true })?.pt.x).toBe(x);
    expect(snapTo(list, query(0.01, 0, scale))?.pt.x).toBe(0);
  });
});

describe('suggestions that are the same are one (^881)', () => {
  it('the offset curve of a lane is the curve of the lane beside it: one suggestion, the curve of the segment', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [40, 0, 0],
        [0, 3, 0],
        [40, 3, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    const curves = suggestionsOfGraph(g).filter(
      (s): s is SnapCurve => s.kind === 'curve' && !s.limited,
    );
    const lineAt = (y: number) => (c: SnapCurve) =>
      c.pieces.every((p) => p.type === 'line' && Math.abs(p.P.y - y) < 1e-6);
    const onLine = (y: number) => curves.filter(lineAt(y));
    // The lane at y = 3 has its curve, which is the offset of the lane at y = 0: one curve, not two.
    expect(onLine(3)).toHaveLength(1);
    expect(onLine(3)[0]!.rule).toBe('curve');
    // The offsets that no lane is on stay.
    expect(onLine(-3)).toHaveLength(1);
    expect(onLine(6)).toHaveLength(1);
  });
});

describe('the corner of a bend is a snap point (^885)', () => {
  it('it ranks after the radius points', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [30, 20, Math.PI / 2],
      ],
      [[0, 1, 8]],
    );
    const corners = suggestionsOfGraph(g).filter((s) => s.kind === 'point' && s.rule === 'corner');
    expect(corners).toHaveLength(1);
    expect((corners[0] as SnapPoint).rank).toBe(RANK.corner);
  });
});

describe('turning a heading offers no offset curve (^878)', () => {
  it('while the heading point of a node is dragged, no offset snap curve is there', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [40, 0, 0],
        [0, 3, 0],
        [40, 3, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    const ed = new Editor();
    ed.load(g);
    const rules = (list: ReturnType<typeof snapBase>) => new Set(list.map((s) => s.rule));
    expect(rules(snapBase(ed.graph, null, null)).has('offset')).toBe(true);
    const h = chainHandles(ed.chains, 20).find((x) => x.type === 'head' && x.i === 0)!;
    const look = (x: number, y: number) => at(x, y, { ctrl: false, scale: 20 });
    ed.pointerDown(look(h.x, h.y));
    ed.pointerMove(look(h.x + 1, h.y + 5));
    expect(rules(snapBase(ed.graph, ed.press, null)).has('offset')).toBe(false);
  });
});
