# The runtime data (^1235)

What the app holds in memory, operation by operation. Since ^1232 (the tabula rasa) this is all there is; every other piece of data is added here when the operation that needs it is built, with when it is calculated and what can change it.

## The clone of what is persisted

- `Editor.graph` (`src/lib/editor/editor.svelte.ts`): the map of the open project, an immutable `Graph`. **Empty** for now: opening a project reads no part of its map (^1236). It is to be the in-memory clone of the stored rows that are in view, behind the storage only by the autosave delay.
- `ProjectSession` (`src/lib/project/session.svelte.ts`): the stored `header` of the open project (lane configurations and id counters are kept as stored), the header fields (`title`, `createdAt`, `lastUpdatedAt`), `id`, `saved` (the graph at the last save request, to see whether there is a change), `stored` (the map as the storage has it, to write only the rows that changed), `savedCamera`, and the timers: a change is written 0.4 s after the last change (`AUTOSAVE_MS`) and at the latest 5 s after the oldest unsaved one (`AUTOSAVE_MAX_WAIT_MS`); the camera 1 s after it rests (`CAMERA_SAVE_MS`); the page flushes on leaving.
- `nodeOf` and `edgeIndex` in `src/lib/model/graph.ts`: an index by id (and by node for segments), made once per graph object in a `WeakMap`. The only derived data left; to be replaced when the data of the map is designed.

## State of the interface (not derived from the map)

- `Camera` (`camera/camera.svelte.ts`): the view (centre, scale, rotation, grid centre), the size of the canvas, the cursor, panning, rotating, the pressed compass chip, the recent-zoom flag of the scale bar, the touches of a two-finger gesture.
- The projects list (headers only), the modal (open, row mode, rename draft, hover), the toasts, the version banner.

## Chunks (^1231, ^1238)

- `MapMemory` (`map/mapMemory.svelte.ts`): `ready` (the loaded chunks of the open project, by id: their node and segment rows as stored), `loading` (the chunks asked for that are on their way), `tooMuch`, `project`. Chunks are asked for from the camera: the view and one ring. Nothing is let go yet (eviction is not built).
- `ChunkLoader` (`map/chunkLoader.ts`): the chunks it has read, the nodes by id (also the far ends of segments), the chunks it is reading.
- Drawn from it, so far: the node dots, and the placeholder of a chunk that is not loaded.

## Not there any more (^1232)

Chains, derived nodes, towers, hulls, corners, lane facts, markings, the road surface and its memories, the window and the incremental structures, the camera bounds, snapping, hover and hit testing, selection, the history, every pointer operation. `docs/features.md` and `docs/controls.md` describe the old app: they are the list of what is to be built again.
