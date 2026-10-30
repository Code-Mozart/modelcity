import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, bareCurvePoint, click, draw, drawMode, last } from './testing/editorHelpers';
import { toRad } from './curves/vec';

describe('a new editor', () => {
  it('starts with a blank canvas', () => {
    const ed = new Editor();
    expect(ed.roads).toEqual([]);
    expect(ed.active).toBeNull();
    expect(ed.anchors).toEqual([]);
  });

  it('starts in select mode: no preview of a node, a default cursor', () => {
    const ed = new Editor();
    ed.pointerMove(at(10, 5));
    expect(ed.drawing).toBe(false);
    expect(ed.hover).toBeNull();
    expect(ed.cursor).toBe('default');
  });
});

describe('creating a road with clicks (^40)', () => {
  it('the first click starts a road with one node heading right', () => {
    const ed = draw([[3, 4]]);
    expect(ed.roads).toHaveLength(1);
    expect(ed.roads[0]!.nodes).toEqual([{ x: 3, y: 4, th: 0 }]);
    expect(ed.active).toBe(0);
    expect(ed.sel).toEqual({ road: 0, node: 0 });
  });

  it('further clicks extend the road with a curve from the heading to the cursor', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
      [40, 0],
    ]);
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    expect(ed.edges[0]!.map((e) => e.E.kind)).toEqual(['C', 'C']);
    expect(ed.sel).toEqual({ road: 0, node: 2 });
  });

  it('previews the next node with the curve from the last one', () => {
    const ed = draw([[0, 0]]);
    ed.pointerMove(at(20, -10));
    expect(ed.hover).toMatchObject({
      kind: 'preview',
      ref: { x: 0, y: 0 },
      node: { x: 20, y: -10 },
    });
  });

  it('a node behind the arrow gets a curve, not a straight line, in the preview and when created', () => {
    const ed = draw([[0, 0]]);
    ed.pointerMove(at(-10, 8));
    const preview = ed.hover;
    expect(preview?.kind).toBe('preview');
    click(ed, -10, 8);
    expect(ed.edges[0]![0]!.E.kind).not.toBe('line');
  });
});

describe('creating by dragging the heading (^40)', () => {
  it('dragging while placing sets the heading from the press point to the cursor', () => {
    const ed = drawMode();
    ed.pointerDown(at(0, 0));
    ed.pointerMove(at(0, 20));
    expect(last(ed).th).toBeCloseTo(toRad(90));
    expect(last(ed)).toMatchObject({ x: 0, y: 0 });
    ed.pointerUp();
    ed.pointerMove(at(50, 50));
    expect(last(ed).th).toBeCloseTo(toRad(90));
  });

  it('ignores a tiny movement, so a click keeps its automatic heading', () => {
    const ed = drawMode();
    ed.pointerDown(at(0, 0));
    ed.pointerMove(at(0.5, 0.5));
    expect(last(ed).th).toBe(0);
  });
});

describe('dragging the heading of later nodes (^40)', () => {
  it('works for later nodes and can make an S-curve', () => {
    const ed = draw([[0, 0]]);
    ed.pointerDown(at(40, -10));
    ed.pointerMove(at(60, -10));
    ed.pointerUp();
    expect(last(ed).th).toBeCloseTo(0);
    expect(ed.edges[0]![0]!.E.kind).toBe('S');
  });

  it('snaps the heading to 15 degrees with shift', () => {
    const ed = drawMode();
    ed.pointerDown(at(0, 0));
    ed.pointerMove(at(10 * Math.cos(toRad(33)), 10 * Math.sin(toRad(33)), { shift: true }));
    expect(last(ed).th).toBeCloseTo(toRad(30));
  });
});

describe('starting another road and finishing roads (^40)', () => {
  it('Esc finishes the road; the next click starts a new one, even on a non-blank canvas', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    expect(ed.key('Escape')).toBe(true);
    expect(ed.active).toBeNull();
    click(ed, 100, 100);
    click(ed, 100, 100);
    expect(ed.roads).toHaveLength(2);
    expect(ed.roads[1]!.nodes).toEqual([{ x: 100, y: 100, th: 0 }]);
    expect(ed.active).toBe(1);
  });
});

describe('finishing roads with other inputs (^40)', () => {
  it('finishing a road with one node cancels it', () => {
    const ed = draw([[0, 0]]);
    ed.key('Escape');
    expect(ed.roads).toEqual([]);
  });

  it('a right click on empty space finishes the road', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    ed.rightClick(at(80, 80));
    expect(ed.active).toBeNull();
    expect(ed.roads).toHaveLength(1);
  });

  it('clicking the last node again finishes the road, or cancels it if it is the only node', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    click(ed, 20, -10);
    expect(ed.active).toBeNull();
    expect(ed.roads[0]!.nodes).toHaveLength(2);
    const lone = draw([[0, 0]]);
    click(lone, 0, 0);
    expect(lone.roads).toEqual([]);
    expect(lone.active).toBeNull();
  });

  it('dragging the last node moves it and keeps drawing', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(30, -12));
    ed.pointerUp();
    expect(last(ed)).toMatchObject({ x: 30, y: -12 });
    expect(ed.active).toBe(0);
  });
});

describe('editing while drawing (^40)', () => {
  const road = (): [number, number][] => [
    [0, 0],
    [20, -10],
    [40, 0],
  ];

  it('pressing on a handle edits it instead of creating a node', () => {
    const ed = draw(road());
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(22, -16));
    ed.pointerUp();
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    expect(ed.roads[0]!.nodes[1]).toMatchObject({ x: 22, y: -16 });
    expect(ed.active).toBe(0);
  });
});

describe('hover and inserting while drawing (^40)', () => {
  const road = (): [number, number][] => [
    [0, 0],
    [20, -10],
    [40, 0],
  ];

  it('shows what is under the pointer: a handle, a curve, else the preview', () => {
    const ed = draw(road());
    ed.pointerMove(at(20, -10));
    expect(ed.hover?.kind).toBe('handle');
    const mid = bareCurvePoint(ed);
    ed.pointerMove(at(mid.x, mid.y));
    expect(ed.hover?.kind).toBe('candidate');
    ed.pointerMove(at(80, 80));
    expect(ed.hover?.kind).toBe('preview');
  });

  it('pressing on a curve inserts a node there and keeps drawing', () => {
    const ed = draw(road());
    const mid = bareCurvePoint(ed);
    click(ed, mid.x, mid.y);
    expect(ed.roads[0]!.nodes).toHaveLength(4);
    expect(ed.sel!.road).toBe(0);
    expect(ed.active).toBe(0);
  });
});

describe('inserting nodes (^40)', () => {
  const road = (): [number, number][] => [
    [0, 0],
    [20, -10],
    [40, 0],
  ];

  it('dragging an inserted node sets a different heading', () => {
    const ed = draw(road());
    const mid = bareCurvePoint(ed);
    ed.pointerDown(at(mid.x, mid.y));
    const node = ed.sel!.node;
    const before = ed.roads[0]!.nodes[node]!.th;
    ed.pointerMove(at(mid.x, mid.y + 20));
    ed.pointerUp();
    expect(ed.roads[0]!.nodes[node]!.th).toBeCloseTo(toRad(90));
    expect(ed.roads[0]!.nodes[node]!.th).not.toBeCloseTo(before);
  });

  it('in select mode a click on a curve selects its two nodes instead of inserting (^74)', () => {
    const ed = draw(road());
    ed.key('Escape');
    const mid = bareCurvePoint(ed);
    click(ed, mid.x, mid.y);
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    expect(ed.drawing).toBe(false);
    expect(ed.selection).toHaveLength(2);
    click(ed, 100, 100);
    expect(ed.drawing).toBe(true);
    click(ed, 100, 100);
    expect(ed.roads).toHaveLength(2);
    expect(ed.active).toBe(1);
  });
});

describe('removing and aborting (^40)', () => {
  it('a right click on a node removes it, also while drawing', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
      [40, 0],
    ]);
    ed.rightClick(at(20, -10));
    expect(ed.roads[0]!.nodes).toHaveLength(2);
    expect(ed.active).toBe(0);
  });
});

describe('removing nodes (^40)', () => {
  it('Delete removes the selected node; a road left with one node disappears', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    ed.key('Escape');
    ed.pointerDown(at(20, -10));
    ed.pointerUp();
    expect(ed.sel).toEqual({ road: 0, node: 1 });
    expect(ed.key('Delete')).toBe(true);
    expect(ed.roads).toEqual([]);
    expect(ed.sel).toBeNull();
  });

  it('cancelPress undoes what the left button did (a second finger came down)', () => {
    const ed = draw([[0, 0]]);
    ed.pointerDown(at(20, -10));
    expect(ed.roads[0]!.nodes).toHaveLength(2);
    ed.cancelPress();
    expect(ed.roads[0]!.nodes).toHaveLength(1);
    expect(ed.active).toBe(0);
  });

  it('ignores unbound keys', () => {
    expect(new Editor().key('q')).toBe(false);
  });

  it('resets an explicit radius to auto on double-click of its ring', () => {
    const ed = draw([
      [0, 0],
      [30, -20],
    ]);
    ed.key('Escape');
    ed.roads = [{ ...ed.roads[0]!, radii: [3] }];
    const ring = ed.handles(4).find((h) => h.type === 'rad')!;
    ed.resetRadiusAt(at(ring.x, ring.y));
    expect(ed.roads[0]!.radii[0]).toBeNull();
  });
});
