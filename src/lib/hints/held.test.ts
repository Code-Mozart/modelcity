import { describe, expect, it } from 'vitest';
import { Held, keyName } from './held.svelte';

const key = (key: string, code = '', mods: Partial<KeyboardEvent> = {}) =>
  ({
    key,
    code,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  }) as KeyboardEvent;

describe('the names of keys (^243)', () => {
  it('are what the hints show', () => {
    expect(keyName({ key: 'Control', code: 'ControlLeft' })).toBe('Ctrl');
    expect(keyName({ key: 'Meta', code: 'MetaLeft' })).toBe('Ctrl');
    expect(keyName({ key: 'Escape', code: 'Escape' })).toBe('Esc');
    expect(keyName({ key: 'Delete', code: 'Delete' })).toBe('Del');
    expect(keyName({ key: 'z', code: 'KeyZ' })).toBe('Z');
    expect(keyName({ key: 'Ω', code: 'KeyZ' })).toBe('Z'); // Alt+Z on a Mac types another character
    expect(keyName({ key: 'Enter', code: 'Enter' })).toBe('Enter');
  });
});

describe('what is held down (^243)', () => {
  it('a key is held from its key down to its key up, with the modifiers', () => {
    const h = new Held();
    h.keyDown(key('Control', 'ControlLeft', { ctrlKey: true }));
    h.keyDown(key('z', 'KeyZ', { ctrlKey: true }));
    expect(h.keys).toEqual(expect.arrayContaining(['Ctrl', 'Z']));
    h.keyUp(key('z', 'KeyZ', { ctrlKey: true }));
    expect(h.keys).toEqual(['Ctrl']);
    h.keyUp(key('Control', 'ControlLeft'));
    expect(h.keys).toEqual([]);
  });

  it('a modifier whose key up was missed does not stick: the next event says what is held', () => {
    const h = new Held();
    h.keyDown(key('Shift', 'ShiftLeft', { shiftKey: true }));
    h.keyDown(key('a', 'KeyA')); // Shift is no longer held, as this event says
    expect(h.keys).toEqual(['A']);
  });

  it('buttons, and what the symbols see: a click row and a drag row', () => {
    const h = new Held();
    let moved = false;
    const view = h.view(() => moved);
    h.button('lmb', true);
    expect(view.mouse('lmb', false)).toBe(true); // a click row while the button is down
    expect(view.mouse('lmb', true)).toBe(false);
    moved = true;
    expect(view.mouse('lmb', false)).toBe(false);
    expect(view.mouse('lmb', true)).toBe(true); // the drag row once it moved
    h.button('lmb', false);
    expect(view.mouse('lmb', true)).toBe(false);
    expect(view.mouse('rmb', false)).toBe(false);
  });

  it('losing the focus lets go of everything', () => {
    const h = new Held();
    h.keyDown(key('a', 'KeyA'));
    h.button('rmb', true);
    h.clear();
    expect(h.keys).toEqual([]);
    expect(h.buttons.rmb).toBe(false);
  });
});
