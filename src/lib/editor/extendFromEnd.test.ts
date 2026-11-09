import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { mapOf } from '../testing/snapHelpers';

const alt = (x: number, y: number) => at(x, y, { alt: true });
const plain = (x: number, y: number) => at(x, y, { ctrl: true });
const click = (ed: Editor, p: ReturnType<typeof at>) => {
  ed.pointerDown(p);
  ed.pointerUp();
};

/** One road A (0, 0) to B (20, 0), in draw mode. */
function road() {
  const ed = new Editor();
  ed.load(
    mapOf([
      [
        [0, 0],
        [20, 0],
      ],
    ]),
  );
  ed.enterDrawMode();
  return ed;
}

describe('Alt+LMB extends from the end (^915)', () => {
  it('the clicked node is the end of the new segment, and the road is drawn backwards until extend mode is left, whether Alt is held or not', () => {
    const ed = road();
    click(ed, alt(20, 0));
    expect(ed.phase).toBe('extend');
    click(ed, plain(20, -30));
    click(ed, plain(50, -50));
    expect(ed.graph.edges.map((e) => [e.start, e.end])).toEqual([
      [0, 1],
      [2, 1],
      [3, 2],
    ]);
  });

  it('without Alt the road goes on forward from the node, as before', () => {
    const ed = road();
    click(ed, plain(20, 0));
    expect(ed.end).toBe('end');
    click(ed, plain(50, 20));
    click(ed, plain(90, 0));
    const last = ed.graph.edges.at(-1)!;
    expect(last.end).toBe(ed.graph.nodes.at(-1)!.id);
    expect(last.start).toBeLessThan(last.end);
  });

  it('after Esc the backwards drawing is over: a click without Alt extends forward again', () => {
    const ed = road();
    click(ed, alt(20, 0));
    expect(ed.end).toBe('start');
    click(ed, plain(20, -30));
    ed.key('Escape');
    ed.enterDrawMode();
    click(ed, plain(20, 0));
    expect(ed.end).toBe('end');
  });

  it('the hint says extend from end', () => {
    const ed = road();
    ed.pointerMove(alt(20, 0));
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', act: 'extend' });
  });
});
