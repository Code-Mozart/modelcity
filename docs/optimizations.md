# The optimizations (^932 to ^941, ^1204 to ^1209 and ^1211 to ^1214 and ^1218 to ^1223, milestone ^927)

An optimization (^930) is a change to the code that leads to the same behaviour, proven by tests, with better performance, or at least usually better. One hat each; the gain is **measured** with the setup of ^928 once it exists (until then: `not measured`). Status: `done`, `idea` (a guess, to be proven).

| Hat | Optimization | Status | Where | Same behaviour proven by | Measured gain |
| --- | --- | --- | --- | --- | --- |
| ^932 | Only the arrows on the screen are sampled and drawn (`samplesAlong` with `within`) | done (PR #47) | `curves/arrows.ts`, `render/scene.ts` | unit `curves/arrows.test` | not measured |
| ^933 | The curve of a segment is built once per graph and looked up (`curveOfEdge`) | done | `editor/chains.ts` | unit `curves/edgeCache.test` | not measured |
| ^934 | Nodes are looked up through an index kept per graph (`nodeOf`) | done | `model/graph.ts` | unit `model/graph.test` | not measured |
| ^935 | A bounding box leaves the segments that are far from a node out of the touch tests (`boxOf`, `near`) | done | `editor/derived.ts` | unit `editor/derived.test` | not measured |
| ^936 | Towers are found through a grid of cells instead of comparing every pair of nodes | done | `editor/towers.ts` | unit `editor/towers.test` | not measured |
| ^937 | Snap curves far from the pointer are rejected by a bounding box before the nearest point on them is computed | idea | `snap/engine.ts` | | |
| ^938 | A grid (`curves/grid.ts`) for every question that asks what is near: the pieces of the surface in the point-in-surface test of the dashed lines (`insideOf`), the segments for the conflicts of lanes and the touches (`curveGridOf`), the pieces of the union, the ends of the lines, the snap suggestions, the nodes | done | `curves/grid.ts`, `curves/union.ts`, `editor/derived.ts`, `editor/laneFacts.ts`, `editor/markings.ts`, `editor/violations.ts`, `snap/merge.ts` | unit `curves/insideOf.test` (the grid test says what the test against every piece says), and the existing tests of every place it is used, unchanged | dashed lines clipped to the surface on the angle ground (648 nodes): 5085 ms to 87 ms; on 3000 nodes: 3105 ms to 369 ms |
| ^939 | What is outside the screen is not drawn and not looked at: the loops of the surface, the dashed lines, the give-way lines and arrows, the towers and derived nodes | done | `render/paint.ts`, `render/markings.ts`, `render/roadMarks.ts`, `render/towerGizmo.ts`, `render/scene.ts`, `render/roadsOnScreen.ts`, `MapCanvas.svelte` | unit `render/towerGizmo.test`; the even-odd fill counts per loop, so a loop off the screen cannot change what is shown | panning a map of 12000 nodes in the browser: 434 ms to 33 ms a frame, the display's 60 FPS, the same as on the small grounds (with ^940) |
| ^940 | What only depends on the graph is not computed again when only the camera or the pointer moved: the curves of a graph with their boxes (`curvesOf`), its segments by number and node (`edgesIn`, `edgesOut`, `edgesAt`), the bounds of the content (moved, not found again, when the camera pans) | done | `editor/derived.ts`, `model/graph.ts`, `camera/bounds.ts` | unit: the whole suite, unchanged (the graphs are never changed, so a cache per graph object never goes stale); `camera/bounds.test` | with ^938, the lane facts of 3000 nodes: 34238 ms to 31 ms |
| ^941 | An edit derives again only a region of the map around what changed (the union, the lane facts, the derived nodes, the markings and the clip are kept per region); the rest is taken from the graph before the edit | in progress (PR #59) | | | |
| ^1204 | The segments of a graph are found by number and by node through an index kept per graph, not by looking at every segment (`edgeOfId`, `edgesIn`, `edgesOut`, `edgesAt`) | done | `model/graph.ts` | unit `model/graph.test` and the whole suite | part of the lane facts figure of ^940 |
| ^1205 | The conflicts of the lanes of a node look only at the segments near the node's own (`curveGridOf`, `curveNumberOf`), and the size of a tower is counted once | done | `editor/laneFacts.ts` | unit `editor/laneFacts.test`, `editor/tGroundRules.test`, `editor/angleGroundRules.test` (what the rules give on the grounds, unchanged) | lane facts, 12000 nodes: 1097 ms to 127 ms |
| ^1206 | The derived nodes ask the grids of the segments and of the nodes what touches a place, not all of them | done | `editor/derived.ts` | unit `editor/derived.test` | derived nodes, 3000 nodes: 836 ms to 36 ms |
| ^1207 | The holes of the surface: a loop is only tested against the loops whose box holds it | done | `editor/surface.ts` | unit `editor/surface.test` | the patching of the holes, 3000 nodes: 338 ms to 2 ms |
| ^1208 | Dashed and solid lines are joined and made distinct by a grid of their ends and boxes | done | `editor/markings.ts` | unit `editor/markings.test` and the grounds | markings, 12000 nodes: 2444 ms to 146 ms |
| ^1209 | The violations (touching nodes, touching segments) are looked for near each node, not among all pairs | done | `editor/violations.ts` | unit `editor/violations.test` | part of an edit of a map of 3000 nodes in the browser: 8785 ms to 917 ms (with the others) |
| ^1211 | A hole of the surface is patched or not by looking for a circle of the size of the test, and the search stops at the first place where one fits (`inscribedRadius` with `enough`); the full radius was found for every hole | done (PR #59) | `curves/area.ts`, `editor/surface.ts` | unit `editor/surface.test`, `curves/area.test` (a boolean that is the same as before) | connected map, 648 nodes: patched 5023 ms (324 nodes: 306 ms) to 24 ms |
| ^1212 | A benchmark map that is one connected network (`connectedMap`, `MAP=connected bun run bench`): the isolated cells of the tiled map hid what a real map costs (big holes, one huge loop) | done (PR #59) | `testing/samples.ts`, `scripts/bench.ts` | n/a (a benchmark) | showed ^1211 |
| ^1213 | The point-in-surface test (`insideOf`) looks at the pieces along its ray only: the grid of the pieces has thin rows (50 by 1 m, the ray runs almost along x), no set is made per question, and the test of a hole is built once, not for each place tried (`Grid.each`, `inscribedRadius`) | done (PR #59) | `curves/grid.ts`, `curves/union.ts`, `curves/area.ts` | unit `curves/insideOf.test` (the 8000 random points still agree with the test against every piece) | connected map, 3000 nodes: dashed lines clipped 2083 ms to 1021 ms, patched 137 ms to 106 ms |
| ^1214 | What the last edit computed is used again where nothing near it changed (`curves/memo.ts`): the cuts of each piece and whether each cut piece is on the boundary of the surface (`UnionMemory`), the stretches of each dashed line that fit on the surface (`clip.ts`). Results are kept by the content of their input; a result is used again if no box of what changed meets its own box (for a dashed line: its ray to the right edge of the surface too) | done (PR #59), the rest of the stages is still computed for the whole map | `curves/memo.ts`, `curves/union.ts`, `editor/surface.ts`, `editor/clip.ts` | unit `editor/incremental.test` (random edits of a connected map: the surface and the clipped lines equal those of a run without memory) | connected map, 3000 nodes, one node moved (`bun scripts/benchEdit.ts 250`): 2443 ms to about 900 ms; lines clipped 1175 ms to about 120 ms |
| ^1218 | What is made from the graph (derived nodes, hulls, surface, lane facts, markings, towers) is made for the part of the graph in a window round the view only: every chain with a segment whose curve meets the window, and the chains that meet those at a node (`editor/windowed.ts`, `editor/window.svelte.ts`); the window grows in steps, so panning a little leaves it as it is | done (PR #59); the chains, the roads of the scene, the snap suggestions, the anchors and the other things of the editor still look at the whole graph | `editor/windowed.ts`, `editor/window.svelte.ts`, `MapCanvas.svelte` | unit `editor/windowed.test` (what the part gives where the view is equals what the whole map gives, on the grounds and a connected map); `bun run identity`: 411 views, 28 differ, all by the give-way line ends below | browser, one edit of a connected map: 3000 nodes 1533 ms to 384 ms, 12000 nodes 8524 ms to 2100 ms; 96000 nodes: 44 s (not good enough: what still looks at the whole graph) |
| ^1219 | The sketch of the sample maps builds plain lists, not a new graph per node (it was quadratic: 28 s for 48000 nodes, now 31 ms) | done (PR #59) | `testing/junctionKit.ts` | data of the junction ground unchanged (same hash of the pipeline) | map generation 100x faster |
| ^1220 | The parallel S-curve lanes are looked at in groups of lanes that touch one another (found through a grid), not every lane against every other (it was quadratic, and the `find` of each lane's segment in the list too) | done (PR #59) | `editor/parallelS.ts` | unit `editor/parallelS` tests unchanged; the chains of all grounds and the connected map are the same as before, to the last digit | the edit of 96000 nodes in the browser: 44 s to 3.7 s (with ^1222) |
| ^1221 | The indexes of nodes and segments, and the chains, are made again only where an edit changed something: a graph of the same shape as one seen before (the same nodes and segments in the same places, the same ends; only some objects are new) gets the chains of the changed nodes and segments made again, and of the S-curve lanes near them (`model/changes.ts`, `editor/chainsLive.ts`, `model/graph.ts`); a few graphs of different shapes (the map, its part in the window, the graph before a drag) are kept apart | done (PR #59); an edit that adds or removes a node or segment still makes all of them (a pass of its own) | `model/changes.ts`, `model/graph.ts`, `editor/chainsLive.ts`, `editor/chainsBuild.ts` | unit `model/changes.test` (the indexes equal the lists, also going back and forth), `editor/chainsLive.test` (chains made again equal chains made from nothing on random moves, turns and radii on three grounds) | chains of the connected map of 96000 nodes after a move: 1200 ms to 15 ms |
| ^1222 | The editor works on the part of the map in the window: its chains, the hits, the handles, the roads drawn, the focus; snap suggestions come from what is near the view and from what is pinned, selected or being extended (the user, ^1216); the message of violations counts those near the view; the window stays as it is while a node is pressed | done (PR #59) | `editor/editor.svelte.ts`, `editor/window.svelte.ts`, `editor/snapping.ts`, `editor/drop.ts`, `App.svelte` | the controls matrix and the unit tests unchanged (without a window the part is all of the graph); `bun run identity` | one node moved on 96000 nodes, in the browser: 44 s to about 500 ms; panning and pointer moves 33 ms |
| ^1223 | The camera bounds are made from the convex hull of the node dots and of the curves (`camera/reducedAnchors.ts`), found chain by chain, chunk by chunk (256 m) and region by region (8 chunks), each kept while its chains are the same objects, instead of one anchor for every node and piece of the map; an arc is looked at in steps that keep its box within 2 cm | done (PR #59) | `camera/reducedAnchors.ts`, `editor/editor.svelte.ts` | unit `camera/reducedAnchors.test` (the box of the few anchors equals the box of all of them within half a pixel, at random zooms and turns, on three maps) | connected map 96000 nodes, anchors after one move: 700 ms to 55 ms (first time: 4.9 s to 1.1 s); zooming no longer looks at every node |

## What is left (measured, not yet done)

The pipeline now grows about linearly with the number of nodes, but an edit still derives everything again, so it grows with the map. Measured with `bun run bench` (node, median of three, ms) and `bun run frames` (browser, dev build):

| Map | surface (the union) | lines clipped to the surface | an edit in the browser | panning, a frame | moving the pointer |
| --- | --- | --- | --- | --- | --- |
| T ground, 358 nodes | | | 151 | 33 (60 FPS) | 33 |
| angle ground, 648 nodes | 88 | 87 | 184 | 33 (60 FPS) | 33 |
| tiled map, 3000 nodes | 299 | 369 | 767 | 33 (60 FPS) | 33 |
| tiled map, 12000 nodes | 1228 | 1403 | 3650 | 33 (60 FPS) | 33 |
| tiled map, 96000 nodes (in node only) | 10745 | 13156 | | | |

The times of a frame are for two painted frames, so 33 ms is the display's 60 FPS. Before this milestone the angle ground took 5085 ms to clip the lines alone (in node) and 600 ms for an edit in the browser, and a map of 3000 nodes 8785 ms.

**A connected network is worse than isolated cells (^1212)**, and it is the shape of a real map. `MAP=connected bun run bench` (node, ms), after ^1211 and ^1213:

| Map | surface | holes patched | lines clipped | derived nodes | lane facts |
| --- | --- | --- | --- | --- | --- |
| 648 nodes | 131 | 16 | 147 | 12 | 7 |
| 3000 nodes | 805 | 117 | 1113 | 75 | 37 |
| 12000 nodes | 4097 | 444 | 7134 | 191 | 180 |

Before ^1211 the holes alone took 5023 ms at 648 nodes. What is left grows faster than the map (the ray of the point-in-surface test is as long as the loop is wide, and a connected network has one huge loop), and only deriving by region (^941: tiles with a margin, the loops joined at the seams) takes that out: an edit then costs what it touches. The graph edits themselves (copying the arrays, ^934) are below 1% of an edit and wait until the stages are local.

**One node moved on the connected map (`bun scripts/benchEdit.ts [cells]`, node, ms, the surface and markings pipeline), before and after ^1214:**

| Map | cold | edit before | edit after |
| --- | --- | --- | --- |
| 3000 nodes | 2588 (before) / about 3000 (after) | 2443 | about 900 |
| 12000 nodes | about 12500 (before) / 15946 (after) | about 12500 | 5700 |

The give-way lines set their own square ends (^977): until now they took what the last marking line left on the canvas, so on a map with no lane markings at all they had round ends. That is the only difference to `main` in `bun run identity` (28 physical-style views of the grounds without markings): a fix, to be accepted by the user.

An edit is now about a third of a cold run and no longer grows with the lines clipped, but it still grows with the map: what is left is the bookkeeping that finds out what did not change (the keys of every piece, the grids, `withoutCovered`, the derived nodes, the lane facts), all linear in the map. A cold run got slower by the keys (about 20%). To make an edit cost what it touches, the graph edit itself must say what changed (the changed segments and nodes) so that none of those stages has to look at the rest; that is the next step, and `bun run identity` (all 411 views identical to `main`, pixel for pixel, after ^1211 to ^1214) is the check for it.

Panning and moving the pointer no longer grow with the map (^939, ^940). Ideas, in the order of what they would give: **^941** (only what changed is derived again, by a region of the map, so that an edit costs what the edit touches and not the map: the union, the lane facts and the clip are all per region), a cheaper union (the cutting of all pieces by each other is the bulk of the surface).


## Is the picture the same? (`bun run identity`)

`scripts/identity.ts` paints 411 views (the cases of the four testing grounds in the logical markings, with the debug layer and some in the physical markings, a view half a cell off each, and one of the whole ground, and a tiled map) with the base branch (`origin/main`) and with this one and compares the canvases byte for byte (`FILTER` takes some views, `SELF=1` paints the base twice: no noise, the two are identical).

What it found, and what was done:

- **Two real changes of behaviour**, both of the optimizations and both fixed: derived nodes were counted as touching nodes, and the point-in-surface test counted the crossings of the loops that hold the point only (it now also takes the box and the band of the ray with the tolerance). The test `editor/derivedOrder.test` and the 8000 random points of `curves/insideOf.test` keep them from coming back. The derived nodes, towers, bars, hulls, surface, lane facts, give-way lines, arrows and markings (logical and physical) of the junction, priority and small T grounds are now **identical to the base, to the last digit**.
- **The pictures are not pixel for pixel the same**, only because of what is not drawn off the screen (^939): the surface fill of fewer loops gives anti-aliasing that differs by one level of 255 on a few pixels in about 180 of the 411 views, and leaving out marks and lines off the screen changes the state the canvas keeps for the next one (the dash pattern), so that a dash of a give-way line starts a fraction of a pixel elsewhere in 13 views. With the surface culling switched off 13 of the 411 views differed, and with the culling of marks switched off as well the three of them that were tried were identical; a full run with all culling off was not made.

## The chunked map (PR #60, ^1249)

Measured in a real browser (headless Chromium on a 4-core container with 16 GB), on the production build, one big connected road network (`bench/chunks.spec.ts`, `bun run bench`, `NODES=100000`; rows of straight roads 40 m apart joined by S-curves at every 8th column; about 1.12 segments per node). The view is 1200 x 800 m at 1 px per meter: 48 chunks (the screen and one ring). Compare on one machine only (^930).

| | 20,000 nodes | 100,000 nodes |
|---|---|---|
| Import of the file (parse, check, write all rows) | 2.6 s | 11.7 s |
| Build of the segment index (in the worker) | 2.9 s | 15.5 s |
| Storage used by the project | 26 MB | 141 MB |
| Open a project (header, count of the index) | 0.04 s | 0.05 s (0.07 s with the count) |
| First view: all 48 chunks loaded | 2.4 s | 3.2 s |
| Read of one chunk (median) | 0.22 s | 0.29 s |
| Rows in a chunk | 97 | 99 |
| Pan at 300 m/s for 10 s: median frame | 17 ms | 17 ms |
| ... frames over 50 ms | 10 of 124 (3 s) | 50 of 299 |
| JS heap | 3.7 MB | 4.6 MB |

What was found, and done:

- **A cursor reads a row per request and was 20 times slower than a few requests that ask for parts at once.** The nodes of a chunk are now read in up to 8 parts, all at once, and the nodes and the segments of a chunk are asked at the same time (a read of a chunk went from 0.50 s to 0.29 s at 100k).
- **A dev build is much slower than the production one** in the reactivity of Svelte (a stack is captured for every read of a reactive map): the benchmarks run on the production build (`VITE_TEST_HOOK=1`, names of the functions kept).
- **The drawing of the nodes read the view through the proxy of the state of the camera for every number of every node** (0.6 s of 10 s of panning, plus 0.6 s of reads of the reactivity): a plain copy of the view, the projection worked out once, one path for all dots (the JS time of the pan went from about 2.2 s to 0.5 s).
- **The id of a project was a UUID, in the key of every record and every entry of every index: half of the storage.** New projects have 8 characters (26 MB instead of 52 MB at 20k; 141 MB instead of 261 MB at 100k). Projects that have a UUID keep it.

What is left (not within the limits yet; 300,000 nodes is not tried before this is):

- **(Done, ^1250: see below.) The nodes of a chunk were found by the strip of the index on x (or on y) that holds fewer: 2,200 rows for the 99 that are in the chunk, 22 times too many** (the strip grows with the square root of the number of nodes). Reading the rows of the chunk alone is 0.9 ms against 15 ms for the strip, and four reads at the same time are 2 ms against 49 ms: the strips are what blocks the main thread for 50 to 117 ms (the structured clone of the rows), which are the frames over 50 ms while panning.
- Import 12 s and the build of the index 16 s per 100,000 nodes (about 65 and 140 microseconds a row): about 6 to 7 minutes for 2,000,000 nodes. One request per row.
- 1.4 KB of storage per node, with its segment and the index: 2.8 GB for 2,000,000 nodes.

### Nodes found by their cell (^1250)

The nodes of a chunk are one exact lookup of their cell in a derived store (`nodecells`, built with the index of the segments), and the indexes on x and y of the nodes are gone. At 100,000 nodes, same map and machine:

| | strip of the index on x or y | cell of the node |
|---|---|---|
| Read of one chunk (median) | 288 ms | 101 ms |
| First view (48 chunks) | 3.2 s | 1.2 s |
| Pan 300 m/s: frames in 10 s | 299 | 529 |
| ... frame time, 95th percentile / worst | 117 / 133 ms | 33 / 67 ms |
| ... frames over 50 ms | 50 | 14 |
| Build of the index | 15.5 s | 28 s (twice the rows) |
| Storage | 141 MB | 160 MB (+13.5%) |
| Import | 11.7 s | 10.8 s |

### The established view (^1251)

After the chunks of the view are loaded (`bench/established.spec.ts`, 5 s each, the frame rate limit of the browser lifted, headless Chromium on the production build, no GPU: the canvas is rasterized by software), at 1 px per meter:

| | 20,000 nodes | 100,000 nodes |
|---|---|---|
| Pan 80 m back and forth: frames per second | 88 | 78 |
| ... median / 95th percentile frame | 11.3 / 13.5 ms | 11.8 / 19.8 ms |
| Zoom 15%: frames per second | 84 | 72 |
| Rotate 0.4 rad: frames per second | 26 | 34 |
| ... median frame | 24.5 ms | 25 ms |
| Rows in view (nodes and segments) | 4,725 | 4,805 |

The same at both sizes, within what the machine varies: the established view does not depend on the size of the map. The profile of a pan: the main thread is in the browser's own code (the rasterization) for 4.3 s of 5 s, JavaScript is about 0.6 s (about 1 ms a frame). Rotating costs about twice: the box of the view that is round the turned screen is larger than the screen, so more chunks are asked for (in the test 9 to 24 more reads, which are the frames over 50 ms) and more curves are drawn than are on the screen.

Culling by the turned screen instead of the box round it (`overlapsView`): chunks to ask for, chunks to show and curves to draw are those that the screen as it is turned touches. Rotating at 100,000 nodes: 34 to 36 frames per second, median frame 25 to 23.7 ms, 9 to 5 new chunk reads, 7,106 to 6,630 rows loaded. Less than expected (I expected about half the cost): rotating is slow in this browser because of the software rasterization of lines that are not along the pixel rows and columns, not because of what is drawn off the screen. The test for it is `src/lib/map/chunks.test.ts`.

### Where the time of the import goes, and what was done (^1253)

Measured in a browser profile on disk (the earlier tables were measured on a profile in memory: the storage is not compressed there, 160 MB for 100,000 nodes against 40 MB on disk, and the writes are faster).

Writing 100,000 small rows to IndexedDB, headless Chromium, profile on disk (`/tmp` probe, not kept):

| One transaction, a put for each row, key and value as stored | 6.3 s |
| The same with two indexes on the store | 10.1 s |
| Durability `relaxed` | 8.1 s |
| Two stores written at the same time | 7.5 s |
| Ten transactions at the same time on one store | 8.3 s |
| A key that is a number and a value that is a number | 6.3 s |
| **Blocks of 100 rows, a put for each block** | **0.3 s** |

So a put costs about 65 microseconds whatever it is given, and only the number of puts counts. Reads: 20,000 rows by 20,000 `get`s 817 ms, by one `getAll` of the range 131 ms, `getAllKeys` 78 ms; the count of a store of 100,000 rows 171 ms (a count scans).

100,000 nodes, 112,000 segments (`bench/report.spec.ts`, headless, no GPU), before and after reading in ranges and the mark that the index is complete:

| | before | after |
|---|---|---|
| Import (212,000 puts: at the floor) | 18.1 s | 17.2 s |
| Build of the index (212,000 records and their reads) | 47.9 s | 31.1 s |
| Open: the check of the index | 1,826 ms | 83 ms |
| First view | 3.8 s | 1.5 s |
| Read of one chunk (median) | 179 ms | 129 ms |

What is left is the number of puts: 4,250,000 rows (2,000,000 nodes, 2,250,000 segments) for the import and as many records for the index. Blocks of rows (^1254) are the only thing that changes that.

### Streaming import and the log of the benchmark (^1256)

The import used to hold the whole file at once: its text, the parsed object, the checked copy, and one transaction with every row. At 800,000 nodes that is hundreds of megabytes (and the benchmark made the whole text in a string, which cannot be longer than about 512 MB: 2,000,000 nodes do not fit). Now `project/jsonRows.ts` reads the text in pieces of about 1 MB and gives the rows of `nodes` and `edges` in batches of 5,000, `project/streamImport.ts` checks each row and writes the batch (`ProjectStorage.append`) and creates the project (`create`, which gives it its header, so it appears in the list) when all is read and checked. In memory at any time: one piece, one batch, the set of node ids (for the checks of the segments' ends) and the ends of the segments as numbers, never the rows. A file that is refused is removed again (`remove`). The checks and their hats are those of `readProject` (^229); the ones that need the whole map (^204 to ^207) are made at the end. Measured (100,000 nodes, headless): the JS heap stays at 5 to 12 MB while importing (it was the size of the file several times), the time is the same (15 s: the puts are the floor, ^1253).

Left to do: a project whose import is stopped by closing the tab leaves rows without a header in the browser (they are not listed); cleaning those up is not built.

The benchmark makes its map in pieces, too (`bench/makeMap.ts`), and writes a log line by line to `bench/out/progress-*.log`: what it is doing, and every 5 seconds what the page says (rows imported, index progress, chunks, JS heap), errors and crashes of the page, and a line when the page does not answer. A run that hangs shows where in that file.

### Rows in blocks of ids: tried, measured, reverted (^1254)

Nodes and segments in records of 128 ids (key: the id divided by 128) make the import 5 to 8 times faster **when the ids follow the map** (the generated map of the benchmark: rows of nodes in order): 1.8 s for 100,000 nodes. A map drawn by hand has ids in the order of drawing, which say nothing of the places. `SCRAMBLE=1 bun run bench` spreads the ids over the map; the same 100,000 nodes, headless, profile on disk:

| | one record for each row (kept) | blocks of 128 ids |
|---|---|---|
| Import | 16 s | 39.7 s |
| Build of the index | 31 s | 22.9 s |
| Storage used | 58.7 MB | 64.9 MB |
| First view | 1.15 s | 1.89 s |
| Read of one chunk (median, 12 reads at a time) | 299 ms | 499 ms |
| Pan along a row, chunks loading | 89 fps | 77 fps |

The nodes and segments of a chunk lie in many blocks when the ids are spread, so each read gets many blocks, and each block of the import is read and written again by every batch. Reverted; the priority is operation speed and render speed over the time of the index (^1254). Reads of a chunk at 12 at a time show about three times the time of 4 at a time (the storage serves them one after the other); the first view takes the same.

### Selection (^1257)

`bun run bench:selection` (seeded, repeatable, `bench/selection.ts`) measures the work that the pointer and a frame ask for, on the rows that a view holds; `bun run bench` has a part with every loaded node selected. 2026-11-18, linux x64 in a container, no GPU:

| | 5,000 nodes in view | 20,000 | 80,000 |
|---|---|---|---|
| Pick at the pointer (node and segment), ms | < 0.01 | < 0.01 | < 0.01 |
| of which the segment, ms | 0.04 | 0.07 | 0.15 |
| Box over the whole screen (turned), ms | 0.56 | 1.55 | 4.98 |

A selection of 1,000, 20,000 or 100,000 nodes: the marks of a frame (which of the nodes in view are selected) 1.6 to 2.5 ms for 20,000 nodes in view; the pins 0.3 to 6.8 ms; a history step 0.03 to 0.24 ms; 200 steps of 1,000 nodes in the history: the panel 19 ms (once for each step, not for each frame).

Frames at 100,000 nodes (headless, software drawing), 3,549 nodes in view selected: pan 91 fps without a selection, 27 with the first way of drawing it (a stroked ring on each node, thick curves over the skeleton), 34 with the second (a filled halo under each dot, the thick curves under the skeleton); zoom 75, 28, 36; rotate 45, 25, 29. The profile of a frame says that 80% of the time is the browser drawing (`(program)`), the JavaScript of the selection is below 2%: the cost is in the pixels of the highlight. On a machine with a GPU the drawing is not the limit (the 100,000-node run on an M1 laptop showed 700 to 1,000 fps without a selection, ^1253).

Checked against looking at everything (`map/hit.property.test`): the nearest node and the nearest segment equal what a search of all nodes and segments finds, with a reach larger than a chunk, and the nodes in a box equal the nodes whose screen position is in it, with the view turned and at any scale.


### Draw mode and move (^1263, ^1265)

The chunks in memory are patched from what was written instead of being read again (^1262): the node just placed is there for the next click without a read. Headless at 100,000 nodes (2026-11-20, the same machine and run for both), the commit before draw mode against the one after move: established pan 77 / 76 fps, zoom 73 / 71, rotate 40 / 37, pan with the loaded nodes selected 28 / 27: the same within what the machine varies (this machine was slower that day than in the selection round above). The benchmark does not hover: the control points and the scaffold are made from the rows near the pointer when it moves, and the scaffold again at each frame of the camera while the pointer is over the map.
