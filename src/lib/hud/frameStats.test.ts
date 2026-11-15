import { describe, expect, it } from 'vitest';
import { isFramesKey } from './frameKey';
import { describe as text, FrameStats } from './frameStats.svelte';

const key = (over: Partial<Parameters<typeof isFramesKey>[0]> = {}) => ({
  key: '.',
  ctrlKey: true,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...over,
});

describe('the frame times (^1252)', () => {
  it('say how long a draw takes and how often one follows the other', () => {
    const draws = Array.from({ length: 10 }, (_, i) => ({ start: i * 10, ms: 2 }));
    expect(text(draws)).toBe('draw 2.0 ms (most 2.0) · 100 frames per second');
  });

  it('do not count a pause between two draws as a frame', () => {
    const draws = [
      { start: 0, ms: 1 },
      { start: 10, ms: 3 },
      { start: 5000, ms: 1 },
    ];
    expect(text(draws)).toBe('draw 1.7 ms (most 3.0) · 100 frames per second');
    expect(text([{ start: 0, ms: 4 }])).toBe('draw 4.0 ms (most 4.0)');
  });

  it('look at nothing while they are off, and start again when they are turned on', () => {
    const stats = new FrameStats();
    stats.record(0, 2);
    expect(stats.text).toBe('');
    stats.toggle();
    stats.record(1000, 1003);
    expect(stats.text).toBe('draw 3.0 ms (most 3.0)');
    stats.toggle();
    expect([stats.visible, stats.text]).toEqual([false, '']);
  });

  it('are turned on and off by Ctrl+Period and nothing else', () => {
    expect(isFramesKey(key())).toBe(true);
    expect(isFramesKey(key({ ctrlKey: false }))).toBe(false);
    expect(isFramesKey(key({ metaKey: true }))).toBe(false);
    expect(isFramesKey(key({ key: ',' }))).toBe(false);
  });
});
