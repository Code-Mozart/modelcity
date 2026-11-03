import { describe, expect, it } from 'vitest';
import { at } from '../testing/editorHelpers';
import { drawMode, mapOf } from '../testing/snapHelpers';

const road = () =>
  mapOf([
    [
      [0, 0],
      [40, 0],
    ],
  ]);
const look = (x: number, y: number, scale = 4) => at(x, y, { ctrl: false, scale });

describe('split and merge use the snap suggestions (^101)', () => {
  it('a node that is near is the node, and the guide shows it', () => {
    const ed = drawMode(road());
    ed.pointerMove(look(-2.8, 0));
    expect(ed.hover).toMatchObject({ kind: 'handle', handle: { type: 'node', id: 0 } });
    expect(ed.snapped?.pt).toEqual({ x: 0, y: 0 });
    // The point and the lines through it are shown together, also when the node is grabbed (^289).
    expect(ed.snapped?.by.filter((b) => b.kind === 'curve').length).toBeGreaterThanOrEqual(2);
  });

  it('a click there acts on the node: it starts a new road from it', () => {
    const ed = drawMode(road());
    ed.pointerMove(look(-2.8, 0));
    ed.pointerDown(look(-2.8, 0));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.active).toBe(0);
  });

  it('a curve that is near is a place on the curve, and a click splits there', () => {
    const ed = drawMode(road());
    ed.pointerMove(look(20, 1, 20));
    expect(ed.hover).toMatchObject({ kind: 'candidate' });
    expect(ed.snapped?.by[0]).toMatchObject({ rule: 'curve' });
    ed.pointerDown(look(20, 1, 20));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.nodes.at(-1)).toMatchObject({ x: 20, y: 0 });
  });

  it('with Ctrl it is the way it was: only what is under the pointer', () => {
    const ed = drawMode(road());
    ed.pointerMove(at(-2.8, 0));
    expect(ed.hover).toMatchObject({ kind: 'preview' });
    expect(ed.snapped).toBeNull();
  });
});
