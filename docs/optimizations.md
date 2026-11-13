# The optimizations (^932 to ^941, ^1204 to ^1209 and ^1211 to ^1219, milestone ^927)

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
