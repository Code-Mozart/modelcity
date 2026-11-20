import { describe, expect, it } from 'vitest';
import { isRebuildKey } from './rebuildKey';

const key = (over: Partial<Parameters<typeof isRebuildKey>[0]> = {}) => ({
  key: ',',
  ctrlKey: true,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...over,
});

describe('the key that builds the segment index again (^1248)', () => {
  it('is Ctrl+Comma, and nothing else', () => {
    expect(isRebuildKey(key())).toBe(true);
    expect(isRebuildKey(key({ ctrlKey: false }))).toBe(false);
    expect(isRebuildKey(key({ shiftKey: true }))).toBe(false);
    expect(isRebuildKey(key({ metaKey: true }))).toBe(false);
    expect(isRebuildKey(key({ key: '.' }))).toBe(false);
  });
});
