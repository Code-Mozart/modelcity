import { describe, expect, it } from 'vitest';
import { MarkingStyle, isMarkingStyleKey } from './markingStyle.svelte';

const key = (extra = {}) => ({
  key: '/',
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...extra,
});

describe('the marking style switch (^1040)', () => {
  it('logical by default, Ctrl+/ switches', () => {
    const style = new MarkingStyle();
    expect(style.physical).toBe(false);
    style.toggle();
    expect(style.physical).toBe(true);
    style.toggle();
    expect(style.physical).toBe(false);
  });

  it('only Ctrl (or Cmd) and the slash', () => {
    expect(isMarkingStyleKey(key())).toBe(true);
    expect(isMarkingStyleKey(key({ ctrlKey: false, metaKey: true }))).toBe(true);
    expect(isMarkingStyleKey(key({ ctrlKey: false }))).toBe(false);
    expect(isMarkingStyleKey(key({ shiftKey: true }))).toBe(false);
    expect(isMarkingStyleKey(key({ key: '.' }))).toBe(false);
  });
});
