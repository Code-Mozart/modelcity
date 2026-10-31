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

  it('turns the middle line about the other corner, along the heading line, and stays an S', () => {
    const { path, E, handles } = setup();
    const h = handles.find((x) => x.type === 'mid1')!;
    const to = {
      x: h.x + 0.6 * Math.cos(path.nodes[0]!.th),
      y: h.y + 0.6 * Math.sin(path.nodes[0]!.th),
    };
    const next = applyDrag(path, startDrag(path, h), to, noMods);
    const tag = next.shapes[0];
    expect(tag).toMatchObject({ kind: 'S' });
    const mid = tag && tag.kind === 'S' ? tag.mid : undefined;
    expect(mid).toBeDefined();
    expect(mid!.ux).not.toBeCloseTo(E.mid!.ux, 6);
    const E2 = edgesOf(next)[0]!.E;
    expect(E2.kind).toBe('S');
    // the other corner stays where it was
    if (E2.kind === 'S') expect(E2.k2!.x).toBeCloseTo(E.k2!.x, 6);
  });

  it('ignores a drag that would not be an S-curve any more', () => {
    const { path, handles } = setup();
    const h = handles.find((x) => x.type === 'mid2')!;
    const next = applyDrag(path, startDrag(path, h), { x: -1e6, y: 1e6 }, noMods);
    expect(edgesOf(next)[0]!.E.kind).toBe('S');
  });
});
