import { describe, expect, it } from 'vitest';
import { line, pieceLength } from '../curves/piece';
import { distinct, markingsOf, type Marking } from './markings';
import { readFileSync } from 'node:fs';
import { fromFile } from '../project/file';
import { derivedNodes, withDerived } from './derived';

const dashed = (x0: number, x1: number, y = 0): Marking => ({
  kind: 'dashed',
  pieces: [line({ x: x0, y }, { x: x1, y })],
});

describe('lines on top of each other are drawn once (^974, ^962)', () => {
  it('a short line over the main line goes, so the dashes of the main line run on', () => {
    const main = dashed(0, 40);
    const stubs = [dashed(12, 13.3), dashed(30.7, 32)];
    expect(distinct([stubs[0]!, main, stubs[1]!])).toEqual([main]);
  });

  it('lines side by side, in another place or of another style stay', () => {
    const solid: Marking = { ...dashed(12, 13.3), kind: 'solid' };
    const all = [dashed(0, 40), dashed(12, 13.3, 3), dashed(40, 50), solid];
    expect(distinct(all)).toHaveLength(4);
  });
});

describe('the simple T-junction (^962): a main road and a side road, each 1+1', () => {
  const graph = fromFile(
    JSON.parse(readFileSync(new URL('../../../docs/mocks/hat962.json', import.meta.url), 'utf8')),
  ).graph;
  const seen = withDerived(graph, derivedNodes(graph));
  const length = (m: Marking) => m.pieces.reduce((n, p) => n + pieceLength(p), 0);

  it('physical: no centerline on an Ortsstraße (^972)', () => {
    expect(markingsOf(seen, true)).toEqual([]);
  });

  it('logical: the main line is one line over its whole length, no short line restarts its dashes (^974)', () => {
    const m = markingsOf(seen, false);
    expect(m).toHaveLength(2);
    expect(m.map(length).sort((a, b) => b - a)[0]).toBeCloseTo(36.6, 1);
    expect(m.every((x) => length(x) > 5)).toBe(true);
  });
});
