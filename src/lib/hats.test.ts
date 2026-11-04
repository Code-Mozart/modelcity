import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Guards the hat registry rules (.claude/CLAUDE.md): unique hats, and `next:` is always right. */
const registry = readFileSync(new URL('../../docs/hats.md', import.meta.url), 'utf8');
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const listed = [...registry.matchAll(/^\| \^(\d+) \|/gm)].map((m) => Number(m[1]));
/** Ranges rented out to other files (`## Rented ranges` in docs/hats.md): the file defines one row per hat. */
const rented = [...registry.matchAll(/^\| \^(\d+)–\^(\d+) \| (\S+) \|/gm)].map((m) => ({
  from: Number(m[1]),
  to: Number(m[2]),
  file: m[3]!,
}));
/** Every number of a rented range. */
const span = (r: { from: number; to: number }) =>
  Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i);
const defined = (file: string) =>
  [...read(file).matchAll(/^\| \^(\d+) \|/gm)].map((m) => Number(m[1]));
const ids = [
  ...listed,
  ...rented.flatMap((r) => defined(r.file).filter((id) => id >= r.from && id <= r.to)),
];

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

  it('rented ranges are whole: each file defines every hat of its ranges once, none outside them (^392)', () => {
    for (const file of new Set(rented.map((r) => r.file))) {
      const all = rented.filter((r) => r.file === file).flatMap(span);
      const own = defined(file).sort((a, b) => a - b);
      expect(
        own,
        `${file} must define every hat of its rented ranges, once each, and no other`,
      ).toEqual(all.sort((a, b) => a - b));
    }
  });

  it('every hat named in the rented files exists (^371)', () => {
    for (const file of new Set(rented.map((r) => r.file))) {
      const used = [...read(file).matchAll(/\^(\d+)/g)].map((m) => Number(m[1]));
      const missing = used.filter((id) => !ids.includes(id));
      expect(
        missing,
        `${file} names hats that are not in docs/hats.md: ${missing.join(', ')}`,
      ).toEqual([]);
    }
  });
});
