import { at, editing } from './editHarness';
import { edge, node } from './loadedMap';

/** A road 1 - 2 - 3 along the x axis, and a branch from 2 to 4, and 4 - 5: the tee that the tests of deleting work on. */
export const nodes = [
  node(1, -100, 0),
  node(2, 0, 0),
  node(3, 100, 0),
  node(4, 0, 100),
  node(5, 100, 100),
];
export const edges = [edge(10, 1, 2), edge(11, 2, 3), edge(12, 2, 4), edge(13, 4, 5)];

export const key = (k: string, mods: object = {}) => ({
  key: k,
  code: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

export const ids = (rows: { 0: number }[]) => rows.map((r) => r[0]);

/** The tee in a storage, its chunks in memory and an editor, with what the pointer can do on it. */
export async function setup() {
  const told: string[] = [];
  const e = await editing(nodes, edges, told);
  const hover = (x: number, y: number) => (e.editor.hover = e.press.pickAt(at(x, y)));
  const click = (x: number, y: number, shift = false) => {
    e.press.down(at(x, y), shift);
    e.press.up();
  };
  return { ...e, told, hover, click };
}
