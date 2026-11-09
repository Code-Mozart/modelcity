import { describe, expect, it } from 'vitest';
import { projectKeyOf } from './projectKeys';

const press = (key: string, mods: Partial<Parameters<typeof projectKeyOf>[0]> = {}) =>
  projectKeyOf({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods });

describe('the keys of the projects', () => {
  it('Ctrl+S saves, and Cmd+S too', () => {
    expect(press('s', { ctrlKey: true })).toBe('save');
    expect(press('S', { metaKey: true })).toBe('save');
  });

  it('Ctrl+Shift+S exports a file (^746)', () => {
    expect(press('S', { ctrlKey: true, shiftKey: true })).toBe('export');
  });

  it('Ctrl+O opens the file window, P the projects', () => {
    expect(press('o', { ctrlKey: true })).toBe('open');
    expect(press('p')).toBe('projects');
  });

  it('other keys and Alt chords are not theirs', () => {
    expect(press('s', { ctrlKey: true, altKey: true })).toBeNull();
    expect(press('p', { shiftKey: true })).toBeNull();
    expect(press('x')).toBeNull();
  });
});
