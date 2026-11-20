<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Camera } from './camera/camera.svelte';
  import { FEATURES } from './features';
  import { render } from './render/render';
  import { MapView } from './render/mapView.svelte';
  import type { FrameStats } from './hud/frameStats.svelte';
  import type { Editor } from './editor/editor.svelte';
  import { SelectPress } from './editor/selectPress';
  import { DrawPress, cursorOf } from './editor/drawPress';
  import { MovePress, gripOf } from './editor/movePress';
  import type { Point } from './camera/view';
  import type { ControlId } from './hints/hints';
  import { CHUNK_M } from './map/chunks';
  import { chunksInView, overlapsView } from './map/inView';
  import type { MapMemory } from './map/mapMemory.svelte';

  let {
    camera,
    memory,
    editor,
    frames,
    onUse,
    laneWidth,
  }: {
    camera: Camera;
    memory: MapMemory;
    editor: Editor;
    frames: FrameStats;
    onUse: (id: ControlId) => void;
    /** The width (meters) of the road of a lane configuration (^945). */
    laneWidth: (lane: number) => number;
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

  /** What the canvas draws, derived part by part (`MapView`). */
  const view = $derived(
    new MapView({
      camera,
      memory,
      editor,
      laneWidth: (lane) => laneWidth(lane),
      ghostTarget: (at, hover) => drawPress.ghostTarget(at, hover),
    }),
  );
  const loadedMap = () => memory.loaded();

  // Redraw whenever the camera or the map in memory changes.
  $effect(() => {
    const began = performance.now();
    // A plain copy of the view: the numbers are read for every node, and reading them through the state of the camera is slow (^1249).
    const frame = {
      ctx: canvas.getContext('2d')!,
      view: { ...camera.view },
      size: { ...camera.size },
    };
    render(frame, dpr, view.scene, {
      showGrid: FEATURES.grid,
      showScaleBar: camera.scaleBarVisible,
    });
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
    if (grip) movePress.grab(grip, at, e.shiftKey, e.altKey);
    if (editor.mode === 'select' && !editor.busy) press.down(at, e.shiftKey, e.altKey);
    else if (editor.mode === 'draw') drawPress.down(at, e.altKey);
  }

  /** The left button moved while it is down: a drag of what it holds, or what the press of the mode does. */
  function leftMove(at: Point, e: PointerEvent) {
    if (movePress.move(at, e.ctrlKey || e.metaKey)) {
      press.forget();
      drawPress.forget();
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
    view.pointer = at;
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch') camera.touchUp(e.pointerId);
    else if (e.button === 0) {
      camera.releaseChip();
      const held = movePress.up();
      if (held) {
        press.forget();
        drawPress.forget();
        return onUse('move');
      }
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
  onpointerleave={() => ((editor.hover = null), (view.pointer = null))}
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
