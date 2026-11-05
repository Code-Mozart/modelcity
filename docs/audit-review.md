# Audit review (^371)

Everything the audit and the sweep of the code found, **with what needs your input first**. Answer in the last column of a row (one word is enough), commit, and tell me. A blank answer counts as **ok**.

| Part | What | Rows | What I need from you |
|---|---|---|---|
| 1 | Operations | 44 | each: ok, not an operation, or rename |
| 2 | Rows I am not sure are features | 18 | keep or drop |
| 3 | Open questions and `assumed` decisions | 8 | decide or confirm |
| 4 | Controls found in the code | 58 | skim: is the context and the hint right? |
| 5 | Open bugs | 10 | only if one of them is not a bug, or has the wrong priority |
| 6 | Planned features and chores from the audit | 26 | roadmap order, if you have one |
| 7 | All other features | 308 | reference; skim at will |
| 8 | What is not tested | | for the test-gap hats |

## Part 1: the operations

An operation is something the user deliberately does that changes the map, the stored project or what is open, or writes an output (^391). Not a mode change, not opening a modal.

| Hat | Name | What it does | Code | Certain? | Tests | Your answer |
|---|---|---|---|---|---|---|
| ^501 | pan | Pan: RMB drag moves the view, the content follows the pointer | camera/camera.svelte.ts startPan | certain | unit `camera/cameraEngine.test` (strong), `camera/view.test` (strong), `camera/bounds.test` (weak) | |
| ^502 | zoom | Zoom with the wheel at the cursor (1.5 per mille per pixel of wheel delta) | camera/camera.svelte.ts zoomWheel | certain | unit `camera/cameraBounds.test` (weak), `camera/cameraEngine.test` (weak) | |
| ^503 | rotate | Rotate with an MMB drag left or right, 0.4° per pixel, about the point where the drag started | camera/pivotDrag.ts | certain | unit `camera/camera.test` (strong), `camera/cameraEngine.test` (weak) | |
| ^504 | rotate to a direction | Rotate to a compass direction with N, E, S or W while the middle button is held | camera/camera.svelte.ts key | certain | unit `camera/cameraBounds.test` (weak), `camera/cameraEngine.test` (weak) | |
| ^534 | bend curve | Drag the bend point: both headings turn so the heading lines meet at the pointer | curves/drag.ts dragCorner | certain | no unit test runs dragCorner; none found | |
| ^535 | change radius | Drag a radius point: the radius follows the pointer smoothly | curves/drag.ts dragRadius, nearestRadius | certain | unit `curves/continuity.test` (strong), `curves/curves.test` (strong), `curves/radiusHandles.test` (weak) | |
| (existing) ^10 | insert node | Insert a node into a curve (the curve does not change) | editor/ops.ts insertAt | certain | unit `editor/ownCurve.test` (strong), `editor/branching.test` (weak), `editor/controls.test` (weak) | |
| (existing) ^493 | extend road | Extend a road from its end node (or from a node without a segment) | editor/ops.ts extendTo | certain | unit `editor/controls.test` (strong), `editor/dropMerge.test` (strong), `editor/branching.test` (weak) | |
| ^549 | split road | Split: a new road starts at an existing node or curve | editor/ops.ts splitAt | certain | unit `editor/branching.test` (strong), `hints/hints.test` (strong), `editor/controls.test` (strong) | |
| ^550 | merge road | Merge: the road being drawn ends at an existing node or curve | editor/ops.ts mergeInto | certain | unit `editor/branching.test` (strong), `hints/hints.test` (strong), `editor/dropMerge.test` (strong) | |
| (existing) ^162 | close road | Close: the road being drawn ends at its own first node, making a loop | editor/editor.svelte.ts | certain | unit `editor/extend.test` (strong), `editor/branching.test` (strong), `editor/dropMerge.test` (strong) | |
| (existing) ^432 | finish road | Finish the road being drawn (Esc, RMB, or a click on the node being drawn from) | editor/editor.svelte.ts finishRoad | certain | unit `editor/branching.test` (strong), `editor/dropMerge.test` (strong), `editor/extend.test` (strong) | |
| (existing) ^434 | delete node | Delete selected nodes (delete node, delete N nodes) | editor/removal.ts nodesRemoval | certain | unit `editor/editor.test` (strong), `editor/selection.test` (strong), `editor/branchSelect.test` (weak) | |
| ^551 | remove segment | Remove a segment (its nodes go too if it was their only segment) | editor/removal.ts segmentsRemoval | certain | unit `editor/controls.test` (weak), `editor/pins.test` (weak), `editor/rightClickSelected.test` (weak) | |
| ^552 | remove branch | Remove a whole branch with Alt | editor/removal.ts segmentsRemoval | certain | unit `editor/controls.test` (strong) | |
| (existing) ^234 | flip arm | Flip the arm of a node: all connected nodes turn around, segments run the other way, curves stay | editor/ops.ts flipArmFrom | certain | unit `editor/controls.test` (strong), `editor/branchSelect.test` (strong), `editor/towers.test` (strong) | |
| (existing) ^71 | move N nodes | Move the selected nodes together by the same translation | editor/ops.ts dragStep, model/graph.ts moveNodes | certain | unit `editor/selection.test` (strong), `editor/branchSelect.test` (weak), `editor/pins.test` (weak) | |
| (existing) ^468 | turn heading | Turn the heading of a node by dragging its heading control point | editor/ops.ts dragStep | certain | unit `editor/controlSnap.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) | |
| (existing) ^453 | undo | Undo a step | editor/timeline.svelte.ts | certain | unit `editor/history.test` (weak), `editor/undoRedo.test` (weak) | |
| (existing) ^455 | redo | Redo a step | editor/timeline.svelte.ts | certain | unit `editor/undoRedo.test` (weak) | |
| ^553 | undo batch | Undo a whole batch (Alt) | editor/history.ts undoStep | certain | unit `editor/history.test` (weak), `editor/steps.test` (weak) | |
| ^554 | redo batch | Redo a whole batch (Alt) | editor/history.ts redoStep | certain | unit `editor/history.test` (weak), `editor/steps.test` (weak) | |
| (existing) ^486 | select node | Select a node by clicking it (it becomes the whole selection; Shift adds or removes) | editor/selection.ts pressNode | certain | unit `editor/selection.test` (strong), `editor/branchSelect.test` (weak), `editor/branching.test` (weak) | |
| ^555 | select segment | Select the two nodes of a segment by clicking its curve | editor/selection.ts afterCurveClick | certain | unit `editor/controls.test` (strong), `editor/editor.test` (strong), `editor/concentricBuild.test` (weak) | |
| (existing) ^487 | select branch | Select a branch with Alt+click, or deselect it if wholly selected | editor/selection.ts afterBranchClick | certain | unit `editor/branchSelect.test` (strong), `editor/controls.test` (weak), `editor/editor.test` (weak) | |
| ^556 | add branch | Add a branch to the selection with Alt+Shift+click, or deselect it | editor/selection.ts afterBranchAdd | certain | unit `editor/branchSelect.test` (strong), `editor/selection.test` (strong), `editor/controls.test` (weak) | |
| (existing) ^492 | select by box | Select by a box: nodes whose centre is inside, live while dragging (Shift adds) | editor/selection.ts nodesInBand | certain | unit `editor/selection.test` (strong), `editor/branchSelect.test` (weak), `editor/controls.test` (weak) | |
| ^557 | deselect all | Deselect all (Esc or a click on empty canvas with a selection) | editor/editor.svelte.ts | certain | unit `editor/selection.test` (strong), `editor/controls.test` (weak), `editor/editor.test` (weak) | |
| (existing) ^420 | place first node and set heading | Place the first node and set its heading (drag) | editor/ops.ts placePress | certain | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `curves/middleDrag.test` (weak) | |
| (existing) ^475 | place next node | Place the next node of the road being drawn | editor/ops.ts placeNode | certain | unit `editor/branching.test` (strong), `editor/dropMerge.test` (strong), `editor/extend.test` (strong) | |
| (existing) ^476 | place next node and set heading | Place the next node and set its heading | editor/ops.ts placeStep | certain | unit `editor/branching.test` (weak), `editor/cancelDrag.test` (weak), `editor/controlSnap.test` (weak) | |
| (existing) ^437 | cancel first node | Cancel the first node (the road has one node) | editor/editor.svelte.ts finishRoad | certain | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) | |
| (existing) ^248 | merge nodes by drop | Merge a node into another by dropping it | editor/drop.ts | certain | unit `editor/merging.test` (strong), `editor/dupNode.test` (weak), `editor/branching.test` (weak) | |
| ^680 | join node into a curve by drop | Join a node into a curve by dropping it | editor/drop.ts curveUnder | certain | unit `editor/branching.test` (weak), `editor/controls.test` (weak), `editor/dropMerge.test` (weak) | |
| ^681 | move branch | Move a branch with Alt + drag on a node | editor/press.ts pressNode | unsure | unit `editor/branchSelect.test` (weak), `editor/branching.test` (weak), `editor/controls.test` (weak) | |
| ^682 | add to selection | Add to the selection with Shift (a node, a segment, a box) | editor/selection.ts | certain | unit `editor/selection.test` (strong), `editor/controlSnap.test` (weak), `editor/controls.test` (weak) | |
| ^683 | deselect | Remove from the selection with Shift (a node, a segment) | editor/selection.ts | certain | unit `editor/selection.test` (strong), `editor/controlSnap.test` (weak), `editor/controls.test` (weak) | |
| (existing) ^428 | save project | Save the project at once (Ctrl+S) | project/session.svelte.ts saveNow | certain | unit `project/load.test` (strong), `project/session.test` (weak) | |
| (existing) ^431 | new project | New project: the open project is saved, then there is none | project/session.svelte.ts newProject | certain | unit `project/session.test` (strong), `project/cameraSaved.test` (weak); e2e `camera.spec` (weak) | |
| ^648 | open project | Open a project from the list | project/session.svelte.ts open | certain | unit `project/load.test` (weak), `project/session.test` (weak) | |
| ^649 | rename project | Rename a project | project/session.svelte.ts | certain | none found | |
| ^650 | delete project | Delete a project (asks first) | project/session.svelte.ts remove | certain | unit `project/session.test` (weak); e2e `projects.spec` (weak) | |
| (existing) ^429 | export project | Export the project as a file `<title>.modelcity.json` | project/session.svelte.ts exportJson | certain | e2e `projects.spec` (weak); no unit test runs exportJson | |
| (existing) ^430 | import project | Import a project file | project/session.svelte.ts importFile | certain | unit `project/file.test` (weak), `project/load.test` (weak), `project/session.test` (weak) | |

## Part 2: rows I am not sure are features

| Hat | Type | What | Code | My doubt | Your answer |
|---|---|---|---|---|---|
| ^681 | operation | Move a branch with Alt + drag on a node | editor/press.ts pressNode | unsure | |
| ^507 | feature | The wheel unit is scaled by deltaMode (pixels, lines, pages) | MapCanvas.svelte onWheel | likely | |
| ^521 | feature | Two nodes with parallel aligned headings are joined by a straight line | curves/edge.ts autoEdge | likely | |
| ^524 | feature | A hook's automatic radius and its cap (3 times the larger of the radius and the length) | curves/twoArc.ts hookAuto | likely | |
| ^525 | feature | An S-curve whose widest middle line does not fit is built anchored at the nodes | curves/edge.ts twoArc | unsure | |
| ^526 | feature | When both arcs share one circle the one big arc is split in two equal halves | curves/twoArc.ts halfwayAngle | unsure | |
| ^569 | feature | In draw mode Shift+click on a node does not split or merge | editor/press.ts actOf | unsure | |
| ^572 | feature | A node where chains meet has one handle per chain | editor/chains.ts chainHandles | likely | |
| ^579 | feature | The node being drawn from is always offered with its snap suggestions | editor/editor.svelte.ts snapped | likely | |
| ^583 | feature | Dragging a handle on a path and writing the result back to the graph | model/dragGraph.ts | unsure | |
| ^586 | feature | Edges can be given the radius of another edge (shared radius) | model/graph.ts shareRadius | likely | |
| ^589 | feature | The far end of the road that ends at a leaf node | model/junction.ts farEnd | likely | |
| ^606 | feature | The compass label is above the icon when the heading points down | render/compass.ts | likely | |
| ^611 | feature | The canvas is drawn at the device pixel ratio | render/render.ts | likely | |
| ^612 | feature | Sample project fixture | project/samples/v1.json | unsure | |
| ^658 | feature | The page title and favicon | index.html | unsure | |
| ^673 | feature | Tie-breaks at the same place: a node point before other points, a crossing last; the curve of a segment before a line on top of it | snap/engine.ts pointRank, rank | likely | |
| ^677 | feature | An offset curve is left out where its arc would turn inside out | snap/rules.ts offsetPiece | likely | |

## Part 3: open questions and assumed decisions

| Hat | Type | Status | What | Your answer |
|---|---|---|---|---|
| ^366 | question | open (user; Claude's estimate in the answer) | Remove S-curves and hooks, or forbid them for parallel segments (user; correction: an S-curve is derived, `docs/data-model.md` stores no shape, ^172,  | |
| ^367 | decision | assumed (user's proposal; Claude agrees; details by the user) | Version numbers `v0.x.0: <moniker>` (user, answers ^312): | |
| ^369 | decision | assumed (user's request for a term, milestone ^370; ^357 calls it the *manipulated node*) | The active node and the active control point (user): | |
| ^372 | question | open (user; Claude answers) | Do we use integration tests? Should we? | |
| ^435 | decision | decided (user: one name shared by the hint and the history); assumed (details: the interna | One user-facing name per operation (user, audit ^371): | |
| ^439 | decision | assumed (user's model, Claude agrees; details assumed) | Operations and batches (user, audit ^371): | |
| ^483 | question | open (roadmap, no milestone; user, found in the audit ^371) | The step of the extend lines (user): | |
| ^484 | question | open (roadmap, no milestone; found in the audit ^371) | A lone node survives a reload: | |

## Part 4: the controls found in the code (not walked)

The hint is what the code says, not what the screen shows.

| Hat | Context | Control | Does | Hint in the code | Tests | Your answer |
|---|---|---|---|---|---|---|
| ^684 | select mode, empty canvas, something selected | `LMB` click | deselect all (^557) | `LMB`: deselect all (^75) | unit `editor/editor.test` (strong), `editor/extend.test` (strong), `editor/modes.test` (strong) | |
| ^685 | select mode, empty canvas, something selected | `Shift` + `LMB` drag | add to selection (^682) | `Shift`+`LMB` drag: add to selection | unit `editor/selection.test` (strong), `editor/controls.test` (strong), `editor/modes.test` (strong) | |
| ^686 | select mode, something selected | `Esc` | deselect all (^557) | `Esc`: deselect all (^218) | unit `editor/branchSelect.test` (weak), `editor/controls.test` (weak), `editor/editor.test` (weak) | |
| ^687 | any mode, something selected | `Del` or `Backspace` | ^434 | `Del`: delete selected | unit `editor/controls.test` (weak), `editor/editor.test` (weak), `editor/modes.test` (weak) | |
| ^688 | select mode, pointer on a node, something selected | `Shift` + `LMB` click | add to selection (^682); deselect (^683) | `Shift`+`LMB`: select or deselect | unit `editor/controls.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) | |
| ^689 | select mode, pointer on a node, something selected | `Alt` + `Shift` + `LMB` click | select branch (^487); deselect (^683) | `Alt`+`Shift`+`LMB`: add branch to selection (or deselect branch) | unit `editor/branchSelect.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) | |
| ^690 | select mode, pointer on a curve | `LMB` click | select segment (^555) | `LMB`: select segment | unit `editor/editor.test` (strong), `editor/controls.test` (strong), `editor/extend.test` (strong) | |
| ^691 | select mode, pointer on a curve, something selected | `Shift` + `LMB` click | add to selection (^682); deselect (^683) | `Shift`+`LMB`: add segment to selection, or deselect segment | unit `editor/editor.test` (strong), `editor/controls.test` (strong), `editor/extend.test` (strong) | |
| ^692 | select mode, pointer on a curve | `Alt` + `LMB` click | select branch (^487) | `Alt`+`LMB`: select branch (or deselect branch) | unit `editor/editor.test` (strong), `editor/extend.test` (strong), `editor/modes.test` (strong) | |
| ^693 | select mode, pointer on a selected node, several selected | `LMB` drag | ^433 | `LMB` drag: move node (the group moves) | unit `editor/branching.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) | |
| ^694 | select mode, pointer on a node | `Alt` + `LMB` drag | move branch (^681) | none (exemption not yet decided) | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) | |
| ^695 | any mode, pointer on a bend point | `LMB` drag | bend curve (^534) | `LMB` drag: bend curve | unit `editor/branching.test` (strong), `curves/continuity.test` (weak), `editor/editor.test` (weak) | |
| ^696 | any mode, pointer on a radius point | `LMB` drag | change radius (^535) | `LMB` drag: change radius | unit `curves/continuity.test` (weak), `editor/branching.test` (weak), `editor/controlSnap.test` (weak) | |
| ^697 | any mode, pointer on a corner point of an S-curve | `LMB` drag | turn heading (^468) | `LMB` drag: turn heading | unit `editor/branching.test` (strong), `editor/inflection.test` (strong), `curves/continuity.test` (weak) | |
| ^698 | any mode, pointer on a radius point, a segment whose two nodes are selected | `LMB` drag | change radius (^535) | `LMB` drag: change radius (all selected segments) | unit `editor/selection.test` (strong), `editor/controlSnap.test` (strong), `editor/controls.test` (strong) | |
| ^699 | any mode, several nodes selected, pointer on one of them or on a segment between them | `RMB` click | ^434 | `RMB`: delete selected (^290) | unit `editor/rightClickSelected.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) | |
| ^700 | the heading of an existing node is dragged, it snapped to something | `Shift` held | ^335 | `Shift`: aim at snap suggestion | unit `editor/modes.test` (strong), `editor/headingSnap.test` (weak), `editor/branching.test` (weak) | |
| ^701 | the heading of an existing node is dragged, it snapped to something | `Shift` + `Alt` held | ^335 | `Shift+Alt`: aim away from snap suggestion | unit `editor/headingSnap.test` (strong), `editor/modes.test` (strong), `editor/branching.test` (weak) | |
| ^702 | a handle is dragged, the pointer snapped to a touching point or a heading | `Alt` held | ^301 | `Alt`: opposite heading | unit `editor/touching.test` (weak), `editor/branching.test` (weak), `editor/controlSnap.test` (weak) | |
| ^703 | a node is dragged onto another node, released | `LMB` release | merge nodes by drop (^248) | `LMB`: merge on release (while dragging) | unit `editor/merging.test` (strong), `editor/ownCurve.test` (strong), `editor/dropMerge.test` (strong) | |
| ^704 | a node is dragged onto a curve, released | `LMB` release | join node into a curve by drop (^680) | none (the dashed result shows, ^284) | unit `editor/ownCurve.test` (strong), `editor/branching.test` (weak), `editor/cancelDrag.test` (weak) | |
| ^705 | a radius point is dragged onto a node of its segment | `LMB` release | ^141 | none | unit `editor/controlSnap.test` (strong), `curves/radiusHandles.test` (strong), `editor/ownCurve.test` (strong) | |
| ^706 | draw mode, nothing drawn, pointer on another node | `LMB` click | split road (^549) | `LMB`: split | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/controls.test` (strong) | |
| ^707 | draw mode, nothing drawn, pointer on a curve | `LMB` click | split road (^549); insert node (^10) | `LMB`: split | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/controls.test` (strong) | |
| ^708 | draw mode, nothing drawn, pointer on a curve | `LMB` drag | insert node (^10) | `LMB` drag: insert and set heading | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/controls.test` (strong) | |
| ^709 | draw mode, nothing drawn, pointer on a curve | `RMB` click | remove segment (^551) | `RMB`: remove segment | unit `editor/branching.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) | |
| ^710 | draw mode, nothing drawn, pointer on a curve | `Alt` + `RMB` click | remove branch (^552) | `Alt`+`RMB`: remove branch | unit `editor/branching.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) | |
| ^711 | draw mode, pointer on a radius point | `LMB` click | split road (^549); merge road (^550) | none (as on the curve) | unit `editor/extend.test` (strong), `editor/modes.test` (strong), `editor/branching.test` (strong) | |
| ^712 | draw mode, right after a split, pointer on the inserted node | `LMB` click | ^276 | none | unit `editor/radiusClick.test` (strong), `editor/modes.test` (strong), `editor/extend.test` (strong) | |
| ^713 | draw mode, right after a split on a curve, nothing placed after it | `Esc` or `RMB` click | ^237 | `Esc or RMB`: finish | unit `editor/controls.test` (strong), `editor/radiusClick.test` (strong); e2e `editing.spec` (strong) | |
| ^714 | extend mode, pointer on a node of another road | `LMB` click | merge road (^550) | `LMB`: merge | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/editor.test` (strong) | |
| ^715 | extend mode, pointer on a curve (also of the road itself) | `LMB` click | merge road (^550) | `LMB`: merge | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) | |
| ^716 | extend mode, pointer on the node the road started at | `LMB` click | close road (^162) | `LMB`: close | unit `editor/extend.test` (strong), `editor/branching.test` (strong), `editor/editor.test` (strong) | |
| ^717 | extend mode, pointer on a curve | `LMB` drag | insert node (^10) | `LMB` drag: insert and set heading | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/ownCurve.test` (strong) | |
| ^718 | extend mode, pointer on a curve | `RMB` click | remove segment (^551) | `RMB`: remove segment | unit `editor/editor.test` (strong), `editor/branching.test` (weak), `editor/concentricBuild.test` (weak) | |
| ^719 | extend mode, pointer on a curve | `Alt` + `RMB` click | remove branch (^552) | `Alt`+`RMB`: remove branch | unit `editor/controls.test` (strong), `editor/editor.test` (strong), `editor/branchSelect.test` (weak) | |
| ^720 | extend mode, a segment exists, empty canvas | `RMB` click or `Esc` | ^432 | `Esc or RMB`: finish | unit `editor/selection.test` (strong), `hints/hints.test` (weak), `editor/controls.test` (weak) | |
| ^721 | any mode, nothing selected, something pinned | `S` | ^258 | `S`: unpin all snap suggestions | unit `editor/pins.test` (strong), `editor/controls.test` (strong), `editor/modes.test` (strong) | |
| ^722 | any mode, no modal | `RMB` drag | pan (^501) | `RMB` drag: pan (hidden after use, ^110; missing in draw mode, ^389) | unit `editor/extend.test` (weak), `editor/modes.test` (weak) | |
| ^723 | any mode, no modal | wheel | zoom (^502) | wheel: zoom (hidden after use; missing in draw mode, ^389) | none found | |
| ^724 | any mode, no modal | `Ctrl` + wheel (a pinch on a touchpad) | zoom (^502) | none (^376) | unit `editor/phase.test` (weak) | |
| ^725 | any mode, no modal | `MMB` drag left or right | rotate (^503) | `MMB` drag: rotate (hidden after use; missing in draw mode, ^389) | unit `editor/extend.test` (weak), `editor/modes.test` (weak), `editor/radiusClick.test` (weak) | |
| ^726 | any mode, no modal | `MMB` drag up or down | zoom (^502) | none (the compass shows it while dragging) | unit `editor/extend.test` (strong), `camera/camera.test` (weak), `editor/modes.test` (weak) | |
| ^727 | the middle button is held (rotating) | `Esc` | ^31 | none (the compass shows the keys) | none found | |
| ^728 | the middle button is held (rotating) | `N`, `E`, `S`, `W` | rotate to a direction (^504) | the compass key caps | none found | |
| ^729 | the middle button is held (rotating), pointer on a compass key cap | `LMB` click | rotate to a direction (^504) | the compass key caps | unit `camera/cameraEngine.test` (weak), `editor/extend.test` (weak), `editor/modes.test` (weak) | |
| ^730 | touch, one finger | touch | ^40 | none (^382) | unit `editor/editor.test` (weak) | |
| ^731 | touch, a second finger comes down | touch | ^40 | none (^382) | unit `editor/editor.test` (strong), `editor/extend.test` (weak), `editor/modes.test` (weak) | |
| ^732 | touch, two fingers | twist, pinch, move | pan (^501); zoom (^502); rotate (^503) | none (^382) | none found | |
| ^733 | projects modal, pointer on a project card | `LMB` click | open project (^648) | `LMB`: open | unit `project/session.test` (weak), `project/load.test` (weak); e2e `projects.spec` (weak) | |
| ^734 | projects modal, pointer on the pen of a card | `LMB` click | rename project (^649) | `LMB`: rename (opens a text field) | unit `project/session.test` (weak); e2e `projects.spec` (weak) | |
| ^735 | projects modal, a name is being typed | `Enter` or `LMB` on the check | rename project (^649) | `Enter`/`LMB`: rename | unit `hints/hints.test` (weak) | |
| ^736 | projects modal, a name is being typed | `Esc` or `LMB` on the cross | ^233 | `Esc or LMB`: cancel | unit `hints/hints.test` (weak) | |
| ^737 | projects modal, pointer on the bin of a card | `LMB` click | delete project (^650) | `LMB`: delete (asks first, ^233) | unit `project/session.test` (weak); e2e `projects.spec` (weak) | |
| ^738 | projects modal, a delete is being asked | `LMB` on the check | delete project (^650) | `LMB`: delete | unit `hints/hints.test` (weak) | |
| ^739 | projects modal, a delete is being asked | `Esc` or `LMB` on the cross | ^233 | `Esc or LMB`: cancel | unit `hints/hints.test` (weak); e2e `projects.spec` (weak) | |
| ^740 | projects modal, the search field has the focus | typing | ^427 | none (the field is the control) | none found | |
| ^741 | projects modal, a rename is unfinished | `LMB` outside the dialog, `Esc`, `P` | ^233 | warning toast `Finish or cancel the rename first.` | none found | |

## Part 5: open bugs found

| Hat | Status | What |
|---|---|---|
| ^378 | open (found in the audit ^371) | The mode icons' tooltips never show: |
| ^384 | open (roadmap, no milestone; user, found in the audit ^371) | The `Tab` hint is missing in view mode: |
| ^385 | open (roadmap, no milestone; user, found in the audit ^371) | "No project matches." with no project at all: |
| ^387 | open (roadmap, no milestone; user: it should be grayed out too, found in the aud | The projects modal does not gray out the recent history panel (user): |
| ^389 | open (roadmap, no milestone; user's question, found in the audit ^371; the code  | The camera hints are missing in draw mode (user's question): |
| ^419 | open (roadmap, no milestone; user, found in the audit ^371; the audit only docum | The start node counts as selected in extend mode (user): |
| ^438 | open (roadmap, no milestone; user, found in the audit ^371; the audit only docum | Cancelling the first node says `finish` and `finish road` (user): |
| ^472 | open (roadmap, no milestone; user, found in the audit ^371; the cause is not fou | `Ctrl` held on its own does not take the snap away until the pointer moves (user): |
| ^473 | open; fix planned in ^481 (roadmap, no milestone; user's observation, found in t | The `Shift` hint shows although `Shift` changes nothing here (user): |
| ^494 | open (roadmap, no milestone; user's step 35, found in the audit ^371; checked wi | A click on a node without a segment says `split` (user): |

## Part 6: planned features and chores from the audit

| Hat | Type | What |
|---|---|---|
| ^363 | feature | Partially parallel segments (user, figure ^364): |
| ^368 | feature | Debug layer (user): |
| ^374 | feature | Version display and favicon (user): |
| ^376 | feature | `Ctrl` + wheel zooms faster, with a hint (user): |
| ^379 | chore | Test gap: `Ctrl+S` with nothing to save has no e2e test: |
| ^380 | chore | Test gap: the `Alt` variants of nothing to undo and nothing to redo: |
| ^381 | chore | Test gap: the mouse cursor: |
| ^382 | chore | Test gap: touch controls: |
| ^383 | chore | Test gap: the scale bar and the compass: |
| ^388 | chore | A reusable modal component (user's question: "modals are also a reusable component, right?"): |
| ^390 | feature | The selection is persisted (user): |
| ^418 | feature | The `Alt` note on the undo hint only when it applies (user): |
| ^421 | chore | Hint wording: `place node` instead of `add node` (user): |
| ^449 | feature | The undo history is persisted (feature): |
| ^451 | chore | Test gap: closing the page saves: |
| ^452 | feature | Also save when the page becomes hidden (Claude, extends ^447): |
| ^463 | chore | Test gap: the compass directions and the label of the first node of an arm: |
| ^464 | feature | The preview keeps the cancelled or previous heading (user): |
| ^470 | feature | A measurement label has the color of its line (user): |
| ^474 | feature | Shorter hint: `snap only position` (user): |
| ^479 | chore | Test gap: what the preview draws: |
| ^481 | feature | The `Shift` hint only when the heading actually snaps (user): |
| ^482 | feature | Draw order of the canvas (user): |
| ^497 | chore | E2E scenarios from the audit (user's idea): |
| ^498 | feature | The offset label of a heading is orange (user): |
| ^500 | chore | Test gap: the offset label of a heading: |

## Part 7: all other features

The rest of `docs/features.md`, in the same order. `= ^N` is an existing hat that already describes exactly this thing.

| Hat | Name | Category | Code | Certain? | Tests |
|---|---|---|---|---|---|
| (existing) ^502 | Zoom with an MMB drag up or down, 1% per pixel, about the same point | operation | camera/pivotDrag.ts | certain | unit `camera/camera.test` (strong), `camera/bounds.test` (weak) |
| (existing) ^504 | Rotate to a compass direction with a click on a key cap of the compass | operation | camera/camera.svelte.ts compassClick | certain | unit `camera/cameraEngine.test` (weak) |
| (existing) ^535 | Change the radius of a segment by dragging a radius point | operation | editor/ops.ts dragStep | certain | unit `editor/controlSnap.test` (strong), `editor/selection.test` (strong), `curves/continuity.test` (weak) |
| (existing) ^534 | Bend a curve by dragging its bend point | operation | editor/ops.ts dragStep | certain | unit `editor/branching.test` (weak), `editor/controlSnap.test` (weak), `editor/editor.test` (weak) |
| (existing) ^4 | World coordinates: meters, origin at the map centre, x right, y down; rot 0 has north up | data | camera/view.ts | certain | unit `camera/view.test` (weak) |
| ^505 | Two fingers: twist rotates, pinch zooms, moving both pans, about the midpoint | operation | camera/twoFinger.ts | certain | unit `camera/camera.test` (strong), `camera/view.test` (weak), `camera/cameraBounds.test` (weak) |
| (existing) ^236 | The camera is stored with a project and restored when it is opened | persistence | camera/camera.svelte.ts state restore | certain | e2e `camera.spec` (strong) |
| (existing) ^33 | While the middle button is held the cursor is a compass (needle to north, inner ring says what dragging does, key caps N E S W) | presentation | hud/Compass.svelte | certain | no unit test runs this file; none found |
| (existing) ^34 | The scale bar shows during an MMB drag and for 2 s after any wheel or pinch zoom | presentation | camera/camera.svelte.ts scaleBarVisible | certain | unit `camera/cameraEngine.test` (strong), `camera/camera.test` (weak) |
| (existing) ^35 | The background grid (switched off) | presentation | camera/view.ts gridStep, features.ts | certain | none found |
| ^506 | A right-button press that moves 4 px or less is a click, not a pan | rules | camera/camera.svelte.ts CLICK_SLOP_PX | certain | unit `camera/camera.test` (weak), `camera/cameraEngine.test` (weak) |
| (existing) ^376 | Ctrl+wheel (a touchpad pinch) zooms 4 times faster | rules | MapCanvas.svelte PINCH_BOOST | certain | no unit test runs this file; none found |
| ^508 | The scale stays between 0.02 and 400 px per meter | rules | camera/view.ts MIN_SCALE MAX_SCALE | certain | none found |
| ^509 | A dead zone of 20 px per axis around the MMB drag start, so a mostly vertical drag does not rotate | rules | camera/pivotDrag.ts DEAD_ZONE_PX | certain | unit `camera/camera.test` (strong) |
| ^510 | Esc during an MMB drag cancels it and restores the view from before the drag (it does not finish a road) | rules | camera/camera.svelte.ts cancelRotate | certain | unit `camera/cameraEngine.test` (strong), `camera/bounds.test` (weak), `camera/camera.test` (weak) |
| ^511 | After a direction jump the drag goes on from there with a fresh dead zone | rules | camera/pivotDrag.ts setRotation | certain | unit `camera/camera.test` (strong) |
| (existing) ^37 | The camera cannot leave the content: at least 12 px of the skeleton bounds stay on screen | rules | camera/bounds.ts MIN_VISIBLE_PX | certain | unit `camera/cameraBounds.test` (strong), `camera/cameraEngine.test` (strong), `camera/bounds.test` (weak) |
| ^512 | With nothing drawn the view does not pan at all | rules | camera/bounds.ts constrainView | certain | unit `camera/cameraEngine.test` (strong), `camera/bounds.test` (strong), `camera/camera.test` (weak) |
| (existing) ^62 | The content bounds are the skeleton, curves and node dots, not the control points; never drawn | rules | camera/skeletonAnchors.ts | certain | unit `camera/skeletonAnchors.test` (strong), `camera/bounds.test` (weak), `camera/cameraBounds.test` (weak) |
| ^513 | Opening a project puts the camera back without the view being pulled toward the old content | rules | project/session.svelte.ts showCamera | certain | unit `project/cameraSaved.test` (strong), `camera/cameraEngine.test` (weak); e2e `camera.spec` (weak) |
| ^514 | The node handle is hit within 9 px (mouse) or 16 px (touch); nodes win over other handles | control points | curves/handles.ts hitHandle | certain | unit `curves/radiusHandles.test` (weak), `editor/towers.test` (weak) |
| ^515 | The other handles are hit within 11 px (mouse) or 20 px (touch), in the order heading, bend, corners, radius | control points | curves/handles.ts hitHandle | certain | unit `curves/curves.test` (weak), `curves/middleDrag.test` (weak), `editor/towers.test` (weak) |
| (existing) ^126 | The heading control point sits on the arrow, 40 px from the node | control points | curves/handles.ts handlesOf | certain | unit `curves/curves.test` (weak), `curves/middleDrag.test` (weak); e2e `editing.spec` (weak) |
| ^516 | The bend point (control point of a bend) where the two heading lines meet | control points | curves/handles.ts edgeHandles | certain | unit `curves/curves.test` (strong), `editor/controls.test` (weak); e2e `editing.spec` (weak) |
| (existing) ^128 | Radius control points: one in the middle of an arc and one at each end | control points | curves/handles.ts radiusHandles | certain | unit `curves/radiusHandles.test` (strong), `editor/selection.test` (strong), `curves/continuity.test` (weak) |
| (existing) ^139 | A radius end point within 14 px of a node is not offered | control points | curves/handles.ts AT_NODE_PX | certain | unit `curves/radiusHandles.test` (strong), `curves/continuity.test` (weak), `editor/controlSnap.test` (weak) |
| (existing) ^132 | The corner points of an S-curve turn the heading of their node | control points | curves/handles.ts cornerHandles | certain | unit `curves/middleDrag.test` (strong), `camera/skeletonAnchors.test` (weak), `curves/curves.test` (weak) |
| (existing) ^105 | A hook's corner points are derived and cannot be dragged | control points | curves/handles.ts cornerHandles | certain | none found |
| ^517 | Two nodes whose heading lines meet are joined by a bend: straight, arc, straight | curve model | curves/bend.ts bendEdge, classify.ts | certain | unit `curves/curves.test` (strong) |
| ^518 | A bend is only used if the heading lines meet ahead of the first node and behind the second (within 8 chord lengths) | curve model | curves/classify.ts | certain | unit `curves/curves.test` (strong), `curves/middleDrag.test` (strong), `curves/radiusHandles.test` (weak) |
| ^519 | S-curve: two arcs of one radius with a middle straight through the inflection point | curve model | curves/reverse.ts, anchored.ts, twoArc.ts | certain | unit `curves/continuity.test` (strong), `curves/curves.test` (strong); e2e `radii.spec` (weak) |
| ^520 | Hook: two arcs of one radius turning the same way | curve model | curves/anchored.ts, twoArc.ts | certain | unit `curves/arrows.test` (weak), `curves/curves.test` (weak) |
| (existing) ^172 | The shape of an edge is derived from positions, headings and radius; no shape tag is stored | curve model | curves/edge.ts buildEdge | certain | unit `curves/curves.test` (weak) |
| (existing) ^8 | Auto radius: the largest radius that fits | curve model | curves/bend.ts limitRadius | certain | unit `curves/curves.test` (strong), `curves/radiusHandles.test` (strong), `curves/continuity.test` (weak) |
| ^522 | The radius is at least 0.5 m unless nothing fits | curve model | curves/radius.ts RMIN | certain | none found |
| ^523 | A requested radius above the maximum is limited to the maximum | curve model | curves/radius.ts limitRadius | certain | none found |
| ^527 | The length of a curve is its arc length | measure | curves/measure.ts lengthOf | certain | unit `curves/measure.test` (weak) |
| ^528 | The bend angle of an arc in degrees | measure | curves/measure.ts bendAngleDeg | certain | unit `curves/measure.test` (weak) |
| ^529 | The middle of a curve, where the length is shown | measure | curves/measure.ts middleOf | certain | unit `curves/measure.test` (strong) |
| ^530 | The measurements: total length | measure | curves/measure.ts summaryOf | certain | none found |
| ^531 | The measurements: bounding box along the compass directions | measure | curves/measure.ts summaryOf extremes | certain | unit `curves/measure.test` (strong) |
| ^532 | The measurements: number of nodes and segments | measure | curves/measure.ts summaryOf | certain | unit `curves/measure.test` (weak) |
| ^533 | The measurements: radius minimum, maximum, average and median | measure | curves/measure.ts summaryOf | certain | unit `curves/measure.test` (weak) |
| (existing) ^121 | The edges of a path are built once per path and kept | performance | curves/path.ts edgesOf | certain | unit `curves/edgeCache.test` (weak) |
| ^536 | A lane is 3 m wide | presentation | curves/lane.ts LANE_WIDTH_M | certain | none found |
| (existing) ^91 | The road outline is 2 px, scaled down when it would take more than 20% of the road width | presentation | curves/lane.ts outlinePx | certain | unit `curves/lane.test` (strong) |
| ^537 | The new node's automatic heading makes the new segment one circular arc | rules | curves/path.ts autoHeading | certain | unit `curves/curves.test` (weak), `curves/middleDrag.test` (weak), `editor/touching.test` (weak) |
| (existing) ^65 | The automatic heading of a node placed before the first node of a road | rules | curves/path.ts autoHeadingBefore | certain | unit `editor/extend.test` (strong), `curves/middleDrag.test` (strong), `editor/editor.test` (weak) |
| ^538 | The bend point cannot come closer than 0.7 m to a node | rules | curves/drag.ts CTRL_MIN_DIST | certain | none found |
| (existing) ^332 | A radius within a millimeter of the maximum is auto | rules | curves/drag.ts toRequested | certain | unit `curves/curves.test` (weak), `curves/radiusHandles.test` (weak) |
| ^539 | Headings never change when radii do | rules | curves/drag.ts applyDrag | certain | unit `curves/curves.test` (strong) |
| ^540 | The nearest point of the curves to a position within a distance | rules | curves/path.ts nearestOnCurve | certain | unit `curves/continuity.test` (weak), `snap/snap.test` (weak) |
| ^541 | Dragging while a node is placed sets its heading, measured from where it was placed | drawing | editor/ops.ts placeStep | certain | unit `editor/editor.test` (strong), `editor/cancelDrag.test` (strong), `editor/modes.test` (strong) |
| ^542 | The cursor is a hand over a handle | feedback | editor/targets.ts cursorOf | certain | none found |
| ^543 | The cursor is a copy cursor over a curve in draw mode | feedback | editor/targets.ts cursorOf | certain | unit `editor/controls.test` (weak), `editor/editor.test` (weak), `editor/extend.test` (weak) |
| ^544 | The cursor is a pointer over a curve in select mode | feedback | editor/targets.ts cursorOf | certain | unit `editor/editor.test` (strong), `editor/branching.test` (weak), `editor/controls.test` (weak) |
| ^545 | The cursor is a crosshair in draw mode | feedback | editor/targets.ts cursorOf | certain | unit `editor/modes.test` (strong), `editor/controls.test` (weak), `editor/editor.test` (weak) |
| ^546 | The cursor is the default arrow in select mode | feedback | editor/targets.ts cursorOf | certain | unit `editor/editor.test` (strong), `editor/controls.test` (weak), `editor/extend.test` (weak) |
| (existing) ^49 | What the control hints are about is derived from what is under the pointer | feedback | editor/targets.ts targetOf | certain | unit `editor/modes.test` (strong) |
| ^547 | A step has a name: place node, move node, turn heading, bend curve, change radius, insert node, split road, merge road, close road, extend road, finish road, delete node, select N nodes, deselect all | history | editor/stepNames.ts | certain | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `editor/steps.test` (strong) |
| ^548 | Selecting and deselecting say how many nodes in the step name | history | editor/stepNames.ts selectionName | certain | unit `editor/steps.test` (strong), `editor/controls.test` (weak), `editor/selection.test` (weak) |
| (existing) ^78 | All scaffold gizmos are hidden while a group moves | presentation | editor/editor.svelte.ts movingGroup, phase.ts | certain | unit `editor/phase.test` (strong), `editor/selection.test` (weak) |
| (existing) ^284 | While dragging onto a merge the curves the node would then have are shown dashed | presentation | editor/drop.ts dropPreview | certain | unit `editor/dropMerge.test` (strong), `editor/ownCurve.test` (strong), `editor/controlSnap.test` (weak) |
| ^558 | While a drop merges, the segments it would replace are not drawn | presentation | editor/drop.ts roadsShown | certain | no unit test runs roadsShown; none found |
| (existing) ^99 | The hovered segment gets an outline, with Alt the whole branch | presentation | editor/selection.ts hoveredEdges | certain | unit `editor/controls.test` (strong), `editor/hoverFresh.test` (strong), `editor/concentricBuild.test` (weak) |
| ^559 | A hovered or dragged handle, or a node being placed, reveals its gizmos (focus) | presentation | editor/hits.ts focusOf | certain | unit `editor/modes.test` (strong), `editor/controls.test` (strong); e2e `editing.spec` (weak) |
| (existing) ^55 | Control points show when the pointer is within 48 px, a curve counts as hovered within 20 px | presentation | editor/proximity.ts | certain | unit `editor/proximity.test` (strong), `camera/skeletonAnchors.test` (weak), `editor/branching.test` (weak) |
| (existing) ^125 | The preview of the curve a merge would add | presentation | editor/targets.ts mergePreview | certain | unit `editor/branching.test` (strong), `editor/editor.test` (weak), `editor/ownCurve.test` (weak) |
| (existing) ^350 | A run bar joins the nodes of a run beside their circles | presentation | editor/towers.ts barsOf | certain | unit `editor/towers.test` (weak), `editor/pins.test` (weak), `editor/snapping.test` (weak) |
| (existing) ^344 | The tower line through the radius points of interlocked segments | presentation | editor/parallel.ts controlTower | certain | unit `editor/sharedRadius.test` (strong), `editor/controlSnap.test` (strong); e2e `radii.spec` (strong) |
| (existing) ^361 | The other control points on the tower line are shown as rings | presentation | editor/parallel.ts | certain | unit `editor/sharedRadius.test` (strong), `editor/controlSnap.test` (weak), `editor/towers.test` (weak) |
| (existing) ^113 | The old places of moved nodes are shown | presentation | editor/snapping.ts previousPlaces | certain | no unit test runs previousPlaces; none found |
| (existing) ^281 | A new node's segment gets the radius that makes it concentric with a touching segment | rules | editor/ops.ts placeNode, sharedRadius.ts concentricWithParallel | certain | unit `editor/concentricBuild.test` (strong), `editor/controlSnap.test` (strong), `editor/towers.test` (strong) |
| (existing) ^331 | The preview of a click shows the radius the new segment gets | rules | editor/sharedRadius.ts previewRadius | certain | unit `editor/concentricBuild.test` (strong), `editor/controlSnap.test` (strong), `editor/controls.test` (weak) |
| (existing) ^419 | A node just placed, inserted, split, merged or extended from is selected | rules | editor/ops.ts | certain | unit `editor/controls.test` (strong), `editor/radiusClick.test` (strong), `editor/reach.test` (strong) |
| ^560 | A press that moves 6 px or less (screen) is a click | rules | editor/types.ts DRAG_PX | certain | unit `editor/extend.test` (weak) |
| (existing) ^319 | A node placed on a snap line copies the line's normal; dragging its heading there copies nothing | rules | editor/ops.ts, snap/heading.ts | certain | unit `editor/cancelDrag.test` (strong), `editor/controlSnap.test` (strong), `editor/editor.test` (strong) |
| ^561 | Extending from a node that only has outgoing edges draws the road backwards (new nodes go before it) | rules | editor/ops.ts extendTo, model/junction.ts DrawEnd | certain | unit `editor/extend.test` (strong), `editor/branching.test` (strong), `editor/controls.test` (weak) |
| (existing) ^437 | A road with fewer than two nodes is cancelled when it is finished | rules | editor/ops.ts finishedGraph | certain | unit `editor/extend.test` (weak), `editor/modes.test` (weak), `editor/steps.test` (weak) |
| (existing) ^237 | A split on a curve that is finished at once gives the curve back | rules | editor/ops.ts finishedGraph, editor.svelte.ts splitUndo | certain | unit `editor/controls.test` (strong), `editor/radiusClick.test` (strong); e2e `editing.spec` (strong) |
| (existing) ^276 | A click on the node inserted by a split keeps it and goes back to draw mode | rules | editor/editor.svelte.ts finishRoad keep | certain | unit `editor/radiusClick.test` (strong), `editor/modes.test` (strong), `editor/extend.test` (strong) |
| (existing) ^278 | A click on a radius point in draw mode splits or merges there like on the curve | rules | editor/editor.svelte.ts clickedRadius | certain | unit `editor/radiusClick.test` (strong), `editor/branching.test` (strong), `editor/editor.test` (strong) |
| (existing) ^160 | After a removal while drawing the road goes on from the node being drawn from if it is still there, else from its neighbour | rules | editor/ops.ts removeSegmentsFrom | certain | unit `editor/controls.test` (strong), `editor/branching.test` (strong), `editor/dropMerge.test` (strong) |
| (existing) ^290 | A right click on one of several selected nodes, or a segment between them, removes all selected nodes | rules | editor/removal.ts rightClickRemoval | certain | unit `editor/rightClickSelected.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) |
| (existing) ^234 | Flipping an arm keeps drawing from the same node, the other way | rules | editor/ops.ts flipArmFrom | certain | unit `editor/controls.test` (strong), `editor/editor.test` (strong), `editor/dropMerge.test` (weak) |
| (existing) ^335 | A dragged heading copies the heading of what it snapped to; Shift aims at it and Shift+Alt away | rules | editor/ops.ts headingOf | certain | unit `editor/headingSnap.test` (strong), `editor/modes.test` (weak) |
| (existing) ^254 | A node that snapped to a touching point takes the heading of that place | rules | editor/ops.ts snappedDrag | certain | unit `editor/touching.test` (strong), `editor/controlSnap.test` (strong), `editor/branching.test` (weak) |
| (existing) ^141 | A radius point snapped onto a node of its segment sets the radius to auto | rules | editor/ops.ts, curves/drag.ts | certain | unit `editor/controlSnap.test` (strong), `curves/radiusHandles.test` (strong), `editor/ownCurve.test` (strong) |
| (existing) ^77 | Dragging a radius of several selected segments gives the radius to all of them and keeps parallel ones concentric | rules | editor/press.ts withSharedRadius | certain | unit `editor/selection.test` (strong), `editor/sharedRadius.test` (strong); e2e `radii.spec` (weak) |
| ^562 | Dragging an S-curve corner | rules | editor/ops.ts | certain | unit `editor/editor.test` (weak) |
| (existing) ^268 | A node dropped on a curve or snapped to it joins the segment, which is split there | rules | editor/drop.ts curveUnder | certain | unit `editor/merging.test` (strong), `editor/branching.test` (strong), `editor/controlSnap.test` (strong) |
| (existing) ^295 | Esc while a node or control point is dragged or a node is placed puts everything back | rules | editor/editor.svelte.ts cancelPress | certain | unit `editor/cancelDrag.test` (strong), `editor/controlSnap.test` (strong), `editor/modes.test` (strong) |
| ^563 | A second finger takes the one-finger action back | rules | editor/editor.svelte.ts cancelPress | certain | unit `editor/editor.test` (strong), `editor/extend.test` (strong), `editor/modes.test` (weak) |
| (existing) ^439 | A batch is a run of consecutive steps of one kind (selection, or a drawing session) | rules | editor/history.ts | certain | unit `editor/history.test` (strong), `editor/steps.test` (strong), `editor/controls.test` (weak) |
| ^564 | At most 200 steps are kept | rules | editor/history.ts MAX_STEPS | certain | none found |
| (existing) ^227 | A step that changes nothing is no step | rules | editor/editor.svelte.ts commit | certain | unit `editor/steps.test` (strong), `editor/undoRedo.test` (strong), `editor/cancelDrag.test` (weak) |
| ^565 | After an undo or redo the next step starts a batch of its own | rules | editor/history.ts sealed | certain | unit `editor/history.test` (strong), `hud/recent.test` (weak), `editor/branching.test` (weak) |
| ^566 | Opening a project clears the selection, the road being drawn and the history | rules | editor/editor.svelte.ts load | certain | unit `editor/branching.test` (strong), `editor/dropMerge.test` (strong), `editor/extend.test` (strong) |
| ^567 | Heading control points select only without a modifier and not in draw mode | rules | editor/press.ts selects | certain | unit `editor/editor.test` (strong), `hints/hints.test` (strong), `editor/extend.test` (strong) |
| ^568 | A click on empty canvas with nothing selected enters draw mode; Shift click does nothing | rules | editor/selection.ts afterEmptyClick | certain | unit `editor/selection.test` (strong), `editor/controls.test` (strong), `hints/hints.test` (strong) |
| ^570 | Entering draw mode clears the selection | rules | editor/editor.svelte.ts enterDrawMode | certain | unit `editor/modes.test` (strong), `editor/steps.test` (strong), `editor/controls.test` (weak) |
| (existing) ^238 | What is under the pointer: a handle, else a curve (draw mode: a candidate), else the preview | rules | editor/hits.ts hoverAt | certain | unit `editor/editor.test` (strong), `editor/controls.test` (strong), `editor/modes.test` (strong) |
| ^571 | Hover is derived from the last pointer position, so keys, undo and view moves refresh it | rules | editor/editor.svelte.ts hoverRaw, modifiers, look | certain | unit `editor/controls.test` (strong), `editor/hoverFresh.test` (strong), `editor/editor.test` (weak) |
| (existing) ^138 | No split closer than 0.5 m to a node, and one reach for node and curve | rules | editor/chains.ts nearNode | certain | unit `editor/branching.test` (strong), `editor/reach.test` (strong), `editor/controls.test` (weak) |
| ^573 | A node without an edge is a chain of its own | rules | editor/chains.ts loneChain | certain | unit `editor/branching.test` (weak) |
| ^574 | Radius sharing: a segment's radius is stored as auto within a millimeter of its maximum | rules | editor/sharedRadius.ts storedRadius | certain | unit `editor/controlSnap.test` (strong), `editor/concentricBuild.test` (weak), `editor/selection.test` (weak) |
| ^575 | Radius sharing: a value above the maximum stays stored, clamped when drawn | rules | editor/sharedRadius.ts shareConcentric | certain | unit `editor/selection.test` (weak) |
| (existing) ^282 | Parallel segments get the dragged value plus the offset that keeps them concentric | rules | editor/sharedRadius.ts shareConcentric | certain | unit `editor/sharedRadius.test` (strong), `editor/concentricBuild.test` (weak); e2e `radii.spec` (weak) |
| (existing) ^324 | Which parallel segment governs: the dragged one's group, else the one on its branch, else the innermost | rules | editor/sharedRadius.ts governing | certain | unit `editor/controls.test` (weak), `editor/ownCurve.test` (weak); e2e `radii.spec` (strong) |
| (existing) ^302 | Only its own two nodes selected: the radius changes alone | rules | editor/sharedRadius.ts sharedWith | certain | unit `editor/sharedRadius.test` (strong), `editor/branchSelect.test` (weak); e2e `radii.spec` (weak) |
| (existing) ^334 | Parallel segments: their nodes touch at both ends and their arcs share centers | rules | editor/parallel.ts parallel | certain | unit `editor/sharedRadius.test` (strong), `editor/towers.test` (strong), `editor/selection.test` (strong) |
| ^576 | Parallel groups can have any number of lanes, transitively | rules | editor/parallel.ts withParallels | certain | unit `editor/sharedRadius.test` (weak) |
| (existing) ^352 | A tower is a chain of touching nodes ordered across the lanes | rules | editor/towers.ts towersOf | certain | unit `editor/towers.test` (strong), `editor/selection.test` (weak), `editor/sharedRadius.test` (weak) |
| (existing) ^356 | A control point is a snap point of its own place while dragged | rules | editor/snapping.ts ownPlace | certain | unit `editor/controlSnap.test` (strong), `editor/controls.test` (weak), `editor/headingSnap.test` (weak) |
| (existing) ^333 | A radius point can only reach the line it moves along | rules | editor/snapping.ts locusOf, reachOf | certain | unit `editor/controlSnap.test` (strong), `curves/continuity.test` (weak); e2e `radii.spec` (weak) |
| (existing) ^325 | Extend lines are left out at the node itself | rules | editor/snapping.ts withoutExtendAtTip | certain | unit `editor/ownCurve.test` (strong), `editor/branching.test` (weak), `editor/controls.test` (weak) |
| ^577 | Ctrl turns snapping off while held | rules | editor/snapping.ts snapFor | certain | unit `editor/snapping.test` (strong), `editor/snapHover.test` (weak); e2e `snapping.spec` (weak) |
| (existing) ^358 | Shift keeps only the snapped position, not the heading, on a click that places a node | rules | editor/snapping.ts placedAt | certain | unit `editor/touching.test` (strong), `hints/dragHints.test` (strong), `editor/editor.test` (strong) |
| (existing) ^258 | Pins: the snap suggestions of selected nodes are offered at any distance; each pin replaces the one before | rules | editor/pins.svelte.ts | certain | unit `editor/pins.test` (strong), `snap/snap.test` (strong); e2e `snapping.spec` (weak) |
| ^578 | Pins are editor state: no history step, not stored, gone nodes drop out | rules | editor/pins.svelte.ts | certain | unit `editor/pins.test` (strong), `editor/controls.test` (weak), `editor/undoRedo.test` (weak) |
| (existing) ^110 | Which controls were used (visited) is tracked per press | rules | editor/usage.ts controlUsed | certain | unit `editor/controls.test` (strong) |
| ^580 | Undo and redo are ignored while the left button is down | rules | editor/editor.svelte.ts move | certain | unit `editor/undoRedo.test` (strong), `editor/editor.test` (strong), `editor/modes.test` (weak) |
| ^581 | In view mode keys other than Tab are ignored by the editor | rules | editor/editor.svelte.ts key | certain | unit `editor/controls.test` (weak), `editor/modes.test` (weak) |
| (existing) ^422 | Select mode: no road is being drawn, default cursor, blue outline | modes | hud/modes.ts | certain | e2e `modes.spec` (weak); no unit test runs this file |
| (existing) ^423 | Draw mode: a preview shows the node a click would place, crosshair cursor | modes | editor/phase.ts | certain | unit `editor/modes.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) |
| (existing) ^424 | Extend mode: a road is being drawn from a node, orange outline, dashed preview | modes | editor/phase.ts | certain | unit `editor/ownCurve.test` (strong), `editor/branching.test` (strong), `editor/dropMerge.test` (strong) |
| (existing) ^425 | View mode: only the generated geometry, only the camera works | modes | editor/editor.svelte.ts viewing | certain | unit `editor/modes.test` (weak) |
| (existing) ^426 | Projects modal | project | project/ProjectsModal.svelte | certain | no unit test runs this file; none found |
| (existing) ^440 | Toast `saved` | toasts | project/session.svelte.ts saveNow | certain | none found |
| (existing) ^441 | Toast `nothing to save yet` | toasts | project/session.svelte.ts saveNow | certain | unit `project/load.test` (weak) |
| (existing) ^442 | Toast `modelcity saves automatically` | toasts | project/session.svelte.ts saveNow | certain | none found |
| (existing) ^443 | Toast `nothing to undo` | toasts | App.svelte noHistory | certain | no unit test runs this file; none found |
| (existing) ^444 | Toast `nothing to redo` | toasts | App.svelte noHistory | certain | no unit test runs this file; none found |
| (existing) ^106 | The map is a directed graph of nodes and edges (an edge runs from start to end) | data | model/graph.ts | certain | unit `model/graph.test` (strong), `curves/edgeCache.test` (weak) |
| ^582 | Edges refer to a lane with a width; the default lane is 3 m | data | model/graph.ts DEFAULT_LANE | certain | none found |
| (existing) ^170 | Lengths are rounded to the millimeter when a change is committed | data | model/graph.ts roundToMm | certain | none found |
| ^584 | Removing a node with one edge in and one out joins its neighbours (radius auto) | rules | model/graph.ts removeNode | certain | unit `model/graph.test` (strong), `editor/controlSnap.test` (weak), `model/ring.test` (weak) |
| (existing) ^322 | A ring of two nodes does not join into a loop when one node is removed | rules | model/graph.ts removeNode | certain | unit `model/ring.test` (strong) |
| ^585 | Removing nodes also removes nodes left without an edge, except the first node of the road being drawn | rules | model/graph.ts removeNodes | certain | unit `model/graph.test` (strong), `model/ring.test` (strong), `editor/branching.test` (weak) |
| (existing) ^133 | Selected segments are the edges whose two nodes are both selected | rules | model/graph.ts edgesBetween | certain | unit `editor/selection.test` (strong), `editor/towers.test` (weak); e2e `radii.spec` (weak) |
| ^587 | What a click on a node does in draw mode: finish, close, extend, split or merge | rules | model/junction.ts nodeAction | certain | unit `hints/hints.test` (strong), `model/graph.test` (strong), `editor/extend.test` (weak) |
| (existing) ^191 | What a click on a curve does in draw mode: split or merge | rules | model/junction.ts curveAction | certain | unit `hints/hints.test` (strong), `editor/branching.test` (strong), `editor/editor.test` (strong) |
| (existing) ^239 | A merge right after clicking the first node runs out of that node (order of the clicks) | rules | model/junction.ts mergeEnd | certain | unit `editor/extend.test` (strong), `editor/dropMerge.test` (weak), `editor/editor.test` (weak) |
| ^588 | A branch is a chain of nodes without splits or merges; its ends have a number of edges other than two | rules | model/junction.ts branchOfEdge | certain | unit `editor/branchSelect.test` (strong), `model/graph.test` (strong) |
| (existing) ^131 | The branch of a node where branches meet is the one that goes on in drawing direction, else the one before | rules | model/junction.ts branchOfNode | certain | unit `editor/controls.test` (weak), `model/graph.test` (weak), `model/merge.test` (weak) |
| (existing) ^130 | An arm is all nodes connected to a node | rules | model/junction.ts armOf | certain | none found |
| (existing) ^90 | The road surface: every segment is a lane wide with an outline; outlines are drawn first then surfaces so crossing roads merge | presentation | render/scene.ts drawLanes | certain | no unit test runs this file; none found |
| ^590 | View mode draws only the road surface, no skeleton, no scaffold | presentation | render/scene.ts drawScene | certain | no unit test runs this file; none found |
| (existing) ^60 | The skeleton: curves 2 px and node dots 5.5 px, always shown | presentation | render/scene.ts CURVE_PX NODE_DOT_PX | certain | no unit test runs this file; none found |
| ^591 | A selected node is blue and 150% larger | presentation | render/scene.ts SELECTED_DOT_PX | certain | no unit test runs this file; none found |
| ^592 | A pinned node is drawn turquoise | presentation | render/scene.ts drawNodes | certain | no unit test runs this file; none found |
| (existing) ^231 | A selected segment's curve and direction arrows are blue | presentation | render/scene.ts drawRoad | certain | no unit test runs this file; none found |
| (existing) ^80 | Direction chevrons along curves every 72 px, pointing the way the road runs | presentation | render/scene.ts drawDirection | certain | no unit test runs this file; none found |
| (existing) ^66 | The scaffold of a segment is shown all or nothing, for one segment at a time | presentation | render/scaffold.ts activeSegment | certain | unit `render/scaffold.test` (strong) |
| ^593 | Which segment shows its scaffold: the hovered control point's, else the curve under the pointer within 20 px, else the closest control point within 48 px | presentation | render/scaffold.ts | certain | unit `render/scaffold.test` (strong), `editor/branching.test` (weak), `editor/editor.test` (weak) |
| ^594 | Selected segments show their scaffold together | presentation | render/scaffold.ts withSelectedTogether | certain | unit `render/scaffold.test` (strong), `editor/selection.test` (strong) |
| ^595 | A node's heading arrow belongs to the scaffold of the segments on both sides; a node without a segment always shows it | presentation | render/scaffold.ts arrowShown | certain | unit `render/scaffold.test` (strong), `editor/focus.test` (strong), `editor/sharedRadius.test` (weak) |
| ^596 | The heading arrow is twice as long as the distance to its control point (80 px) | presentation | render/scene.ts drawArrow | certain | e2e `editing.spec` (weak); no unit test runs this file |
| ^597 | Heading lines of a segment through the corner point, or a short stub | presentation | render/guides.ts drawGuides | certain | no unit test runs this file; none found |
| ^598 | The circle of an arc | presentation | render/guides.ts drawCircles | certain | no unit test runs this file; none found |
| ^599 | The inflection point of an S-curve or hook | presentation | render/guides.ts drawCorners | certain | no unit test runs this file; none found |
| ^600 | Orange filled control points (heading, bend, corner, radius), a radius point a little larger | presentation | render/scene.ts drawHandles | certain | e2e `editing.spec` (weak); no unit test runs this file |
| (existing) ^230 | A hovered or dragged control point is as large as a selected node | presentation | render/scene.ts isFocused | certain | no unit test runs this file; none found |
| (existing) ^79 | In draw mode a curve under the pointer gets a ring and a tick: the place for an inserted node | presentation | render/scene.ts drawHover | certain | no unit test runs this file; none found |
| ^601 | The preview of the next node: a dot and an orange arrow at 60% opacity | presentation | render/scene.ts drawPreview | certain | no unit test runs this file; none found |
| (existing) ^321 | The preview of the next segment: a dashed curve with its dashed heading lines and measurements | presentation | render/scene.ts drawPreview | certain | no unit test runs this file; none found |
| ^602 | The selection box: a blue rectangle with a light fill | presentation | render/scene.ts drawBand | certain | no unit test runs this file; none found |
| ^603 | Snap guides: turquoise lines and curves 1.5 px, rings at snap points | presentation | render/snapGuides.ts | certain | no unit test runs this file; none found |
| ^604 | The outline of the hovered segment or branch: 20 px across, a half circle at each end, on top of everything | presentation | render/outline.ts | certain | no unit test runs this file; none found |
| ^605 | The outline is at least 8 px wider than the road surface | presentation | render/outline.ts OUTLINE_MARGIN_PX | certain | no unit test runs this file; none found |
| (existing) ^482 | Draw order of the scene: surface, scaffold, curves, arrows, handles, preview, tower, snap, previous, drop preview, band, bars, nodes, outlines | presentation | render/scene.ts drawScene | certain | no unit test runs this file; none found |
| (existing) ^316 | The heading label of a node being placed: the compass icon with degrees (first node of an arm) | presentation | render/compass.ts drawCompass | certain | no unit test runs this file; none found |
| (existing) ^341 | The offset label of a heading being turned (beside the arrow, with a sign) | presentation | render/compass.ts drawOffset | certain | no unit test runs this file; none found |
| ^607 | The length of a segment shown at its middle | presentation | render/measures.ts lengthAtMiddle | certain | no unit test runs this file; none found |
| ^608 | The bend angle and radius label at the bend | presentation | render/measures.ts bendLines | certain | no unit test runs this file; none found |
| ^609 | The length of a bend inside the bend at the middle radius point | presentation | render/measures.ts lengthOfBend | certain | no unit test runs this file; none found |
| (existing) ^470 | Labels are orange (orange-ink) text, one line height 13 px | presentation | render/measures.ts label | certain | no unit test runs this file; none found |
| ^610 | The scale bar: a bar and a length (cm, m, km) of a round number at least 80 px wide | presentation | render/render.ts drawScaleBar | certain | no unit test runs this file; none found |
| (existing) ^83 | One font size of all text, 12 px | presentation | render/paint.ts FONT_PX | certain | no unit test runs this file; none found |
| (existing) ^377 | The colors come from CSS variables, read at each frame (dark and light) | presentation | render/paint.ts readPalette | certain | no unit test runs this file; none found |
| (existing) ^145 | The test hook window.__modelcity (development only) | dev | testHook.ts | certain | no unit test runs this file; none found |
| ^613 | Features that are built but switched off are listed in features.ts | dev | features.ts | certain | none found |
| ^614 | Control hints panel in the top left: rows of inputs (mouse glyphs, key caps) and what they do, without a background | feedback | hints/Hints.svelte | certain | no unit test runs this file; none found |
| ^615 | A hint row with several inputs for the same thing shows them joined by `or` | feedback | hints/Hints.svelte | certain | e2e `projects.spec` (weak); no unit test runs this file |
| (existing) ^103 | A hint can have a note with a key (`(Alt to undo batch)`) | feedback | hints/Hints.svelte | certain | no unit test runs this file; none found |
| (existing) ^181 | Hints for the current mode, what is under the pointer, selection and drag state | feedback | hints/hints.ts hintsFor | certain | unit `hints/hints.test` (strong) |
| (existing) ^286 | While a handle is dragged the hints are only about the drag | feedback | hints/hints.ts dragHints | certain | unit `hints/dragHints.test` (strong) |
| (existing) ^142 | Hint wording: verbs only (`finish`, `extend`, `split`, `merge`) | feedback | hints/hints.ts | certain | unit `hints/hints.test` (weak) |
| ^616 | `Tab` hint on top: view mode or select mode | feedback | hints/hints.ts tabHints | certain | unit `editor/modes.test` (weak), `hints/hints.test` (weak) |
| ^617 | `P`: projects hint always shown | feedback | hints/hints.ts PROJECT_HINTS | certain | none found |
| ^618 | Hints of controls that were used lately are hidden for 5 minutes, each on its own | feedback | hints/usage.svelte.ts VISITED_MS | certain | unit `hints/hints.test` (strong), `hints/usage.test` (strong) |
| ^619 | The `Ctrl` and `Shift` and `Alt` hints are never hidden by use | feedback | hints/hints.ts snapHints | certain | none found |
| ^620 | `S` hint: pin snap suggestions (with nodes selected) or unpin all (with none selected and something pinned) | feedback | hints/hints.ts snapHints | certain | unit `editor/pins.test` (strong), `snap/snap.test` (strong); e2e `snapping.spec` (weak) |
| (existing) ^301 | The `Alt` hint `opposite heading` shows while the pointer is snapped to a heading | feedback | hints/hints.ts snapHints | certain | none found |
| (existing) ^81 | Undo and redo hints, only while there is something to undo or redo | feedback | hints/hints.ts historyHints | certain | unit `hints/hints.test` (strong), `hud/panel.test` (weak) |
| ^621 | Toast: the pin tip text `Select the node and press [S] to pin its snap suggestions` | feedback | hints/pinTip.ts | certain | unit `hints/dragHints.test` (weak), `hints/hints.test` (weak) |
| ^622 | Toast: the heading tip text `Snap to something to copy its heading` | feedback | hints/headingTip.ts | certain | none found |
| (existing) ^119 | The mode icons (eye, pointer, pen, extend) with the current one in its color and ring | feedback | hud/ModeFrame.svelte, hud/modes.ts | certain | no unit test runs this file; none found |
| ^623 | The screen outline in the color of the mode (none in view mode) | feedback | hud/ModeFrame.svelte | certain | no unit test runs this file; none found |
| ^624 | View mode shows only the eye and the pointer icons | feedback | hud/modes.ts shownIn | certain | no unit test runs this file; none found |
| (existing) ^378 | The mode icons have a name as tooltip that never shows | feedback | hud/ModeFrame.svelte title | certain | no unit test runs this file; none found |
| (existing) ^107 | The recent history panel: the last 7 rows, with undone ones grayed | feedback | hud/panel.ts panelView | certain | unit `hud/panel.test` (strong), `hud/recent.test` (strong); e2e `editing.spec` (strong) |
| ^625 | At most 3 undone rows are shown in the panel | feedback | hud/panel.ts MAX_UNDONE | certain | unit `hud/panel.test` (strong), `hud/recent.test` (strong); e2e `editing.spec` (weak) |
| (existing) ^108 | The rows of a batch are grouped and share one right border | feedback | hud/panel.ts, HistoryPanel.svelte | certain | unit `hud/panel.test` (strong) |
| ^626 | A batch of more than 5 steps shows its last 4 and `(N more steps)` | feedback | hud/panel.ts MANY SHOWN | certain | unit `hud/panel.test` (strong); e2e `editing.spec` (weak) |
| ^627 | A run of selection steps is one row named by what it selected in the end; a run that ends where it began has no row | feedback | hud/panel.ts collapse | certain | unit `hud/panel.test` (strong), `editor/steps.test` (strong) |
| (existing) ^241 | The undo and redo hints sit at the bottom of the panel, only if it has rows | feedback | hud/panel.ts panelHints | certain | unit `hud/panel.test` (strong), `editor/steps.test` (weak); e2e `editing.spec` (strong) |
| (existing) ^323 | The measurements panel, bottom left, only with at least one segment selected | feedback | hud/MeasurementsPanel.svelte | certain | no unit test runs this file; none found |
| ^628 | Measurements: `n nodes and m segments selected` | feedback | hud/MeasurementsPanel.svelte | certain | e2e `radii.spec` (weak); no unit test runs this file |
| ^629 | Measurements: `Box: 35 x 12 m` (whole meters; kilometers with one decimal) | feedback | hud/measureText.ts boxText | certain | unit `hud/measureText.test` (strong) |
| ^630 | Measurements: `Length: 120 m` (whole meters; km with two decimals) | feedback | hud/measureText.ts lengthText | certain | unit `hud/measureText.test` (strong) |
| ^631 | Measurements: `Curve radius: ...` one value or min, max, average and median | feedback | hud/measureText.ts radiusText | certain | unit `hud/measureText.test` (strong) |
| ^632 | The measurements panel lifts above the scale bar while that shows | feedback | App.svelte lifted | certain | no unit test runs this file; none found |
| (existing) ^232 | Toasts: short messages in the top right with the icon of their kind | feedback | ui/ToastList.svelte, Notice.svelte | certain | no unit test runs this file; none found |
| (existing) ^210 | A toast has the icon of its kind (info, warning, success, error) | feedback | ui/Notice.svelte | certain | no unit test runs this file; none found |
| ^633 | A key in square brackets in a message is shown as a key cap | feedback | ui/toastText.ts partsOf | certain | unit `ui/toastText.test` (weak), `ui/toasts.test` (weak) |
| (existing) ^385 | An empty list says `No project matches.` (the none text) | feedback | ui/FilterList.svelte | certain | no unit test runs this file; none found |
| (existing) ^193 | A refused file: `This is not a modelcity project file.` | feedback | project/file.ts REFUSAL_TEXT | certain | unit `project/file.test` (weak), `project/load.test` (weak); e2e `projects.spec` (weak) |
| (existing) ^195 | A refused file: newer version message | feedback | project/file.ts | certain | unit `project/file.test` (weak), `project/load.test` (weak); e2e `projects.spec` (weak) |
| (existing) ^196 | A refused file: old version message | feedback | project/file.ts | certain | unit `project/file.test` (weak), `project/load.test` (weak); e2e `projects.spec` (weak) |
| (existing) ^209 | A refused file: damaged, details in the console | feedback | project/file.ts | certain | unit `project/session.test` (weak), `project/load.test` (weak) |
| ^634 | A refused file: unreadable | feedback | project/file.ts | certain | unit `project/session.test` (weak) |
| ^635 | The console gets the hat of the refusal and where the file went wrong | feedback | project/migrate.ts refuse | certain | unit `project/session.test` (strong), `project/file.test` (strong) |
| (existing) ^190 | A project card: title, how long ago it was changed, the exact time as tooltip | feedback | project/ProjectCard.svelte | certain | e2e `projects.spec` (weak); no unit test runs this file |
| (existing) ^214 | `just now`, `17 minutes ago`, up to 8 weeks, then the date | feedback | project/time.ts formatAgo | certain | unit `project/time.test` (strong), `project/session.test` (weak) |
| ^636 | A card of an old version says `version N` after its title | feedback | project/file.ts versionLabel | certain | unit `project/load.test` (strong) |
| ^637 | The open project's card has an outline and the label `open` | feedback | project/ProjectCard.svelte | certain | e2e `projects.spec` (weak); no unit test runs this file |
| ^638 | Pen and bin icons inside the card; renaming and delete confirm change the card in place | feedback | project/ProjectCard.svelte | certain | no unit test runs this file; none found |
| ^639 | Delete asks first: the bin turns into a cross, the pen into a check | feedback | project/ProjectCard.svelte | certain | e2e `projects.spec` (weak); no unit test runs this file |
| ^640 | The `New project` card has the open project's outline while there is no project | feedback | project/ProjectsModal.svelte | certain | e2e `camera.spec` (weak), `projects.spec` (weak); no unit test runs this file |
| ^641 | The modal's own hints replace all others | feedback | project/modalHints.ts | certain | none found |
| ^642 | The file window opens with the browser's own picker, accepting .json | feedback | project/ProjectsModal.svelte | certain | no unit test runs this file; none found |
| ^643 | Touch: one finger is the left button | input | MapCanvas.svelte touchDown | certain | no unit test runs this file; none found |
| ^644 | Touch hit areas are larger (16 px node, 20 px others) | input | curves/handles.ts | certain | none found |
| ^645 | The cursor leaving the canvas clears what is hovered | input | MapCanvas.svelte | certain | no unit test runs this file; none found |
| ^646 | The middle button does not scroll (auto-scroll prevented) | input | MapCanvas.svelte | certain | no unit test runs this file; none found |
| ^647 | Page scroll by wheel prevented on the canvas | input | MapCanvas.svelte onWheel | certain | no unit test runs this file; none found |
| (existing) ^165 | A project is stored in IndexedDB, one record per project | persistence | project/storage.ts | certain | unit `project/load.test` (weak) |
| ^651 | The file stores lengths in integer millimeters, nodes and edges as tuples | persistence | project/file.ts | certain | unit `project/file.test` (strong), `project/session.test` (weak) |
| (existing) ^173 | The file has a format version; migrations turn version n into n+1 | persistence | project/migrate.ts | certain | unit `project/file.test` (strong), `project/load.test` (weak) |
| ^652 | The project last opened is remembered in the browser (localStorage) | persistence | project/browserMemory.ts | certain | unit `project/load.test` (weak), `project/session.test` (weak) |
| ^653 | The toasts and the history panel share one column so they do not overlap | presentation | App.svelte .right | certain | no unit test runs this file; none found |
| (existing) ^213 | A list that scrolls on its own while its search field stays | presentation | ui/FilterList.svelte | certain | no unit test runs this file; none found |
| ^654 | Icons: small stroke icons | presentation | ui/Icon.svelte | certain | no unit test runs this file; none found |
| ^655 | The projects modal: veil, dialog, title, close, search, list, three cards | presentation | project/ProjectsModal.svelte | certain | e2e `projects.spec` (weak); no unit test runs this file |
| (existing) ^211 | The modal is wide and at most three quarters of the screen tall; only the list scrolls | presentation | project/ProjectsModal.svelte | certain | e2e `projects.spec` (weak); no unit test runs this file |
| ^656 | Dark and light colors follow the browser | presentation | app.css | certain | none found |
| ^657 | The map is a full-window canvas | presentation | MapCanvas.svelte | certain | no unit test runs this file; none found |
| ^659 | A toast that is showing is not shown twice; its time starts again | rules | ui/toasts.svelte.ts show | certain | unit `ui/toasts.test` (strong) |
| (existing) ^427 | Search in lists: fuzzy, case ignored, characters in order | rules | ui/fuzzy.ts fuzzyScore | certain | unit `ui/fuzzy.test` (strong) |
| ^660 | Search ranking: consecutive characters, word starts score more, gaps cost; equal scores keep the order | rules | ui/fuzzy.ts | certain | unit `ui/fuzzy.test` (strong) |
| (existing) ^166 | Only a change of the map updates the project date, not a rename or the camera | rules | project/session.svelte.ts save | certain | unit `project/session.test` (strong), `project/cameraSaved.test` (strong) |
| (existing) ^189 | A map without a project becomes one when something is drawn (Untitled project) | rules | project/session.svelte.ts begin | certain | unit `project/session.test` (strong) |
| ^661 | Titles are at most 100 characters | rules | project/session.svelte.ts MAX_TITLE | certain | none found |
| (existing) ^233 | Importing is refused while a rename is unfinished | rules | project/session.svelte.ts mayLeave | certain | unit `project/load.test` (weak) |
| ^662 | Import and load use one pipeline: migrate, then check | rules | project/migrate.ts readProject | certain | unit `project/load.test` (weak) |
| ^663 | A project that cannot be loaded from storage stays as it is and the app starts with a new empty project | rules | project/session.svelte.ts tryShow | certain | unit `project/load.test` (strong), `project/session.test` (strong), `project/cameraSaved.test` (weak) |
| ^664 | While renaming the modal does not close and no other card can be used | rules | project/session.svelte.ts mayLeave | certain | unit `project/load.test` (strong), `project/session.test` (weak) |
| ^665 | The map takes no input while the modal is up | rules | App.svelte onKeyDown | certain | no unit test runs this file; none found |
| ^666 | With Alt held the physical key letter is used (Alt+Z types another character on a Mac) | rules | editor/keymap.ts keyOf | certain | no unit test runs keyOf; none found |
| ^667 | The panel shows the second a step is taken, undone or redone and goes after 3 s | time | hud/recent.svelte.ts RECENT_MS | certain | unit `hud/recent.test` (strong), `hud/panel.test` (strong); e2e `editing.spec` (strong) |
| ^668 | While a road is being drawn the panel stays; its 3 s start when the road is finished | time | App.svelte | certain | no unit test runs this file; none found |
| ^669 | Confirmations stay 3 s, warnings and errors 8 s | time | ui/toasts.svelte.ts TOAST_MS TOAST_LONG_MS | certain | unit `ui/toasts.test` (weak) |
| (existing) ^445 | Autosave 400 ms after the last change | time | project/session.svelte.ts AUTOSAVE_MS | certain | unit `project/session.test` (weak) |
| (existing) ^446 | Autosave at the latest 5 s after the oldest unsaved change | time | project/session.svelte.ts | certain | unit `project/session.test` (weak) |
| (existing) ^448 | The camera is saved once it rests for 1 s, without changing the project date | time | project/session.svelte.ts CAMERA_SAVE_MS | certain | unit `project/cameraSaved.test` (strong), `project/session.test` (strong) |
| (existing) ^447 | The project is saved when the page is left | time | App.svelte pagehide | certain | no unit test runs this file; none found |
| (existing) ^485 | The project that was open last opens at start | time | project/session.svelte.ts start | certain | unit `project/load.test` (strong), `project/session.test` (strong) |
| (existing) ^458 | Snap tier 15° (from 90 px) | parameter | snap/angles.ts | certain | none found |
| (existing) ^459 | Snap tier 5° (from 180 px) | parameter | snap/angles.ts | certain | none found |
| (existing) ^460 | Snap tier 1° (from 320 px) | parameter | snap/angles.ts | certain | none found |
| ^670 | Heading angle snap: a dragged heading snaps to a multiple of the step that applies at its distance | rules | snap/angles.ts snapAngle | certain | unit `snap/angles.test` (weak), `snap/heading.test` (weak) |
| ^671 | A point is pulled to a snap suggestion within 25 px | rules | snap/engine.ts SNAP_NEAR_PX | certain | unit `editor/controlSnap.test` (weak), `snap/snap.test` (weak) |
| ^672 | Suggestions of a node are offered within 300 px of the pointer (unless pinned) | rules | snap/engine.ts SNAP_REACH_PX, offered | certain | unit `snap/snap.test` (strong), `editor/pins.test` (weak) |
| (existing) ^294 | The tip about pinning at 85% of the reach | rules | snap/engine.ts REACH_WARN | certain | unit `snap/snap.test` (weak) |
| (existing) ^102 | A snap point beats a snap curve; only the nearest curve is used so no two parallel lines show | rules | snap/engine.ts snapNearest | certain | unit `snap/snap.test` (strong), `snap/geometry.test` (strong), `curves/continuity.test` (weak) |
| (existing) ^280 | A crossing of two near curves is a snap point | rules | snap/engine.ts crossingPoints | certain | unit `snap/snap.test` (strong) |
| (existing) ^289 | A point and the curves through it are all shown or all hidden | rules | snap/engine.ts snapNearest, curvesThrough | certain | none found |
| (existing) ^313 | The heading control point copies the heading of what it snapped to | rules | snap/heading.ts headingFrom | certain | unit `snap/heading.test` (strong), `editor/controls.test` (weak); e2e `editing.spec` (weak) |
| ^674 | `Alt` inverts the copied heading | rules | snap/heading.ts flip | certain | unit `snap/heading.test` (weak) |
| (existing) ^318 | A node placed on a snap line gets the direction of its normal | rules | snap/heading.ts laneHeading | certain | unit `snap/heading.test` (strong), `snap/snap.test` (strong); e2e `snapping.spec` (weak) |
| ^675 | A snap line's heading is its direction away from its base | rules | snap/heading.ts awayFrom | certain | unit `snap/heading.test` (strong), `editor/headingSnap.test` (strong), `snap/geometry.test` (weak) |
| (existing) ^263 | Snap lines have no ends | rules | snap/geometry.ts infiniteLine | certain | unit `snap/geometry.test` (weak) |
| (existing) ^265 | Snap rule: line along the normal of a node | rules | snap/rules.ts nodeRules | certain | unit `snap/snap.test` (strong), `snap/heading.test` (strong), `editor/snapping.test` (weak) |
| (existing) ^266 | Snap rule: line along the heading of a node | rules | snap/rules.ts nodeRules | certain | unit `snap/heading.test` (strong), `snap/snap.test` (strong), `editor/controlSnap.test` (weak) |
| (existing) ^267 | Snap rule: three points at a node (on it and one lane width to each side) | rules | snap/rules.ts nodeRules | certain | unit `snap/snap.test` (strong), `editor/sharedRadius.test` (weak), `snap/heading.test` (weak) |
| ^676 | Snap rule: the curve of a segment | rules | snap/rules.ts curveRules | certain | unit `snap/heading.test` (strong), `snap/snap.test` (strong) |
| (existing) ^269 | Snap rule: bisector and tangent of a bend | rules | snap/rules.ts bendRules | certain | unit `snap/snap.test` (strong) |
| (existing) ^270 | Snap rule: radius points of an arc | rules | snap/rules.ts arcRules | certain | unit `snap/snap.test` (weak) |
| (existing) ^271 | Snap rule: lines along the normal at the ticks of an arc | rules | snap/rules.ts arcRules | certain | unit `snap/snap.test` (strong) |
| (existing) ^272 | Snap rule: the inflection point | rules | snap/rules.ts inflectionRules | certain | unit `snap/snap.test` (weak) |
| (existing) ^273 | Snap rule: the lines at the inflection point | rules | snap/rules.ts inflectionRules | certain | unit `snap/snap.test` (strong) |
| (existing) ^279 | Snap rule: the two offset curves of a segment, one lane width to each side | rules | snap/rules.ts curveRules | certain | unit `snap/snap.test` (strong), `editor/concentricBuild.test` (weak), `snap/heading.test` (weak) |
| ^678 | Snap rule: where the moved nodes were (previous) | rules | editor/snapping.ts | certain | unit `editor/snapping.test` (strong), `editor/pins.test` (weak), `editor/selection.test` (weak) |
| (existing) ^326 | Snap rule: extend line at +15° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^327 | Snap rule: extend line at +30° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| ^679 | Snap rule: extend line at +45° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^337 | Snap rule: extend line at +60° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^338 | Snap rule: extend line at +75° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^329 | Snap rule: extend line at -15° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^330 | Snap rule: extend line at -30° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^328 | Snap rule: extend line at -45° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^339 | Snap rule: extend line at -60° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^340 | Snap rule: extend line at -75° | rules | snap/rules.ts extendRules | certain | unit `snap/heading.test` (weak) |
| (existing) ^336 | Snap rule: the own curves of the dragged node's segments | rules | editor/snapping.ts ownCurves | certain | unit `editor/ownCurve.test` (strong), `editor/dropMerge.test` (strong), `editor/cancelDrag.test` (weak) |
| (existing) ^275 | Coincident snap lines and equal points are one suggestion | rules | snap/rules.ts dedupe | certain | unit `snap/snap.test` (strong) |
| (existing) ^253 | On a right-hand lane the heading is the same, on the left the opposite | rules | snap/rules.ts nodeRules | certain | unit `editor/touching.test` (strong), `snap/heading.test` (weak) |
| (existing) ^457 | Snap tier 45° (0 px) | time-free parameter | snap/angles.ts | certain | none found |

## Part 8: what is not tested

**77 rows** are in code that no unit test executes (coverage run of the unit tests, V8): the whole render layer, every Svelte component, `storage.ts`, and a few functions (`dragCorner`, `exportJson`, `turningOf`, `previousPlaces`, `focusTower`, `formatLocalIso`, `keyOf`, `chainSelection`, `roadsShown`). Only e2e can cover them, and e2e coverage was not measured.

**100 rows** have no test candidate by title or module:

| Hat | Name | Category |
|---|---|---|
| ^534 | Drag the bend point: both headings turn so the heading lines meet at the pointer | operation |
| ^649 | Rename a project | operation |
| (existing) ^33 | While the middle button is held the cursor is a compass (needle to north, inner ring says what dragging does,  | presentation |
| (existing) ^35 | The background grid (switched off) | presentation |
| (existing) ^376 | Ctrl+wheel (a touchpad pinch) zooms 4 times faster | rules |
| ^507 | The wheel unit is scaled by deltaMode (pixels, lines, pages) | rules |
| ^508 | The scale stays between 0.02 and 400 px per meter | rules |
| (existing) ^105 | A hook's corner points are derived and cannot be dragged | control points |
| ^522 | The radius is at least 0.5 m unless nothing fits | curve model |
| ^523 | A requested radius above the maximum is limited to the maximum | curve model |
| ^524 | A hook's automatic radius and its cap (3 times the larger of the radius and the length) | curve model |
| ^526 | When both arcs share one circle the one big arc is split in two equal halves | curve model |
| ^530 | The measurements: total length | measure |
| ^536 | A lane is 3 m wide | presentation |
| ^538 | The bend point cannot come closer than 0.7 m to a node | rules |
| ^542 | The cursor is a hand over a handle | feedback |
| ^558 | While a drop merges, the segments it would replace are not drawn | presentation |
| (existing) ^113 | The old places of moved nodes are shown | presentation |
| ^564 | At most 200 steps are kept | rules |
| (existing) ^426 | Projects modal | project |
| (existing) ^440 | Toast `saved` | toasts |
| (existing) ^442 | Toast `modelcity saves automatically` | toasts |
| (existing) ^443 | Toast `nothing to undo` | toasts |
| (existing) ^444 | Toast `nothing to redo` | toasts |
| ^582 | Edges refer to a lane with a width; the default lane is 3 m | data |
| (existing) ^170 | Lengths are rounded to the millimeter when a change is committed | data |
| ^583 | Dragging a handle on a path and writing the result back to the graph | internal |
| (existing) ^130 | An arm is all nodes connected to a node | rules |
| (existing) ^90 | The road surface: every segment is a lane wide with an outline; outlines are drawn first then surfaces so cros | presentation |
| ^590 | View mode draws only the road surface, no skeleton, no scaffold | presentation |
| (existing) ^60 | The skeleton: curves 2 px and node dots 5.5 px, always shown | presentation |
| ^591 | A selected node is blue and 150% larger | presentation |
| ^592 | A pinned node is drawn turquoise | presentation |
| (existing) ^231 | A selected segment's curve and direction arrows are blue | presentation |
| (existing) ^80 | Direction chevrons along curves every 72 px, pointing the way the road runs | presentation |
| ^597 | Heading lines of a segment through the corner point, or a short stub | presentation |
| ^598 | The circle of an arc | presentation |
| ^599 | The inflection point of an S-curve or hook | presentation |
| (existing) ^230 | A hovered or dragged control point is as large as a selected node | presentation |
| (existing) ^79 | In draw mode a curve under the pointer gets a ring and a tick: the place for an inserted node | presentation |
| ^601 | The preview of the next node: a dot and an orange arrow at 60% opacity | presentation |
| (existing) ^321 | The preview of the next segment: a dashed curve with its dashed heading lines and measurements | presentation |
| ^602 | The selection box: a blue rectangle with a light fill | presentation |
| ^603 | Snap guides: turquoise lines and curves 1.5 px, rings at snap points | presentation |
| ^604 | The outline of the hovered segment or branch: 20 px across, a half circle at each end, on top of everything | presentation |
| ^605 | The outline is at least 8 px wider than the road surface | presentation |
| (existing) ^482 | Draw order of the scene: surface, scaffold, curves, arrows, handles, preview, tower, snap, previous, drop prev | presentation |
| (existing) ^316 | The heading label of a node being placed: the compass icon with degrees (first node of an arm) | presentation |
| (existing) ^341 | The offset label of a heading being turned (beside the arrow, with a sign) | presentation |
| ^606 | The compass label is above the icon when the heading points down | presentation |
| ^607 | The length of a segment shown at its middle | presentation |
| ^608 | The bend angle and radius label at the bend | presentation |
| ^609 | The length of a bend inside the bend at the middle radius point | presentation |
| (existing) ^470 | Labels are orange (orange-ink) text, one line height 13 px | presentation |
| ^610 | The scale bar: a bar and a length (cm, m, km) of a round number at least 80 px wide | presentation |
| (existing) ^83 | One font size of all text, 12 px | presentation |
| (existing) ^377 | The colors come from CSS variables, read at each frame (dark and light) | presentation |
| ^611 | The canvas is drawn at the device pixel ratio | presentation |
| ^612 | Sample project fixture | data |
| (existing) ^145 | The test hook window.__modelcity (development only) | dev |
| ^613 | Features that are built but switched off are listed in features.ts | dev |
| ^614 | Control hints panel in the top left: rows of inputs (mouse glyphs, key caps) and what they do, without a backg | feedback |
| (existing) ^103 | A hint can have a note with a key (`(Alt to undo batch)`) | feedback |
| ^617 | `P`: projects hint always shown | feedback |
| ^619 | The `Ctrl` and `Shift` and `Alt` hints are never hidden by use | feedback |
| (existing) ^301 | The `Alt` hint `opposite heading` shows while the pointer is snapped to a heading | feedback |
| ^622 | Toast: the heading tip text `Snap to something to copy its heading` | feedback |
| (existing) ^119 | The mode icons (eye, pointer, pen, extend) with the current one in its color and ring | feedback |
| ^623 | The screen outline in the color of the mode (none in view mode) | feedback |
| ^624 | View mode shows only the eye and the pointer icons | feedback |
| (existing) ^378 | The mode icons have a name as tooltip that never shows | feedback |
| (existing) ^323 | The measurements panel, bottom left, only with at least one segment selected | feedback |
| ^632 | The measurements panel lifts above the scale bar while that shows | feedback |
| (existing) ^232 | Toasts: short messages in the top right with the icon of their kind | feedback |
| (existing) ^210 | A toast has the icon of its kind (info, warning, success, error) | feedback |
| (existing) ^385 | An empty list says `No project matches.` (the none text) | feedback |
| ^638 | Pen and bin icons inside the card; renaming and delete confirm change the card in place | feedback |
| ^641 | The modal's own hints replace all others | feedback |
| ^642 | The file window opens with the browser's own picker, accepting .json | feedback |
| ^643 | Touch: one finger is the left button | input |
| ^644 | Touch hit areas are larger (16 px node, 20 px others) | input |
| ^645 | The cursor leaving the canvas clears what is hovered | input |
| ^646 | The middle button does not scroll (auto-scroll prevented) | input |
| ^647 | Page scroll by wheel prevented on the canvas | input |
| ^653 | The toasts and the history panel share one column so they do not overlap | presentation |
| (existing) ^213 | A list that scrolls on its own while its search field stays | presentation |
| ^654 | Icons: small stroke icons | presentation |
| ^656 | Dark and light colors follow the browser | presentation |
| ^657 | The map is a full-window canvas | presentation |
| ^658 | The page title and favicon | presentation |
| ^661 | Titles are at most 100 characters | rules |
| ^665 | The map takes no input while the modal is up | rules |
| ^666 | With Alt held the physical key letter is used (Alt+Z types another character on a Mac) | rules |
| ^668 | While a road is being drawn the panel stays; its 3 s start when the road is finished | time |
| (existing) ^447 | The project is saved when the page is left | time |
| (existing) ^458 | Snap tier 15° (from 90 px) | parameter |
| (existing) ^459 | Snap tier 5° (from 180 px) | parameter |
| (existing) ^460 | Snap tier 1° (from 320 px) | parameter |
| (existing) ^289 | A point and the curves through it are all shown or all hidden | rules |
| (existing) ^457 | Snap tier 45° (0 px) | time-free parameter |
