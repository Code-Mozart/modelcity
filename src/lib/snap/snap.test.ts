import { describe, expect, it } from 'vitest';
import { buildEdge } from '../curves/edge';
import type { PathNode } from '../curves/types';
import { snapTo, SNAP_NEAR_PX } from './engine';
import { suggestionsOf, type RuleEdge, type RuleNode } from './rules';
import type { Suggestion } from './types';

const node = (id: number, x: number, y: number, th: number): RuleNode => ({ id, x, y, th });
const asPath = (n: RuleNode): PathNode => ({ x: n.x, y: n.y, th: n.th });

/** A map of nodes joined in a row, lane width 3 m. */
function map(nodes: RuleNode[]): Suggestion[] {
  const edges: RuleEdge[] = nodes.slice(1).map((q, i) => {
    const p = nodes[i]!;
    const E = buildEdge(asPath(p), asPath(q), null);
    return {
      id: i + 1,
      start: p.id,
      end: q.id,
      ref: { i, p: asPath(p), q: asPath(q), E },
      width: 3,
    };
  });
  return suggestionsOf(nodes, edges, () => 3);
}

const ask = (list: Suggestion[], x: number, y: number, pinned: number[] = []) =>
  snapTo(list, { pt: { x, y }, scale: 10, pinned: new Set(pinned) });

const straight = () => map([node(1, 0, 0, 0), node(2, 30, 0, 0)]);

describe('the rules (^265 to ^273, ^279)', () => {
  it('a node makes a normal line, a heading line and three points', () => {
    const list = straight();
    const rules = list.filter((s) => s.from.length === 1 && s.from[0] === 1).map((s) => s.rule);
    expect(rules.filter((r) => r === 'node-normal')).toHaveLength(1);
    expect(rules.filter((r) => r === 'node-points')).toHaveLength(3);
    const at = list.filter(
      (s) => s.kind === 'point' && s.rule === 'node-points' && s.from[0] === 1,
    );
    expect(at.map((p) => (p.kind === 'point' ? [p.at.x, p.at.y] : [])).sort()).toEqual(
      [
        [0, -3],
        [0, 0],
        [0, 3],
      ].sort(),
    );
  });

  it('a segment is a snap curve and has two offset curves one lane width away', () => {
    const list = straight();
    expect(list.filter((s) => s.rule === 'curve')).toHaveLength(1);
    expect(list.filter((s) => s.rule === 'offset')).toHaveLength(2);
    expect(ask(list, 10, 3.05)).toMatchObject({ pt: { x: 10, y: 3 } });
    expect(ask(list, 10, -2.96)).toMatchObject({ pt: { x: 10, y: -3 } });
  });
});

describe('the rules of arcs (^269 to ^273)', () => {
  it('an arc has radius points, ticks and, on a bend, a bisector with its tangent', () => {
    const list = map([node(1, 0, 0, 0), node(2, 50, 30, Math.PI / 2)]);
    expect(list.filter((s) => s.rule === 'radius-point').length).toBeGreaterThanOrEqual(2);
    expect(list.filter((s) => s.rule === 'tick').length).toBeGreaterThanOrEqual(1);
    expect(list.filter((s) => s.rule === 'bend')).toHaveLength(2);
    expect(list.filter((s) => s.rule === 'offset')).toHaveLength(2);
  });

  it('an S-curve has an inflection point with its tangent and normal', () => {
    const list = map([node(1, 0, 0, 0), node(2, 40, 10, 0)]);
    const p = list.find((s) => s.kind === 'point' && s.at.x === 20 && s.at.y === 5);
    expect(p).toBeDefined();
    expect(list.filter((s) => s.rule === 'inflection-lines').length).toBeGreaterThanOrEqual(1);
  });

  it('lines that coincide are one, with all their origins (^275)', () => {
    const list = map([node(1, 0, 0, 0), node(2, 40, 10, 0)]);
    const normals = list.filter((s) => s.kind === 'curve' && s.straight && s.origins[0]!.x === 0);
    const atNode = normals.filter((s) => s.kind === 'curve' && Math.abs(s.origins[0]!.y) < 1e-9);
    // the normal of the node and the normal at the tick, which is the node (an arc starts there)
    expect(atNode.filter((s) => s.rule === 'node-normal' || s.rule === 'tick')).toHaveLength(1);
  });
});

describe('snapping to them (^101, ^102)', () => {
  it('a point near nothing is not pulled anywhere', () => {
    expect(ask(straight(), 15, 1.5)).toBeNull();
  });

  it('pulls to the nearest line, within the near distance only', () => {
    const near = SNAP_NEAR_PX / 10;
    expect(ask(straight(), 0.9 * near, 20)).toMatchObject({ pt: { x: 0, y: 20 } });
    expect(ask(straight(), 1.1 * near, 20)).toBeNull();
  });

  it('a point beats a line, and a crossing of two lines is a point (^280)', () => {
    const hit = ask(straight(), 0.2, 3.2)!;
    expect(hit.pt).toEqual({ x: 0, y: 3 });
    expect(hit.by.length).toBeGreaterThan(0);
    const two = map([node(1, 0, 0, 0), node(2, 20, 10, Math.PI / 2)]);
    const cross = ask(two, 0.3, 9.8)!;
    expect(cross.pt).toEqual({ x: 0, y: 10 });
    expect(cross.by).toHaveLength(2);
  });

  it('only suggestions near their nodes are offered, pinned ones anywhere (^258)', () => {
    const list = map([node(1, 0, 0, 0), node(2, 30, 0, 0)]);
    const far = list.concat(map([node(9, 1000, 900, 0), node(8, 1030, 900, 0)]));
    expect(ask(far, 1000.05, 400)).toBeNull();
    expect(ask(far, 1000.05, 400, [9])).toMatchObject({ pt: { x: 1000, y: 400 } });
  });
});
