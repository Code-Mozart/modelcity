<script lang="ts">
  import { projectKeyOf } from './lib/project/projectKeys';
  import { onMount, untrack } from 'svelte';
  import { Camera } from './lib/camera/camera.svelte';
  import Compass from './lib/hud/Compass.svelte';
  import { Editor } from './lib/editor/editor.svelte';
  import { editorKey, isTyping, USED } from './lib/editor/keys';
  import { connectEditor } from './lib/edit/connect';
  import { SelectionPins } from './lib/editor/pins';
  import type { LoadedMap } from './lib/map/hit';
  import Hints from './lib/hints/Hints.svelte';
  import ModeFrame from './lib/hud/ModeFrame.svelte';
  import HistoryPanel from './lib/hud/HistoryPanel.svelte';
  import { panelHints, panelView } from './lib/hud/panel';
  import { Recent } from './lib/hud/recent.svelte';
  import { Toasts } from './lib/ui/toasts.svelte';
  import ToastList from './lib/ui/ToastList.svelte';
  import { appHints } from './lib/hints/appControls';
  import { selectHints } from './lib/hints/selectControls';
  import { selectFactsOf } from './lib/hints/selectFacts';
  import { drawHints } from './lib/hints/drawControls';
  import { drawFactsOf } from './lib/hints/drawFacts';
  import { dragHints } from './lib/hints/moveControls';
  import { Usage } from './lib/hints/usage.svelte';
  import { modalHints } from './lib/project/modalHints';
  import MapCanvas from './lib/MapCanvas.svelte';
  import ProjectsModal from './lib/project/ProjectsModal.svelte';
  import { ProjectSession } from './lib/project/session.svelte';
  import { IndexedDbStorage } from './lib/project/indexedDb';
  import { MapMemory } from './lib/map/mapMemory.svelte';
  import { IndexBuild } from './lib/map/indexBuild.svelte';
  import IndexPanel from './lib/map/IndexPanel.svelte';
  import { isRebuildKey } from './lib/map/rebuildKey';
  import { FrameStats } from './lib/hud/frameStats.svelte';
  import FrameTimes from './lib/hud/FrameTimes.svelte';
  import { isFramesKey } from './lib/hud/frameKey';
  import { installTestHook } from './lib/testHook';
  import VersionText from './lib/hud/VersionText.svelte';
  import { VersionBanner } from './lib/hud/versionBanner.svelte';
  import { TAB_TITLE } from './lib/version';

  const editor = new Editor();
  const camera = new Camera();
  const toasts = new Toasts();
  editor.told = (kind, text) => toasts.show(kind, text);
  // The version and the moniker show at load and after a while without input (^787); the tab says it too (^788).
  const banner = new VersionBanner();
  document.title = TAB_TITLE;
  const storage = new IndexedDbStorage();
  const memory = new MapMemory(storage);
  const index = new IndexBuild(storage);
  const frames = new FrameStats();
  const session = new ProjectSession(editor, camera, storage, {
    notify: (kind, text) => toasts.show(kind, text),
  });
  installTestHook({ editor, camera, session, memory, index }, () =>
    document.querySelector('canvas'),
  );

  onMount(() => void session.start());

  // The open project has a complete segment index before its map is shown (^1239); the chunks in memory are those of that project (^1238).
  $effect(() => {
    const id = session.id;
    untrack(() => void index.ensure(id));
  });
  $effect(() => {
    const id = index.status === 'ready' ? index.project : '';
    untrack(() => memory.open(id));
  });

  // The chunks of the selected nodes stay in memory (^1257); if there is no room for them the selection goes, and the user is told.
  const loaded = $derived<LoadedMap>(memory.loaded());
  // A blank map can be drawn on: its first change makes it a project (^189, ^1262).
  editor.canEdit = () =>
    session.noProject || (index.status === 'ready' && memory.project === session.id);
  editor.ids = () => session.nextIds();
  // A blank map that became a project has a complete index and no rows: nothing has to be read (^1263).
  session.onCreated = (id) => {
    index.madeComplete(id);
    memory.openEmpty(id);
  };
  connectEditor(editor, {
    storage,
    memory,
    project: () => session.id,
    commit: (change, index) => session.commitMap(change, index),
  });
  const pins = new SelectionPins();
  memory.onSqueezed = () => {
    editor.dropSelection();
    toasts.show(
      'warning',
      'The selection was cleared: the memory has no room for all the selected nodes.',
    );
  };
  $effect(() => {
    // The node a road is drawn from stays in memory as well (^1263).
    const active = editor.draw.active;
    const sel = active === null ? editor.selection : new Set([...editor.selection, active]);
    untrack(() => {
      const chunks = pins.pinnedFor(sel, memory.index.nodeOf);
      for (const id of memory.pinned) if (!chunks.has(id)) memory.pinned.delete(id);
      for (const id of chunks) memory.pinned.add(id);
    });
  });
  $effect(() => {
    void memory.project;
    untrack(() => pins.reset());
  });

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
  // The last steps and what was undone, for a few seconds after each one (^107, ^109).
  const recent = new Recent();
  $effect(() => {
    const event = editor.event;
    untrack(() => recent.consume(event));
  });
  const panel = $derived(panelView(editor.history));
  const historyRows = $derived(panelHints(editor.history, usage.hidden));
  // While the projects modal is up its controls replace all others (^168).
  const hints = $derived(
    session.modalOpen
      ? modalHints(session.row?.mode ?? 'list', session.over)
      : editor.drag
        ? dragHints({ held: editor.drag.grip.type, merges: editor.drag.merges })
        : [
            ...(editor.mode === 'draw'
              ? drawHints(drawFactsOf(editor, loaded), usage.hidden)
              : selectHints(selectFactsOf(editor, loaded), usage.hidden)),
            ...appHints(usage.hidden),
          ],
  );

  /** The keys of the projects: `Ctrl+S` saves, `Ctrl+Shift+S` exports, `P` and `Ctrl+O` open (^168, ^222, ^223, ^226, ^746). */
  function projectKey(e: KeyboardEvent): boolean {
    const action = projectKeyOf(e);
    if (action === 'save') void session.saveNow();
    else if (action === 'export') void session.exportJson();
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
    editor.alt = e.altKey;
    if (session.modalOpen) return modalKey(e);
    if (isTyping(e.target)) return;
    if (isFramesKey(e)) {
      frames.toggle();
      return e.preventDefault();
    }
    if (isRebuildKey(e)) {
      void index.rebuild();
      return e.preventDefault();
    }
    if (projectKey(e) || camera.key(e.key)) return e.preventDefault();
    const action = editorKey(editor, e);
    if (!action) return;
    const used = USED[action];
    if (used) usage.mark(used);
    e.preventDefault();
  }
</script>

<svelte:window
  onkeydown={onKeyDown}
  onpointerdown={() => banner.used()}
  onkeyup={(e) => {
    editor.alt = e.altKey;
    camera.keyUp(e.key);
  }}
  onpagehide={() => void session.flush()}
/>

<main>
  <MapCanvas {camera} {memory} {editor} {frames} onUse={(id) => usage.mark(id)} />
  <ModeFrame mode={editor.phase} />
  <IndexPanel build={index} title={session.title} />
  <Hints {hints} />
  <VersionText visible={banner.visible} />
  <FrameTimes stats={frames} />
  <div class="right">
    <div class="toasts"><ToastList {toasts} /></div>
    {#if recent.visible}<HistoryPanel groups={panel} hints={historyRows} />{/if}
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
