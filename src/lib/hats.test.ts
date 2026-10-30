import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Guards the hat registry rules (.claude/CLAUDE.md): unique hats, and `next:` is always right. */
const registry = readFileSync(new URL('../../docs/hats.md', import.meta.url), 'utf8');
const ids = [...registry.matchAll(/^\| \^(\d+) \|/gm)].map((m) => Number(m[1]));

describe('hat registry (docs/hats.md)', () => {
  it('lists hats and states the next one on the first line', () => {
    expect(ids.length).toBeGreaterThan(0);
    const next = /^next: \^(\d+)$/.exec(registry.split('\n')[0]!);
    expect(next, 'first line must read "next: ^N"').not.toBeNull();
    expect(Number(next![1])).toBe(Math.max(...ids) + 1);
  });

  it('never repeats a hat', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no gaps in the numbering', () => {
    const sorted = [...ids].sort((a, b) => a - b);
    expect(sorted).toEqual(sorted.map((_, i) => i + 1));
  });
});
