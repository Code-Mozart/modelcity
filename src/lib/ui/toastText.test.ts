import { describe, expect, it } from 'vitest';
import { partsOf } from './toastText';

describe('the keys in a message', () => {
  it('a message without keys is one text', () => {
    expect(partsOf('saved')).toEqual([{ text: 'saved' }]);
  });

  it('a key in square brackets is a key between the texts', () => {
    expect(partsOf('press [S] to pin')).toEqual([
      { text: 'press ' },
      { key: 'S' },
      { text: ' to pin' },
    ]);
  });

  it('a key at the start or the end has no empty text around it', () => {
    expect(partsOf('[Esc]')).toEqual([{ key: 'Esc' }]);
  });
});
