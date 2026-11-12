import { describe, expect, it } from 'vitest';
import { addEdge, addNode, emptyGraph } from '../model/graph';
import { junctionGround } from '../testing/junctionGround';
import { derivedNodes, withDerived } from './derived';
import { laneArrows } from './laneArrows';
import { laneChangesOf } from './laneChanges';

const arrowsOf = (g: ReturnType<typeof junctionGround>) => {
  const d = withDerived(g, derivedNodes(g));
  return laneArrows(d, laneChangesOf(d));
};

describe('the arrows of lanes that end (^1029, ^1059)', () => {
  it('one for every lane that merges, at the last node of its tower, shown as a merge', () => {
    const arrows = arrowsOf(junctionGround());
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.every((a) => a.sign.kind === 'merge')).toBe(true);
  });

  it('none where nothing leads to that node: the arrow would stand over the void', () => {
    // Two lanes that start side by side with nothing before them, and merge.
    let g = emptyGraph();
    const add = (x: number, y: number, th = 0) => {
      const r = addNode(g, { x, y, th });
      g = r.graph;
      return r.id;
    };
    const [a, b, end] = [add(0, 0), add(0, 3), add(40, 0)];
    g = addEdge(g, a, end, null);
    g = addEdge(g, b, end, null);
    expect(arrowsOf(g)).toEqual([]);
  });
});
