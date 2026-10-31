# The stored data model (draft, ^161)

Status: **ready for the user's final review**. Once the user has approved it, the stored model is fixed: **every change to it needs both of us to agree** (user and Claude), and comes with a version bump and a migration (see the end). Hats: ^106 (normalized model), ^92 (replaced by the graph, see below), ^26 (lane configuration), ^82 and ^148 (persistence).

## 1. What is stored and what is derived

The stored model is a **directed graph with radii and headings**. Nothing else is stored.

- **Stored:** the project (title, dates, version), the camera, the nodes, the edges, the lane configurations.
- **Derived at runtime, never stored:** the shape of an edge (bend, S-curve, hook), curve pieces and geometry (`EdgeRef`), caches, the road surface, junction kinds, branches, roads and arms (^130), parallel segments (^100), the road being drawn, the selection, the undo history, hover and pointer state.

## 2. One project (JSON)

```json
{
  "version": 1,
  "title": "modelcity demo map",
  "createdAt": "2026-10-31T06:00:00Z",
  "lastUpdatedAt": "2026-10-31T06:01:00Z",
  "camera": { "x": 0, "y": 0, "scale": 4.0, "rot": 0.0 },
  "nodes": [
    [0, 100000, 0, 0.0],
    [1, 300000, 50000, 2.3]
  ],
  "edges": [[0, 0, 1, null, 1]],
  "laneConfigurations": { "1": { "name": "default", "width": 3000 } }
}
```

An **export file** is exactly one such project object. The browser keeps one stored record per project in the same format (see section 5).

### Conventions (one place, no conversions)

- **Lengths are integer millimeters**: node positions, radius, lane width, camera position, and the position of a frozen S-curve middle line. The editor works in float meters (^4) and rounds to the millimeter when it commits a change, so a saved and loaded project is identical.
- **World:** meters in the editor, origin at the map center, x right, y down (^4).
- **Headings and angles:** radians. A heading of 0 points east (+x); positive turns clockwise on the screen (y is down), so 1.5708 points south. Headings are the direction of travel.
- **Camera:** `x`, `y` is the world point at the center of the viewport (mm), `scale` is **pixels per meter** (float, as `View.scale`), `rot` is the rotation of the world about that center in radians, positive clockwise on the screen; `rot` 0 has north (-y) at the top (`src/lib/view.ts`).
- **Dates:** ISO 8601 UTC strings. `version`: an integer.
- **Ids:** integers. A new id is the largest id of its kind in the project plus 1 (no counters are stored).

### Nodes: `[id, x, y, heading]` (densely packed)

One heading per node. A node is shared by all edges that meet there; sharing is the graph itself (no more coincidence by position, ^92).

### Edges: `[id, startNodeId, endNodeId, radius, laneConfigurationId]` (densely packed)

- The edge runs from start to end; that is its direction of travel (the direction arrows).
- `radius`: integer millimeters, or `null` for automatic (the largest that fits, ^8). It is the only nullable element. The minimum is 0.5 m (^57).
- There is no shape tag (^172): whether the edge is a bend, an S-curve or a hook, and where the middle line of an S runs, are derived from the two positions, the two headings and the radius.

### Lane configurations: `{ "<id>": { "name": string, "width": mm } }` (not densely packed)

A named set of lane properties that edges refer to. Today only `name` and `width`; more properties (car lane, bike path, ...) are added later with a migration. The default is 3000 mm (`LANE_WIDTH_M`, ^90).

## 3. Rules of the graph

- It is a plain directed graph. Two edges may arrive at a node from opposite sides, or leave it in different directions; the model does not forbid it. Such conflicts (a node with conflicting directions, ...) are reported by the **validator** (^169), not prevented by the model.
- Loops are normal (an edge back to an earlier node, ^162). A road, an arm and a branch (^130) are computed from the graph.
- A later height of a node is a new element at the end of the node tuple, added with a migration.

## 4. Persistence (^82, ^148)

- **Export** (^163) and **import** (^164) a project as a file (`Ctrl+S`, `Ctrl+O`, ^168). **Save to the browser** (^165) in IndexedDB, one record per project; **autosave** (^166) after a change to nodes, edges or lane configurations. Moving the camera alone neither autosaves nor changes `lastUpdatedAt`, and the camera is not part of undo. The camera is saved with the next save.
- **Several projects** (^167): the list of stored projects.
- **New project** (^171): a blank project with a new empty record.

## 5. Migrations

- `version` is an integer. Loading a project with an older version runs the migrations in order (`1 → 2`, `2 → 3`, ...); each is a pure function on the parsed JSON, and old migrations are never edited.
- Each version keeps a sample project file in the tests. A test migrates every sample to the current version and checks the result.
- A project with a newer version than the app knows is refused with a clear message, never opened half.

## 6. Decided

All decisions of this document are recorded in ^170 (the graph, the tuples, the millimeters, no counters, the conventions, `scale` in pixels per meter, no check in the model) and ^172 (no shape tag).
