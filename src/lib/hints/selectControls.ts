import {
  always,
  isNode,
  lane,
  lmb,
  onCurve,
  onDerived,
  onVoid,
  picked,
  nodeSelected,
  select,
  some,
  handle,
  type C,
} from './facts';
import { DEL, ESC, mouse } from './inputs';

/** The void of select mode and the selection box (^393, ^684, ^495, ^685). */
export const SELECT_HEAD: C[] = [
  // The void of select mode (^393, ^684).
  {
    hat: 393,
    input: lmb,
    on: (f) => select(f) && onVoid(f) && !some(f),
    listens: always,
    says: () => 'draw mode',
  },
  {
    hat: 684,
    input: lmb,
    on: (f) => select(f) && onVoid(f) && some(f),
    listens: always,
    says: () => 'deselect all',
  },
  // Select by box, on the void and on a curve (^495, ^685).
  {
    hat: 495,
    input: mouse('lmb', true),
    id: 'select-box',
    on: (f) => select(f) && !handle(f) && !onDerived(f),
    listens: always,
    says: () => 'select',
  },
  {
    hat: 685,
    input: mouse('lmb', true, 'shift'),
    id: 'select-add',
    on: (f) => select(f) && !handle(f) && !onDerived(f),
    listens: always,
    says: (f) => (some(f) ? 'add to selection' : null),
  },
];

/** Selecting nodes and segments, deselecting and deleting what is selected (^490, ^688, ^690, ^691, ^491, ^692, ^689, ^686, ^687). */
export const SELECT_TAIL: C[] = [
  // Selecting a node (^490, ^688, ^491, ^689): a click keeps only it (^809); with nothing selected `Shift` would add nothing to the click.
  {
    hat: 490,
    input: lmb,
    id: 'select',
    on: (f) => select(f) && isNode(f),
    listens: (f) => !(nodeSelected(f) && f.selected === 1),
    says: (f) => {
      if (nodeSelected(f) && f.selected === 1) return null;
      return some(f) ? 'select instead' : 'select';
    },
  },
  {
    hat: 688,
    input: mouse('lmb', false, 'shift'),
    id: 'select-add',
    on: (f) => select(f) && isNode(f),
    listens: always,
    says: (f) => (nodeSelected(f) ? 'deselect' : some(f) ? 'select' : null),
  },
  // Selecting a segment by a click on its curve (^690, ^691).
  {
    hat: 690,
    input: lmb,
    id: 'select',
    on: (f) => select(f) && onCurve(f),
    listens: (f) => !(picked(f) === 2 && f.selected === 2),
    says: (f) => {
      if (picked(f) === 2 && f.selected === 2) return null;
      return some(f) ? 'select segment instead' : 'select segment';
    },
  },
  {
    hat: 691,
    input: mouse('lmb', false, 'shift'),
    id: 'select-add',
    on: (f) => select(f) && onCurve(f),
    listens: always,
    says: (f) =>
      !some(f) ? null : picked(f) === 2 ? 'deselect segment' : 'add segment to selection',
  },
  // The branch of a node or a curve (^491, ^692, ^689).
  {
    hat: 491,
    input: mouse('lmb', false, 'alt'),
    id: 'select-lane',
    on: (f) => select(f) && isNode(f),
    listens: always,
    says: (f) => (lane(f) ? 'deselect branch' : 'select branch'),
  },
  {
    hat: 692,
    input: mouse('lmb', false, 'alt'),
    id: 'select-lane',
    on: (f) => select(f) && onCurve(f),
    listens: always,
    says: (f) => (lane(f) ? 'deselect branch' : 'select branch'),
  },
  {
    hat: 689,
    input: mouse('lmb', false, 'alt+shift'),
    id: 'select-lane',
    on: (f) => select(f) && (isNode(f) || onCurve(f)),
    listens: always,
    says: (f) => (!some(f) ? null : lane(f) ? 'deselect branch' : 'add branch to selection'),
  },
  // Something selected: deselect it, delete it (^686, ^687).
  {
    hat: 686,
    input: ESC,
    id: 'deselect-all',
    on: select,
    listens: some,
    says: (f) => (some(f) ? 'deselect all' : null),
  },
  {
    hat: 687,
    input: DEL,
    id: 'delete-selected',
    on: select,
    listens: (f) => some(f) || isNode(f) || onCurve(f),
    says: (f) => (some(f) ? 'delete selected' : null),
  },
];
