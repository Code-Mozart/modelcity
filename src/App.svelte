<script lang="ts">
  import { onMount } from 'svelte';
  import { Camera } from './lib/camera/camera.svelte';
  import Compass from './lib/camera/Compass.svelte';
  import { Editor } from './lib/editor/editor.svelte';
  import Hints from './lib/hints/Hints.svelte';
  import { hintsFor } from './lib/hints/hints';
  import { modalHints } from './lib/project/modalHints';
  import MapCanvas from './lib/MapCanvas.svelte';
  import ProjectsModal from './lib/project/ProjectsModal.svelte';
  import { ProjectSession } from './lib/project/session.svelte';
  import { IndexedDbStorage } from './lib/project/storage';
  import { installTestHook } from './lib/testHook';

  const editor = new Editor();
  const camera = new Camera();
  const session = new ProjectSession(editor, camera, new IndexedDbStorage());
  installTestHook(editor, camera, session, () => document.querySelector('canvas'));
  // While the projects modal is up its controls replace all others (^168).
  const hints = $derived(
    session.modalOpen
      ? modalHints(session.row?.mode ?? 'list', session.over)
      : hintsFor(editor.drawing, editor.hintTarget, editor.selection.length, {
          undo: editor.canUndo,
          redo: editor.canRedo,
        }),
  );

  onMount(() => void session.start());

  // Save the project a short while after the map changed (^166).
  $effect(() => {
    void editor.graph;
    session.changed();
  });

  /** Ctrl+S exports, Ctrl+O opens the projects (^168). */
  function projectKey(e: KeyboardEvent): boolean {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return false;
    if (e.key === 's') session.download();
    else if (e.key === 'o') void session.openModal();
    else return false;
    return true;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (session.modalOpen) {
      if (e.key === 'Escape' && session.row) session.cancelRow();
      else if (e.key === 'Escape') session.closeModal();
      return;
    }
    if (e.target instanceof HTMLInputElement) return;
    if (projectKey(e)) e.preventDefault();
    else if (
      camera.key(e.key) ||
      editor.key(e.key, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })
    )
      e.preventDefault();
  }
</script>

<svelte:window
  onkeydown={onKeyDown}
  onkeyup={(e) => camera.keyUp(e.key)}
  onpagehide={() => void session.flush()}
/>

<main>
  <MapCanvas {editor} {camera} />
  <Hints {hints} />
  <Compass {camera} />
  <ProjectsModal {session} />
</main>

<style>
  main {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
