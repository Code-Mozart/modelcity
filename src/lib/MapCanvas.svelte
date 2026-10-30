<script lang="ts">
  import { onMount } from 'svelte';
  import type { Editor, PointerInfo } from './editor.svelte';
  import { render } from './render';
  import { initialView, panBy, screenToWorld, zoomAt, type Size, type View } from './view';

  let { editor }: { editor: Editor } = $props();

  const ZOOM_PER_WHEEL_PX = 0.0015;
  const LINE_PX = 16;
  const PAGE_PX = 400;
  const PINCH_BOOST = 4;

  let canvas: HTMLCanvasElement;
  let view = $state<View>(initialView());
  let size = $state<Size>({ width: 1, height: 1 });
  let dpr = $state(1);
  let panning: { x: number; y: number } | null = $state(null);

  function resize() {
    dpr = window.devicePixelRatio || 1;
    size = { width: canvas.clientWidth, height: canvas.clientHeight };
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
  }

  // Redraw whenever the view, the size or anything the editor exposes changes.
  $effect(() => {
    const scene = {
      path: editor.path,
      edges: editor.edges,
      handles: editor.handles(view.scale),
      sel: editor.sel,
      hover: editor.hover,
      tool: editor.tool,
      showCircles: editor.showCircles,
      showLines: editor.showLines,
    };
    render({ ctx: canvas.getContext('2d')!, view, size }, dpr, scene);
  });

  function localPoint(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function info(e: PointerEvent | MouseEvent): PointerInfo {
    return {
      pt: screenToWorld(view, size, localPoint(e)),
      scale: view.scale,
      touch: 'pointerType' in e && e.pointerType === 'touch',
      shift: e.shiftKey,
    };
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? PAGE_PX : 1;
    const px = e.deltaY * unit * (e.ctrlKey ? PINCH_BOOST : 1);
    view = zoomAt(view, size, localPoint(e), Math.exp(-px * ZOOM_PER_WHEEL_PX));
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button === 2) return;
    canvas.setPointerCapture(e.pointerId);
    const wantsPan = e.button === 1;
    // Dragging empty space pans in the Move tool (^14).
    if (wantsPan || !editor.pointerDown(info(e))) {
      if (wantsPan || editor.tool === 'move') panning = { x: e.clientX, y: e.clientY };
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!panning) return editor.pointerMove(info(e));
    view = panBy(view, e.clientX - panning.x, e.clientY - panning.y);
    panning = { x: e.clientX, y: e.clientY };
  }

  function endPointer() {
    panning = null;
    editor.pointerUp();
  }

  onMount(() => {
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Test hook for e2e/screenshots.
    (window as unknown as { __view: () => View }).__view = () => view;
    return () => ro.disconnect();
  });
</script>

<canvas
  bind:this={canvas}
  style:cursor={panning ? 'grabbing' : editor.cursor}
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={endPointer}
  onpointercancel={endPointer}
  onpointerleave={() => editor.pointerLeave()}
  oncontextmenu={(e) => {
    e.preventDefault();
    editor.removeAt(info(e));
  }}
  ondblclick={(e) => editor.resetRadiusAt(info(e))}
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
