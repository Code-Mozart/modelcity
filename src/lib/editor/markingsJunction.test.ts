import { describe, expect, it } from 'vitest';
import { line } from '../curves/piece';
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
  it('has no centerline on an Ortsstraße (^972), so nothing restarts', () => {
    const graph = fromFile(
      JSON.parse(readFileSync(new URL('../../../docs/mocks/hat962.json', import.meta.url), 'utf8')),
    ).graph;
    expect(markingsOf(withDerived(graph, derivedNodes(graph)))).toEqual([]);
  });
});
