# The optimizations (^932 to ^941 and ^1204 to ^1209, milestone ^927)

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
| ^939 | What is outside the screen is not drawn and not looked at: the loops of the surface, the dashed lines, the give-way lines and arrows, the towers and derived nodes | done (the roads and their handles are not yet) | `render/paint.ts`, `render/markings.ts`, `render/roadMarks.ts`, `render/towerGizmo.ts` | unit `render/towerGizmo.test`; the even-odd fill counts per loop, so a loop off the screen cannot change what is shown | panning a map of 12000 nodes in the browser: 434 ms to 133 ms a frame (with ^940) |
| ^940 | What only depends on the graph is not computed again when only the camera or the pointer moved: the curves of a graph with their boxes (`curvesOf`), its segments by number and node (`edgesIn`, `edgesOut`, `edgesAt`), the bounds of the content (moved, not found again, when the camera pans) | done | `editor/derived.ts`, `model/graph.ts`, `camera/bounds.ts` | unit: the whole suite, unchanged (the graphs are never changed, so a cache per graph object never goes stale); `camera/bounds.test` | with ^938, the lane facts of 3000 nodes: 34238 ms to 31 ms |
| ^941 | Hulls and corners of a segment are cached with the curve, and only the segments that changed are computed again | idea | | | |
| ^1204 | The segments of a graph are found by number and by node through an index kept per graph, not by looking at every segment (`edgeOfId`, `edgesIn`, `edgesOut`, `edgesAt`) | done | `model/graph.ts` | unit `model/graph.test` and the whole suite | part of the lane facts figure of ^940 |
| ^1205 | The conflicts of the lanes of a node look only at the segments near the node's own (`curveGridOf`, `curveNumberOf`), and the size of a tower is counted once | done | `editor/laneFacts.ts` | unit `editor/laneFacts.test`, `editor/tGroundRules.test`, `editor/angleGroundRules.test` (what the rules give on the grounds, unchanged) | lane facts, 12000 nodes: 1097 ms to 127 ms |
| ^1206 | The derived nodes ask the grids of the segments and of the nodes what touches a place, not all of them | done | `editor/derived.ts` | unit `editor/derived.test` | derived nodes, 3000 nodes: 836 ms to 36 ms |
| ^1207 | The holes of the surface: a loop is only tested against the loops whose box holds it | done | `editor/surface.ts` | unit `editor/surface.test` | the patching of the holes, 3000 nodes: 338 ms to 2 ms |
| ^1208 | Dashed and solid lines are joined and made distinct by a grid of their ends and boxes | done | `editor/markings.ts` | unit `editor/markings.test` and the grounds | markings, 12000 nodes: 2444 ms to 146 ms |
| ^1209 | The violations (touching nodes, touching segments) are looked for near each node, not among all pairs | done | `editor/violations.ts` | unit `editor/violations.test` | part of an edit of a map of 3000 nodes in the browser: 8785 ms to 917 ms (with the others) |

## What is left (measured, not yet done)

The pipeline now grows about linearly with the number of nodes, but an edit still derives everything again, so it grows with the map. Measured with `bun run bench` (node, median of three, ms) and `bun run frames` (browser, dev build):

| Map | surface (the union) | lines clipped to the surface | an edit in the browser | panning, a frame | moving the pointer |
| --- | --- | --- | --- | --- | --- |
| T ground, 358 nodes | | | 150 | 33 (60 FPS) | 33 |
| angle ground, 648 nodes | 88 | 87 | 217 | 33 (60 FPS) | 33 |
| tiled map, 3000 nodes | 299 | 369 | 935 | 49 | 33 |
| tiled map, 12000 nodes | 1228 | 1403 | 4217 | 134 | 33 |
| tiled map, 96000 nodes (in node only) | 10745 | 13156 | | | |

The times of a frame are for two painted frames, so 33 ms is the display's 60 FPS. Before this milestone the angle ground took 5085 ms to clip the lines alone (in node) and 600 ms for an edit in the browser, and a map of 3000 nodes 8785 ms.

Ideas, in the order of what they would give: **^941** (only what changed is derived again, by a region of the map, so that an edit costs what the edit touches and not the map: the union, the lane facts and the clip are all per region), the roads, handles and nodes of the scene off the screen not built each frame (^939, the rest of it: the camera pan still grows with the map), and a cheaper union (the cutting of all pieces by each other is the bulk of the surface).

