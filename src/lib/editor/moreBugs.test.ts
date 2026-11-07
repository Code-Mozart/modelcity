import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { fromFile } from '../project/file';
import { headingSources } from '../snap/heading';
import { nearestOnPieces } from '../snap/geometry';
import { withoutExtendAtTip, suggestionsOfGraph } from './snapping';
import type { SnapHit, SnapPoint } from '../snap/types';

// The project of ^834: three lanes of bends, a tower of three nodes at the left.
const project = () =>
  fromFile(
    JSON.parse(readFileSync(new URL('../../../docs/mocks/hat834.json', import.meta.url), 'utf8')),
  ).graph;
const drawMode = () => {
  const ed = new Editor();
  ed.load(project());
  ed.enterDrawMode();
  return ed;
};
const snapping = (x: number, y: number) => at(x, y, { ctrl: false, scale: 29.12 });

describe('a curve with an arc that does not turn is still a curve to snap to (^837)', () => {
  it('its nearest point has a distance', () => {
    const ed = drawMode();
    const edge7 = suggestionsOfGraph(ed.graph).find(
      (s) => s.kind === 'curve' && s.edge === 7 && s.rule === 'offset' && s.side === -1,
    );
    if (edge7?.kind !== 'curve') throw new Error('no offset curve of the segment');
    expect(nearestOnPieces(edge7.pieces, { x: -27.982, y: -3.542 })?.d).toBeCloseTo(0.036, 3);
  });

  it('the pointer beside that segment snaps to its offset curve', () => {
    const ed = drawMode();
    ed.pointerMove(snapping(-27.982, -3.542));
    expect(ed.snapped?.by.map((s) => s.rule)).toEqual(['offset']);
  });
});

describe('the origins of a snap are all the nodes that agree (^835)', () => {
  it('above the top node of a tower of three, all three show their heading', () => {
    const ed = drawMode();
    ed.pointerMove(snapping(-32.6, -3.58));
    const origins = headingSources(ed.snapped, false);
    expect(origins.map((o) => o.at.y).sort((a, b) => a - b)).toEqual([-0.578, 2.422, 5.422]);
  });
});

describe('the extend lines are not shown at the node that is extended (^839)', () => {
  const point = (rule: SnapPoint['rule'], x: number, node?: number): SnapPoint => ({
    kind: 'point',
    at: { x, y: 0 },
    heading: null,
    rule,
    from: [],
    node,
  });
  const extendLine = { kind: 'curve', rule: 'extend45', pieces: [], from: [] } as never;
  const args = { info: null, press: null, hover: null, drawing: true, pinned: [5] };

  it('also when a crossing at the same place comes first', () => {
    const hit: SnapHit = {
      pt: { x: 0.0005, y: 0 },
      heading: null,
      by: [point('crossing', 0.0005), extendLine],
    };
    const kept = withoutExtendAtTip(hit, args, [point('node-points', 0, 5)]);
    expect(kept.by).toHaveLength(1);
  });

  it('but they show away from it', () => {
    const hit: SnapHit = {
      pt: { x: 4, y: 0 },
      heading: null,
      by: [point('crossing', 4), extendLine],
    };
    expect(withoutExtendAtTip(hit, args, [point('node-points', 0, 5)]).by).toHaveLength(2);
  });
});
