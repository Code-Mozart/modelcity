<script lang="ts">
  import { onMount } from 'svelte';
  import {
    gridStep,
    initialView,
    panBy,
    worldToScreen,
    zoomAt,
    type Size,
    type View,
  } from './view';

  // ^2 test object: a 1 m x 2 m box centered on the world origin.
  const BOX = { w: 1, h: 2 };
  const ZOOM_PER_WHEEL_PX = 0.0015;

  let canvas: HTMLCanvasElement;
  let view: View = initialView();
  let size: Size = { width: 1, height: 1 };
  let dpr = 1;
  let drag: { x: number; y: number } | null = null;
  let frame = 0;

  const colors = {
    bg: '#f4f1ea',
    minor: '#e2ded3',
    major: '#cfc9ba',
    box: '#3b6ea8',
    boxFill: '#3b6ea833',
  };

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

  function drawGrid(ctx: CanvasRenderingContext2D, step: number, color: string) {
    const tl = {
      x: view.cx - size.width / 2 / view.scale,
      y: view.cy - size.height / 2 / view.scale,
    };
    const br = {
      x: view.cx + size.width / 2 / view.scale,
      y: view.cy + size.height / 2 / view.scale,
    };
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
      const sx = Math.round(worldToScreen(view, size, { x, y: 0 }).x) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, size.height);
    }
    for (let y = Math.floor(tl.y / step) * step; y <= br.y; y += step) {
      const sy = Math.round(worldToScreen(view, size, { x: 0, y }).y) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(size.width, sy);
    }
    ctx.stroke();
  }

  function draw() {
    frame = 0;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size.width, size.height);

    const minor = gridStep(view.scale, 12);
    drawGrid(ctx, minor, colors.minor);
    drawGrid(ctx, minor * 10, colors.major);

    const a = worldToScreen(view, size, { x: -BOX.w / 2, y: -BOX.h / 2 });
    const w = BOX.w * view.scale;
    const h = BOX.h * view.scale;
    ctx.fillStyle = colors.boxFill;
    ctx.fillRect(a.x, a.y, w, h);
    ctx.strokeStyle = colors.box;
    ctx.lineWidth = 2;
    ctx.strokeRect(a.x, a.y, w, h);
    ctx.lineWidth = 1;

    // Scale bar and zoom readout.
    const bar = gridStep(view.scale, 80);
    ctx.fillStyle = '#333';
    ctx.fillRect(16, size.height - 24, bar * view.scale, 3);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      bar >= 1000 ? `${bar / 1000} km` : bar >= 1 ? `${bar} m` : `${bar * 100} cm`,
      16,
      size.height - 32,
    );
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
