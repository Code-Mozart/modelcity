import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from './fuzzy';

describe('fuzzy search (^178)', () => {
  it('matches characters in order, ignoring case, and nothing else', () => {
    expect(fuzzyScore('mdl', 'modelcity demo map')).not.toBeNull();
    expect(fuzzyScore('MOD', 'modelcity')).not.toBeNull();
    expect(fuzzyScore('ldm', 'model')).toBeNull();
    expect(fuzzyScore('z', 'model')).toBeNull();
  });

  it('an empty query matches everything with the same score', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
    expect(fuzzyScore('  ', 'anything')).toBe(0);
  });

  it('prefers characters that follow each other and word starts', () => {
    const together = fuzzyScore('map', 'xmapx')!;
    const apart = fuzzyScore('map', 'xmxaxpx')!;
    expect(together).toBeGreaterThan(apart);
    expect(fuzzyScore('d', 'demo')!).toBeGreaterThan(fuzzyScore('d', 'model')!);
  });

  it('filters and ranks a list, keeping the order of equally good items', () => {
    const items = ['old city', 'city center', 'harbour', 'city'];
    expect(fuzzyFilter(items, '', (s) => s)).toEqual(items);
    expect(fuzzyFilter(items, 'zzz', (s) => s)).toEqual([]);
    expect(fuzzyFilter(items, 'city', (s) => s)).toEqual(['city center', 'city', 'old city']);
  });
});
