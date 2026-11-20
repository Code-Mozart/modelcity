<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import type { Camera } from './camera/camera.svelte';
  import { FEATURES } from './features';
  import { render } from './render/render';
  import type { ChunkView } from './render/mapLayer';
  import type { FrameStats } from './hud/frameStats.svelte';
  import { curveOf, type SkeletonEdge } from './map/curve';
  import type { Editor } from './editor/editor.svelte';
  import { branchOf } from './editor/branchOf';
  import { SelectPress } from './editor/selectPress';
  import { DrawPress, cursorOf } from './editor/drawPress';
  import { MovePress, gripOf } from './editor/movePress';
  import { ghostOf } from './editor/drawGhost';
  import { draftViewOf, edgesWithDraft } from './edit/draftView';
  import { withTip } from './render/marksOf';
  import { NO_SCAFFOLD } from './render/scaffold';
  import { scaffoldOf } from './render/scaffoldOf';
  import { shownSegments } from './editor/scaffold';
  import { screenToWorld, type Point } from './camera/view';
  import type { LoadedMap } from './map/hit';
  import { networkOf } from './map/network';
  import { marksOf } from './render/marksOf';
  import type { EdgeRow } from './project/storage';
  import type { ControlId } from './hints/hints';
  import { boxOfId, CHUNK_M, countOf, idsWhere } from './map/chunks';
  import { chunksInView, overlapsView } from './map/inView';
  import { MAX_CHUNKS, type MapMemory } from './map/mapMemory.svelte';

  let {
    camera,
    memory,
    editor,
    frames,
    onUse,
  }: {
    camera: Camera;
    memory: MapMemory;
    editor: Editor;
    frames: FrameStats;
    onUse: (id: ControlId) => void;
  } = $props();

  const LINE_PX = 16;
  const PAGE_PX = 400;
  const PINCH_BOOST = 4;

  let canvas: HTMLCanvasElement;
  let dpr = $state(1);

  function resize() {
    dpr = window.devicePixelRatio || 1;
    camera.size = { width: canvas.clientWidth, height: canvas.clientHeight };
    canvas.width = Math.round(camera.size.width * dpr);
    canvas.height = Math.round(camera.size.height * dpr);
  }

  // The chunks the screen touches and one ring round them are asked for (^1238).
  $effect(() => {
    void memory.project;
    // The chunks of the selection are asked for as well (^1257): they change with the selection.
    void memory.pinned.size;
    const range = chunksInView(camera.view, camera.size, CHUNK_M);
    const near = overlapsView(camera.view, camera.size, CHUNK_M);
    untrack(() => void memory.show(range, near));
  });

  /** The chunks the screen touches as it is turned (not all of the box round it), or null when that is more than can be shown. */
  const seen = $derived.by(() => {
    const range = chunksInView(camera.view, camera.size);
    if (countOf(range) > 4 * MAX_CHUNKS) return null;
    const ids = idsWhere(range, overlapsView(camera.view, camera.size));
    return ids.length > MAX_CHUNKS ? null : ids;
  });

  /** Those chunks, with their nodes or as not loaded, and how far those are. */
  const chunkViews = $derived(
    (seen ?? []).map((id): ChunkView => {
      const state = memory.chunks.get(id);
      return {
        box: boxOfId(id),
        nodes: state?.status === 'ready' ? state.chunk.nodes : null,
        progress: memory.progress.get(id) ?? 0,
      };
    }),
  );

  const loadedMap = (): LoadedMap => ({
    chunks: memory.chunks,
    nodeOf: memory.index.nodeOf,
    edgesAt: memory.index.edgesAt,
  });

  /** The segments of the chunks that are loaded, each once; what the progress of a chunk does is not looked at here. */
  const found = $derived.by(() => {
    const out = new SvelteMap<number, { row: EdgeRow; edge: SkeletonEdge }>();
    for (const id of seen ?? []) {
      const state = memory.chunks.get(id);
      if (state?.status !== 'ready') continue;
      for (const row of state.chunk.edges) {
        const [p, q] = [memory.index.nodeOf(row[1]), memory.index.nodeOf(row[2])];
        if (p && q && !out.has(row[0])) out.set(row[0], { row, edge: curveOf(row, p, q) });
      }
    }
    return out;
  });
  /** What an operation in progress would change, drawn over the map (^1262). */
  const draft = $derived.by(() => {
    void found;
    return draftViewOf(editor.draft, memory.index.nodeOf);
  });
  const edges = $derived([
    ...[...found.values()].filter((f) => !draft.hiddenEdges.has(f.row[0])).map((f) => f.edge),
    ...draft.edges,
  ]);
  /** The node the road being drawn goes on from (^65): marked like a selected node, as on `main`. */
  const tip = $derived.by(() => {
    void found;
    const id = editor.draw.active;
    return id === null ? undefined : memory.index.nodeOf(id);
  });
  /** Where the pointer is on the screen, for the preview of draw mode. */
  let pointer = $state<Point | null>(null);
  const ghost = $derived.by(() => {
    if (editor.mode !== 'draw' || !pointer || editor.draft) return null;
    const target = drawPress.ghostTarget(pointer, editor.hover);
    return target ? ghostOf(editor.draw, tip, target) : null;
  });

  /** The branch under the pointer while `Alt` is held: not worked out again at every frame of the camera, only when the pointer, `Alt` or what is loaded changes. */
  const hoverBranch = $derived(
    editor.alt && editor.hover ? branchOf(networkOf(loadedMap()), editor.hover) : null,
  );

  /** The chunks as they are drawn: without the nodes the draft moves or takes away (^1265). */
  const shownChunks = $derived(
    draft.hiddenNodes.size
      ? chunkViews.map((c) =>
          c.nodes ? { ...c, nodes: c.nodes.filter((n) => !draft.hiddenNodes.has(n[0])) } : c,
        )
      : chunkViews,
  );
  /** A node as it is drawn: as the draft has it, else as it is loaded. */
  const rowOfNode = (id: number) => draft.nodes.find((n) => n[0] === id) ?? memory.index.nodeOf(id);
  const shownEdges = $derived(edgesWithDraft(found, draft, editor.draft));

  const marks = $derived(
    withTip(
      marksOf(
        {
          selection: editor.selection,
          hover: editor.hover,
          band: editor.band,
          branch: hoverBranch,
        },
        {
          nodes: [...shownChunks.flatMap((c) => (c.nodes ? [c.nodes] : [])), draft.nodes],
          edges: shownEdges,
        },
        memory.index.nodeOf,
      ),
      tip,
    ),
  );

  /** The nodes in view with no segment: their heading arrows always show (^60). */
  const lone = $derived.by(() => {
    void found;
    return shownChunks.flatMap((c) =>
      (c.nodes ?? []).filter((n) => memory.index.edgesAt(n[0]).length === 0),
    );
  });
  /** The scaffold that is shown (^60, ^66): none in view mode, in extend mode, and while several nodes are moved (^78). */
  const scaffold = $derived.by(() => {
    const drag = editor.drag;
    if (editor.phase === 'view' || editor.phase === 'extend' || (drag && drag.group > 0))
      return NO_SCAFFOLD;
    const hovered = editor.hover?.kind === 'handle' ? editor.hover.handle : null;
    const focus = drag?.grip ?? hovered;
    const at = pointer && screenToWorld(camera.view, camera.size, pointer);
    const map = { ...loadedMap(), nodeOf: rowOfNode };
    const shown = shownSegments({
      map,
      pt: at,
      scale: camera.view.scale,
      focus,
      selected: marks.selectedEdges.map((e) => e.id),
    });
    const rows = shown
      .map((id) => shownEdges.get(id)?.row)
      .filter((r): r is EdgeRow => r !== undefined);
    return scaffoldOf(rows, lone, rowOfNode, { scale: camera.view.scale, focus });
  });

  const scene = $derived({
    chunks: shownChunks,
    edges,
    marks,
    tooMuch: seen === null || memory.tooMuch,
    draftNodes: draft.nodes,
    ghost,
    scaffold,
  });

  // Redraw whenever the camera or the map in memory changes.
  $effect(() => {
    const began = performance.now();
    // A plain copy of the view: the numbers are read for every node, and reading them through the state of the camera is slow (^1249).
    const frame = {
      ctx: canvas.getContext('2d')!,
      view: { ...camera.view },
      size: { ...camera.size },
    };
    render(frame, dpr, scene, { showGrid: FEATURES.grid, showScaleBar: camera.scaleBarVisible });
    frames.record(began, performance.now());
  });

  function localPoint(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? PAGE_PX : 1;
    onUse('zoom');
    camera.zoomWheel(e.deltaY * unit * (e.ctrlKey ? PINCH_BOOST : 1), localPoint(e));
  }

  const around = {
    map: loadedMap,
    screen: () => ({ view: camera.view, size: camera.size }),
  };
  const press = $derived(new SelectPress(editor, around));
  const drawPress = $derived(new DrawPress(editor, around));
  const movePress = $derived(new MovePress(editor, around));
  $effect(() => {
    const [d, m] = [drawPress, movePress];
    editor.cancelPress = () => m.cancel() || d.cancel();
  });

  /** The left button: the compass while the view is turned, else what the mode does with it. */
  function leftDown(at: Point, e: PointerEvent) {
    if (camera.rotating) return camera.compassClick(at);
    if (editor.mode === 'view') return;
    // A node or a control point can be dragged (^1265); without a drag the press of the mode makes it a click.
    const grip = gripOf(press.pickAt(at));
    if (grip) movePress.grab(grip, at, e.shiftKey);
    if (editor.mode === 'select' && !editor.busy) press.down(at, e.shiftKey, e.altKey);
    else if (editor.mode === 'draw') drawPress.down(at, e.altKey);
  }

  /** The left button moved while it is down: a drag of what it holds, or what the press of the mode does. */
  function leftMove(at: Point, e: PointerEvent) {
    if (movePress.move(at, e.ctrlKey || e.metaKey)) {
      press.forget();
      drawPress.cancel();
    } else if (press.active) press.move(at);
    else if (drawPress.active) drawPress.move(at, e.ctrlKey || e.metaKey);
  }

  function onPointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    const at = localPoint(e);
    camera.cursor = at;
    editor.alt = e.altKey;
    if (e.pointerType === 'touch') camera.touchDown(e.pointerId, at);
    else if (e.button === 0) leftDown(at, e);
    else if (e.button === 1) camera.startRotate(at);
    else if (e.button === 2) camera.startPan(at);
  }

  function onPointerMove(e: PointerEvent) {
    const at = localPoint(e);
    camera.cursor = at;
    editor.alt = e.altKey;
    if (e.pointerType === 'touch' && camera.touchMove(e.pointerId, at)) return;
    if (camera.rotating) camera.moveRotate(at);
    else if (camera.panning) camera.movePan(at);
    else if (movePress.active || press.active || drawPress.active) leftMove(at, e);
    else if (editor.mode !== 'view') editor.hover = press.pickAt(at, e.pointerType === 'touch');
    pointer = at;
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch') camera.touchUp(e.pointerId);
    else if (e.button === 0) {
      camera.releaseChip();
      if (movePress.up()) return onUse('move');
      if (drawPress.active) return drawPress.up();
      const did = press.up();
      if (did === 'click') onUse('select');
      else if (did === 'box') onUse('box');
    } else if (e.button === 1) {
      camera.endRotate();
      onUse('rotate');
    } else if (e.button === 2) {
      // Pulled: a pan. Not moved: a click, which deletes what is under the pointer (^489, ^920).
      if (camera.endPan()) onUse('pan');
      else void editor.rightClick(press.pickAt(localPoint(e)), e.altKey);
    }
  }

  onMount(() => {
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  });
</script>

<canvas
  bind:this={canvas}
  style:cursor={editor.busy
    ? 'progress'
    : camera.rotating
      ? 'none'
      : camera.panning
        ? 'grabbing'
        : cursorOf(editor.mode, editor.hover)}
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onpointerleave={() => ((editor.hover = null), (pointer = null))}
  onmousedown={(e) => e.button === 1 && e.preventDefault()}
  oncontextmenu={(e) => e.preventDefault()}
></canvas>

<style>
  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
</style>
