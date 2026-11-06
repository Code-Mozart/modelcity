import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { hintsFor } from '../hints/hints';
import { show } from '../testing/hintHelpers';
import { at, click, drawMode, roadThenDrawMode } from '../testing/editorHelpers';

const steps = (ed: Editor) => ed.timeline.history.past.map((s) => s.name);

describe('cancelling the first node (^438)', () => {
  it('a click on it says and names `cancel`, and takes the node away', () => {
    const ed = drawMode();
    click(ed, 10, 10);
    ed.pointerMove(at(10, 10));
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', act: 'cancel' });
    click(ed, 10, 10);
    expect(ed.graph.nodes).toHaveLength(0);
    expect(steps(ed).at(-1)).toBe('cancel first node');
  });

  it('`Esc` is the same step', () => {
    const ed = drawMode();
    click(ed, 10, 10);
    ed.key('Escape', { ctrl: false, shift: false });
    expect(ed.graph.nodes).toHaveLength(0);
    expect(steps(ed).at(-1)).toBe('cancel first node');
  });

  it('once a segment is drawn it is `finish road` again', () => {
    const ed = drawMode();
    click(ed, 10, 10);
    click(ed, 40, 10);
    ed.key('Escape', { ctrl: false, shift: false });
    expect(steps(ed).at(-1)).toBe('finish road');
  });

  it('the hints say `cancel` while only the first node is placed', () => {
    const empty = { kind: 'empty' } as const;
    const rows = hintsFor(true, empty, 0, { firstNodeOnly: true }).map(show);
    expect(rows).toContain('Esc or RMB: cancel');
    const node = { kind: 'handle', type: 'node', act: 'cancel' } as const;
    expect(hintsFor(true, node, 0, { firstNodeOnly: true }).map(show)[1]).toBe(
      'LMB or Esc: cancel',
    );
    expect(hintsFor(true, empty, 0).map(show)).toContain('Esc or RMB: finish');
  });
});

describe('a node without a segment is extended, not split (^494)', () => {
  /** An editor with one node and no segment (what a reload gives, ^484). */
  const lone = () => {
    const first = drawMode();
    click(first, 0, 0);
    const ed = new Editor();
    ed.load(first.graph);
    ed.enterDrawMode();
    return ed;
  };

  it('the hint and the step say `extend`, and the road is drawn on from the node', () => {
    const ed = lone();
    ed.pointerMove(at(0, 0));
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', act: 'extend' });
    click(ed, 0, 0);
    expect(ed.active).toBe(0);
    expect(steps(ed).at(-1)).toBe('extend road');
  });
});

describe('the hint target knows a right click is on the selection (^779)', () => {
  it('a node of a selection of several, and a segment between two of them', () => {
    const ed = roadThenDrawMode([
      [0, 0],
      [20, -10],
      [40, 0],
    ]);
    ed.key('Escape', { ctrl: false, shift: false });
    ed.selection = [...ed.graph.nodes.map((n) => n.id)];
    ed.pointerMove(at(0, 0));
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', onSelection: true });
    ed.selection = [ed.graph.nodes[0]!.id];
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', onSelection: false });
  });
});
