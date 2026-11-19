import { connectEditor } from '../edit/connect';
import { Editor } from '../editor/editor.svelte';
import { SelectPress } from '../editor/selectPress';
import type { Size, View } from '../camera/view';
import { MapMemory } from '../map/mapMemory.svelte';
import { buildIndex } from '../map/segmentIndex';
import { MemoryStorage, type EdgeRow, type NodeRow } from '../project/storage';
import { file } from './storageFixtures';

export const size: Size = { width: 400, height: 400 };
/** The world point (x, y) is at (x + 200, y + 200) on the screen. */
export const view: View = { cx: 0, cy: 0, scale: 1, rot: 0, gx: 0, gy: 0 };
export const at = (x: number, y: number) => ({ x: x + 200, y: y + 200 });

const settle = async () => {
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
};

/** A project in a storage with its index, its chunks loaded in memory, and an editor that changes it the way the app does (^1260). */
export async function editing(nodes: NodeRow[], edges: EdgeRow[], told: string[] = []) {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: { ...file(), nodes, edges } });
  await buildIndex(storage, 'p');
  const memory = new MapMemory(storage);
  memory.open('p');
  memory.show({ cx0: -2, cx1: 2, cy0: -2, cy1: 2 });
  await settle();
  const editor = new Editor();
  editor.told = (_, text) => void told.push(text);
  connectEditor(editor, {
    storage,
    memory,
    project: () => 'p',
    commit: (change, index) => storage.patch('p', file(), change, index),
  });
  const press = new SelectPress(editor, {
    map: () => editor.loaded!(),
    screen: () => ({ view, size }),
  });
  const rows = async () => {
    const f = (await storage.load('p')) as unknown as { nodes: NodeRow[]; edges: EdgeRow[] };
    const sorted = <R extends [number, ...unknown[]]>(r: R[]) => [...r].sort((a, b) => a[0] - b[0]);
    return { nodes: sorted(f.nodes), edges: sorted(f.edges) };
  };
  return { storage, memory, editor, press, rows, settle };
}
