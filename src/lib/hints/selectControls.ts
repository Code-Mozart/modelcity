import { hintsOf, type Control } from './controls';
import type { Hint } from './hints';
import { ESC, key, mouse } from './inputs';

/**
 * What the controls of select mode need to know (^181): the mode, what is under the pointer, and
 * the state of the selection and the history. `hovered` is a node, a segment, or nothing.
 */
export interface SelectFacts {
  mode: 'view' | 'select';
  hovered: 'node' | 'segment' | null;
  /** The hovered node is selected, or both nodes of the hovered segment are. */
  hoveredSelected: boolean;
  selected: number;
  /** All the nodes of the branch of what is hovered are selected (^128). */
  branchSelected: boolean;
}

const picking = (f: SelectFacts) => f.mode === 'select';
const onVoid = (f: SelectFacts) => picking(f) && f.hovered === null;
const yes = () => true;

/** The controls of select mode, and Tab that goes with it, in the order of the hints (^392, `docs/controls.md`). */
export const SELECT_CONTROLS: Control<SelectFacts>[] = [
  {
    hat: 394,
    input: key('Tab'),
    id: 'view',
    on: picking,
    listens: yes,
    says: () => 'view mode',
  },
  {
    hat: 395,
    input: key('Tab'),
    on: (f) => !picking(f),
    listens: yes,
    says: () => 'select mode',
  },
  {
    hat: 490,
    input: mouse('lmb'),
    id: 'select',
    on: (f) => picking(f) && f.hovered === 'node',
    listens: yes,
    says: (f) => (f.selected > 0 && !f.hoveredSelected ? 'select instead' : 'select'),
  },
  {
    hat: 688,
    input: mouse('lmb', false, 'shift'),
    on: (f) => picking(f) && f.hovered === 'node' && f.selected > 0,
    listens: yes,
    says: (f) => (f.hoveredSelected ? 'deselect' : 'add to selection'),
  },
  {
    hat: 690,
    input: mouse('lmb'),
    id: 'select',
    on: (f) => picking(f) && f.hovered === 'segment',
    listens: yes,
    says: () => 'select segment',
  },
  {
    hat: 691,
    input: mouse('lmb', false, 'shift'),
    on: (f) => picking(f) && f.hovered === 'segment' && f.selected > 0,
    listens: yes,
    says: (f) => (f.hoveredSelected ? 'deselect segment' : 'add segment to selection'),
  },
  {
    hat: 491,
    input: mouse('lmb', false, 'alt'),
    id: 'branch',
    on: (f) => picking(f) && f.hovered === 'node',
    listens: yes,
    says: (f) => (f.branchSelected ? 'deselect branch' : 'select branch'),
  },
  {
    hat: 692,
    input: mouse('lmb', false, 'alt'),
    id: 'branch',
    on: (f) => picking(f) && f.hovered === 'segment',
    listens: yes,
    says: (f) => (f.branchSelected ? 'deselect branch' : 'select branch'),
  },
  {
    hat: 689,
    input: mouse('lmb', false, 'alt+shift'),
    on: (f) => picking(f) && f.hovered !== null && f.selected > 0,
    listens: yes,
    says: (f) => (f.branchSelected ? 'deselect branch' : 'add branch to selection'),
  },
  {
    hat: 495,
    input: mouse('lmb', true),
    id: 'box',
    on: onVoid,
    listens: yes,
    says: () => 'select',
  },
  {
    hat: 685,
    input: mouse('lmb', true, 'shift'),
    on: (f) => onVoid(f) && f.selected > 0,
    listens: yes,
    says: () => 'add to selection',
  },
  {
    hat: 684,
    input: mouse('lmb'),
    on: (f) => onVoid(f) && f.selected > 0,
    listens: yes,
    says: () => 'deselect all',
  },
  {
    hat: 686,
    input: ESC,
    on: (f) => picking(f) && f.selected > 0,
    listens: yes,
    says: () => 'deselect all',
  },
];

/** The hints of select mode (and of the keys that go with it), without those of the controls the user used lately (`hidden`, ^110). */
export const selectHints = (
  f: SelectFacts,
  hidden: (id: NonNullable<Hint['id']>) => boolean,
): Hint[] => hintsOf(SELECT_CONTROLS, f).filter((h) => !(h.id && hidden(h.id)));
