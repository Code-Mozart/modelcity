# Review sheet: operations and unsure rows

Source: `docs/features.md` on branch `chore/controls-audit` (PR #33). Answer per row with one word. For operations: **ok**, **not an operation** (then it is a feature), or **rename: ...**. For unsure rows: **keep** (it is a feature) or **drop** (internal, not a feature). Anything you leave out counts as ok.

## Part 1: the operations (44)

An operation is something the user deliberately does that changes the map, the stored project or what is open, or writes an output (^391). Not a mode change, not opening a modal.

| Hat | Name | What it does | Where in the code | Certain? | Your answer |
|---|---|---|---|---|---|
| ^501 | pan | Pan: RMB drag moves the view, the content follows the pointer | camera/camera.svelte.ts startPan | certain | |
| ^502 | zoom | Zoom with the wheel at the cursor (1.5 per mille per pixel of wheel delta) | camera/camera.svelte.ts zoomWheel | certain | |
| ^503 | rotate | Rotate with an MMB drag left or right, 0.4° per pixel, about the point where the drag started | camera/pivotDrag.ts | certain | |
| ^504 | rotate to a direction | Rotate to a compass direction with N, E, S or W while the middle button is held | camera/camera.svelte.ts key | certain | |
| ^534 | bend curve | Drag the bend point: both headings turn so the heading lines meet at the pointer | curves/drag.ts dragCorner | certain | |
| ^535 | change radius | Drag a radius point: the radius follows the pointer smoothly | curves/drag.ts dragRadius, nearestRadius | certain | |
| (existing) ^10 | insert node | Insert a node into a curve (the curve does not change) | editor/ops.ts insertAt | certain | |
| (existing) ^493 | extend road | Extend a road from its end node (or from a node without a segment) | editor/ops.ts extendTo | certain | |
| ^549 | split road | Split: a new road starts at an existing node or curve | editor/ops.ts splitAt | certain | |
| ^550 | merge road | Merge: the road being drawn ends at an existing node or curve | editor/ops.ts mergeInto | certain | |
| (existing) ^162 | close road | Close: the road being drawn ends at its own first node, making a loop | editor/editor.svelte.ts | certain | |
| (existing) ^432 | finish road | Finish the road being drawn (Esc, RMB, or a click on the node being drawn from) | editor/editor.svelte.ts finishRoad | certain | |
| (existing) ^434 | delete node | Delete selected nodes (delete node, delete N nodes) | editor/removal.ts nodesRemoval | certain | |
| ^551 | remove segment | Remove a segment (its nodes go too if it was their only segment) | editor/removal.ts segmentsRemoval | certain | |
| ^552 | remove branch | Remove a whole branch with Alt | editor/removal.ts segmentsRemoval | certain | |
| (existing) ^234 | flip arm | Flip the arm of a node: all connected nodes turn around, segments run the other way, curves stay | editor/ops.ts flipArmFrom | certain | |
| (existing) ^71 | move N nodes | Move the selected nodes together by the same translation | editor/ops.ts dragStep, model/graph.ts moveNodes | certain | |
| (existing) ^468 | turn heading | Turn the heading of a node by dragging its heading control point | editor/ops.ts dragStep | certain | |
| (existing) ^453 | undo | Undo a step | editor/timeline.svelte.ts | certain | |
| (existing) ^455 | redo | Redo a step | editor/timeline.svelte.ts | certain | |
| ^553 | undo batch | Undo a whole batch (Alt) | editor/history.ts undoStep | certain | |
| ^554 | redo batch | Redo a whole batch (Alt) | editor/history.ts redoStep | certain | |
| (existing) ^486 | select node | Select a node by clicking it (it becomes the whole selection; Shift adds or removes) | editor/selection.ts pressNode | certain | |
| ^555 | select segment | Select the two nodes of a segment by clicking its curve | editor/selection.ts afterCurveClick | certain | |
| (existing) ^487 | select branch | Select a branch with Alt+click, or deselect it if wholly selected | editor/selection.ts afterBranchClick | certain | |
| ^556 | add branch | Add a branch to the selection with Alt+Shift+click, or deselect it | editor/selection.ts afterBranchAdd | certain | |
| (existing) ^492 | select by box | Select by a box: nodes whose centre is inside, live while dragging (Shift adds) | editor/selection.ts nodesInBand | certain | |
| ^557 | deselect all | Deselect all (Esc or a click on empty canvas with a selection) | editor/editor.svelte.ts | certain | |
| (existing) ^420 | place first node and set heading | Place the first node and set its heading (drag) | editor/ops.ts placePress | certain | |
| (existing) ^475 | place next node | Place the next node of the road being drawn | editor/ops.ts placeNode | certain | |
| (existing) ^476 | place next node and set heading | Place the next node and set its heading | editor/ops.ts placeStep | certain | |
| (existing) ^437 | cancel first node | Cancel the first node (the road has one node) | editor/editor.svelte.ts finishRoad | certain | |
| (existing) ^248 | merge nodes by drop | Merge a node into another by dropping it | editor/drop.ts | certain | |
| ^680 | join node into a curve by drop | Join a node into a curve by dropping it | editor/drop.ts curveUnder | certain | |
| ^681 | move branch | Move a branch with Alt + drag on a node | editor/press.ts pressNode | unsure | |
| ^682 | add to selection | Add to the selection with Shift (a node, a segment, a box) | editor/selection.ts | certain | |
| ^683 | deselect | Remove from the selection with Shift (a node, a segment) | editor/selection.ts | certain | |
| (existing) ^428 | save project | Save the project at once (Ctrl+S) | project/session.svelte.ts saveNow | certain | |
| (existing) ^431 | new project | New project: the open project is saved, then there is none | project/session.svelte.ts newProject | certain | |
| ^648 | open project | Open a project from the list | project/session.svelte.ts open | certain | |
| ^649 | rename project | Rename a project | project/session.svelte.ts | certain | |
| ^650 | delete project | Delete a project (asks first) | project/session.svelte.ts remove | certain | |
| (existing) ^429 | export project | Export the project as a file `<title>.modelcity.json` | project/session.svelte.ts exportJson | certain | |
| (existing) ^430 | import project | Import a project file | project/session.svelte.ts importFile | certain | |

## Part 2: rows I am not sure are features (18)

| Hat | Type | What | Where in the code | My doubt | Your answer |
|---|---|---|---|---|---|
| ^681 | operation | Move a branch with Alt + drag on a node | editor/press.ts pressNode | unsure | |
| ^507 | feature | The wheel unit is scaled by deltaMode (pixels, lines, pages) | MapCanvas.svelte onWheel | likely, read from the flow | |
| ^521 | feature | Two nodes with parallel aligned headings are joined by a straight line | curves/edge.ts autoEdge | likely, read from the flow | |
| ^524 | feature | A hook's automatic radius and its cap (3 times the larger of the radius and the length) | curves/twoArc.ts hookAuto | likely, read from the flow | |
| ^525 | feature | An S-curve whose widest middle line does not fit is built anchored at the nodes | curves/edge.ts twoArc | unsure | |
| ^526 | feature | When both arcs share one circle the one big arc is split in two equal halves | curves/twoArc.ts halfwayAngle | unsure | |
| ^569 | feature | In draw mode Shift+click on a node does not split or merge | editor/press.ts actOf | unsure | |
| ^572 | feature | A node where chains meet has one handle per chain | editor/chains.ts chainHandles | likely, read from the flow | |
| ^579 | feature | The node being drawn from is always offered with its snap suggestions | editor/editor.svelte.ts snapped | likely, read from the flow | |
| ^583 | feature | Dragging a handle on a path and writing the result back to the graph | model/dragGraph.ts | unsure | |
| ^586 | feature | Edges can be given the radius of another edge (shared radius) | model/graph.ts shareRadius | likely, read from the flow | |
| ^589 | feature | The far end of the road that ends at a leaf node | model/junction.ts farEnd | likely, read from the flow | |
| ^606 | feature | The compass label is above the icon when the heading points down | render/compass.ts | likely, read from the flow | |
| ^611 | feature | The canvas is drawn at the device pixel ratio | render/render.ts | likely, read from the flow | |
| ^612 | feature | Sample project fixture | project/samples/v1.json | unsure | |
| ^658 | feature | The page title and favicon | index.html | unsure | |
| ^673 | feature | Tie-breaks at the same place: a node point before other points, a crossing last; the curve of a segment before a line on top of it | snap/engine.ts pointRank, rank | likely, read from the flow | |
| ^677 | feature | An offset curve is left out where its arc would turn inside out | snap/rules.ts offsetPiece | likely, read from the flow | |
