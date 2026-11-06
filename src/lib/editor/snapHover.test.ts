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
    ed.pointerMove(look(12, 1, 20));
    expect(ed.hover).toMatchObject({ kind: 'candidate' });
    expect(ed.snapped?.by[0]).toMatchObject({ rule: 'curve' });
    ed.pointerDown(look(12, 1, 20));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.nodes.at(-1)).toMatchObject({ x: 12, y: 0 });
  });

  it('with Ctrl it is the way it was: only what is under the pointer', () => {
    const ed = drawMode(road());
    ed.pointerMove(at(-2.8, 0));
    expect(ed.hover).toMatchObject({ kind: 'preview' });
    expect(ed.snapped).toBeNull();
  });
});

describe('the middle line of a straight segment (^798)', () => {
  it('at the middle of a straight segment, where its middle line crosses it, a click splits exactly there (^798)', () => {
    const ed = drawMode(road());
    ed.pointerMove(look(20, 1, 20));
    expect(ed.hover).toMatchObject({ kind: 'candidate' });
    ed.pointerDown(look(20, 1, 20));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.nodes.at(-1)).toMatchObject({ x: 20, y: 0 });
  });
});

describe('sliding along a curve still snaps to the other suggestions (^802)', () => {
  const crossing = () =>
    drawMode(
      mapOf([
        [
          [0, 0],
          [100, 0],
        ],
        [
          [30, -30],
          [60, -30],
        ],
      ]),
    );

  it('on the curve, near where a line crosses it, the pointer is pulled to the crossing', () => {
    const ed = crossing();
    ed.pointerMove(look(30.6, 0.1, 4)); // on the segment, 0.6 m from the normal line of the other road's first node, away from the nodes and their handles
    expect(ed.hover).toMatchObject({ kind: 'candidate' });
    expect(ed.snapped?.pt).toMatchObject({ x: 30, y: 0 });
  });

  it('and a click there splits the segment at the crossing', () => {
    const ed = crossing();
    ed.pointerMove(look(30.6, 0.1, 4));
    ed.pointerDown(look(30.6, 0.1, 4));
    ed.pointerUp();
    expect(
      ed.graph.nodes.find((n) => Math.abs(n.x - 30) < 1e-6 && Math.abs(n.y) < 1e-6),
    ).toBeDefined();
  });

  it('also in extend mode, where a click merges into the curve', () => {
    const ed = crossing();
    ed.pointerMove(look(60, -30, 4));
    ed.pointerDown(look(60, -30, 4));
    ed.pointerUp();
    expect(ed.phase).toBe('extend');
    ed.pointerMove(look(30.6, 0.1, 4));
    expect(ed.hover).toMatchObject({ kind: 'candidate' });
    expect(ed.snapped?.pt).toMatchObject({ x: 30, y: 0 });
  });
});

describe('the right click does what the hint says where the pointer is snapped (^808)', () => {
  const near = () => {
    const ed = drawMode(
      mapOf([
        [
          [0, 0],
          [100, 0],
        ],
      ]),
    );
    ed.pointerMove(look(4, 0.1, 4)); // on the segment, 16 px from the first node: pulled to it
    return ed;
  };

  it('the hover is the node, the hint says delete node', () => {
    const ed = near();
    expect(ed.hover).toMatchObject({ kind: 'handle', handle: { type: 'node' } });
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', type: 'node' });
  });

  it('and the right click deletes that node, not the segment under the raw pointer', () => {
    const ed = near();
    ed.rightClick(look(4, 0.1, 4));
    expect(ed.timeline.history.past.at(-1)?.name).toBe('delete node');
  });
});
