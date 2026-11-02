import { describe, expect, it } from 'vitest';
import { at, click, draw, roadDrawn, roadThenDrawMode } from '../testing/editorHelpers';

/** Road A from (0,0) over (20,-10) to (40,0), finished; back in draw mode with no road yet. */
const road = () =>
  roadThenDrawMode([
    [0, 0],
    [20, -10],
    [40, 0],
  ]);

describe('extending a road from a leaf node (^65)', () => {
  it('a click on the last node extends the road from it', () => {
    const ed = road();
    click(ed, 40, 0);
    expect(roadDrawn(ed)).toBe(0);
    expect(ed.end).toBe('end');
    expect(ed.chains[0]!.path.nodes).toHaveLength(3);
    ed.pointerMove(at(70, 20));
    expect(ed.hover).toMatchObject({ kind: 'preview', end: 'end', ref: { x: 40, y: 0 } });
    click(ed, 70, 20);
    expect(ed.chains).toHaveLength(1);
    expect(ed.chains[0]!.path.nodes).toHaveLength(4);
    expect(ed.chains[0]!.path.nodes[3]).toMatchObject({ x: 70, y: 20 });
  });

  it('a click on the first node extends the road backwards: new nodes are added before it', () => {
    const ed = road();
    click(ed, 0, 0);
    expect(ed.end).toBe('first'); // nothing placed yet: a node goes before it, a merge out of it (^239)
    ed.pointerMove(at(-30, 15));
    expect(ed.hover).toMatchObject({ kind: 'preview', end: 'first', ref: { x: 0, y: 0 } });
    click(ed, -30, 15);
    const nodes = ed.chains[0]!.path.nodes;
    expect(nodes).toHaveLength(4);
    expect(nodes[0]).toMatchObject({ x: -30, y: 15 });
    expect(nodes[1]).toMatchObject({ x: 0, y: 0, th: 0 });
    expect(ed.sel).toEqual(ed.chains[0]!.nodeIds[0]);
    expect(ed.edges[0]![0]!.E.kind).not.toBe('line');
  });
});

describe('extending from the other end and finishing (^65)', () => {
  it('a click on the node where the road started closes a loop (^162)', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
      [40, 0],
    ]);
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', type: 'node', act: 'finish' });
    ed.pointerMove(at(0, 0));
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', type: 'node', act: 'close' });
    click(ed, 0, 0);
    expect(ed.phase).toBe('draw');
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.chains).toHaveLength(1);
    const ids = ed.chains[0]!.nodeIds;
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe(ids[3]);
  });

  it('clicking the node being drawn from finishes the road, at either end', () => {
    const ed = road();
    click(ed, 0, 0);
    click(ed, 0, 0);
    expect(ed.phase).toBe('draw');
    expect(ed.chains[0]!.path.nodes).toHaveLength(3);
  });

  it('a click on a node in the middle splits a road off it in draw mode, a drag moves it', () => {
    const ed = road();
    click(ed, 20, -10);
    expect(ed.active).toBe(ed.chains[0]!.nodeIds[1]);
    expect(ed.origin).toBe(ed.active);
    ed.key('Escape');
    expect(ed.chains).toHaveLength(1);
    ed.pointerDown(at(40, 0));
    ed.pointerMove(at(46, 4));
    ed.pointerUp();
    expect(ed.chains[0]!.path.nodes[2]).toMatchObject({ x: 46, y: 4 });
    expect(ed.active).toBeNull();
  });
});

describe('extending from a leaf node is a draw mode control (^65)', () => {
  it('is not available in select mode: a click on a leaf only selects it', () => {
    const ed = road();
    ed.key('Escape');
    click(ed, 40, 0);
    expect(ed.phase).toBe('select');
    expect(ed.active).toBeNull();
  });

  it('a second finger takes the click back, and finishing resets the end', () => {
    const ed = road();
    ed.pointerDown(at(0, 0));
    ed.cancelPress();
    ed.pointerUp();
    expect(ed.active).toBeNull();
    click(ed, 0, 0);
    expect(ed.end).toBe('first');
    ed.key('Escape');
    expect(ed.end).toBe('end');
  });
});

/** Two parallel segments, A (0) to B (1) and C (2) to D (3), and draw mode. */
const parallel = () => {
  const ed = draw([
    [0, 0],
    [60, 0],
  ]);
  ed.key('Escape');
  click(ed, 500, 500);
  click(ed, 0, 40);
  click(ed, 60, 40);
  ed.key('Escape');
  click(ed, 500, 500);
  return ed;
};
const edges = (ed: ReturnType<typeof parallel>) => ed.graph.edges.map((e) => `${e.start}>${e.end}`);

describe('a merge follows the order of the clicks (^239)', () => {
  it('A first, then D: the segment runs from A to D, as clicked', () => {
    const ed = parallel();
    click(ed, 0, 0);
    ed.pointerMove(at(60, 40));
    expect(ed.mergePreview).toMatchObject({
      end: 'end',
      ref: { x: 0, y: 0 },
      node: { x: 60, y: 40 },
    });
    click(ed, 60, 40);
    expect(edges(ed)).toEqual(['0>1', '2>3', '0>3']);
  });

  it('D first, then A: from D to A', () => {
    const ed = parallel();
    click(ed, 60, 40);
    click(ed, 0, 0);
    expect(edges(ed)).toEqual(['0>1', '2>3', '3>0']);
  });
});

describe('a merge after closing a loop or placing a node (^239)', () => {
  it('closing the loop at the node where the road started still runs the usual way', () => {
    const ed = parallel();
    click(ed, 0, 0);
    click(ed, 60, 0);
    expect(edges(ed)).toEqual(['0>1', '2>3', '1>0']);
  });

  it('once a node was placed the road is drawn backwards: a merge goes into the new node', () => {
    const ed = parallel();
    click(ed, 0, 0);
    click(ed, -30, 20);
    expect(ed.end).toBe('start');
    click(ed, 60, 40);
    expect(edges(ed).at(-1)).toBe('3>4');
  });
});
