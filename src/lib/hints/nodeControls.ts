import { DEL, ESC, hint, mouse, type Input } from './inputs';
import type { ControlId, Hint } from './hints';

/**
 * Controls as data (^783), the spike: the controls of select mode with the pointer on a node, one
 * row each. A row says what the control is (its hat, its input), **when it listens** (the editor
 * does something with the input there: checked against the handlers by `nodeControls.test.ts`),
 * and **what its hint says** (or nothing, where the hint is not shown). The hints of that area are
 * made from this table; nothing else says what they are.
 */
export interface NodeFacts {
  /** How many nodes are selected. */
  selected: number;
  /** The node under the pointer: is it selected, is its whole branch, is a right click on the selection (^290, ^779). */
  node: { selected: boolean; lane: boolean; onSelection: boolean };
}

export interface NodeControl {
  /** The hat of the control (`docs/controls.md`, ^392). */
  hat: number;
  input: Input;
  /** The control whose hint is hidden for a while after it was used (^110). */
  id?: ControlId;
  /** Whether the editor does anything with the input here. */
  listens: (f: NodeFacts) => boolean;
  /** What the hint says, or null where there is no hint (nothing to add to another row, or none by design). */
  says: (f: NodeFacts) => string | null;
}

const some = (f: NodeFacts) => f.selected > 0;

export const NODE_CONTROLS: NodeControl[] = [
  {
    hat: 488,
    input: mouse('lmb', true),
    listens: () => true,
    says: () => 'move node',
  },
  {
    hat: 489,
    input: mouse('rmb'),
    listens: () => true,
    says: (f) => (f.node.onSelection ? 'delete selected nodes' : 'delete node'),
  },
  {
    // A click on a selected node of several keeps only it; on the only selected node it does nothing.
    hat: 490,
    input: mouse('lmb'),
    id: 'select',
    listens: (f) => !(f.node.selected && f.selected === 1),
    says: (f) => (f.node.selected ? null : f.selected > 0 ? 'select instead' : 'select'),
  },
  {
    // With nothing selected `Shift` would add nothing to what the click does, so no hint then.
    hat: 688,
    input: mouse('lmb', false, 'shift'),
    id: 'select-add',
    listens: () => true,
    says: (f) => (f.node.selected ? 'deselect' : some(f) ? 'select' : null),
  },
  {
    hat: 491,
    input: mouse('lmb', false, 'alt'),
    id: 'select-lane',
    listens: () => true,
    says: (f) => (f.node.lane ? 'deselect branch' : 'select branch'),
  },
  {
    hat: 689,
    input: mouse('lmb', false, 'alt+shift'),
    id: 'select-lane',
    listens: () => true,
    says: (f) => (!some(f) ? null : f.node.lane ? 'deselect branch' : 'add branch to selection'),
  },
  {
    hat: 686,
    input: ESC,
    id: 'deselect-all',
    listens: some,
    says: (f) => (some(f) ? 'deselect all' : null),
  },
  {
    hat: 687,
    input: DEL,
    id: 'delete-selected',
    listens: some,
    says: (f) => (some(f) ? 'delete selected' : null),
  },
];

/** The hints of the controls that have one here, in the order of the table. */
export const nodeHints = (f: NodeFacts): Hint[] =>
  NODE_CONTROLS.flatMap((c) => {
    const text = c.says(f);
    return text === null ? [] : [hint(c.input, text, c.id)];
  });
