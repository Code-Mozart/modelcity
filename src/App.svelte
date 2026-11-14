<script lang="ts">
  import { projectKeyOf } from './lib/project/projectKeys';
  import { onMount } from 'svelte';
  import { Camera } from './lib/camera/camera.svelte';
  import Compass from './lib/hud/Compass.svelte';
  import { Editor } from './lib/editor/editor.svelte';
  import Hints from './lib/hints/Hints.svelte';
  import { Toasts } from './lib/ui/toasts.svelte';
  import ToastList from './lib/ui/ToastList.svelte';
  import { appHints } from './lib/hints/appControls';
  import { Usage } from './lib/hints/usage.svelte';
  import { modalHints } from './lib/project/modalHints';
  import MapCanvas from './lib/MapCanvas.svelte';
  import ProjectsModal from './lib/project/ProjectsModal.svelte';
  import { ProjectSession } from './lib/project/session.svelte';
  import { IndexedDbStorage } from './lib/project/indexedDb';
  import { installTestHook } from './lib/testHook';
  import VersionText from './lib/hud/VersionText.svelte';
  import { VersionBanner } from './lib/hud/versionBanner.svelte';
  import { TAB_TITLE } from './lib/version';

  const editor = new Editor();
  const camera = new Camera();
  const toasts = new Toasts();
  // The version and the moniker show at load and after a while without input (^787); the tab says it too (^788).
  const banner = new VersionBanner();
  document.title = TAB_TITLE;
  const session = new ProjectSession(editor, camera, new IndexedDbStorage(), {
    notify: (kind, text) => toasts.show(kind, text),
  });
  installTestHook(editor, camera, session, () => document.querySelector('canvas'));

  onMount(() => void session.start());

  // Save the camera once it rests, if it moved (^236).
  $effect(() => {
    void camera.view;
    session.cameraMoved();
  });

  // Save the project a short while after the map changed (^166).
  $effect(() => {
    void editor.graph;
    session.changed();
  });

  // A control that was used lately has its hint hidden for a while (^110).
  const usage = new Usage();
  // While the projects modal is up its controls replace all others (^168).
  const hints = $derived(
    session.modalOpen
      ? modalHints(session.row?.mode ?? 'list', session.over)
      : appHints(usage.hidden),
  );

  /** The keys of the projects: `Ctrl+S` saves, `Ctrl+Shift+S` exports, `P` and `Ctrl+O` open (^168, ^222, ^223, ^226, ^746). */
  function projectKey(e: KeyboardEvent): boolean {
    const action = projectKeyOf(e);
    if (action === 'save') void session.saveNow();
    else if (action === 'export') session.exportJson();
    else if (action === 'open') void session.openModal(true);
    else if (action === 'projects') void session.openModal();
    return action !== null;
  }

  /** While the projects modal is up, Esc leaves the rename or the modal; the other keys are its own. */
  function modalKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (session.row) session.cancelRow();
    else session.closeModal();
  }

  function onKeyDown(e: KeyboardEvent) {
    banner.used();
    if (session.modalOpen) return modalKey(e);
    if (e.target instanceof HTMLInputElement) return;
    if (projectKey(e) || camera.key(e.key)) e.preventDefault();
  }
</script>

<svelte:window
  onkeydown={onKeyDown}
  onpointerdown={() => banner.used()}
  onkeyup={(e) => camera.keyUp(e.key)}
  onpagehide={() => void session.flush()}
/>

<main>
  <MapCanvas {camera} onUse={(id) => usage.mark(id)} />
  <Hints {hints} />
  <VersionText visible={banner.visible} />
  <div class="right">
    <div class="toasts"><ToastList {toasts} /></div>
  </div>
  <Compass {camera} />
  <ProjectsModal {session} />
</main>

<style>
  /* The toasts and the recent history panel share one column, so they never overlap (^232). The column has no layer of its own: the toasts are above the veil of the projects modal, the panel under it (^387). */
  .right {
    position: absolute;
    right: 1.1667em;
    top: 1em;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.8em;
    pointer-events: none;
  }
  .toasts {
    position: relative;
    z-index: 2;
  }
  main {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
