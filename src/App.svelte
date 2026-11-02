<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Camera } from './lib/camera/camera.svelte';
  import ModeFrame from './lib/hud/ModeFrame.svelte';
  import Compass from './lib/hud/Compass.svelte';
  import { Editor } from './lib/editor/editor.svelte';
  import Hints from './lib/hints/Hints.svelte';
  import HistoryPanel from './lib/hud/HistoryPanel.svelte';
  import { panelHints, panelView } from './lib/hud/panel';
  import { Recent } from './lib/hud/recent.svelte';
  import { Toasts } from './lib/ui/toasts.svelte';
  import ToastList from './lib/ui/ToastList.svelte';
  import { hintsFor, viewHints } from './lib/hints/hints';
  import { Usage } from './lib/hints/usage.svelte';
  import { actionFor, keyOf } from './lib/editor/keymap';
  import { modalHints } from './lib/project/modalHints';
  import MapCanvas from './lib/MapCanvas.svelte';
  import ProjectsModal from './lib/project/ProjectsModal.svelte';
  import { ProjectSession } from './lib/project/session.svelte';
  import { IndexedDbStorage } from './lib/project/storage';
  import { installTestHook } from './lib/testHook';

  const editor = new Editor();
  const camera = new Camera();
  const toasts = new Toasts();
  const session = new ProjectSession(editor, camera, new IndexedDbStorage(), {
    notify: (kind, text) => toasts.show(kind, text),
  });
  installTestHook(editor, camera, session, () => document.querySelector('canvas'));
  // A control that was used lately has its hint hidden for a while (^110).
  const usage = new Usage();
  $effect(() => {
    const used = editor.used;
    untrack(() => used && usage.mark(used.id));
  });
  // While the projects modal is up its controls replace all others (^168).
  const hints = $derived(
    session.modalOpen
      ? modalHints(session.row?.mode ?? 'list', session.over)
      : editor.viewing
        ? viewHints(usage.hidden)
        : hintsFor(editor.drawing, editor.hintTarget, editor.selection.length, {
            hidden: usage.hidden,
            pinned: editor.pinned.length,
            snapping: editor.snapped !== null,
            rotating: camera.rotating,
          }),
  );
  // The last steps and what was undone, for a few seconds after each one, and while a road is drawn (^107, ^109).
  const recent = new Recent();
  $effect(() => {
    const event = editor.timeline.event;
    untrack(() => recent.consume(event));
  });
  // Drawing a road keeps the panel up; when the road is finished the interval starts from then.
  $effect(() => {
    if (editor.active === null) untrack(() => recent.hideLater());
  });
  const panelShown = $derived(recent.visible || editor.active !== null);
  const panel = $derived(panelView(editor.timeline.history));
  const historyRows = $derived(panelHints(editor.timeline.history, usage.hidden));

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

  /** `Ctrl+S` saves; `P` opens the projects, `Ctrl+O` with the file window (^168, ^222, ^223, ^226). */
  function projectKey(e: KeyboardEvent): boolean {
    if (e.shiftKey || e.altKey) return false;
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (ctrl && key === 's') void session.saveNow();
    else if (ctrl && key === 'o') void session.openModal(true);
    else if (!ctrl && key === 'p') void session.openModal();
    else return false;
    return true;
  }

  /** Undo or redo with nothing to undo or redo says so, instead of doing nothing (^242). */
  function noHistory(e: KeyboardEvent) {
    const mods = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey };
    const action = actionFor(keyOf(e), mods);
    if ((action === 'undo' || action === 'undoBatch') && !editor.timeline.canUndo) {
      toasts.show('info', 'nothing to undo');
    } else if ((action === 'redo' || action === 'redoBatch') && !editor.timeline.canRedo) {
      toasts.show('info', 'nothing to redo');
    }
  }

  const modsOf = (e: KeyboardEvent) => ({
    alt: e.altKey,
    shift: e.shiftKey,
    ctrl: e.ctrlKey || e.metaKey,
  });

  /** While the projects modal is up, Esc leaves the rename or the modal; the other keys are its own. */
  function modalKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (session.row) session.cancelRow();
    else session.closeModal();
  }

  function onKeyDown(e: KeyboardEvent) {
    editor.modifiers(modsOf(e));
    if (session.modalOpen) return modalKey(e);
    if (e.target instanceof HTMLInputElement) return;
    noHistory(e);
    if (projectKey(e) || camera.key(e.key) || editor.key(keyOf(e), modsOf(e))) e.preventDefault();
  }
</script>

<svelte:window
  onkeydown={onKeyDown}
  onkeyup={(e) => {
    camera.keyUp(e.key);
    editor.modifiers(modsOf(e));
  }}
  onblur={() => editor.modifiers({ alt: false, shift: false, ctrl: false })}
  onpagehide={() => void session.flush()}
/>

<main>
  <MapCanvas {editor} {camera} onUse={(id) => usage.mark(id)} />
  <ModeFrame phase={editor.phase} />
  <Hints {hints} />
  <div class="right">
    <ToastList {toasts} />
    {#if panelShown}<HistoryPanel groups={panel} hints={historyRows} />{/if}
  </div>
  <Compass {camera} />
  <ProjectsModal {session} />
</main>

<style>
  /* The toasts and the recent history panel share one column, so they never overlap (^232). */
  .right {
    position: absolute;
    right: 1.1667em;
    top: 1em;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.8em;
    pointer-events: none;
  }
  main {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
