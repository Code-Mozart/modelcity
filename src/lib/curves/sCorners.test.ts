import { describe, expect, it } from 'vitest';
import { edgesOf } from './path';
import { handlesOf } from './handles';
import { fixture } from './testing/paths';

describe('the corners of an S-curve are derived, not handles (^132, ^840)', () => {
  const path = fixture('G');
  const edges = edgesOf(path);
  const E = edges[0]!.E;

  it('the S-curve has its two corners, like a hook', () => {
    expect(E.kind).toBe('S');
    expect('k1' in E && 'k2' in E && E.k1 && E.k2).toBeTruthy();
  });

  it('but they cannot be grabbed: the handles are the nodes, headings and radius points only', () => {
    const types = new Set(handlesOf(path, edges, 4).map((h) => h.type));
    expect([...types].every((t) => ['node', 'head', 'rad'].includes(t))).toBe(true);
  });
});
