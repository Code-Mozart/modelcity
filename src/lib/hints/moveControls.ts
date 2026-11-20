import type { HoverKind } from '../editor/pick';
import { hintsOf, type Control } from './controls';
import type { Hint } from './hints';
import { ESC, mouse } from './inputs';

/** What a drag does, by what it holds (`main`'s `DRAG_TEXT`). */
export const DRAG_TEXT = {
  node: 'move node',
  head: 'turn heading',
  ctrl: 'bend curve',
  rad: 'change radius',
} as const;

type Held = keyof typeof DRAG_TEXT;
const yes = () => true;
const isHeld = (k: HoverKind): k is Held => k !== null && k !== 'segment';

/**
 * `LMB` drag on a node or a control point, in select and draw mode (`main`'s `dragRow`, ^488, ^697,
 * ^695, ^696), and `Alt`+`LMB` on a heading point (^466): rows for the table of a mode, which says where it exists (`on`).
 */
export function dragRows<F extends { hovered: HoverKind }>(on: (f: F) => boolean): Control<F>[] {
  const row = (hat: number, kind: Held): Control<F> => ({
    hat,
    input: mouse('lmb', true),
    ...(kind === 'node' ? { id: 'move' as const } : {}),
    on: (f) => on(f) && f.hovered === kind,
    listens: yes,
    says: () => DRAG_TEXT[kind],
  });
  const flip: Control<F> = {
    hat: 466,
    input: mouse('lmb', false, 'alt'),
    on: (f) => on(f) && f.hovered === 'head',
    listens: yes,
    says: () => 'flip arm',
  };
  return [row(488, 'node'), row(697, 'head'), row(695, 'ctrl'), row(696, 'rad'), flip];
}

/** While something is dragged: what it holds, and whether letting it go merges (^286). */
export interface DragFacts {
  held: HoverKind;
  merges: boolean;
}

/** While a node or control point is dragged only what matters now (`main`'s `DRAG_CONTROLS`, ^488, ^703, ^461). */
export const DRAG_CONTROLS: Control<DragFacts>[] = [
  {
    hat: 488,
    input: mouse('lmb', true),
    on: yes,
    listens: yes,
    says: (f) => (isHeld(f.held) ? DRAG_TEXT[f.held] : null),
  },
  {
    hat: 703,
    input: mouse('lmb'),
    on: (f) => f.merges,
    listens: yes,
    says: () => 'merge on release',
  },
  { hat: 461, input: ESC, on: yes, listens: yes, says: () => 'cancel' },
];

export const dragHints = (f: DragFacts): Hint[] => hintsOf(DRAG_CONTROLS, f);
