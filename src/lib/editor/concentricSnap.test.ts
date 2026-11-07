import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { chainHandles } from './chains';
import { fromFile } from '../project/file';
import { edgeOfId } from '../model/graph';
import { parallel } from './parallel';

// The project of ^830: three bends, the outer lane (segment 7) is not concentric with the middle one (0).
const project = () =>
  fromFile(
    JSON.parse(readFileSync(new URL('../../../docs/mocks/hat830.json', import.meta.url), 'utf8')),
  ).graph;

const snapping = (x: number, y: number) => at(x, y, { ctrl: false, scale: 30 });

// The middle radius point of segment 7 when its radius is 18.7 m, the radius that is concentric with segment 0.
const concentric = { x: 3.8897843973, y: -48.252831206 };

/** Drags the middle radius point of the outer lane to the pointer positions and drops it. */
function dragOuter(path: { x: number; y: number }[]): Editor {
  const ed = new Editor();
  ed.load(project());
  const h = chainHandles(ed.chains, 4).find((x) => x.type === 'rad' && x.id === 7 && x.t === 0.5)!;
  ed.pointerDown(snapping(h.x, h.y));
  ed.pointerMove(snapping(h.x + 0.2, h.y + 0.2));
  for (const p of path) ed.pointerMove(snapping(p.x, p.y));
  ed.pointerUp();
  return ed;
}

const isConcentric = (ed: Editor) =>
  parallel(ed.graph, edgeOfId(ed.graph, 0)!, edgeOfId(ed.graph, 7)!);

describe('a radius point snaps to the concentric radius (^830)', () => {
  it('the pointer on the place: the radius is exactly that of the lane beside it plus the lane width', () => {
    const ed = dragOuter([concentric]);
    expect(edgeOfId(ed.graph, 7)!.radius).toBe(18.7);
    expect(isConcentric(ed)).toBe(true);
  });

  it('the pointer a few pixels beside it: the same radius, not what the pointer gives', () => {
    for (const [dx, dy] of [
      [0.1, 0],
      [0, 0.1],
      [-0.1, -0.1],
      [0.2, -0.2],
    ] as const) {
      const ed = dragOuter([{ x: concentric.x + dx, y: concentric.y + dy }]);
      expect(edgeOfId(ed.graph, 7)!.radius).toBe(18.7);
      expect(isConcentric(ed)).toBe(true);
    }
  });

  it('coming from a larger radius works the same way', () => {
    const ed = dragOuter([
      { x: 7, y: -52.6 },
      { x: 4.6, y: -49.3 },
      { x: concentric.x + 0.1, y: concentric.y },
    ]);
    expect(edgeOfId(ed.graph, 7)!.radius).toBe(18.7);
  });
});
