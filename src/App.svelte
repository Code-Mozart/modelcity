<script lang="ts">
  import { projectKeyOf } from './lib/project/projectKeys';
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
  import { headingFrom } from './lib/snap/heading';
  import { hintStateOf } from './lib/editor/hintState';
  import MapCanvas from './lib/MapCanvas.svelte';
  import ProjectsModal from './lib/project/ProjectsModal.svelte';
  import { ProjectSession } from './lib/project/session.svelte';
  import { IndexedDbStorage } from './lib/project/storage';
  import { installTestHook } from './lib/testHook';
  import VersionText from './lib/hud/VersionText.svelte';
  import PointerCoordinates from './lib/hud/PointerCoordinates.svelte';
  import {
    DebugTools,
    hoverText,
    isCoordinatesKey,
    nearMissLines,
  } from './lib/hud/debugTools.svelte';
  import { violationsOf } from './lib/editor/violations';
  import { VersionBanner } from './lib/hud/versionBanner.svelte';
  import { TAB_TITLE } from './lib/version';

  const editor = new Editor();
  const camera = new Camera();
  const toasts = new Toasts();
  // The version and the moniker show at load and after a while without input (^787); the tab says it too (^788).
  const banner = new VersionBanner();
  const debug = new DebugTools();
  document.title = TAB_TITLE;
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
            ...hintStateOf(editor),
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

  /** The keys of the projects: `Ctrl+S` saves, `Ctrl+Shift+S` exports, `P` and `Ctrl+O` open (^168, ^222, ^223, ^226, ^746). */
  function projectKey(e: KeyboardEvent): boolean {
    const action = projectKeyOf(e);
    if (action === 'save') void session.saveNow();
    else if (action === 'export') session.exportJson();
    else if (action === 'open') void session.openModal(true);
    else if (action === 'projects') void session.openModal();
    return action !== null;
  }

  /** While the map has violations of the rules of touching nodes, a red message says how many (^827). */
  $effect(() => {
    const n = violationsOf(editor.graph).length;
    const text = n === 1 ? '1 violation' : `${n} violations`;
    untrack(() => toasts.keep('violations', n ? { kind: 'error', text } : null));
  });

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
    banner.used();
    editor.modifiers(modsOf(e));
    if (session.modalOpen) return modalKey(e);
    if (e.target instanceof HTMLInputElement) return;
    if (isCoordinatesKey(e)) {
      debug.toggleCoordinates();
      return e.preventDefault();
    }
    noHistory(e);
    if (projectKey(e) || camera.key(e.key) || editor.key(keyOf(e), modsOf(e))) e.preventDefault();
  }
</script>

<svelte:window
  onkeydown={onKeyDown}
  onpointerdown={() => banner.used()}
  onkeyup={(e) => {
    camera.keyUp(e.key);
    editor.modifiers(modsOf(e));
  }}
  onblur={() => editor.modifiers({ alt: false, shift: false, ctrl: false })}
  onpagehide={() => void session.flush()}
/>

<main>
  <MapCanvas {editor} {camera} debug={debug.coordinates} onUse={(id) => usage.mark(id)} />
  <ModeFrame phase={editor.phase} />
  <Hints {hints} />
  <VersionText visible={banner.visible} />
  {#if debug.coordinates}<PointerCoordinates
      pt={editor.pointer?.pt}
      over={hoverText(editor.graph, editor.hover)}
      misses={nearMissLines(editor.graph, editor.hover)}
    />{/if}
  <div class="right">
    <div class="toasts"><ToastList {toasts} /></div>
    {#if panelShown}<HistoryPanel groups={panel} hints={historyRows} />{/if}
  </div>
  {#if summary.segments > 0}<MeasurementsPanel {summary} lifted={camera.scaleBarVisible} />{/if}
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
