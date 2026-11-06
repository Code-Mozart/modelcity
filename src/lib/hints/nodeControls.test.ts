import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/editor.svelte';
import { at } from '../testing/editorHelpers';
import { mapOf } from '../testing/snapHelpers';
import { NODE_CONTROLS, nodeHints, type NodeControl, type NodeFacts } from './nodeControls';

/** The controls of select mode with the pointer on a node, checked against the handlers (^783). */
const B = { x: 30, y: 0 };
const keys = { ctrl: false, shift: false };

/** A road A B C and another one; the pointer is on B; these nodes are selected. */
function ready(selection: number[]) {
  const ed = new Editor();
  ed.load(
    mapOf([
      [
        [0, 0],
        [30, 0],
        [60, 0],
      ],
      [
        [0, 60],
        [30, 60],
      ],
    ]),
  );
  ed.selection = selection;
  ed.pointerMove(at(B.x, B.y));
  return ed;
}

function factsOf(ed: Editor): NodeFacts {
  const t = ed.hintTarget;
  if (t.kind !== 'handle' || t.type !== 'node') throw new Error('the pointer is on a node');
  const node = { selected: !!t.selected, lane: !!t.lane, onSelection: !!t.onSelection };
  return { selected: ed.selection.length, node };
}

/** Do the input of a control with the pointer on B. */
function press(ed: Editor, c: NodeControl) {
  const { input } = c;
  const mods = input.kind === 'mouse' ? { shift: !!input.shift, alt: !!input.alt } : {};
  const where = (dx = 0, dy = 0) => at(B.x + dx, B.y + dy, mods);
  if (input.kind === 'key') return ed.key(input.label === 'Esc' ? 'Escape' : 'Delete', keys);
  if (input.kind !== 'mouse') throw new Error('a key or the mouse');
  if (input.button === 'rmb') return ed.rightClick(where());
  ed.pointerDown(where());
  if (input.drag) {
    ed.pointerMove(where(5, 4));
    ed.pointerMove(where(12, 9));
  }
  ed.pointerUp();
}

/** Whether the input changed anything: the map, the selection or the history. */
function effect(ed: Editor, c: NodeControl): boolean {
  const before = {
    graph: ed.graph,
    selection: [...ed.selection],
    steps: ed.timeline.history.past.length,
  };
  press(ed, c);
  const same =
    before.selection.length === ed.selection.length &&
    before.selection.every((id) => ed.selection.includes(id));
  return ed.graph !== before.graph || !same || ed.timeline.history.past.length !== before.steps;
}

const CONTEXTS: Record<string, number[]> = {
  'nothing selected': [],
  'only this node': [1],
  'this node and another': [1, 2],
  'others, not this node': [0, 2],
  'the whole branch': [0, 1, 2],
};

/** The checks of one selection state: for every control of the table. */
function checkContext(name: string, selection: number[]) {
  describe(name, () => {
    for (const c of NODE_CONTROLS) {
      it(`^${c.hat}: the table says it listens exactly where the editor does something`, () => {
        const ed = ready(selection);
        const listens = c.listens(factsOf(ed));
        expect(effect(ed, c)).toBe(listens);
      });
      it(`^${c.hat}: a hint is shown only for a control that listens`, () => {
        const f = factsOf(ready(selection));
        if (c.says(f) !== null) expect(c.listens(f)).toBe(true);
      });
    }
  });
}

describe('the controls of a node in select mode, the table and the handlers (^783)', () => {
  for (const [name, selection] of Object.entries(CONTEXTS)) checkContext(name, selection);
});

/** What listens but has no hint, in a state: `^hat with the state`. */
function silentIn(name: string, selection: number[]): string[] {
  const f = factsOf(ready(selection));
  const silent = NODE_CONTROLS.filter((c) => c.listens(f) && c.says(f) === null);
  return silent.map((c) => `^${c.hat} with ${name}`);
}

describe('what the table says about the hints (^783)', () => {
  it('the controls that listen but have no hint are known and few', () => {
    const all = Object.entries(CONTEXTS).flatMap(([name, selection]) => silentIn(name, selection));
    expect(all).toEqual([
      '^688 with nothing selected', // redundant: `Shift` adds nothing to the click
      '^689 with nothing selected', // redundant: the same as `Alt`
      '^490 with this node and another', // a click keeps only this node, and says nothing (^809)
      '^490 with the whole branch', // the same
    ]);
  });

  it('the hints are in the order of the table, each with its input', () => {
    const f = { selected: 2, node: { selected: false, lane: false, onSelection: false } };
    expect(nodeHints(f).map((r) => r.text)).toEqual([
      'move node',
      'delete node',
      'select instead',
      'select',
      'select branch',
      'add branch to selection',
      'deselect all',
      'delete selected',
    ]);
  });

  it('every control of the table is a row of docs/controls.md with its hat (^392)', () => {
    const doc = readFileSync(new URL('../../../docs/controls.md', import.meta.url), 'utf8');
    for (const c of NODE_CONTROLS)
      expect(doc).toMatch(new RegExp(`^\\| (= )?\\^${c.hat} \\|`, 'm'));
  });
});
