import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { mapOf } from '../testing/snapHelpers';
import { addNode, emptyGraph } from '../model/graph';

const alt = (x: number, y: number) => at(x, y, { alt: true });
const plain = (x: number, y: number) => at(x, y, { ctrl: true });
const click = (ed: Editor, p: ReturnType<typeof at>) => {
  ed.pointerDown(p);
  ed.pointerUp();
};
const edgesOf = (ed: Editor) => ed.graph.edges.map((e) => [e.start, e.end]);

/** One road A (0, 0) to B (20, 0): A is its branch start node, B its branch end node. In draw mode. */
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

describe('a click extends the way the branch grows (^916)', () => {
  it('from a branch end node forwards, from a branch start node backwards', () => {
    const forwards = road();
    click(forwards, plain(20, 0));
    expect(forwards.end).toBe('end');
    const backwards = road();
    click(backwards, plain(0, 0));
    expect(backwards.end).toBe('start');
  });

  it('Alt turns it round: backwards from a branch end node, forwards from a branch start node (^915, ^917)', () => {
    const fromEnd = road();
    click(fromEnd, alt(20, 0));
    expect(fromEnd.end).toBe('start');
    const fromStart = road();
    click(fromStart, alt(0, 0));
    expect(fromStart.end).toBe('end');
  });

  it('a node with no segment extends forwards, backwards with Alt', () => {
    const lone = () => {
      const ed = new Editor();
      ed.load(addNode(emptyGraph(), { x: 0, y: 0, th: 0 }).graph);
      ed.enterDrawMode();
      return ed;
    };
    const forwards = lone();
    click(forwards, plain(0, 0));
    expect(forwards.end).toBe('end');
    const backwards = lone();
    click(backwards, alt(0, 0));
    expect(backwards.end).toBe('start');
  });
});

describe('the way stays (^916)', () => {
  it('the way stays until extend mode is left, whether Alt is held or not', () => {
    const ed = road();
    click(ed, alt(20, 0));
    click(ed, plain(20, -30));
    click(ed, plain(50, -50));
    expect(edgesOf(ed)).toEqual([
      [0, 1],
      [2, 1],
      [3, 2],
    ]);
    expect(ed.end).toBe('start');
  });

  it('after Esc the next click chooses again', () => {
    const ed = road();
    click(ed, alt(20, 0));
    click(ed, plain(20, -30));
    ed.key('Escape');
    ed.enterDrawMode();
    click(ed, plain(20, 0));
    expect(ed.end).toBe('end');
  });
});

describe('a merge or split on the way (^916)', () => {
  it('a merge backwards is a split: the segment runs out of the node reached', () => {
    const ed = road();
    click(ed, plain(0, 0));
    click(ed, plain(-30, 20));
    click(ed, plain(20, 0));
    expect(edgesOf(ed).at(-1)).toEqual([1, 2]);
  });
});

describe('placing the first node (^918 and ^919 were withdrawn)', () => {
  it('LMB places the first node and goes forwards, and so does Alt+LMB, whose Alt inverts a snapped heading (^301)', () => {
    for (const press of [plain, alt]) {
      const ed = new Editor();
      ed.enterDrawMode();
      click(ed, press(0, 0));
      expect(ed.end).toBe('end');
      click(ed, plain(30, 20));
      expect(edgesOf(ed)).toEqual([[0, 1]]);
    }
  });
});
