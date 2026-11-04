<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Camera } from './lib/camera/camera.svelte';
  import ModeFrame from './lib/hud/ModeFrame.svelte';
  import Compass from './lib/hud/Compass.svelte';
  import { Editor } from './lib/editor/editor.svelte';
  import Hints from './lib/hints/Hints.svelte';
  import HistoryPanel from './lib/hud/HistoryPanel.svelte';
  import MeasurementsPanel from './lib/hud/MeasurementsPanel.svelte';
  import { summaryOf } from './lib/curves/measure';
  import { selectedSegments } from './lib/editor/selection';
  import { panelHints, panelView } from './lib/hud/panel';
  import { Recent } from './lib/hud/recent.svelte';
  import { Toasts } from './lib/ui/toasts.svelte';
  import ToastList from './lib/ui/ToastList.svelte';
  import { hintsFor, viewHints } from './lib/hints/hints';
  import { PIN_TIP } from './lib/hints/pinTip';
  import { HEADING_TIP } from './lib/hints/headingTip';
  import { REACH_WARN } from './lib/snap/engine';
  import { Usage } from './lib/hints/usage.svelte';
  import { actionFor, keyOf } from './lib/editor/keymap';
  import { modalHints } from './lib/project/modalHints';
  import { dropOf } from './lib/editor/drop';
  import { headingFrom, placedHeading } from './lib/snap/heading';
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
  // While a handle is dragged, the hints are about the drag only (^286); the graph is read so that it follows the drag.
  /** The snap gives a heading that `Alt` inverts: a lane or a normal for a placed node, or the copied heading (^301, ^313). */
  const invertible = (e: Editor) =>
    placedHeading(e.snapped, false) !== null ||
    (e.press !== null && headingFrom(e.snapped, false) !== null);
  const drag = $derived.by(() => {
    const [press, graph] = [editor.press, editor.graph];
    // Setting the heading of a node that was just placed is dragging a heading too (^286).
    if (press?.kind === 'place' && press.moved)
      return { type: 'head' as const, merge: false, place: true };
    if (press?.kind !== 'drag' || !press.moved) return null;
    return { type: press.drag.handle.type, merge: dropOf(graph, press, editor.snapped) !== null };
  });
  // While the projects modal is up its controls replace all others (^168).
  const hints = $derived(
    session.modalOpen
      ? modalHints(session.row?.mode ?? 'list', session.over)
      : editor.viewing
        ? viewHints(usage.hidden)
        : hintsFor(editor.drawing, editor.hintTarget, editor.selection.length, {
            hidden: usage.hidden,
            pinned: editor.pins.list.length,
            snapping: editor.snapped !== null,
            touching: invertible(editor),
            placing: editor.drawing,
            rotating: camera.rotating,
            drag,
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
  // Pulling a snap suggestion of a node towards its maximum distance says how to pin it (^258, ^294); not while pinning is visited.
  $effect(() => {
    const far = (editor.snapped?.reach ?? 0) >= REACH_WARN;
    untrack(() => far && !usage.hidden('pin') && toasts.show('info', PIN_TIP));
  });
  // Pinning is a control like the others: used, its tip is not shown for a while (^110).
  $effect(() => {
    if (editor.pins.list.length) untrack(() => usage.mark('pin'));
  });
  // A node placed on a snap line copies no heading when its heading is dragged: say how to copy one (^319); copying visits it (^110).
  const lineTip = $derived(
    editor.press?.kind === 'place' && editor.press.moved && editor.press.onLine,
  );
  $effect(() => {
    if (lineTip) untrack(() => !usage.hidden('copy-heading') && toasts.show('info', HEADING_TIP));
  });
  $effect(() => {
    const copied = editor.press !== null && headingFrom(editor.snapped, false) !== null;
    if (copied) untrack(() => usage.mark('copy-heading'));
  });
  // The measurements of the selected segments, shown while one is selected (^342).
  const summary = $derived.by(() => {
    const ids = selectedSegments(editor.graph, editor.selection);
    const pieces = editor.chains.flatMap((c) =>
      c.edges.filter((_, i) => ids.includes(c.edgeIds[i]!)).map((e) => e.E.pieces),
    );
    return summaryOf(pieces, editor.selection.length);
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
  {#if summary.segments > 0}<MeasurementsPanel {summary} lifted={camera.scaleBarVisible} />{/if}
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
