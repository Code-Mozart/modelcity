<script lang="ts">
  import { onMount } from 'svelte';
  import type { Camera } from './camera.svelte';
  import type { Editor, PointerInfo } from './editor.svelte';
  import { FEATURES } from './features';
  import { render } from './render';
  import { screenToWorld, type Point } from './view';

  let { editor, camera }: { editor: Editor; camera: Camera } = $props();

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

  // Redraw whenever the camera or anything the editor exposes changes.
  $effect(() => {
    const scene = {
      path: editor.path,
      edges: editor.edges,
      handles: editor.handles(camera.view.scale),
      sel: editor.sel,
      hover: editor.hover,
      tool: editor.tool,
      showCircles: editor.showCircles,
      showLines: editor.showLines,
    };
    const frame = { ctx: canvas.getContext('2d')!, view: camera.view, size: camera.size };
    render(frame, dpr, scene, { showGrid: FEATURES.grid, showScaleBar: camera.scaleBarVisible });
  });

  function localPoint(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function info(e: PointerEvent | MouseEvent): PointerInfo {
    return {
      pt: screenToWorld(camera.view, camera.size, localPoint(e)),
      scale: camera.view.scale,
      touch: 'pointerType' in e && e.pointerType === 'touch',
      shift: e.shiftKey,
    };
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? PAGE_PX : 1;
    camera.zoomWheel(e.deltaY * unit * (e.ctrlKey ? PINCH_BOOST : 1), localPoint(e));
  }

  /** Left press: drag a handle (a box selection will go here later, ^30). */
  function leftDown(e: PointerEvent, at: Point) {
    if (camera.rotating) camera.compassClick(at);
    else editor.pointerDown(info(e));
  }

  function touchDown(e: PointerEvent, at: Point) {
    if (camera.touchDown(e.pointerId, at) >= 2) {
      editor.pointerUp();
      camera.endPan();
    } else if (!editor.pointerDown(info(e)) && editor.tool === 'move') camera.startPan(at);
  }

  function onPointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    const at = localPoint(e);
    camera.cursor = at;
    if (e.pointerType === 'touch') touchDown(e, at);
    else if (e.button === 0) leftDown(e, at);
    else if (e.button === 1) camera.startRotate(at);
    else if (e.button === 2) camera.startPan(at);
  }

  function onPointerMove(e: PointerEvent) {
    const at = localPoint(e);
    camera.cursor = at;
    if (e.pointerType === 'touch' && camera.touchMove(e.pointerId, at)) return;
    if (camera.rotating) camera.moveRotate(at);
    else if (camera.panning) camera.movePan(at);
    else editor.pointerMove(info(e));
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      camera.touchUp(e.pointerId);
      camera.endPan();
      editor.pointerUp();
    } else if (e.button === 0) {
      camera.releaseChip();
      editor.pointerUp();
    } else if (e.button === 1) camera.endRotate();
    // A right click without movement removes a node, a right drag only pans (^31).
    else if (e.button === 2 && !camera.endPan()) editor.removeAt(info(e));
  }

  onMount(() => {
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Test hook for e2e/screenshots.
    (window as unknown as { __camera: Camera }).__camera = camera;
    return () => ro.disconnect();
  });
</script>

<canvas
  bind:this={canvas}
  style:cursor={camera.rotating ? 'none' : camera.panning ? 'grabbing' : editor.cursor}
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onpointerleave={() => editor.pointerLeave()}
  onmousedown={(e) => e.button === 1 && e.preventDefault()}
  oncontextmenu={(e) => e.preventDefault()}
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
