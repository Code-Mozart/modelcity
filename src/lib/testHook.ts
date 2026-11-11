import type { Camera } from './camera/camera.svelte';
import type { Editor } from './editor/editor.svelte';
import { focusTower, type TowerLine } from './editor/parallel';
import type { ProjectSession } from './project/session.svelte';
import { worldToScreen, type Point } from './camera/view';

/** What the end-to-end tests (`e2e/`) can see of the app (^145). Only installed in dev builds. */
export interface TestHook {
  editor: Editor;
  session: ProjectSession;
  /** Where a world point is on the canvas, in page pixels. */
  toPage(pt: Point): Point;
  /** Pixels per meter. */
  scale(): number;
  /** The line through the control points interlocked with the hovered or dragged one (^344). */
  tower(): TowerLine | null;
  /** The camera as a project stores it. */
  camera(): { x: number; y: number; scale: number; rotation: number };
  /** Moves the camera (for the pictures of the testing ground, ^1018). */
  show(state: { x: number; y: number; scale: number; rotation: number }): void;
}

declare global {
  interface Window {
    __modelcity?: TestHook;
  }
}

export function installTestHook(
  editor: Editor,
  camera: Camera,
  session: ProjectSession,
  canvas: () => HTMLElement | null,
) {
  if (!import.meta.env.DEV) return;
  window.__modelcity = {
    editor,
    session,
    scale: () => camera.view.scale,
    camera: () => camera.state,
    show: (state) => camera.restore(state),
    tower: () => focusTower(editor.graph, editor.chains, editor.focus),
    toPage(pt) {
      const s = worldToScreen(camera.view, camera.size, pt);
      const rect = canvas()?.getBoundingClientRect();
      return { x: s.x + (rect?.left ?? 0), y: s.y + (rect?.top ?? 0) };
    },
  };
}
