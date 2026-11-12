import { describe, expect, it } from 'vitest';
import { derivedNodes, withDerived } from './derived';
import { markingsOf, type Marking } from './markings';
import { graphOf, twoBends } from '../testing/graphHelpers';
import type { Graph } from '../model/graph';

const PI = Math.PI;
type N = [number, number, number];

/** Straight lanes: each is [x from, x to, y, way] with way 1 = left to right, -1 = right to left. */
function lanes(rows: [number, number, number, 1 | -1][]): Graph {
  const nodes: N[] = rows.flatMap(([a, b, y, way]) =>
    way === 1
      ? ([
          [a, y, 0],
          [b, y, 0],
        ] as N[])
      : ([
          [b, y, PI],
          [a, y, PI],
        ] as N[]),
  );
  return graphOf(
    nodes,
    rows.map((_, i) => [2 * i, 2 * i + 1, null]),
  );
}

const marked = (g: Graph, physical = true) =>
  markingsOf(withDerived(g, derivedNodes(g)), { physical });
const xs = (m: Marking) => m.pieces.flatMap((p) => [p.P.x, p.Q.x]);
const span = (m: Marking): [number, number] => [Math.min(...xs(m)), Math.max(...xs(m))];
const yOf = (m: Marking) => m.pieces[0]!.P.y;

describe('a line between neighbouring parallel segments (^950, ^951)', () => {
  it('a lone lane has none', () => {
    expect(marked(lanes([[0, 20, 0, 1]]))).toEqual([]);
  });

  it('1+1: no line, an Ortsstraße has none (^972)', () => {
    expect(
      marked(
        lanes([
          [0, 20, 0, 1],
          [0, 20, 3, -1],
        ]),
      ),
    ).toEqual([]);
  });

  it('1+1 in the logical markings: one dashed line, the rule of the Ortsstraße is for the physical ones (^981)', () => {
    const m = marked(
      lanes([
        [0, 20, 0, 1],
        [0, 20, 3, -1],
      ]),
      false,
    );
    expect(m).toHaveLength(1);
    expect(m[0]!.kind).toBe('dashed');
  });

  it('one-way, two lanes: one dashed line half way between them', () => {
    const m = marked(
      lanes([
        [0, 20, 0, 1],
        [0, 20, 3, 1],
      ]),
    );
    expect(m).toHaveLength(1);
    expect(m[0]!.kind).toBe('dashed');
    expect(yOf(m[0]!)).toBeCloseTo(1.5, 6);
    expect(span(m[0]!)).toEqual([0, 20]);
  });
});

describe('lanes of one way and of both (^951)', () => {
  it('one-way, three lanes: two dashed lines', () => {
    const m = marked(
      lanes([
        [0, 20, 0, 1],
        [0, 20, 3, 1],
        [0, 20, 6, 1],
      ]),
    );
    expect(m.map((x) => x.kind)).toEqual(['dashed', 'dashed']);
    expect(m.map(yOf).sort()).toEqual([1.5, 4.5]);
  });

  it('2+1: dashed between the lanes of one way, solid between the ways', () => {
    const m = marked(
      lanes([
        [0, 20, 0, 1],
        [0, 20, 3, 1],
        [0, 20, 6, -1],
      ]),
    );
    const at = (y: number) => m.find((x) => Math.abs(yOf(x) - y) < 1e-6)!;
    expect(at(1.5).kind).toBe('dashed');
    expect(at(4.5).kind).toBe('solid');
  });
});

describe('more lanes (^951)', () => {
  it('2+2: dashed, solid, dashed', () => {
    const m = marked(
      lanes([
        [0, 20, 0, 1],
        [0, 20, 3, 1],
        [0, 20, 6, -1],
        [0, 20, 9, -1],
      ]),
    );
    const kinds = [...m].sort((a, b) => yOf(a) - yOf(b)).map((x) => x.kind);
    expect(kinds).toEqual(['dashed', 'solid', 'dashed']);
  });
});

describe('judged per stretch (^950, ^952)', () => {
  it('segments parallel for a part only: the line is there only', () => {
    const m = marked(
      lanes([
        [0, 100, 0, 1],
        [25, 75, 3, 1],
      ]),
    );
    expect(m).toHaveLength(1);
    expect(span(m[0]!)).toEqual([25, 75]);
  });

  it('a lane added over the last 40 m: nothing over 60 m, then solid and dashed over 40 m', () => {
    const m = marked(
      lanes([
        [0, 100, 0, 1],
        [0, 100, 3, -1],
        [60, 100, 6, -1],
      ]),
    );
    const row = (kind: string, a: number, b: number) =>
      m.some((x) => x.kind === kind && span(x)[0] === a && span(x)[1] === b);
    expect(m).toHaveLength(2);
    expect(row('solid', 60, 100)).toBe(true);
    expect(row('dashed', 60, 100)).toBe(true);
  });

  it('a pair that goes on across a node is one line, so the dashes run on (^954)', () => {
    const g = lanes([
      [0, 40, 0, 1],
      [40, 80, 0, 1],
      [0, 80, 3, 1],
    ]);
    const m = marked(g);
    expect(m).toHaveLength(1);
    expect(span(m[0]!)).toEqual([0, 80]);
  });
});

describe('on a bend (^950)', () => {
  it('the line runs half way between the arcs, 18.5 m from their center', () => {
    const m = marked(twoBends());
    expect(m).toHaveLength(1);
    const arc = m[0]!.pieces.find((p) => p.type === 'arc');
    expect(arc?.type === 'arc' && arc.r).toBeCloseTo(18.5, 6);
  });
});
