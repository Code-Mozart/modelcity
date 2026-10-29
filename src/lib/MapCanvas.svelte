<script lang="ts">
  import { onMount } from 'svelte';
  import { render } from './render';
  import { initialView, panBy, zoomAt, type Size, type View } from './view';

  const ZOOM_PER_WHEEL_PX = 0.0015;

  let canvas: HTMLCanvasElement;
  let view: View = initialView();
  let size: Size = { width: 1, height: 1 };
  let dpr = 1;
  let drag: { x: number; y: number } | null = null;
  let frame = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    size = { width: canvas.clientWidth, height: canvas.clientHeight };
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    requestDraw();
  }

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function draw() {
    frame = 0;
    render(canvas.getContext('2d')!, view, size, dpr);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Normalize line/page deltas; ctrl+wheel (trackpad pinch) is amplified.
    const px =
      e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1) * (e.ctrlKey ? 4 : 1);
    view = zoomAt(view, size, anchor, Math.exp(-px * ZOOM_PER_WHEEL_PX));
    requestDraw();
  }

  function onPointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag) return;
    view = panBy(view, e.clientX - drag.x, e.clientY - drag.y);
    drag = { x: e.clientX, y: e.clientY };
    requestDraw();
  }

  function onPointerUp() {
    drag = null;
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
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
  }
  canvas:active {
    cursor: grabbing;
  }
</style>
