import { describe, expect, it } from 'vitest';
import { show } from '../testing/hintHelpers';
import { hintsFor, type HintTarget } from './hints';

const empty: HintTarget = { kind: 'empty' };
const CAMERA = ['RMB drag: pan', 'Wheel: zoom', 'MMB drag: rotate'];
const hiddenIds =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id);
const rows = (drawing: boolean, target: HintTarget, selected = 0) =>
  hintsFor(drawing, target, selected).map(show);

describe('the camera in draw mode (^389)', () => {
  it('is hinted, and hidden after use like everywhere', () => {
    expect(hintsFor(true, empty).map(show)).toEqual(expect.arrayContaining(CAMERA));
    const used = hintsFor(true, empty, 0, { hidden: hiddenIds('pan') }).map(show);
    expect(used).not.toContain('RMB drag: pan');
    expect(used).toContain('Wheel: zoom');
  });
});

describe('Shift: snap only position (^481)', () => {
  const shift = 'Shift: snap only position';
  it('is hinted when a click would place a node with a heading at the snap', () => {
    expect(hintsFor(true, empty, 0, { snapping: true, placing: true }).map(show)).toContain(shift);
  });
  it('is not when the snap gives no heading (placing is false then)', () => {
    expect(hintsFor(true, empty, 0, { snapping: true }).map(show)).not.toContain(shift);
  });
});

describe('a right click on the selection (^779)', () => {
  const node = (onSelection: boolean): HintTarget => ({
    kind: 'handle',
    type: 'node',
    act: null,
    onSelection,
  });
  it('over a node of the selection it says what goes: the selected nodes', () => {
    expect(rows(false, node(true), 3)).toContain('RMB: delete selected nodes');
    expect(rows(false, node(true), 3)).not.toContain('RMB: delete node');
    expect(rows(false, node(false), 3)).toContain('RMB: delete node');
  });
  it('over a segment between selected nodes, with or without Alt', () => {
    const between: HintTarget = { kind: 'curve', picked: 2, onSelection: true };
    const r = rows(false, between, 3);
    expect(r).toContain('RMB or Alt+RMB: delete selected nodes');
    expect(r.filter((x) => x.includes('remove'))).toEqual([]);
    expect(rows(false, { kind: 'curve', picked: 1 }, 3)).toContain('RMB: delete segment');
  });
});
