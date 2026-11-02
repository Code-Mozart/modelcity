<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Camera } from './camera/camera.svelte';
  import type { Editor, PointerInfo } from './editor/editor.svelte';
  import { FEATURES } from './features';
  import type { ControlId } from './hints/hints';
  import { chainSelection } from './editor/chains';
  import { render } from './render/render';
  import { screenToWorld, worldToScreen, type Point } from './camera/view';

  let {
    editor,
    camera,
    onUse,
  }: { editor: Editor; camera: Camera; onUse: (id: ControlId) => void } = $props();

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

  // Keep the camera on the content (^37); also re-checks when the window size changes.
  $effect(() => {
    const anchors = editor.anchors;
    void camera.size;
    untrack(() => camera.setAnchors(anchors));
  });

  // Redraw whenever the camera or anything the editor exposes changes.
  $effect(() => {
    const scene = {
      roads: editor.chains.map((c) => ({ path: c.path, edges: c.edges, width: c.width })),
      handles: editor.handles(camera.view.scale),
      selection: chainSelection(editor.chains, editor.selection),
      band: editor.band,
      drawing: editor.drawing,
      viewing: editor.viewing,
      selectedSegments: editor.selectedSegments,
      outline: editor.hoverSegments,
      hideScaffold: editor.movingGroup,
      hover: editor.hover,
      mergePreview: editor.mergePreview,
      focus: editor.focus,
      pointer: editor.pointer,
    };
    const frame = { ctx: canvas.getContext('2d')!, view: camera.view, size: camera.size };
    render(frame, dpr, scene, { showGrid: FEATURES.grid, showScaleBar: camera.scaleBarVisible });
  });

  function localPoint(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /** Where the pointer last was on the canvas, and with what keys, to find it again when the view moves. */
  let last: Pick<PointerInfo, 'screen' | 'touch' | 'shift' | 'alt' | 'ctrl'> | null = null;

  function infoAt(at: NonNullable<typeof last>): PointerInfo {
    return {
      ...at,
      pt: screenToWorld(camera.view, camera.size, at.screen),
      project: (p) => worldToScreen(camera.view, camera.size, p),
      scale: camera.view.scale,
    };
  }

  function info(e: PointerEvent | MouseEvent): PointerInfo {
    const touch = 'pointerType' in e && e.pointerType === 'touch';
    last = {
      screen: localPoint(e),
      touch,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
    };
    return infoAt(last);
  }

  // The view moved (wheel, pan, rotate, keys): the pointer is over another place now (^238).
  $effect(() => {
    void camera.view;
    untrack(() => last && editor.look(infoAt(last)));
  });

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? PAGE_PX : 1;
    onUse('zoom');
    camera.zoomWheel(e.deltaY * unit * (e.ctrlKey ? PINCH_BOOST : 1), localPoint(e));
  }

  /** Left press: creates or edits, or spans the selection box (^70). */
  function leftDown(e: PointerEvent, at: Point) {
    if (camera.rotating) camera.compassClick(at);
    else editor.pointerDown(info(e));
  }

  /** One finger is the left button; a second finger turns the gesture into a camera move. */
  function touchDown(e: PointerEvent, at: Point) {
    if (camera.touchDown(e.pointerId, at) >= 2) editor.cancelPress();
    else editor.pointerDown(info(e));
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
      editor.pointerUp();
    } else if (e.button === 0) {
      camera.releaseChip();
      editor.pointerUp();
    } else if (e.button === 1) {
      camera.endRotate();
      onUse('rotate');
    } else if (e.button === 2) {
      // A right click without movement removes a node or a segment, or finishes the road; a right drag only pans.
      if (!camera.endPan()) editor.rightClick(info(e));
      else onUse('pan');
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
  style:cursor={camera.rotating ? 'none' : camera.panning ? 'grabbing' : editor.cursor}
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onpointerleave={() => editor.pointerLeave()}
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
