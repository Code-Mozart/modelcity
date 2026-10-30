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
- Decisions, questions and milestones: [`docs/hats.md`](docs/hats.md)

## Glossary

The words we use the same way in the chat, the docs and the code (`docs/hats.md` has the reasoning; `docs/controls.md` the controls). **Status** (^67): `decided` = the user decided or defined the term; `assumed` = Claude's wording or reading that the user has not confirmed. Keep this table current: a new or changed term is added here in the same step, and gets `assumed` unless the user defined it.

| Term | Meaning | Status | Hats |
|------|---------|--------|------|
| **Hat** | A unique identifier `^N` for anything (question, decision, bug, image, demo, doc); never reused, tracked in `docs/hats.md` | decided | ^1 |
| **Road** | A chain of nodes with the curves between them; the unit you draw. Roads are independent of each other for now; lanes come later | decided | ^42, ^22 |
| **Node** | A point a road passes through, drawn as a dot. It lies on the curve and carries a heading | decided | ^6 |
| **Heading** | The direction of the road at a node, shown as an arrow | decided | ^6, ^9 |
| **Segment** | The curve between two nodes (`edge` in the code) | decided | ^60 |
| **Leaf node** | A node at either end of a road, also the only node of a road | decided | ^65 |
| **Bend** (L-curve) | A segment with one turn: straight, arc, straight | decided; assumed (that "L-curve" and "bend" are one thing) | ^6 |
| **S-curve** | A segment that turns one way, then the other; both arcs share one radius | decided | ^6 |
| **Hook** | A segment whose two arcs turn the same way, up to about 285 degrees; provisional | decided | ^6 |
| **Radius** | One per segment: automatic (the largest that fits) or explicit. The general minimum is 0.5 m for now | decided; assumed (0.5 m) | ^8, ^57 |
| **Control point** | Something you can drag to edit: a node, a heading tip, a bend's orange point, an orange radius point, a hook's yellow points (`handle` in the code) | decided; assumed (the code word) | ^9 |
| **Gizmo** | Any drawn aid on the canvas that is not map content: the skeleton and the scaffolds | decided | ^60 |
| **Skeleton** | The gizmos that are always shown: the curves (with their direction arrows) and the node dots | decided | ^60 |
| **Scaffold** | All other gizmos of a segment (orange lines, circle, ticks, control points, heading arrows (orange), yellow lines and points, the orange point and its label). Shown all or nothing, for a single segment at a time, and only by need | decided | ^60, ^66 |
| **Selection** | 0..n selected nodes, also of different roads. Selected nodes are blue and 150% larger; dragging one moves all by the same translation | decided; assumed (details) | ^70, ^71, ^72, ^73 |
| **Selection box** | The rectangle spanned by a left drag on empty canvas in select mode, axis-aligned with the viewport (also "rubber band"); selects the nodes inside it | decided | ^69, ^70 |
| **Lane** | A strip of road traffic runs in. For now a road is a single lane, so *select lane* selects the whole road; more lanes come later | decided; assumed (that a road is one lane for now) | ^22, ^76 |
| **Select mode** | No road is being drawn: you edit control points; a click enters draw mode | decided | ^48, ^54 |
| **Draw mode** | A road is being drawn: clicks place nodes, insert nodes on curves, or extend a road from a leaf node | decided | ^48, ^65 |
| **Preview** | The translucent preview of the node a click would place, with the curve to it (not called "ghost") | decided | ^40, ^48, ^68 |
| **Extend** | Add nodes to a road at one of its ends. In draw mode a click on another leaf node makes it the end to extend from (hint: `extend road`) | decided | ^65, ^68 |
| **Finish** | Leave draw mode (Esc, a right click on empty space, or a click on the node being drawn from). A road needs two nodes | decided | ^43 |
| **Camera** | The view onto the world: pan, zoom and rotate | decided | ^19, ^30 |
| **Viewport** | What the camera sees and renders, the visible area of the canvas (the user also says "viewbox") | decided | ^37, ^68 |
| **Bounds** | The tight, screen-aligned box around the skeleton; at least 12 px of it always stay in the viewport. Never drawn | decided | ^37, ^62 |
| **Pivot** | The center of an operation: typically of a rotation, but also of a zoom or scaling. For a middle-button drag it is the point where the drag started, which stays fixed | decided | ^30, ^68 |
| **Dead zone** | The 20 px around where a middle-button drag started in which that axis does nothing yet | decided | ^31 |
| **Compass** | The cursor while the middle button is held: a needle to north, N/E/S/W key caps, and drag hints | decided | ^33 |
| **Hints** | The `[input]: action` rows in the top left corner (also "control hints"), which change with mode, context and selection | decided | ^49, ^74 |
| **Key cap** | The raised, key-like symbol for a keyboard key; blue and sunk in while pressed | decided | ^32, ^68 |
| **Mouse symbols** | The symbols for mouse buttons, drag and the wheel (`MouseIcon`, `MouseDragIcon`, `MouseWheelIcon`) | decided | ^50, ^56 |
| **Proximity** | The fixed pixel distance within which something counts as "near" the pointer: 20 px to a curve, 48 px to a control point | decided; assumed (the distances) | ^55, ^60 |
| **World coordinates** | Meters, origin at the map center, x to the right, y down | decided | ^4 |
