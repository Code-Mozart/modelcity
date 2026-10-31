import { describe, expect, it } from 'vitest';
import { applyDrag, startDrag } from './drag';
import { handlesOf } from './handles';
import { edgesOf } from './path';
import { fixture } from './testing/paths';

describe('dragging the corners of an S-curve (^132)', () => {
  const noMods = { snap: false };
  const setup = () => {
    const path = fixture('G');
    const edges = edgesOf(path);
    const E = edges[0]!.E;
    if (E.kind !== 'S' || !E.mid) throw new Error('expected an S-curve with a middle line');
    const handles = handlesOf(path, edges, 4);
    return { path, E, handles };
  };

  it('offers the two corners as handles', () => {
    const { handles } = setup();
    expect(handles.filter((h) => h.type === 'mid1' || h.type === 'mid2')).toHaveLength(2);
  });

  it('slides along the middle line, which stays, and turns the heading of the node', () => {
    const { path, E, handles } = setup();
    const h = handles.find((x) => x.type === 'mid1')!;
    const M = E.mid!;
    const to = { x: h.x + 0.8 * M.ux, y: h.y + 0.8 * M.uy };
    const next = applyDrag(path, startDrag(path, h), to, noMods);
    expect(next.nodes[0]!.th).not.toBeCloseTo(path.nodes[0]!.th, 6);
    expect(next.nodes[1]).toEqual(path.nodes[1]);
    const tag = next.shapes[0];
    expect(tag).toMatchObject({ kind: 'S', mid: M });
    const E2 = edgesOf(next)[0]!.E;
    expect(E2.kind).toBe('S');
    if (E2.kind === 'S') {
      expect(E2.k2!.x).toBeCloseTo(E.k2!.x, 6);
      expect(E2.k1!.x).toBeCloseTo(h.x + 0.8 * M.ux, 3);
    }
  });

  it('ignores a drag that would not be an S-curve any more', () => {
    const { path, E, handles } = setup();
    const h = handles.find((x) => x.type === 'mid2')!;
    const far = { x: E.mid!.x - 1e6 * E.mid!.ux, y: E.mid!.y - 1e6 * E.mid!.uy };
    const next = applyDrag(path, startDrag(path, h), far, noMods);
    expect(edgesOf(next)[0]!.E.kind).toBe('S');
  });
});
