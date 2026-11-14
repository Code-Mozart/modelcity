<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import type { Camera } from './camera/camera.svelte';
  import { FEATURES } from './features';
  import { render } from './render/render';
  import type { ChunkView } from './render/mapLayer';
  import { curveOf, type SkeletonEdge } from './render/skeleton';
  import type { Point } from './camera/view';
  import type { ControlId } from './hints/hints';
  import { boxOfId, CHUNK_M, countOf, idsOf } from './map/chunks';
  import { chunksInView } from './map/inView';
  import { MAX_CHUNKS, type MapMemory } from './map/mapMemory.svelte';

  let {
    camera,
    memory,
    onUse,
  }: { camera: Camera; memory: MapMemory; onUse: (id: ControlId) => void } = $props();

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
    const range = chunksInView(camera.view, camera.size, CHUNK_M);
    untrack(() => void memory.show(range));
  });

  /** The chunks the screen touches, with their nodes or as not loaded, and how far those are. */
  const chunkViews = $derived.by(() => {
    const seen = chunksInView(camera.view, camera.size);
    if (countOf(seen) > MAX_CHUNKS) return [];
    return [...idsOf(seen)].map((id): ChunkView => {
      const state = memory.chunks.get(id);
      return {
        box: boxOfId(id),
        nodes: state?.status === 'ready' ? state.chunk.nodes : null,
        progress: memory.progress.get(id) ?? 0,
      };
    });
  });

  /** The segments of the chunks that are loaded, each once; what the progress of a chunk does is not looked at here. */
  const edges = $derived.by(() => {
    const seen = chunksInView(camera.view, camera.size);
    if (countOf(seen) > MAX_CHUNKS) return [];
    const found = new SvelteMap<number, SkeletonEdge>();
    for (const id of idsOf(seen)) {
      const state = memory.chunks.get(id);
      if (state?.status !== 'ready') continue;
      for (const row of state.chunk.edges) {
        const [p, q] = [memory.index.nodeOf(row[1]), memory.index.nodeOf(row[2])];
        if (p && q && !found.has(row[0])) found.set(row[0], curveOf(row, p, q));
      }
    }
    return [...found.values()];
  });

  const scene = $derived({
    chunks: chunkViews,
    edges,
    tooMuch: countOf(chunksInView(camera.view, camera.size)) > MAX_CHUNKS || memory.tooMuch,
  });

  // Redraw whenever the camera or the map in memory changes.
  $effect(() => {
    const frame = { ctx: canvas.getContext('2d')!, view: camera.view, size: camera.size };
    render(frame, dpr, scene, { showGrid: FEATURES.grid, showScaleBar: camera.scaleBarVisible });
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

  function onPointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    const at = localPoint(e);
    camera.cursor = at;
    if (e.pointerType === 'touch') camera.touchDown(e.pointerId, at);
    else if (e.button === 0 && camera.rotating) camera.compassClick(at);
    else if (e.button === 1) camera.startRotate(at);
    else if (e.button === 2) camera.startPan(at);
  }

  function onPointerMove(e: PointerEvent) {
    const at = localPoint(e);
    camera.cursor = at;
    if (e.pointerType === 'touch' && camera.touchMove(e.pointerId, at)) return;
    if (camera.rotating) camera.moveRotate(at);
    else if (camera.panning) camera.movePan(at);
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch') camera.touchUp(e.pointerId);
    else if (e.button === 0) camera.releaseChip();
    else if (e.button === 1) {
      camera.endRotate();
      onUse('rotate');
    } else if (e.button === 2 && camera.endPan()) onUse('pan');
  }

  onMount(() => {
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  });
</script>

<canvas
  bind:this={canvas}
  style:cursor={camera.rotating ? 'none' : camera.panning ? 'grabbing' : 'default'}
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
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
