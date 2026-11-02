import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { drawMode, mapOf, snapping } from '../testing/snapHelpers';

describe('pinning snap suggestions (^258)', () => {
  const far = () => {
    const ed = drawMode(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    ed.pointerMove(snapping(1, 100));
    return ed;
  };

  it('suggestions far from their nodes are not offered', () => {
    expect(far().snapped).toBeNull();
  });
});

describe('pins (^258)', () => {
  const selected = () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    ed.pointerDown(snapping(0, 0));
    ed.pointerUp();
    return ed;
  };

  it('S pins the snap suggestions of the selected nodes; with nothing selected it unpins', () => {
    const ed = selected();
    ed.key('s');
    expect(ed.pinned).toEqual([0]);
    ed.pointerDown(snapping(200, 200));
    ed.pointerUp();
    expect(ed.selection).toEqual([]);
    ed.key('s');
    expect(ed.pinned).toEqual([]);
  });

  it('a pinned node offers its suggestions at any distance', () => {
    const ed = selected();
    ed.key('s');
    ed.enterDrawMode();
    ed.pointerMove(snapping(1, 100));
    expect(ed.snapped?.pt.x).toBeCloseTo(0, 6);
    expect(ed.snapped?.pt.y).toBeCloseTo(100, 6);
  });

  it('nodes that are gone are dropped from the pins', () => {
    const ed = selected();
    ed.key('s');
    ed.key('Delete');
    expect(ed.pinned).toEqual([]);
  });
});
