import type { Camera } from './camera.svelte';
import type { Editor } from './editor.svelte';
import { worldToScreen, type Point } from './view';

/** What the end-to-end tests (`e2e/`) can see of the app (^145). Only installed in dev builds. */
export interface TestHook {
  editor: Editor;
  /** Where a world point is on the canvas, in page pixels. */
  toPage(pt: Point): Point;
  /** Pixels per meter. */
  scale(): number;
}

declare global {
  interface Window {
    __modelcity?: TestHook;
  }
}

export function installTestHook(editor: Editor, camera: Camera, canvas: () => HTMLElement | null) {
  if (!import.meta.env.DEV) return;
  window.__modelcity = {
    editor,
    scale: () => camera.view.scale,
    toPage(pt) {
      const s = worldToScreen(camera.view, camera.size, pt);
      const rect = canvas()?.getBoundingClientRect();
      return { x: s.x + (rect?.left ?? 0), y: s.y + (rect?.top ?? 0) };
    },
  };
}
