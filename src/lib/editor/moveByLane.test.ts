import { describe, expect, it } from 'vitest';
import { nodeOf } from '../model/graph';
import { at } from '../testing/editorHelpers';
import { mapOf } from '../testing/snapHelpers';
import { Editor } from './editor.svelte';

describe('a moved node snaps to the places one lane width beside where it was (^882)', () => {
  it('dragged next to its old place, sideways, it goes exactly one lane width over', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    const look = (x: number, y: number) => at(x, y, { ctrl: false, scale: 20 });
    ed.pointerDown(look(40, 0));
    ed.pointerMove(look(41, 1.5));
    ed.pointerMove(look(40.2, 3.1));
    ed.pointerUp();
    const n = nodeOf(ed.graph, 1)!;
    expect([n.x, n.y]).toEqual([40, 3]);
  });
});
