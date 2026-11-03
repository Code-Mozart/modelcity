import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { addEdge, addNode, emptyGraph } from '../model/graph';
import { at, click } from '../testing/editorHelpers';

/** A bend from (0,0) heading east to (50,30) heading south: it has an arc, so radius points. */
function bend() {
  let g = emptyGraph();
  const a = addNode(g, { x: 0, y: 0, th: 0 });
  const b = addNode(a.graph, { x: 50, y: 30, th: Math.PI / 2 });
  g = addEdge(b.graph, a.id, b.id, null);
  const ed = new Editor();
  ed.load(g);
  ed.enterDrawMode();
  return ed;
}

const middle = (ed: Editor) => ed.handles(4).find((h) => h.type === 'rad' && h.t === 0.5)!;

describe('radius points in draw mode (^278)', () => {
  it('a click on one splits there, like a click on the curve', () => {
    const ed = bend();
    const h = middle(ed);
    expect(ed.hintTarget).toMatchObject({ kind: 'empty' });
    ed.pointerMove(at(h.x, h.y));
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', type: 'rad', act: 'split' });
    click(ed, h.x, h.y);
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.nodes.at(-1)!.x).toBeCloseTo(h.x, 2);
    expect(ed.graph.nodes.at(-1)!.y).toBeCloseTo(h.y, 2);
    expect(ed.phase).toBe('extend');
  });

  it('a drag moves the radius, as before', () => {
    const ed = bend();
    const h = middle(ed);
    const before = ed.graph;
    ed.pointerDown(at(h.x, h.y));
    ed.pointerMove(at(h.x + 3, h.y - 3));
    ed.pointerMove(at(h.x + 6, h.y - 6));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.graph.edges[0]!.radius).not.toBe(before.edges[0]!.radius);
  });
});

describe('a click on the node inserted by a split (^276)', () => {
  it('keeps it, and goes back to draw mode', () => {
    const ed = bend();
    const h = middle(ed);
    click(ed, h.x, h.y);
    click(ed, h.x, h.y);
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.edges).toHaveLength(2);
    expect(ed.phase).toBe('draw');
  });

  it('stays when draw mode is left afterwards (^298)', () => {
    const ed = bend();
    const h = middle(ed);
    click(ed, h.x, h.y);
    click(ed, h.x, h.y);
    ed.key('Escape');
    expect(ed.phase).toBe('select');
    expect(ed.graph.nodes).toHaveLength(3);
  });

  it('Esc right after the split still gives the curve back (^237)', () => {
    const ed = bend();
    const h = middle(ed);
    click(ed, h.x, h.y);
    ed.key('Escape');
    expect(ed.graph.nodes).toHaveLength(2);
  });
});
