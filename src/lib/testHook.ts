import type { Camera } from './camera/camera.svelte';
import type { Editor } from './editor/editor.svelte';
import type { IndexBuild } from './map/indexBuild.svelte';
import type { MapMemory } from './map/mapMemory.svelte';
import type { ProjectSession } from './project/session.svelte';
import { worldToScreen, type Point } from './camera/view';

/** What the end-to-end tests (`e2e/`) can see of the app (^145). Only installed in dev builds and in the build of the benchmarks. */
interface TestHook {
  editor: Editor;
  session: ProjectSession;
  /** The chunks in memory; a test can make their reads slow. */
  memory: MapMemory;
  /** The segment index of the open project; a test can put its own runner. */
  index: IndexBuild;
  /** Where a world point is on the canvas, in page pixels. */
  toPage(pt: Point): Point;
  /** Pixels per meter. */
  scale(): number;
  /** The camera as a project stores it. */
  camera(): { x: number; y: number; scale: number; rotation: number };
  /** Moves the camera. */
  show(state: { x: number; y: number; scale: number; rotation: number }): void;
}

declare global {
  interface Window {
    __modelcity?: TestHook;
  }
}

export function installTestHook(
  {
    editor,
    camera,
    session,
    memory,
    index,
  }: Pick<TestHook, 'editor' | 'session' | 'memory' | 'index'> & { camera: Camera },
  canvas: () => HTMLElement | null,
) {
  // Dev builds, and the build that the benchmarks measure (`VITE_TEST_HOOK=1`, ^1249): a dev build is slower in the reactivity of Svelte.
  if (!import.meta.env.DEV && !import.meta.env.VITE_TEST_HOOK) return;
  window.__modelcity = {
    editor,
    session,
    memory,
    index,
    scale: () => camera.view.scale,
    camera: () => camera.state,
    show: (state) => camera.restore(state),
    toPage: (pt) => {
      const rect = canvas()!.getBoundingClientRect();
      const s = worldToScreen(camera.view, camera.size, pt);
      return { x: rect.left + s.x, y: rect.top + s.y };
    },
  };
}
