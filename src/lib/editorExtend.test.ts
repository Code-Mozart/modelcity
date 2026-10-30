import { describe, expect, it } from 'vitest';
import { at, click, draw } from './testing/editorHelpers';

/** Road A from (0,0) over (20,-10) to (40,0), finished; back in draw mode with no road yet. */
const roadThenDrawMode = () => {
  const ed = draw([
    [0, 0],
    [20, -10],
    [40, 0],
  ]);
  ed.key('Escape');
  click(ed, 500, 500);
  return ed;
};

describe('extending a road from a leaf node (^65)', () => {
  it('a click on the last node extends the road from it', () => {
    const ed = roadThenDrawMode();
    click(ed, 40, 0);
    expect(ed.active).toBe(0);
    expect(ed.end).toBe('end');
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    ed.pointerMove(at(70, 20));
    expect(ed.hover).toMatchObject({ kind: 'preview', end: 'end', ref: { x: 40, y: 0 } });
    click(ed, 70, 20);
    expect(ed.roads).toHaveLength(1);
    expect(ed.roads[0]!.nodes).toHaveLength(4);
    expect(ed.roads[0]!.nodes[3]).toMatchObject({ x: 70, y: 20 });
  });

  it('a click on the first node extends the road backwards: new nodes are added before it', () => {
    const ed = roadThenDrawMode();
    click(ed, 0, 0);
    expect(ed.end).toBe('start');
    ed.pointerMove(at(-30, 15));
    expect(ed.hover).toMatchObject({ kind: 'preview', end: 'start', ref: { x: 0, y: 0 } });
    click(ed, -30, 15);
    const nodes = ed.roads[0]!.nodes;
    expect(nodes).toHaveLength(4);
    expect(nodes[0]).toMatchObject({ x: -30, y: 15 });
    expect(nodes[1]).toMatchObject({ x: 0, y: 0, th: 0 });
    expect(ed.sel).toEqual({ road: 0, node: 0 });
    expect(ed.edges[0]![0]!.E.kind).not.toBe('line');
  });
});

describe('extending from the other end and finishing (^65)', () => {
  it('extends the road being drawn from its other end', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    click(ed, 0, 0);
    expect(ed.active).toBe(0);
    expect(ed.end).toBe('start');
    click(ed, -20, 20);
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    click(ed, -20, 20);
    expect(ed.drawing).toBe(false);
  });

  it('clicking the node being drawn from finishes the road, at either end', () => {
    const ed = roadThenDrawMode();
    click(ed, 0, 0);
    click(ed, 0, 0);
    expect(ed.drawing).toBe(false);
    expect(ed.roads[0]!.nodes).toHaveLength(3);
  });

  it('a click on a node in the middle only selects it, a drag moves it', () => {
    const ed = roadThenDrawMode();
    click(ed, 20, -10);
    expect(ed.active).toBeNull();
    expect(ed.sel).toEqual({ road: 0, node: 1 });
    ed.pointerDown(at(40, 0));
    ed.pointerMove(at(46, 4));
    ed.pointerUp();
    expect(ed.roads[0]!.nodes[2]).toMatchObject({ x: 46, y: 4 });
    expect(ed.active).toBeNull();
  });
});

describe('extending a road after drawing another (^65)', () => {
  it('switching to another road drops a road that has only one node so far', () => {
    const ed = roadThenDrawMode();
    click(ed, 300, 300);
    expect(ed.roads).toHaveLength(2);
    click(ed, 40, 0);
    expect(ed.roads).toHaveLength(1);
    expect(ed.active).toBe(0);
  });

  it('keeps the other roads and fixes the index when an earlier road is dropped', () => {
    const ed = roadThenDrawMode();
    click(ed, 40, 0);
    ed.key('Escape');
    click(ed, 500, 500);
    click(ed, 200, 200);
    click(ed, 260, 230);
    ed.key('Escape');
    click(ed, 500, 500);
    click(ed, 400, 400);
    expect(ed.roads).toHaveLength(3);
    click(ed, 260, 230);
    expect(ed.roads).toHaveLength(2);
    expect(ed.active).toBe(1);
    expect(ed.roads[ed.active!]!.nodes).toHaveLength(2);
  });
});

describe('extending from a leaf node is a draw mode control (^65)', () => {
  it('is not available in select mode: a click on a leaf only selects it', () => {
    const ed = roadThenDrawMode();
    ed.key('Escape');
    click(ed, 40, 0);
    expect(ed.drawing).toBe(false);
    expect(ed.active).toBeNull();
  });

  it('a second finger takes the click back, and finishing resets the end', () => {
    const ed = roadThenDrawMode();
    ed.pointerDown(at(0, 0));
    ed.cancelPress();
    ed.pointerUp();
    expect(ed.active).toBeNull();
    click(ed, 0, 0);
    expect(ed.end).toBe('start');
    ed.key('Escape');
    expect(ed.end).toBe('end');
  });
});
