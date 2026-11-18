import { describe, expect, it } from 'vitest';
import type { Size, View } from '../camera/view';
import { Editor } from '../editor/editor.svelte';
import { editorKey } from '../editor/keys';
import { SelectPress } from '../editor/selectPress';
import { edge, loaded, node } from '../testing/loadedMap';
import { SELECT_CONTROLS, selectHints, type SelectFacts } from './selectControls';

const size: Size = { width: 400, height: 400 };
const view: View = { cx: 0, cy: 0, scale: 1, rot: 0, gx: 0, gy: 0 };
const at = (x: number, y: number) => ({ x: x + 200, y: y + 200 });
const map = loaded([node(1, -50, 0), node(2, 50, 0), node(3, 0, 60)], [edge(7, 1, 2)]);

function editorWith(selected: number[] = []) {
  const editor = new Editor();
  if (selected.length) editor.select(new Set(selected));
  const press = new SelectPress(editor, {
    map: () => map,
    screen: () => ({ view, size }),
  });
  return { editor, press };
}

const key = (k: string, mods: object = {}) => ({
  key: k,
  code: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

/** Each control of the table, done on the real thing, with the state its hint is shown in (^783): what the hint says it does. */
const DOES: Record<number, () => unknown> = {
  394: () => {
    const { editor } = editorWith();
    editorKey(editor, key('Tab'));
    return editor.mode === 'view';
  },
  395: () => {
    const { editor } = editorWith();
    editor.toggleMode();
    editorKey(editor, key('Tab'));
    return editor.mode === 'select';
  },
  490: () => {
    const { editor, press } = editorWith([2]);
    press.down(at(-50, 0), false);
    press.up();
    return [...editor.selection].join() === '1';
  },
  688: () => {
    const { editor, press } = editorWith([2]);
    press.down(at(-50, 0), true);
    press.up();
    return [...editor.selection].join() === '2,1';
  },
  690: () => {
    const { editor, press } = editorWith();
    press.down(at(0, 1), false);
    press.up();
    return [...editor.selection].sort().join() === '1,2';
  },
  691: () => {
    const { editor, press } = editorWith([3]);
    press.down(at(0, 1), true);
    press.up();
    return [...editor.selection].join() === '3,1,2';
  },
  491: () => {
    const { editor, press } = editorWith([3]);
    press.down(at(-50, 0), false, true);
    press.up();
    return [...editor.selection].sort().join() === '1,2';
  },
  692: () => {
    const { editor, press } = editorWith([3]);
    press.down(at(0, 1), false, true);
    press.up();
    return [...editor.selection].sort().join() === '1,2';
  },
  689: () => {
    const { editor, press } = editorWith([3]);
    press.down(at(-50, 0), true, true);
    press.up();
    return [...editor.selection].join() === '3,1,2';
  },
  495: () => {
    const { editor, press } = editorWith();
    press.down(at(-80, -20), false);
    press.move(at(80, 20));
    press.up();
    return [...editor.selection].sort().join() === '1,2';
  },
  685: () => {
    const { editor, press } = editorWith([3]);
    press.down(at(-80, -20), true);
    press.move(at(80, 20));
    press.up();
    return [...editor.selection].sort().join() === '1,2,3';
  },
  684: () => {
    const { editor, press } = editorWith([1]);
    press.down(at(0, -100), false);
    press.up();
    return editor.selection.size === 0;
  },
  686: () => {
    const { editor } = editorWith([1]);
    editorKey(editor, key('Escape'));
    return editor.selection.size === 0;
  },
};

const facts = (over: Partial<SelectFacts> = {}): SelectFacts => ({
  mode: 'select',
  hovered: null,
  hoveredSelected: false,
  selected: 0,
  branchSelected: false,
  ...over,
});

const texts = (f: SelectFacts, hidden: (id: string) => boolean = () => false) =>
  selectHints(f, hidden).map((h) => h.text);

describe('the controls of select mode (^394, ^395, ^454, ^456, ^490 to ^495, ^684 to ^691)', () => {
  it.each(SELECT_CONTROLS.map((c) => [c.hat]))('control ^%i does what its hint says', (hat) => {
    expect(DOES[hat]!()).toBe(true);
  });

  it('every control of the table has such a scenario, and no other has one', () => {
    expect(Object.keys(DOES).map(Number).sort()).toEqual(SELECT_CONTROLS.map((c) => c.hat).sort());
  });
});

describe('what the hints of select mode say in each state (^181)', () => {
  it('on nothing with nothing selected: box and view mode', () => {
    expect(texts(facts())).toEqual(['view mode', 'select']);
  });

  it('on nothing with a selection: box, add to the selection, deselect all (click and Esc)', () => {
    expect(texts(facts({ selected: 2 }))).toEqual([
      'view mode',
      'select',
      'add to selection',
      'deselect all',
      'deselect all',
    ]);
  });

  it('on a node: select, or select instead when something else is selected, Shift toggles', () => {
    expect(texts(facts({ hovered: 'node' }))).toEqual(['view mode', 'select', 'select branch']);
    expect(texts(facts({ hovered: 'node', selected: 2 }))).toEqual([
      'view mode',
      'select instead',
      'add to selection',
      'select branch',
      'add branch to selection',
      'deselect all',
    ]);
    expect(texts(facts({ hovered: 'node', selected: 2, hoveredSelected: true }))).toEqual([
      'view mode',
      'select',
      'deselect',
      'select branch',
      'add branch to selection',
      'deselect all',
    ]);
  });
});

describe('what the hints of select mode say on a segment and in view mode (^181)', () => {
  it('on a branch that is selected: deselect branch (^128)', () => {
    const f = facts({ hovered: 'node', selected: 2, branchSelected: true });
    expect(texts(f)).toContain('deselect branch');
    expect(texts(f)).not.toContain('select branch');
  });

  it('on a segment: select segment, Shift adds or deselects', () => {
    expect(texts(facts({ hovered: 'segment', selected: 2 }))).toEqual([
      'view mode',
      'select segment',
      'add segment to selection',
      'select branch',
      'add branch to selection',
      'deselect all',
    ]);
    const both = facts({ hovered: 'segment', selected: 2, hoveredSelected: true });
    expect(texts(both)).toContain('deselect segment');
  });

  it('in view mode there is nothing to pick: select mode is offered', () => {
    expect(texts(facts({ mode: 'view', selected: 3 }))).toEqual(['select mode']);
  });

  it('the hints of controls that were used lately are hidden (^110)', () => {
    expect(texts(facts(), (id) => id === 'box')).toEqual(['view mode']);
    expect(texts(facts(), (id) => id === 'view')).toEqual(['select']);
  });
});
