# modelcity

modelcity is an editor to create Google Maps-like maps for fictional cities.

## Getting started

Requires [bun](https://bun.sh).

```bash
bun install
bun run dev
```

Then open the URL it prints (http://localhost:5173 by default).

`bun install` also enables a pre-push git hook that runs `bun run ci`, the same checks as the GitHub Actions workflow.

## More

- How we work (conventions, branches, code rules, commands): [`.claude/CLAUDE.md`](.claude/CLAUDE.md)
- Controls (mouse, keyboard, touch): [`docs/controls.md`](docs/controls.md)
- Product background and design decisions: [`docs/handover.md`](docs/handover.md)
- The roadmap and its milestones: [`docs/hats.md#roadmap`](docs/hats.md#roadmap)
- All decisions, questions and ideas (the hats): [`docs/hats.md`](docs/hats.md)

## Glossary

The words we use the same way in the chat, the docs and the code (`docs/hats.md` has the reasoning; `docs/controls.md` the controls). **Status** (^67): `decided` = the user decided or defined the term; `assumed` = Claude's wording or reading that the user has not confirmed. Keep this table current: a new or changed term is added here in the same step, and gets `assumed` unless the user defined it.

| Term | Meaning | Status | Hats |
|------|---------|--------|------|
| **Hat** | A unique identifier `^N` for anything (question, decision, bug, image, demo, doc); never reused, tracked in `docs/hats.md` | decided | ^1 |
| **Arm** | Any set of connected nodes (with the segments between them). Today this is what the code and older docs call a *road*, since segments cannot run parallel yet | decided | ^130 |
| **Road** | All arms that are connected by at least one parallel segment, e.g. an "H" whose top and bottom half only touch but share no nodes. (The code still says *road* for a drawn chain of nodes, `Roads`; to be renamed with the data model, ^106) | decided | ^130 |
| **Branch** | Both the concept of splits and merges and a chain of nodes without any: its first and last node have a number of edges other than two, all nodes between have exactly two. A "T" has three branches, an "L" one (with bends), an "A" four (roof, bar, two legs) | decided | ^130 |
| **Node** | A point a road passes through, drawn as a dot. It lies on the curve and carries a heading | decided | ^6 |
| **Heading** | The direction of the road at a node, shown as an arrow | decided | ^6, ^9 |
| **Segment** | The curve between two nodes, with a direction (from its start node to its end node), a radius (its own, or auto) and a lane. Older texts, the code (`GEdge`) and the stored file (`edges`) say *edge*: the same thing, the old word (^747, ^748) | decided (user) | ^60, ^747 |
| **Void** | The part of the map under the pointer where there is no node, no control point and no segment (not "empty canvas": something can be selected, and the canvas is never empty) | decided (user) | ^754 |
| **Selected segment** | A segment whose two nodes are both selected (`selectedSegments` in the code); it is drawn in the color of selected nodes, and its scaffold is shown together with those of the other selected segments | decided | ^133, ^231 |
| **Leaf node** | A node at either end of a road, also the only node of a road | decided | ^65 |
| **Bend** (L-curve) | A segment with one turn: straight, arc, straight | decided; assumed (that "L-curve" and "bend" are one thing) | ^6 |
| **S-curve** | A segment that turns one way, then the other; both arcs share one radius | decided | ^6 |
| **Hook** | A segment whose two arcs turn the same way, up to about 285 degrees; provisional | decided | ^6 |
| **Radius** | One per segment: automatic (the largest that fits) or explicit. The general minimum is 0.5 m for now | decided; assumed (0.5 m) | ^8, ^57 |
| **Control point** | Something you can drag to edit: a node, a heading control point (on the stem of the heading arrow), a bend's orange point, orange radius points (at the ends of an arc), the corner points of a hook or S-curve (`handle` in the code) | decided; assumed (the code word) | ^9 |
| **Gizmo** | Any drawn aid on the canvas that is not map content: the skeleton and the scaffolds | decided | ^60 |
| **Skeleton** | The gizmos that are always shown: the curves (with their direction arrows) and the node dots | decided | ^60 |
| **Scaffold** | All other gizmos of a segment (orange lines, circle, control points, heading arrows (orange), the axis line and corner points of an S-curve or hook, the radius label). Shown all or nothing, for a single segment at a time (selected segments together), and only by need | decided | ^60, ^66 |
| **Selection** | 0..n selected nodes, also of different roads. Selected nodes are blue and 150% larger; dragging one moves all by the same translation | decided; assumed (details) | ^70, ^71, ^72, ^73 |
| **Snap suggestion** | A snap point, a snap line or a snap curve: what a point that is subject to snapping can be pulled to (^101, ^112, ^263) | decided | ^101, ^263 |
| **Snap curve** | A snap suggestion that leaves one degree of freedom along a curve (the curve of a segment, a circle); a snap line is a straight snap curve | decided | ^263 |
| **Snap line** | A straight snap curve: a line through a point along a direction (a tangent, no forward or backward); drawn as a solid turquoise line | decided | ^101 |
| **Snap point** | A snap suggestion that leaves none (a position, for example where two nodes touch, or a node itself); drawn as a solid turquoise ring. It is shown when the pointer is snapped to it, and from afar where a rule says so: the previous positions of moved nodes, the nodes the snap is made of | decided; assumed (the rule that one can be shown from afar, ^804) | ^101, ^113, ^803 |
| **Snap origin** | The node or control point that made a snap suggestion (the points a line or a point comes from, ^275): a node, a radius point, the middle of a bend, the inflection point. While the pointer is snapped to its suggestion it shows its snap point, and, if the heading of the snap comes from it, its heading arrow in turquoise | assumed (the user asked for a term; `origin` is the word of ^275) | ^275, ^803 |
| **Previous position** | The position a node had before it was moved: while it is moved, a snap point is there, shown all the time, because it is useful to see where the nodes were | decided (^113); assumed (the term) | ^113, ^804 |
| **Hover ring** | The thin blue ring around the node or control point under the pointer; not a snap point and not the *node ring* of a selection | assumed (the user asked for a term) | ^114 |
| **Pinned node** | A node whose snap suggestions are offered without a maximum distance, until unpinned (`pin snap suggestions`); drawn as a solid turquoise dot. A *pinned segment*, *branch* or *arm* is one whose nodes are pinned, like the selected ones (^245) | decided | ^258 |
| **Pinned snap suggestion** | A snap line or snap point of a pinned node (*pinned snap line*, *pinned snap point*) | decided | ^258 |
| **Node merge** | Two nodes at one position become one: the node that was dropped on stays with its heading (not the *merge* of roads above) | decided; term assumed | ^248 |
| **Visited control** | A control whose hint is hidden for five minutes after it was used (like a visited link; the code still says *learned*); an *unvisitable* control is never hidden (the hint of `Ctrl` while snapping, the hint of the pin) | decided (user); assumed (the five minutes, ^110) | ^110 |
| **Radius point** | A control point on an arc that changes its radius when dragged (`rad` in the code, ^127, ^128, ^139); the parent term of the *end radius point* and the *bisector radius point* | decided (user: parent and children) | ^128, ^139 |
| **End radius point** | A radius point at each end of the arc, at a tick | decided (user) | ^127 |
| **Bisector radius point** | The radius point in the middle of the arc, on the bisector of the corner | decided (user) | ^139 |
| **Tick** | The point where a heading line touches the arc of a bend, S-curve or hook; the end radius point sits there (^127) | decided | ^127 |
| **Selection box** | The rectangle spanned by a left drag on empty canvas in select mode, axis-aligned with the viewport (also "rubber band"); selects the nodes inside it | decided | ^69, ^70 |
| **Lane** | A strip of road traffic runs in, 3 m wide for now (`LANE_WIDTH_M`). For now a branch is a single lane, so *select branch* (Alt+click; Alt+Shift+click adds it) selects a branch; more lanes come later | decided; assumed (that a road is one lane for now) | ^22, ^76 |
| **Step** | One undoable change of the roads (a placed node, a drag, a removal, ...), see `docs/controls.md` | assumed | ^81, ^88 |
| **Junction node** | A node where more than one edge meets, a single node of the graph with one heading (formerly the *shared node* by position, ^92, replaced by the graph, ^106) | decided; assumed (the name) | ^23, ^106, ^170 |
| **Feature** | Anything the app can do, show or enforce that the user can observe. A thing counts if it passes five tests: *observable* (the user can see it, do it, wait for it, or it shapes what they get), *distinct* (its own thing, not a part of a bigger one), *intended* (someone decided it; an accident is a bug), *nameable* (one sentence says it) and *testable* (a test could check it). It falls in one of these categories: a capability, feedback, presentation, behaviour over time, a rule, data and failure, or the environment. Every operation is a feature; not every feature is an operation (a snap rule, a gizmo, a label is not). Each has a hat (`feature` or `operation`) and a row in `docs/features.md` | assumed (the user asked for the heuristic in the audit; the wording is Claude's reconstruction) | ^371, ^392, ^786 |
| **Operation** | Something the user deliberately does that changes the map, the stored project or what is open, or writes an output: edit the map, undo, select, pan, zoom, rotate, export, save, import, create, rename, delete or switch a project. Not a mode change, not opening a modal, not hovering. Listed in the control hints, the recent history panel and the operations search. We say *operation*, not *action* (`action` is also what code calls many other things) | decided (user, refined in the audit) | ^180, ^391 |
| **Control** | A user input (a key or mouse input with its modifiers) in a context (mode, what is under the pointer, the state of the app). The same input in two contexts is two controls (`LMB`: *draw mode* on empty canvas in select mode, *add node* in draw mode; `Tab`: *view mode* in select mode, *select mode* in view mode); what one does is shown by one control hint. Not a control point | assumed (user's definition, in the audit; open: do alternative inputs of the same thing count as one) | ^371, ^392, ^181 |
| **Fuzzy search** | A search that finds a title if the characters of the search appear in it in the same order, case ignored, and puts the better matches (characters next to each other, at word starts) first; rules in `docs/controls.md` | decided (the principle, ^178); assumed (the scoring) | ^178 |
| **No project** | The state with a blank map that is not a project yet; it becomes one as soon as it has something in it | decided | ^189 |
| **Modal** | A window over the map that blocks the rest until it is closed, for example the *projects modal* (`Ctrl+O`); not "dialog" | decided | ^212 |
| **Project** | The map with its title, dates and camera, kept in the browser, saved by itself and exported or imported as a file (`docs/data-model.md`) | assumed | ^82, ^148, ^170 |
| **Chain** | A run of edges that follow each other through nodes with exactly one edge in and one out; derived from the graph for drawing and hit testing, never stored | assumed | ^106 |
| **Split** | A road starts at an existing node, so that node has one edge in and two (or more) out. Draw mode: click a node or a curve | decided | ^23, ^93 |
| **Merge** | A road ends at an existing node, so that node has two (or more) edges in and one out. Draw mode: click a node or a curve while drawing | decided | ^23, ^93 |
| **Subject to snapping** | A point or handle that is pulled to snap lines and snap points near it; the pivot crosshair, the rotation handle and moved or placed nodes are | decided | ^112 |
| **Node ring** | The fixed-size blue ring around a selected node (with more than one node selected); only the closest one in proximity is drawn. Planned | decided | ^114 |
| **Bounding ring** | The blue ring around all selected nodes, centered at the center of their bounding box. Planned | decided | ^114 |
| **Rotation handle** | The short blue radial line under the cursor on a ring that rotates the selection around the pivot (the user also says "wheel handle"). Planned | decided | ^115 |
| **Crosshair** | The blue pivot of rotating and scaling a selection, first at the center of its bounding box; its square tips scale. Planned | decided | ^116 |
| **Parallel segments** | Two segments are parallel if their start nodes, and their end nodes, have the same or exactly opposite heading, the distance between the start nodes and between the end nodes is half the sum of their lane widths, and their arc circles have the same center (concentric); they share a centerline. A *road* is made of arms connected by at least one parallel segment | decided (user's definition, not built yet) | ^100, ^130 |
| **Orphaned node** | A node without any segment. It must never exist (a node needs a segment, except the node being drawn from); the validator will report it | decided (user, new term) | ^322, ^169 |
| **Tower** | A group of nodes where each one touches the next (one lane width apart, same or opposite heading, ^254). The bars that show parallel segments are drawn per tower and side | assumed (user's proposal) | ^352, ^350 |
| **Run** | On one side of a tower, a group of neighbouring nodes whose segments on that side are parallel. It is drawn as one *run bar* over the circles of the nodes, below them (not the scale bar) | assumed (user asked for a term) | ^353, ^350 |
| **Active node** | With several nodes or control points affected at once (a tower, a selection, multi-extend), the one the user actually clicks or drags; also the node a new segment is extended from (the *start node*, which stays a term). Snapping, hints and measurements follow it, the others follow it (replaces "manipulated node") | assumed (user asked for a term) | ^369, ^357 |
| **Roadmap** | The one prioritised list of wanted work, fuzzy beyond the next items; the "Roadmap" section of `docs/hats.md`. Replaces "todo-list" and "backlog" | decided | ^146 |
| **Roadmap item** | A `feature`, `bug` or `chore` (refactor, docs, tooling) on the roadmap | decided | ^146 |
| **Milestone** | One PR that tackles one or more roadmap items, with a written scope (in/out); a roadmap item can be unassigned until it is planned | decided | ^146 |
| **Extend mode** | The mode while a road is being drawn from a node (dashed preview); finishing the road goes back to draw mode | decided | ^120 |
| **View mode** | Nothing can be edited, only the camera works, and only the generated geometry is drawn (no skeleton). `Tab` in and out; shown by an eye icon, no outline | decided | ^104 |
| **Select mode** | No road is being drawn: you edit control points; a click enters draw mode | decided | ^48, ^54 |
| **Draw mode** | Drawing, but no node is being extended: a click on the void starts a road, a click on a node extends, splits or merges; a second RMB (or Esc) goes to select mode | decided | ^48, ^65, ^120 |
| **Preview** | The translucent preview of the node a click would place, with the curve to it (not called "ghost") | decided | ^40, ^48, ^68 |
| **Extend** | Add nodes to a road at one of its ends. In draw mode a click on another leaf node makes it the end to extend from (hint: `extend road`) | decided | ^65, ^68 |
| **Finish** | End the road being drawn and go back to draw mode (Esc leaves draw mode altogether, a right click on empty space, or a click on the node being drawn from). A road needs two nodes | decided | ^43 |
| **Camera** | The view onto the world: pan, zoom and rotate | decided | ^19, ^30 |
| **Viewport** | What the camera sees and renders, the visible area of the canvas (the user also says "viewbox") | decided | ^37, ^68 |
| **Bounds** | The tight, screen-aligned box around the skeleton; at least 12 px of it always stay in the viewport. Never drawn | decided | ^37, ^62 |
| **Pivot** | The center of an operation: typically of a rotation, but also of a zoom or scaling. For a middle-button drag it is the point where the drag started, which stays fixed | decided | ^30, ^68 |
| **Dead zone** | The 20 px around where a middle-button drag started in which that axis does nothing yet | decided | ^31 |
| **Compass** | The cursor while the middle button is held: a needle to north, N/E/S/W key caps, and drag hints | decided | ^33 |
| **Control hints panel** | The HTML div in the top left corner that shows the control hints; it changes with mode, context and selection (formerly "hints") | decided | ^49, ^74, ^111 |
| **Batch** | A run of consecutive undo steps of one kind (selection changes, or the steps of one drawing session) that `Alt+Ctrl+Z` undoes at once | decided | ^103, ^216 |
| **Control hint** | One row of the control hints panel: `[input]: action` | decided | ^49, ^111 |
| **Message** | Any text for the user with the icon of its kind in front, always at the start (^210): a toast, or the error of a refused import in the modal | decided | ^210, ^232 |
| **Toast** | A short message in the top right corner above the recent history panel, on a transparent background, with the icon of its kind in front (^210); it confirms what the user just did (`saved`) or reports what cannot be shown in the projects modal. It goes by itself after a few seconds | assumed | ^232, ^185 |
| **Recent history panel** | The HTML div in the top right corner that shows the last 7 steps of the history (undone ones grayed out, with their line), batches as steps with joined lines, and the undo and redo hints at its bottom; it appears with each operation and goes after a few seconds (^107–^109, ^216) | decided | ^107, ^111 |
| **Key cap** | The raised, key-like symbol for a keyboard key; blue and sunk in while pressed | decided | ^32, ^68 |
| **Mouse symbols** | The symbols for mouse buttons, drag and the wheel (`MouseIcon`, `MouseDragIcon`, `MouseWheelIcon`) | decided | ^50, ^56 |
| **Proximity** | The fixed pixel distance within which something counts as "near" the pointer: 20 px to a curve, 48 px to a control point | decided; assumed (the distances) | ^55, ^60 |
| **World coordinates** | Meters, origin at the map center, x to the right, y down | decided | ^4 |
