# The runtime data (^1235)

What the app holds in memory, operation by operation. Since ^1232 (the tabula rasa) this is all there is; every other piece of data is added here when the operation that needs it is built, with when it is calculated and what can change it.

## The clone of what is persisted

- `Editor.graph` (`src/lib/editor/editor.svelte.ts`): the map of the open project, an immutable `Graph`. **Empty** for now: opening a project reads no part of its map (^1236). It is to be the in-memory clone of the stored rows that are in view, behind the storage only by the autosave delay.
- `ProjectSession` (`src/lib/project/session.svelte.ts`): the stored `header` of the open project (lane configurations and id counters are kept as stored), the header fields (`title`, `createdAt`, `lastUpdatedAt`), `id`, `saved` (the graph at the last save request, to see whether there is a change), `stored` (the map as the storage has it, to write only the rows that changed), `savedCamera`, and the timers: a change is written 0.4 s after the last change (`AUTOSAVE_MS`) and at the latest 5 s after the oldest unsaved one (`AUTOSAVE_MAX_WAIT_MS`); the camera 1 s after it rests (`CAMERA_SAVE_MS`); the page flushes on leaving.
- `nodeOf` and `edgeIndex` in `src/lib/model/graph.ts`: an index by id (and by node for segments), made once per graph object in a `WeakMap`. The only derived data left; to be replaced when the data of the map is designed.

## State of the interface (not derived from the map)

- `Camera` (`camera/camera.svelte.ts`): the view (centre, scale, rotation, grid centre), the size of the canvas, the cursor, panning, rotating, the pressed compass chip, the recent-zoom flag of the scale bar, the touches of a two-finger gesture.
- The projects list (headers only), the modal (open, row mode, rename draft, hover), the toasts, the version banner.

## Drawing (^1263)

- `Editor.draw` (`editor/editor.svelte.ts`): the road being drawn, its node (`active`), which way (`end`) and where it started (`origin`); a step of the history holds it before and after.
- `Editor.draft`: what the press of the left button would change, as a `RowChange`, worked out on the loaded rows at each move and drawn over the map (`edit/draftView.ts`: its curves and nodes, and the ids of the loaded rows it hides); gone when the press is written or cancelled.
- The preview (`editor/drawGhost.ts`): made from the node drawn from, the pointer and what is under it, at each frame it is needed; kept nowhere.
- `Editor.splitUndo`: the node a split on a curve inserted with its change, so that finishing at once gives the curve back (^237); gone with the next step, undo or redo.
- The id counters are the header's (`ProjectSession.header`), raised with every change written (`withIdsOf`).

## Moving (^1265)

- What is under the pointer: the control points near it are made from the loaded rows at each pointer move (`editor/handles.ts`, within 48 px), kept nowhere.
- `MovePress` (`editor/movePress.ts`): what the left button holds, the nodes that move with it, where it would merge; the draft of the drag is `Editor.draft`, `Editor.drag` says what is held for the hints.
- The scaffold (`editor/scaffold.ts`, `render/scaffoldOf.ts`): which segments show it and their guides, made from the pointer and the loaded rows when either changes (also at each frame of the camera while the pointer is over the map); kept nowhere.

## The surface (^1267)

- Nothing is kept: at each frame the curves in view (kept per row, `curveOf`) are stroked as two paths per road width (`render/surface.ts`); the widths come from the lane configurations of the header (`ProjectSession.laneWidth`).
- What the canvas draws is derived part by part in `render/mapView.svelte.ts` (`MapView`): the chunks in view, their segments, the draft, the marks, the preview, the scaffold and the surface.

## The segment index (^1239, ^1248)

- Stored in IndexedDB with the project (`segments`, one record per segment); derived from the nodes and segments, rebuildable (`Ctrl+Comma`). `IndexBuild` (`map/indexBuild.svelte.ts`): `status` (none, building, ready, stopped, failed), `project`, `done` and `total`, `error`; the build runs in a worker. The map is shown only when the status is ready.

## Chunks (^1231, ^1238)

- `MapMemory` (`map/mapMemory.svelte.ts`): `chunks`, one reactive state per chunk asked for: loading (with its progress, real: rows read of rows there are) or ready (the chunk: its node and segment rows as stored), `tooMuch`, `project`. Asked for from the camera: the view and one ring. Chunks are read one at a time each, 4 at the same time, the one nearest the middle of the view first; a read of a chunk that left the view is stopped. Over a budget of rows (`ROW_BUDGET`, 500,000, provisional) chunks are let go (^1246): not asked for now, not pinned, the one asked for longest ago first, then the farthest from the view, down to 80%. `MapMemory.edited` (^1260) takes the rows of an edit that are gone out of the chunks at once and reads the chunks it touches again, each in place (never shown as loading). `ChunkIndex.edgesAt` gives the loaded segments at a node (^1258). The chunks of selected nodes are pinned (`editor/pins.ts`): they are asked for and never let go (^1257); if the pinned chunks alone are over the budget, `onSqueezed` clears the selection.
- `ChunkLoader` (`map/chunkLoader.ts`): reads one chunk (its nodes, the segments of those, the nodes at their far ends); keeps nothing.
- After an edit the loaded chunks it touches are patched from what was written (`map/chunkPatch.ts`, ^1262); one that is loading, being read again, or that needs a far end the change does not know is read again.
- `ChunkIndex` (`map/chunkIndex.ts`, as `MapMemory.index`): the rows of the loaded chunks by id, shared (one row for a segment that two chunks know, counted, let go with the last chunk that has it).
- `curveOf` (`render/skeleton.ts`): the curve and box of a segment, kept per row (`WeakMap`); `progress` of each chunk that is loading is apart from `chunks`.
- Drawn from it, so far: the curves of the segments with chevrons, the node dots, and the placeholder of a chunk that is not loaded.

## Not there any more (^1232)

Chains, derived nodes, towers, hulls, corners, lane facts, markings, the road surface and its memories, the window and the incremental structures, the camera bounds, snapping, hover and hit testing, selection, the history, every pointer operation. `docs/features.md` and `docs/controls.md` describe the old app: they are the list of what is to be built again.
