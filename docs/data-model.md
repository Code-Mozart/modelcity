# The stored data model (^161)

Status: **approved by the user.** This file is the single source for the stored format; the reasons are in the hats ^170 (the graph, the conventions) and ^172 (no shape tag). **Every change to the stored model needs both of us to agree**, a version bump and a migration (^173).

## Stored and derived

The stored model is a **directed graph with radii and headings**. What is stored: the project (title, dates, version), the camera, the nodes, the edges and the lane configurations. Everything else is derived at runtime and never stored: the shape of an edge (bend, S-curve, hook), curve pieces, caches, the road surface, junction kinds, branches, roads and arms, parallel segments, the road being drawn, the selection, the undo history, hover and pointer state.

## One project (JSON)

```json
{
  "version": 2,
  "title": "modelcity demo map",
  "createdAt": "2026-10-31T06:00:00Z",
  "lastUpdatedAt": "2026-10-31T06:01:00Z",
  "camera": { "x": 0, "y": 0, "scale": 4.0, "rotation": 0.0 },
  "nodes": [
    [0, 100000, 0, 0.0],
    [1, 300000, 50000, 2.3]
  ],
  "edges": [[0, 0, 1, null, 1]],
  "laneConfigurations": { "1": { "name": "default", "width": 3000 } },
  "nextNodeId": 2,
  "nextEdgeId": 1
}
```

An export file is exactly one such project object (^163, ^164). The browser keeps the same data in another layout (^1228, below); the file format is not the storage layout.

## The browser storage: IndexedDB (^1228)

The persisted data has **no chunks** and no other spatial structure of its own: only records and the indexes of the database. Database `modelcity`, version 2:

- `projects`, key `id`: `{ id, header }`, the header being the project without `nodes` and `edges` (title, dates, version, camera, lane configurations, the two id counters). The list of projects reads only these.
- `nodes`, key `[project, id]`: one record `{ p, id, x, y, th }` per node (millimeters). Indexes: `[project, x]` and `[project, y]`, so that the nodes in a range of x or of y are read without the others; the side with the smaller span is the one to range on, the other is filtered by the reader.
- `edges`, key `[project, id]`: `{ p, id, start, end, radius, lane }`. Indexes: `[project, start]` and `[project, end]`: the segments of a node.
- An edit writes the header and the rows that changed (found by id), not the project.
- Records of the first layout, `{ id, file }` (the whole file in one record), are still read; they are written in this layout when the project is saved. A damaged file (rows that are not rows) stays in one record, so that it is refused when it is opened (^229).
- The nodes and segments of a project come back in the order of their ids.

## Conventions

- **Lengths are integer millimeters**: node positions, radius, lane width and the camera position. The editor works in float meters (^4) and rounds to the millimeter when it commits a change, so a saved and loaded project is identical.
- **Angles are radians.** A heading of 0 points east (+x); positive turns clockwise on the screen (y is down), so 1.5708 points south. A heading is the direction of travel.
- **Camera:** `x`, `y` is the world point at the center of the viewport; `scale` is pixels per meter (float); `rotation` is the rotation of the world about that center, positive clockwise on the screen, and 0 has north (-y) at the top (as `View` in `src/lib/camera/view.ts`, whose field is called `rot`).
- **Dates** are ISO 8601 UTC strings; `version` is an integer.
- **Ids** are integers and may have gaps (removing leaves a hole; the id is a key, not the list index). A new node or edge takes `nextNodeId` or `nextEdgeId` and the counter goes up by 1, so an id is never reused (^1224). Each counter is above every id of its kind.
- **Version 2** (^1224) added the two counters. Migration 1 to 2: the largest id of the kind + 1 (0 if none).

## Nodes: `[id, x, y, heading]` (a list of rows, ids may have gaps)

One heading per node. A node is shared by all edges that meet there.

## Edges: `[id, startNodeId, endNodeId, radius, laneConfigurationId]` (a list of rows, ids may have gaps)

- The edge runs from the start to the end node; that is its direction of travel.
- `radius` is an integer in millimeters, or `null` for automatic (the largest that fits, ^8). It is the only nullable element. The minimum is half the width of the lane configuration, 1.5 m for the default lane (^942, which replaces the 0.5 m of ^57). Only this constraint changed, not the structure of the file: a project that stores a smaller radius is neither refused nor repaired, it loads as it is and the editor draws it with the minimum (^942).
- There is no shape tag: the shape is derived from the two positions, the two headings and the radius (^172).

## Lane configurations: `{ "<id>": { "name": string, "width": mm } }` (keyed by id)

A named set of lane properties that edges refer to. Today only `name` and `width` (the default is 3000, ^90).
