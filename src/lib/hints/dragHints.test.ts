import { describe, expect, it } from 'vitest';
import { node, show } from '../testing/hintHelpers';
import { hintsFor } from './hints';

describe('while a handle is dragged (^286)', () => {
  const drag = (type: 'node' | 'head' | 'rad', merge = false) => ({ type, merge });

  it('only what the drag does, what a key changes and whether it merges', () => {
    const rows = (d: ReturnType<typeof drag>, snapping = false) =>
      hintsFor(false, node(false), 1, { drag: d, snapping }).map(show);
    expect(rows(drag('node'))).toEqual(['LMB drag: move node', 'Esc: cancel']);
    expect(rows(drag('node', true), true)).toEqual([
      'LMB drag: move node',
      'LMB: merge on release',
      'Esc: cancel',
      'Ctrl: no snapping',
    ]);
    expect(
      hintsFor(false, node(false), 1, { drag: drag('node'), snapping: true, touching: true }).map(
        show,
      ),
    ).toEqual(['LMB drag: move node', 'Esc: cancel', 'Ctrl: no snapping', 'Alt: opposite heading']);
    expect(
      hintsFor(false, node(false), 1, { drag: { ...drag('head'), place: true } }).map(show),
    ).toEqual([
      'LMB drag: turn heading',
      'Esc: cancel',
      'Ctrl: no snapping',
      'Shift: snap only the position',
    ]);
    expect(rows(drag('head'))).toEqual([
      'LMB drag: turn heading',
      'Esc: cancel',
      'Ctrl: no snapping',
      'Shift: aim at snap suggestion',
      'Shift+Alt: aim away from snap suggestion',
    ]);
    expect(rows(drag('rad'))).toEqual(['LMB drag: change radius', 'Esc: cancel']);
  });
});
