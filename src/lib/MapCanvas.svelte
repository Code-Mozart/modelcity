<script lang="ts">
  import { cornersOf, hullsOf } from './editor/corners';
  import { segmentSigns } from './editor/signs';
  import { markingsOf } from './editor/markings';
  import { dotsOf, holesOf, patched, surfaceFrom } from './editor/surface';
  import { laneChangeLines, laneChangesOf } from './editor/laneChanges';
  import { laneArrows } from './editor/laneArrows';
  import { laneFactsOf } from './editor/laneFacts';
  import { incompleteArrows, waitLines } from './editor/priorityMarks';
  import { goresOf } from './editor/gores';
  import { dropOf, dropPreview, roadsShown } from './editor/drop';
  import { turningOf } from './editor/turning';
  import { headingSourceOrigins } from './editor/hintState';
  import { snapOrigins } from './snap/heading';
  import { scaffoldHidden } from './editor/phase';
  import { followingTower } from './editor/sharedRadius';
  import { barsOf, towersOf } from './editor/towers';
  import { withDerived } from './editor/derived';
  import { previousPlaces } from './editor/snapping';
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
    debug = false,
    walk = 0,
    physical = false,
  }: {
    editor: Editor;
    camera: Camera;
    onUse: (id: ControlId) => void;
    /** The debug layer is on: the hulls and corners are drawn (^925). */
    debug?: boolean;
    /** How far the dots of the debug layer have walked along their polygons, in meters (^948). */
    walk?: number;
    /** Physical lane markings (meters) instead of the logical ones (pixels), ^1040. */
    physical?: boolean;
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

  // Keep the camera on the content (^37); also re-checks when the window size changes.
  $effect(() => {
    const anchors = editor.anchors;
    void camera.size;
    untrack(() => camera.setAnchors(anchors));
  });

  /** The derived nodes, the graph with them in it, and the towers and bars of that, all derived from the graph (^350, ^822). */
  const derivedAll = $derived(editor.derived);
  const seen = $derived(withDerived(editor.graph, derivedAll));
  const bars = $derived(barsOf(seen));
  /** The hulls of the segments, the road surface round them (^945) and, while the debug layer is on, the hulls and corners (^925). */
  const allHulls = $derived(hullsOf(editor.graph));
  /** The lane changes (extensions and merges, ^1056), the gores between their lanes (^1065) and the arrows of the lanes that end (^1029). */
  const changes = $derived(laneChangesOf(seen));
  const gores = $derived(goresOf(seen, changes, allHulls));
  const rawSurface = $derived(
    surfaceFrom(
      allHulls,
      gores.map((w) => w.loop),
    ),
  );
  /** The surface with its tiny holes patched (^1042). */
  const surface = $derived(patched(rawSurface));
  /** What can be said about each lane in (^1101): the give-way lines (^1074, ^1075) and the arrows where a turn is missing (^1076). */
  const facts = $derived(laneFactsOf(editor.graph));
  const arrows = $derived([...laneArrows(seen, changes), ...incompleteArrows(facts)]);
  const hulls = $derived(
    debug
      ? {
          hulls: allHulls.map((h) => h.hull),
          corners: cornersOf(allHulls).map((c) => c.at),
          dots: dotsOf(surface, walk),
          signs: segmentSigns(editor.graph, seen),
          holes: holesOf(rawSurface),
        }
      : null,
  );
  /** The lane markings, derived from the graph with the derived nodes in it (^956), and the dashed lines through the lane changes (^1057). */
  const markings = $derived(
    markingsOf(seen, {
      physical,
      extra: [...laneChangeLines(seen, changes), ...gores.flatMap((w) => w.markings)],
      surface,
    }),
  );
  /** Everything painted on the road surface (^949, ^1029). */
  const marks = $derived({ markings, waitLines: waitLines(facts), arrows, physical });
  const towers = $derived(
    towersOf(seen).map((t) => ({ nodes: t, derived: t.every((n) => n.id < 0) })),
  );

  // Redraw whenever the camera or anything the editor exposes changes.
  $effect(() => {
    const drop = dropOf(editor.graph, editor.press, editor.snapped);
    const scene = {
      roads: roadsShown(editor.chains, editor.graph, editor.press, drop),
      handles: editor.handles(camera.view.scale),
      selection: chainSelection(editor.chains, editor.selection),
      band: editor.band,
      drawing: editor.drawing,
      viewing: editor.viewing,
      selectedSegments: editor.selectedSegments,
      outline: editor.hoverSegments,
      hideScaffold: scaffoldHidden({
        phase: editor.phase,
        movingGroup: editor.movingGroup,
        ctrl: editor.pointer?.ctrl === true,
        dropping: drop !== null,
      }),
      hover: editor.hover,
      mergePreview: editor.mergePreview,
      focus: editor.focus,
      pointer: editor.pointer,
      snap: editor.snapped,
      previous: editor.pointer?.ctrl ? [] : previousPlaces(editor.press),
      nearby: editor.nearbyPoints,
      dropPreview: dropPreview(editor.graph, editor.press, drop),
      pinned: chainSelection(editor.chains, editor.pins.list),
      headingFrom: headingSourceOrigins(editor),
      snapFrom: snapOrigins(editor.snapped),
      bars: bars,
      towers: towers,
      derived: derivedAll,
      surface,
      ...marks,
      hulls,
      tower: followingTower(editor.graph, editor.chains, editor.focus, editor.selection),
      turning: turningOf(editor.chains, editor.press),
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
    // Also while the view moves, so that the preview follows the pointer over the map (^277).
    const pointer = info(e);
    if (e.pointerType === 'touch' && camera.touchMove(e.pointerId, at)) return;
    if (camera.rotating) camera.moveRotate(at);
    else if (camera.panning) camera.movePan(at);
    else editor.pointerMove(pointer);
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
  onpointerleave={() => editor.look(null)}
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
