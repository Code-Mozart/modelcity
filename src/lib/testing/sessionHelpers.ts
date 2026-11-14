import { vi } from 'vitest';
import { Camera } from '../camera/camera.svelte';
import { Editor } from '../editor/editor.svelte';
import { AUTOSAVE_MS, ProjectSession, type Notify } from '../project/session.svelte';
import { MemoryStorage } from '../project/storage';
import { addEdge, addNode } from '../model/graph';

let tick = 0;
/** The clock of the sessions of the tests starts again at 0 for every test. */
export const resetClock = () => {
  tick = 0;
};

/** An editor, a camera, a storage in memory and a session with a clock that counts seconds. */
export const setup = (notify?: Notify) => {
  const editor = new Editor();
  const camera = new Camera();
  camera.size = { width: 1000, height: 800 };
  const storage = new MemoryStorage();
  const clock = () => `2026-11-01T00:00:${String(tick++).padStart(2, '0')}Z`;
  return {
    editor,
    camera,
    storage,
    session: new ProjectSession(editor, camera, storage, { now: clock, notify }),
  };
};
export type Setup = ReturnType<typeof setup>;

/** Put a road of two nodes at (x, y) into the map of the session. */
export const drawRoad = (editor: Editor, x = 0, y = 0) => {
  const a = addNode(editor.graph, { x, y, th: 0 });
  const b = addNode(a.graph, { x: x + 30, y: y + 10, th: 0 });
  editor.graph = addEdge(b.graph, a.id, b.id);
};

/** A project with a road, saved by autosave. */
export const withRoad = async ({ session, editor }: Setup) => {
  await session.start();
  drawRoad(editor);
  session.changed();
  await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 1);
};

/** Two saved projects: the first one with a road, then a second one; returns the id of the first. */
export const two = async (s: Setup) => {
  await withRoad(s);
  const first = s.session.id;
  await s.session.newProject();
  drawRoad(s.editor);
  s.session.changed();
  await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 1);
  return first;
};

export const datesOf = async (storage: MemoryStorage) =>
  (await storage.list()).map((p) => p.file.lastUpdatedAt);
