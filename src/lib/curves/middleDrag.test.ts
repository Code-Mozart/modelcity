import { describe, expect, it } from 'vitest';
import { applyDrag, startDrag } from './drag';
import { handlesOf } from './handles';
import { edgesOf } from './path';
import { fixture } from './testing/paths';

describe('dragging the corners of an S-curve (^132, no shape tag)', () => {
  const noMods = { angleScale: null };
  const setup = () => {
    const path = fixture('G');
    const edges = edgesOf(path);
    if (edges[0]!.E.kind !== 'S') throw new Error('expected an S-curve');
    return { path, handles: handlesOf(path, edges, 4) };
  };

  it('offers the two corners as handles', () => {
    const { handles } = setup();
    expect(handles.filter((h) => h.type === 'mid1' || h.type === 'mid2')).toHaveLength(2);
  });

  it('turns the heading of the first node so its heading line passes through the pointer', () => {
    const { path, handles } = setup();
    const h = handles.find((x) => x.type === 'mid1')!;
    const to = { x: h.x, y: h.y + 4 };
    const next = applyDrag(path, startDrag(h), to, noMods);
    const n = path.nodes[0]!;
    expect(next.nodes[0]!.th).toBeCloseTo(Math.atan2(to.y - n.y, to.x - n.x), 9);
    expect(next.nodes[1]).toEqual(path.nodes[1]);
  });

  it('turns the heading of the second node', () => {
    const { path, handles } = setup();
    const h = handles.find((x) => x.type === 'mid2')!;
    const to = { x: h.x, y: h.y - 4 };
    const next = applyDrag(path, startDrag(h), to, noMods);
    const n = path.nodes[1]!;
    expect(next.nodes[1]!.th).toBeCloseTo(Math.atan2(n.y - to.y, n.x - to.x), 9);
    expect(next.nodes[0]).toEqual(path.nodes[0]);
  });
});
