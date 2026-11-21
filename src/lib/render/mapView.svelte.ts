import { SvelteMap } from 'svelte/reactivity';
import type { Camera } from '../camera/camera.svelte';
import { screenToWorld, type Point } from '../camera/view';
import { draftViewOf, edgesWithDraft } from '../edit/draftView';
import { branchOf } from '../editor/branchOf';
import { ghostOf, type GhostTarget } from '../editor/drawGhost';
import type { Editor } from '../editor/editor.svelte';
import type { Hover } from '../editor/pick';
import { shownSegments } from '../editor/scaffold';
import { boxOfId, countOf, idsWhere } from '../map/chunks';
import { curveOf, type SkeletonEdge } from '../map/curve';
import { chunksInView, overlapsView } from '../map/inView';
import { MAX_CHUNKS, type MapMemory } from '../map/mapMemory.svelte';
import { networkOf } from '../map/network';
import type { EdgeRow } from '../project/storage';
import type { ChunkView, MapScene } from './mapLayer';
import { marksOf, withTip } from './marksOf';
import { NO_SCAFFOLD } from './scaffold';
import { scaffoldOf } from './scaffoldOf';
import { DerivedMemory } from '../derive/derivedMemory';

/** What the view needs besides the camera, the chunks and the editor. */
export interface MapViewDeps {
  camera: Camera;
  memory: MapMemory;
  editor: Editor;
  /** The width (meters) of the road of a lane configuration (^945). */
  laneWidth: (lane: number) => number;
  /** What is under the pointer for the preview of draw mode (`DrawPress.ghostTarget`). */
  ghostTarget: (pointer: Point, hover: Hover | null) => GhostTarget | null;
}

/**
 * What the canvas draws (^1247), made from the camera, the loaded chunks and the state of the editor,
 * each part derived on its own so that it is made again only when what it depends on changes: the
 * chunks in view, their segments, the this.draft of an operation over them (^1263), the marks of the
 * selection and the hover (^1257), the preview of draw mode, the scaffold (^60) and the surface (^945).
 */
export class MapView {
  /** Where the pointer is on the screen, for the preview of draw mode and the scaffold. */
  pointer = $state<Point | null>(null);

  constructor(private deps: MapViewDeps) {}

  private derivedMemory = new DerivedMemory();
  /** The derived nodes of the chunks in view (^821, ^1268), kept per chunk; none in view mode. */
  derived = $derived.by(() => {
    const { memory, editor } = this.deps;
    if (editor.mode === 'view') return [];
    return (this.seen ?? []).flatMap((id) => this.derivedMemory.of(id, memory.chunks) ?? []);
  });

  /** The chunks the screen touches as it is turned (not all of the box round it), or null when that is more than can be shown. */
  seen = $derived.by(() => {
    const range = chunksInView(this.deps.camera.view, this.deps.camera.size);
    if (countOf(range) > 4 * MAX_CHUNKS) return null;
    const ids = idsWhere(range, overlapsView(this.deps.camera.view, this.deps.camera.size));
    return ids.length > MAX_CHUNKS ? null : ids;
  });

  /** Those chunks, with their nodes or as not loaded, and how far those are. */
  chunkViews = $derived.by(() =>
    (this.seen ?? []).map((id): ChunkView => {
      const state = this.deps.memory.chunks.get(id);
      return {
        box: boxOfId(id),
        nodes: state?.status === 'ready' ? state.chunk.nodes : null,
        progress: this.deps.memory.progress.get(id) ?? 0,
      };
    }),
  );

  /** The segments of the chunks that are loaded, each once; what the progress of a chunk does is not looked at here. */
  found = $derived.by(() => {
    const out = new SvelteMap<number, { row: EdgeRow; edge: SkeletonEdge }>();
    for (const id of this.seen ?? []) {
      const state = this.deps.memory.chunks.get(id);
      if (state?.status !== 'ready') continue;
      for (const row of state.chunk.edges) {
        const [p, q] = [
          this.deps.memory.index.nodeOf(row[1]),
          this.deps.memory.index.nodeOf(row[2]),
        ];
        if (p && q && !out.has(row[0])) out.set(row[0], { row, edge: curveOf(row, p, q) });
      }
    }
    return out;
  });
  /** What an operation in progress would change, drawn over the map (^1262). */
  draft = $derived.by(() => {
    void this.found;
    return draftViewOf(this.deps.editor.draft, this.deps.memory.index.nodeOf);
  });
  edges = $derived.by(() => [
    ...[...this.found.values()]
      .filter((f) => !this.draft.hiddenEdges.has(f.row[0]))
      .map((f) => f.edge),
    ...this.draft.edges,
  ]);
  /** The node the road being drawn goes on from (^65): marked like a selected node, as on `main`. */
  tip = $derived.by(() => {
    void this.found;
    const id = this.deps.editor.draw.active;
    return id === null ? undefined : this.deps.memory.index.nodeOf(id);
  });
  ghost = $derived.by(() => {
    if (this.deps.editor.mode !== 'draw' || !this.pointer || this.deps.editor.draft) return null;
    const target = this.deps.ghostTarget(this.pointer, this.deps.editor.hover);
    return target ? ghostOf(this.deps.editor.draw, this.tip, target) : null;
  });

  /** The branch under the this.pointer while `Alt` is held: not worked out again at every frame of the camera, only when the this.pointer, `Alt` or what is loaded changes. */
  hoverBranch = $derived.by(() =>
    this.deps.editor.alt && this.deps.editor.hover
      ? branchOf(networkOf(this.deps.memory.loaded()), this.deps.editor.hover)
      : null,
  );

  /** The chunks as they are drawn: without the nodes the this.draft moves or takes away (^1265). */
  shownChunks = $derived.by(() =>
    this.draft.hiddenNodes.size
      ? this.chunkViews.map((c) =>
          c.nodes ? { ...c, nodes: c.nodes.filter((n) => !this.draft.hiddenNodes.has(n[0])) } : c,
        )
      : this.chunkViews,
  );
  /** A node as it is drawn: as the this.draft has it, else as it is loaded. */
  rowOfNode = (id: number) =>
    this.draft.nodes.find((n) => n[0] === id) ?? this.deps.memory.index.nodeOf(id);
  shownEdges = $derived.by(() => edgesWithDraft(this.found, this.draft, this.deps.editor.draft));

  marks = $derived.by(() =>
    withTip(
      marksOf(
        {
          selection: this.deps.editor.selection,
          hover: this.deps.editor.hover,
          band: this.deps.editor.band,
          branch: this.hoverBranch,
        },
        {
          nodes: [...this.shownChunks.flatMap((c) => (c.nodes ? [c.nodes] : [])), this.draft.nodes],
          edges: this.shownEdges,
        },
        this.deps.memory.index.nodeOf,
      ),
      this.tip,
    ),
  );

  /** The road surface: every segment in view with the width of its road (^945). */
  surface = $derived.by(() =>
    [...this.shownEdges.values()].map(({ row, edge }) => ({
      edge,
      width: this.deps.laneWidth(row[4]),
    })),
  );

  /** The nodes in view with no segment: their heading arrows always show (^60). */
  lone = $derived.by(() => {
    void this.found;
    return this.shownChunks.flatMap((c) =>
      (c.nodes ?? []).filter((n) => this.deps.memory.index.edgesAt(n[0]).length === 0),
    );
  });
  /** The this.scaffold that is shown (^60, ^66): none in view mode, in extend mode, and while several nodes are moved (^78). */
  scaffold = $derived.by(() => {
    const drag = this.deps.editor.drag;
    if (
      this.deps.editor.phase === 'view' ||
      this.deps.editor.phase === 'extend' ||
      (drag && drag.group > 0)
    )
      return NO_SCAFFOLD;
    const hovered =
      this.deps.editor.hover?.kind === 'handle' ? this.deps.editor.hover.handle : null;
    const focus = drag?.grip ?? hovered;
    const at =
      this.pointer && screenToWorld(this.deps.camera.view, this.deps.camera.size, this.pointer);
    const map = { ...this.deps.memory.loaded(), nodeOf: this.rowOfNode };
    const shown = shownSegments({
      map,
      pt: at,
      scale: this.deps.camera.view.scale,
      focus,
      selected: this.marks.selectedEdges.map((e) => e.id),
    });
    const rows = shown
      .map((id) => this.shownEdges.get(id)?.row)
      .filter((r): r is EdgeRow => r !== undefined);
    return scaffoldOf(rows, this.lone, this.rowOfNode, {
      scale: this.deps.camera.view.scale,
      focus,
    });
  });

  scene = $derived.by<MapScene>(() => ({
    chunks: this.shownChunks,
    edges: this.edges,
    marks: this.marks,
    tooMuch: this.seen === null || this.deps.memory.tooMuch,
    draftNodes: this.draft.nodes,
    ghost: this.ghost,
    scaffold: this.scaffold,
    surface: this.surface,
    viewing: this.deps.editor.mode === 'view',
    derived: this.derived,
  }));
}
