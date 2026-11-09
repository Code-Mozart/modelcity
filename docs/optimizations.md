# The optimizations (^932 to ^941, milestone ^927)

An optimization (^930) is a change to the code that leads to the same behaviour, proven by tests, with better performance, or at least usually better. One hat each; the gain is **measured** with the setup of ^928 once it exists (until then: `not measured`). Status: `done`, `idea` (a guess, to be proven).

| Hat | Optimization | Status | Where | Same behaviour proven by | Measured gain |
| --- | --- | --- | --- | --- | --- |
| ^932 | Only the arrows on the screen are sampled and drawn (`samplesAlong` with `within`) | done (PR #47) | `curves/arrows.ts`, `render/scene.ts` | unit `curves/arrows.test` | not measured |
| ^933 | The curve of a segment is built once per graph and looked up (`curveOfEdge`) | done | `editor/chains.ts` | unit `curves/edgeCache.test` | not measured |
| ^934 | Nodes are looked up through an index kept per graph (`nodeOf`) | done | `model/graph.ts` | unit `model/graph.test` | not measured |
| ^935 | A bounding box leaves the segments that are far from a node out of the touch tests (`boxOf`, `near`) | done | `editor/derived.ts` | unit `editor/derived.test` | not measured |
| ^936 | Towers are found through a grid of cells instead of comparing every pair of nodes | done | `editor/towers.ts` | unit `editor/towers.test` | not measured |
| ^937 | Snap curves far from the pointer are rejected by a bounding box before the nearest point on them is computed | idea | `snap/engine.ts` | | |
| ^938 | A spatial index of the segments (a grid of boxes) for every question that asks which segments are near | idea | | | |
| ^939 | Segments completely outside the screen are not stroked | idea | `render/scene.ts` | | |
| ^940 | What only depends on the graph (derived nodes, towers, hulls) is not computed again when only the camera or the pointer moved | idea | | | |
| ^941 | Hulls and corners of a segment are cached with the curve, and only the segments that changed are computed again | idea | | | |
