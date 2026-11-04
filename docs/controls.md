# Controls and features (^371)

**Status: the audit is in progress.** This file was started from blank on purpose; the previous reference is in the Git history (`git show origin/main:docs/controls.md`, last version before ^371). We fill the tables below one feature at a time, together, and take over everything from the old file that is still true. Until the PR of ^370 is merged, the old file stays the current reference.

## Definitions

- **Feature:** anything the app can do or show (a mode, a snap, a rendering, a measurement, an operation). Has a hat of type `feature`, or `operation` (see `docs/hats.md`; features and operations are listed there, not here).
- **Operation** (^180, ^391): something the user deliberately does that changes the map, the stored project or what is open, or writes an output (edit the map, undo, select, pan, zoom, rotate, export, save, import, create, rename, delete, switch a project). Not a mode change, not opening a modal, not hovering. Every operation is a feature; not every feature is an operation (a snap rule, a gizmo, a label is not).
- **Hats (^392):** every operation and every control has a hat for just itself. A hat that describes several things stays as the decision, and each thing gets its own hat that points to it.
- **Control** (README glossary): a user input (key or mouse, with modifiers) in a context. Controls are contextual by design (^45), so every row names its **context**: the mode (view, select, draw, extend), what is under the pointer, and the state of the app (selection, drag, being drawn, touch). The same input in two contexts is two controls.
- **Hat:** reused if the feature, control or operation already has one (^371 rule 1); registered first if not.

**Not audited in detail (user):** layout and colors. The audit records what exists, what it does and what it is tied to; where things sit, how big they are and which color they have is described only where it is the point of a feature (for example the blue border of the current card), and otherwise left to the design hats (^32, ^211).

## Columns

| Column | Meaning |
|--------|---------|
| Hat | The hat of the feature, control or operation. |
| Context | Mode, what is under the pointer, app state. |
| Control | The input, with modifiers. |
| Operation | What it does there. |
| Hint | The control hint (^181) it shows, or the recorded reason it has none (an exemption). |
| Visitable | Whether and how the hint can be visited (hovered or reached, ^259): yes (how), no (why). |
| Special behavior | Everything else that applies: toast message (^210), cursor, hides after use (^110), snapping, and so on. |
| Tests | Where it is tested: unit (one module), integration (the editor engine with a graph, no browser), e2e (the browser). |

## Controls

Each row is one control (^392): an input, or alternative inputs that do the same, in one context. The Hat column starts with the control's own hat. Rows for states not walked yet follow as the audit goes on.

| Hat | Context | Control | Operation or feature | Hint | Visitable | Special behavior | Tests |
|-----|---------|---------|----------------------|------|-----------|------------------|-------|
| ^393 | select mode, empty canvas, nothing selected | `LMB` click | enter draw mode (feature ^423; not an operation) | `LMB`: draw mode | n/a | unit `editor/modes.test`; e2e `modes.spec` |
| ^394 | select mode | `Tab` | go to view mode (feature ^425) | `Tab`: view mode, hidden for a while after the control was used (^110) | n/a | after a round trip the hint is missing until the visit times out | unit `editor/modes.test` (Tab goes to view mode from every mode, and back), `hints/hints.test`; e2e `modes.spec` |
| ^395 | view mode | `Tab` | back to select mode (feature ^422) | should be `Tab`: select mode, hidden by bug ^384 | n/a | unit `editor/modes.test`, `hints/hints.test`; e2e `modes.spec` |
| ^396 | any mode, no modal, nothing to save | `Ctrl+S` | save project (operation ^428): nothing to save, toasts ^441 and ^442 (^232) | none (exemption not yet decided) | n/a | toasts 3 s, identical toast not shown twice | unit `project/load.test`; e2e: gap ^379 |
| ^397 | any mode, no modal, nothing to undo | `Ctrl+Z` | toast ^443 `nothing to undo` (^81) | none | n/a | toast 3 s | e2e `editing.spec`; `Alt` variant: gap ^380 |
| ^398 | any mode, no modal, nothing to redo | `Ctrl+Y` or `Ctrl+Shift+Z` | toast ^444 `nothing to redo` (^81) | none | n/a | toast 3 s | e2e `editing.spec`; `Alt` variant: gap ^380 |
| ^399 | any mode, no modal | `Ctrl+O` | open the projects modal (feature ^426) and the file window of import project (operation ^430) | none (exemption not yet decided) | n/a | overrides the browser's `Ctrl+O`; the file window is the browser's own | e2e `projects.spec` |
| ^400 | any mode, no modal, no text field focused | `P` | open the projects modal (feature ^426) | `P`: projects, always shown | n/a | | e2e `projects.spec` |
| ^401 | projects modal | `Esc` | close the modal (feature ^426) | `Esc`: close (merged with `LMB` over the X) | n/a | | e2e `projects.spec` |
| ^402 | projects modal, pointer outside the dialog | `LMB` click | close the modal (feature ^426; ^233: not while a rename is unfinished) | none (exemption: the backdrop is not a target) | no | | e2e `projects.spec` |
| ^403 | projects modal, pointer on the X | `LMB` click | close the modal (feature ^426) | `Esc or LMB`: close | yes (hover) | | e2e `projects.spec` |
| ^404 | projects modal, pointer on `Import file…` | `LMB` click | import project (operation ^430): open the file window | `LMB`: import | yes (hover) | | e2e `projects.spec` |
| ^405 | projects modal, pointer on `Export JSON` | `LMB` click | export project (operation ^429); to explore | `LMB`: export JSON | yes (hover) | | e2e `projects.spec` |
| ^406 | projects modal, pointer on `New project` | `LMB` click | new project (operation ^431); to explore | `LMB`: new project | yes (hover) | | e2e `projects.spec` |
| ^407 | projects modal, pointer on the search field, not focused | `LMB` click | focus the search (feature ^427, walked later) | `LMB`: search (only while not focused) | yes (hover) | the field is focused when the modal opens | e2e `projects.spec` |
| ^408 | draw mode, nothing drawn yet | `Esc` or `RMB` click | leave draw mode (features ^423, ^422) | `Esc or RMB`: finish | n/a | unit `editor/modes.test` (Esc or a right click leave draw mode before any node has been placed) |
| ^410 | draw mode, nothing drawn yet, empty canvas | `LMB` click | place first node (operation ^409); enters extend mode (feature ^424) | `LMB`: add node (to become `place node`, ^421) | n/a | the node placed is selected; a project may be made at once, which is fine (^386 withdrawn, ^449) | unit `editor/modes.test` (the first click only enters draw mode, the second places a node), `editor/extend.test` |
| ^411 | draw mode, nothing drawn yet, empty canvas | `LMB` drag | place first node and set its heading (op ^420); enters extend mode with the press; the release is not yet explored | before the press `LMB` drag: add node and set heading (to become `place node and set heading`, ^421); while dragging `LMB` drag: turn heading (^286) | n/a | a drag under 6 px keeps the automatic heading; the heading snaps to the compass (^315) and to steps (^457 to ^460), with the label (^316) | unit `editor/editor.test`, `editor/cancelDrag.test`; the compass and label: gap ^463; e2e `smoke.spec` |
| ^412 | extend mode, a segment exists, pointer on the start node | `LMB` click or `Esc` | finish road (operation ^432); to explore | `LMB or Esc`: finish | n/a | with only one node: to explore | e2e `smoke.spec`, `editing.spec` |
| ^413 | extend mode, pointer on a node | `LMB` drag | move node (operation ^433); to explore | `LMB` drag: move node | n/a | snapping, `Ctrl` | unit `editor/snapping.test`; e2e `snapping.spec` |
| ^414 | extend mode, pointer on a node | `RMB` click | delete node (operation ^434); to explore | `RMB`: delete node | n/a | | unit `editor/removal` tests (to check) |
| ^415 | draw or extend mode, the pointer snaps | `Ctrl` held | no snapping (^101) | `Ctrl`: no snapping, shown only while snapping | no (never hidden) | not learnable, ^110 | e2e `snapping.spec` |
| ^416 | draw or extend mode, the pointer snaps, a click would place a node | `Shift` held | the node keeps only the snap position, not its heading (^358); to explore | `Shift`: snap only the position, shown only then | no | not on a drag-place | unit `editor/headingSnap.test` |
| ^417 | any mode, at least one node selected (also, by bug ^419, the start node in extend mode) | `S` | pin the snap suggestions of the selected nodes (^258); to explore | `S`: pin snap suggestions | no (never hidden, ^258) | with nothing selected and something pinned: `S` unpins | e2e `snapping.spec` |
| ^436 | extend mode, only the first node placed, pointer on it | `LMB` click or `Esc` | cancel first node (operation ^437): the node is taken away, back to draw mode (feature ^423) | `LMB or Esc`: finish, should be `cancel` (bug ^438) | n/a | undoable: undo brings the node back at its place; `Esc` is the alternative input, not pressed yet | unit `editor/undoRedo.test` (cancelling a lone node with Esc can be undone), `editor/editor.test` (finishing a road with one node cancels it); e2e: gap |
| ^450 | any mode, no modal, a project is open (it has data) | `Ctrl+S` | save project (operation ^428) at once: toast ^440 `saved`, then toast ^442 `modelcity saves automatically` (^232) | none (exemption not yet decided) | n/a | the background: ^165 (the browser's database), ^166 autosave, ^445 (400 ms), ^446 (5 s), ^447, ^448 | unit `project/load.test` (Ctrl+S saves at once and says so); e2e `projects.spec` |
| ^454 | any mode, no modal, a step in the history to undo | `Ctrl+Z` | undo (operation ^453): the last step is taken back; here the cancel of the first node, so the node is back with its heading | the undo hint of the history panel: `Ctrl+Z`: undo (`Alt` to undo batch), shown while there is a step to undo (^109, ^241) | n/a | the undone step stays in the panel in gray, joined to its batch (^107, ^108); the `Alt` note is always shown (roadmap ^418) | unit `editor/undoRedo.test`, `editor/steps.test`, `hud/panel.test` (undone steps grayed), `hints/usage.test` (the hint is hidden when visited); e2e `editing.spec` (the recent history panel grays out undone steps) |
| ^456 | any mode, no modal, an undone step to redo | `Ctrl+Y` or `Ctrl+Shift+Z` | redo (operation ^455): the undone step is done again; here the cancel, so the node is gone and the preview is back (draw mode, nothing drawn) | the redo hint of the history panel: `Ctrl+Y` or `Ctrl+Shift+Z`: redo (`Alt` to redo batch), while there is a step to redo (^109, ^241) and the control is not hidden as visited (^110) | n/a | the redone step is white again; after a redo with nothing left to redo and both undo and redo visited, the panel shows no hints; the panel goes after about 3 s (^107) | unit `editor/undoRedo.test`, `editor/steps.test`, `hud/panel.test` (redoing colors them back in), `hints/usage.test`; e2e `editing.spec` |
| ^461 | a node is being placed and its heading dragged (the button is held) | `Esc` | cancel (feature ^295): the node is not placed, nothing is a step | `Esc`: cancel (^286) | n/a | the hints are only about the drag (^286) | unit `editor/cancelDrag.test` (a node that is placed with its heading is not placed) |
| ^462 | a node is being placed and its heading dragged | `Ctrl` held | no snapping (feature ^101): the heading follows the pointer freely, also the 45° steps | `Ctrl`: no snapping (shown for every heading drag, ^286) | no (never hidden) | not learnable, ^110 | unit `editor/editor.test` (Ctrl switches it off, ^251), `editor/snapping.test` |
| ^465 | extend mode, only the first node placed, pointer on its heading control point | `LMB` drag | turn heading (operation ^468); not pressed yet | `LMB` drag: turn heading | n/a | the heading snaps (^251, ^315); the hover ring (^469) | unit `editor/editor.test` (dragging the heading), `editor/branching.test`, `editor/headingSnap.test` |
| ^466 | extend mode, pointer on a heading control point | `Alt` + `LMB` click | flip arm (^234); not pressed yet | `Alt`+`LMB`: flip arm | n/a | a click, not a drag | unit `editor/controls.test`; e2e `editing.spec` |
| ^467 | extend mode, only the first node placed, pointer not on the start node | `Esc` or `RMB` click | cancel first node (operation ^437); not pressed yet | `Esc or RMB`: finish, should be `cancel` (bug ^438) | n/a | undoable, like ^436 | unit `editor/undoRedo.test`, `editor/editor.test` (a right click on empty space finishes the road, finishing with one node cancels it) |

## Still to walk (checklist, no hats yet)

What the code and the old reference say exists and has not been walked with the user. It is a list so that nothing is forgotten, not documentation: every item gets its hats, its hint, whether it is visitable, its special behavior and its tests only when the walk reaches it, because the real findings of this audit came from the walk and not from reading the code. The list is by context and input; what it does is the name of the operation or feature (a number is an existing hat).

| Walked | Context | Control | Does |
|--------|---------|---------|------|
| [ ] | select mode, empty canvas, something selected | `LMB` click | deselect all |
| [ ] | select mode, empty canvas | `LMB` drag | select by box |
| [ ] | select mode, empty canvas, something selected | `Shift` + `LMB` drag | add to selection |
| [ ] | select mode, something selected | `Esc` | deselect all |
| [ ] | any mode, something selected | `Del` or `Backspace` | ^434 |
| [ ] | select mode, pointer on a node | `LMB` click | select node |
| [ ] | select mode, pointer on a node, something selected | `Shift` + `LMB` click | add to selection, deselect |
| [ ] | select mode, pointer on a node | `Alt` + `LMB` click | select branch |
| [ ] | select mode, pointer on a node, something selected | `Alt` + `Shift` + `LMB` click | select branch, deselect |
| [ ] | select mode, pointer on a curve | `LMB` click | select segment |
| [ ] | select mode, pointer on a curve, something selected | `Shift` + `LMB` click | add to selection, deselect |
| [ ] | select mode, pointer on a curve | `Alt` + `LMB` click | select branch |
| [ ] | select mode, pointer on a node | `LMB` drag | ^433 |
| [ ] | select mode, pointer on a selected node, several selected | `LMB` drag | ^433 |
| [ ] | select mode, pointer on a node | `Alt` + `LMB` drag | move branch |
| [ ] | any mode, pointer on a heading control point | `LMB` drag | turn heading |
| [ ] | any mode, pointer on a bend point | `LMB` drag | bend curve |
| [ ] | any mode, pointer on a radius point | `LMB` drag | change radius |
| [ ] | any mode, pointer on a corner point of an S-curve | `LMB` drag | turn heading |
| [ ] | any mode, pointer on a radius point, a segment whose two nodes are selected | `LMB` drag | change radius |
| [ ] | select mode, pointer on a node | `RMB` click | ^434 |
| [ ] | any mode, several nodes selected, pointer on one of them or on a segment between them | `RMB` click | ^434 |
| [ ] | any mode, pointer on a heading control point | `Alt` + `LMB` click | ^234 |
| [ ] | a handle is dragged or a node is placed with its heading | `Esc` | ^295 |
| [ ] | a handle is dragged, the pointer snaps | `Ctrl` held | ^101 |
| [ ] | the heading of an existing node is dragged, it snapped to something | `Shift` held | ^335 |
| [ ] | the heading of an existing node is dragged, it snapped to something | `Shift` + `Alt` held | ^335 |
| [ ] | a handle is dragged, the pointer snapped to a touching point or a heading | `Alt` held | ^301 |
| [ ] | a node is dragged onto another node, released | `LMB` release | merge nodes by drop |
| [ ] | a node is dragged onto a curve, released | `LMB` release | join node into a curve by drop |
| [ ] | a radius point is dragged onto a node of its segment | `LMB` release | ^141 |
| [ ] | draw mode, nothing drawn, pointer on the only end node of a road | `LMB` click | extend road |
| [ ] | draw mode, nothing drawn, pointer on another node | `LMB` click | split road |
| [ ] | draw mode, nothing drawn, pointer on a curve | `LMB` click | split road, insert node |
| [ ] | draw mode, nothing drawn, pointer on a curve | `LMB` drag | insert node |
| [ ] | draw mode, nothing drawn, pointer on a curve | `RMB` click | remove segment |
| [ ] | draw mode, nothing drawn, pointer on a curve | `Alt` + `RMB` click | remove branch |
| [ ] | draw mode, pointer on a radius point | `LMB` click | split road, merge road |
| [ ] | draw mode, right after a split, pointer on the inserted node | `LMB` click | ^276 |
| [ ] | draw mode, right after a split on a curve, nothing placed after it | `Esc` or `RMB` click | ^237 |
| [ ] | extend mode, a segment exists, empty canvas | `LMB` click | place next node |
| [ ] | extend mode, empty canvas | `LMB` drag | place next node and set heading |
| [ ] | extend mode, pointer on a node of another road | `LMB` click | merge road |
| [ ] | extend mode, pointer on a curve (also of the road itself) | `LMB` click | merge road |
| [ ] | extend mode, pointer on the node the road started at | `LMB` click | close road |
| [ ] | extend mode, pointer on a curve | `LMB` drag | insert node |
| [ ] | extend mode, pointer on a curve | `RMB` click | remove segment |
| [ ] | extend mode, pointer on a curve | `Alt` + `RMB` click | remove branch |
| [ ] | extend mode, a segment exists, empty canvas | `RMB` click or `Esc` | ^432 |
| [ ] | any mode, nothing selected, something pinned | `S` | ^258 |
| [ ] | any mode, no modal | `RMB` drag | pan |
| [ ] | any mode, no modal | wheel | zoom |
| [ ] | any mode, no modal | `Ctrl` + wheel (a pinch on a touchpad) | zoom |
| [ ] | any mode, no modal | `MMB` drag left or right | rotate |
| [ ] | any mode, no modal | `MMB` drag up or down | zoom |
| [ ] | the middle button is held (rotating) | `Esc` | ^31 |
| [ ] | the middle button is held (rotating) | `N`, `E`, `S`, `W` | rotate to a compass direction |
| [ ] | the middle button is held (rotating), pointer on a compass key cap | `LMB` click | rotate to a compass direction |
| [ ] | touch, one finger | touch | ^40 |
| [ ] | touch, a second finger comes down | touch | ^40 |
| [ ] | touch, two fingers | twist, pinch, move | pan, zoom, rotate |
| [ ] | projects modal, pointer on a project card | `LMB` click | open project |
| [ ] | projects modal, pointer on the pen of a card | `LMB` click | rename project |
| [ ] | projects modal, a name is being typed | `Enter` or `LMB` on the check | rename project |
| [ ] | projects modal, a name is being typed | `Esc` or `LMB` on the cross | ^233 |
| [ ] | projects modal, pointer on the bin of a card | `LMB` click | delete project |
| [ ] | projects modal, a delete is being asked | `LMB` on the check | delete project |
| [ ] | projects modal, a delete is being asked | `Esc` or `LMB` on the cross | ^233 |
| [ ] | projects modal, the search field has the focus | typing | ^427 |
| [ ] | projects modal, a rename is unfinished | `LMB` outside the dialog, `Esc`, `P` | ^233 |

Features without a control of their own, still to be walked from the screen: the skeleton and the scaffold (^60, ^66, ^133), the road surface (^90), the run bars (^350), the measurements panel (^342), the snap guides (^101), the compass and the heading label (^33, ^316), the scale bar (^34), the camera limits (^37), the hover outline of segments and branches (^99), the toasts (`exported`, `imported`, the rename warning, the pin tip, the heading tip), the import and load errors (^192 to ^209), touch (^382).

## Walk-through (depth first)

The audit is a depth-first walk through the app, by hand, one input at a time. A *state* is named by what the user sees, never given an id (hats are the only ids). For each state: the transitions explored and those still to explore. A transition that stays in the same state is listed as "same state".

Stack (where we are, kept up to date at the end of the Journey): first load > view mode > **projects modal** (the file window is closed by Cancel; its second transition, Open file, is left for later)

### first load (select mode, empty map)

Screen: blank canvas; a blue outline around the window; four mode icons (eye, pointer in a blue ring, pen, extend); the hints `Tab` view mode, `LMB` draw mode, `LMB drag` select, `RMB drag` pan, wheel zoom, `MMB drag` rotate, `P` projects; the default cursor. Hats: ^119, ^104, ^120, ^49, ^377 (dark and light mode).

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+S` | same state, two toasts | yes |
| `Ctrl+Z`, `Alt+Ctrl+Z` | same state, toast | yes |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | same state, toast | yes |
| `Tab` | view mode | yes |
| `Ctrl+O` | projects modal with the file window open | yes (same in both states) |
| `P` | projects modal, no file window: the state after *Cancel* of the file window | has to be explored again once a project exists (after the first road) |
| `LMB` click | draw mode (nothing drawn yet) | yes |
| `LMB` drag | box select (nothing to select) | not yet: explore after nodes exist, with selection |
| `RMB` drag | pan | not yet: explore after nodes exist |
| wheel | zoom | not yet: explore after nodes exist |
| `Ctrl` + wheel | faster zoom (^376) | not yet: explore with the camera |
| `MMB` drag | rotate with the compass | not yet: explore with the camera |
| touch | one finger `LMB`, two fingers the camera (^382) | no |

### select mode after a visit of view mode (empty map)

The same as first load, except that the `Tab` hint is hidden: `Tab` was used (twice), and a control that was used lately has its hint hidden for a while (^110). This is the designed behavior, like the camera controls after their first use; the hint comes back when the visit times out. It is the same mechanism as the bug ^384, where it hides the way out of view mode. Transitions (this state is reached by the journey, so it is explored from here on): `LMB` click is explored (draw mode, below); `LMB` drag (box select), the camera controls and `P` are not explored: after the first node the camera and selection will be explored in a state where they do something, and `P` has to be explored again (a project exists then). The global keys (`Ctrl+S`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+O`, `Tab`) are as in first load. Tested in general by unit `hints/usage.test`; for `Tab` itself: gap, to be checked against e2e `editing.spec` ("a used control loses its hint").

### draw mode (nothing drawn yet; entered by `LMB` on empty canvas in select mode)

Screen: the outline and the mode icons in the draw mode's color (the pen is the current mode); the cursor is a crosshair; a preview of the node a click would add follows the pointer, an arrow pointing right (the automatic heading of the first node, ^54). Hints: `LMB`: add node; `LMB` drag: add node and set heading; `Esc` or `RMB`: finish; `P`: projects. The `Tab` hint is hidden (visited, ^110). **No camera hints** although the camera works here (bug ^389). Hats: ^54, ^48, ^47, ^23, ^40, ^110.

Features here: *enter draw mode* (from select mode, ^54) and *leave draw mode* (`Esc` or `RMB`, also before a node, ^54): both are mode changes, so **not operations** (^391). Operations: *add the first node of a road* (`LMB`, heading automatic) and *add the first node and set its heading* (`LMB` drag, ^40).

| Input | Result | Explored |
|-------|--------|----------|
| `LMB` click | node 1 is placed; extend mode (below) | yes |
| `LMB` drag | node 1 with the dragged heading; extend mode | no |
| `Esc`, `RMB` click | back to select mode | no |
| `Tab` | view mode | same as everywhere: explored |
| `P`, `Ctrl+O` | projects modal (over draw mode) | has to be explored again once a project exists |
| `Ctrl+S` | has to be explored again once there is data to save | not yet |
| `Ctrl+Z` | has to be explored again after each operation | explored with the first one (^454); after later operations again |
| `Ctrl+Y`, `Ctrl+Shift+Z` | has to be explored again after an operation was undone | explored with the first one (^456); the batch variants with `Alt` after a finished road |
| `RMB` drag, wheel, `Ctrl` + wheel, `MMB` drag | camera, without hints (^389) | not yet |

### extend mode, one node placed (the pointer still on it)

Reached by `LMB` in draw mode (nothing drawn). The node is selected, the road has no segment. What the user sees, each item with where it comes from (visual details such as sizes and colors only as far as they are features):

| Item | What it is | Hats, code | Tested |
|------|------------|------------|--------|
| orange outline | extend mode's outline | ^119, ^120 (`hud/modes.ts`) | e2e `modes.spec` |
| four icons, the extend icon orange and ringed | the current mode | ^119, ^120 | unit `hud/modes.test` |
| hints `LMB or Esc`: finish; `LMB` drag: move node; `RMB`: delete node | what the pointer over a node does (the node being drawn from: finishing); controls ^412, ^413, ^414 | ^49, ^142, ^239 (`handleHints`) | unit `hints/hints.test` |
| hints `Ctrl`: no snapping; `Shift`: snap only the position | the pointer snaps (it lies on the snap lines of the node); ^415, ^416 | ^101, ^358 (`snapHints`) | unit `hints/hints.test`, `headingSnap.test` |
| hint `S`: pin snap suggestions | **bug ^419 (user)**: it shows because the start node counts as selected in extend mode, which the user never agreed to; the control itself shows while nodes are selected in every mode (^258, no mode check); control ^417 | ^258, ^294 | e2e `snapping.spec` |
| hint `P`: projects; no `Tab` hint, no camera hints | ^400; `Tab` visited (^110); camera missing (bug ^389) | | |
| history panel: `place node` with a right border | the step of operation ^409 (the step is called `place node`; the operation `place first node`), a pending batch (the drawing session is one batch until the road is finished) | ^107, ^108, ^216 (`stepNames.ts`) | e2e `editing.spec` |
| undo hint `Ctrl+Z: undo`, `(Alt to undo batch)` in gray | the undo hint in the panel; the Alt note shows always (roadmap ^418) | ^81, ^103, ^109 | unit `hints/hints.test` |
| a turquoise line from bottom to top, one from left to right, both through the node | the snap lines of the node: its normal and its heading (`nodeRules`: `node-normal`, `node-heading`). The extend lines at 15° to 75° are left out at the node itself (`withoutExtendAtTip`) | ^101, ^265 to ^267, ^325 to ^340 | unit `snap/snap.test`, `editor/snapping.test`; e2e `snapping.spec` |
| solid blue circle | the node dot: blue and larger because it is selected | ^70 (`scene.ts`, `SELECTED_DOT_PX`) | unit render tests (to check) |
| blue ring around it, with a small gap | the hover ring: the pointer is on the node; hover is derived from the pointer position | ^238 (`hover` in `editor.svelte.ts`) | unit `editor/hoverFresh.test`; e2e `editing.spec` |
| orange arrow pointing right | the heading arrow of the node (twice as long as to the control point); its heading is automatic (^54). Stronger than the preview's arrow (assumed: the preview is drawn fainter; to check) | ^9, ^126 (`drawArrow`) | none found |
| solid orange circle half way on the arrow | the heading control point on the stem (about 75% of the dot's size, not measured) | ^9, ^126 | e2e `smoke.spec` (drag) |
| cursor: a hand | the pointer is over a control point (a `grab` cursor over a handle) | ^48 | gap ^381 |

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer away | the dashed preview of the next node and segment appears | no |
| `LMB` click on empty canvas | place node 2 (the first segment) | no |
| `LMB` drag on empty canvas | place node 2 with a heading | no |
| `LMB` click on the node | with one node only: cancel first node: draw mode again, nothing placed; history: batch `place node`, `finish road` (should be `cancel`, ^438) | yes (state below) |
| `Esc` | the same as the `LMB` click (alternative input of the same control ^436) | not pressed yet |
| `LMB` drag on the node | move node | no |
| `RMB` click on the node | delete node | no |
| `Ctrl`, `Shift` held; `S` | no snapping; position only; pin | no |
| `Tab` | view mode (a road being drawn is finished) | no |
| `P`, `Ctrl+O` | projects modal | has to be explored again (data exists) |
| `Ctrl+S`, `Ctrl+Z`, `Ctrl+Y` | to explore again: there is a step and maybe data to save | no |
| `RMB` drag, wheel, `MMB` drag | camera | not yet |

### draw mode, nothing drawn, after a cancelled first node

Like *draw mode (nothing drawn yet)* (cursor, preview with a semi-transparent preview node and the orange arrow pointing right, the same hints), but the history now holds a batch of two steps, `place node` and `finish road`, with a shared right border in the panel, and the undo hint (`Ctrl+Z`) shows below the panel (^107, ^108, ^109, ^439). The map is empty again; whether a project was made meanwhile is ^386. Hats: ^437, ^439, ^435. `Ctrl+S` is explored here (control ^450). Not yet explored here: `Ctrl+Z`, `Alt+Ctrl+Z`, `Ctrl+Y` (they have something to undo now), the camera, `P`.

### extend mode, the first node brought back by undo (E2)

Reached by `Ctrl+Z` in (D2) (control ^454). The mode and outline are those the history snapshot restores: extend mode with the node as start node again (the user did not describe the outline; to confirm). The node has its heading; the pointer lies on it, so it is hovered and the cursor is a hand (^238). History panel: `place node` in white with a white right border, `finish road` in gray with a gray right border, the two borders touching (one batch, no gap, ^108); below it the redo hint `Ctrl+Y` or `Ctrl+Shift+Z`: redo, with `(Alt to redo batch)` in gray (^109, note roadmap ^418). Hats: ^453, ^107, ^108, ^109, ^81.

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+Y` or `Ctrl+Shift+Z` | redo: the cancel is done again (D2) | yes (control ^456; `Ctrl+Shift+Z` is its alternative, not pressed) |
| `Alt+Ctrl+Z`, `Alt+Ctrl+Y` | undo or redo of the whole batch | not yet: explore after a finished road |
| `Ctrl+Z` again | nothing to undo? (the history has two steps, one undone) | no |
| the other inputs of (E), `Ctrl+S`, `P` | as in (E) | by equivalence of the state, not pressed |

### placing the first node with its heading (the button is held)

Reached from (D2) by pressing `LMB` and moving with the button held (control ^411, operation ^420). The node is placed at the press; the road is already in extend mode, so the outline and the extend icon are orange. Screen and hints:

| Item | What it is | Hats | Tested |
|------|------------|------|--------|
| hints `LMB` drag: turn heading, `Esc`: cancel, `Ctrl`: no snapping | the hints while a handle is dragged are only about the drag (no `P`, no camera hints, no `Shift`: it is not available on a drag-place, ^358) | ^286, ^461, ^462 | unit `hints/dragHints.test` |
| the heading arrow follows the pointer in steps | the heading snaps to angle steps, finer the farther the pointer is from the node (the arrow is 80 px long): 45° up to 90 px (^457), 15° from 90 px, about 1.1 arrow lengths (^458), 5° from 180 px, about 2.25 (^459), 1° from 320 px, 4 arrow lengths (^460); for the first node of an arm the steps are absolute, from the compass directions (^315), not from the heading it had | ^251, ^315 | unit `snap/angles.test`, `editor/editor.test` |
| a compass icon and a label such as `270°` | the compass icon of the middle-button rotation (a red needle pointing north, a silver one south, a point in the middle) and the heading in degrees, 0 is north, counter-clockwise (270° is east, 315° north-east); the needle keeps pointing up while the view is not rotated; the label is below the icon, above it when the heading points down | ^316 | gap ^463 |
| cursor: a crosshair | the cursor of draw mode while a node is placed | ^48 | gap ^381 |

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer | the heading follows, with the steps above | yes (to the arrow's tip: 45°; further out: 15°, 5°, 1°, observed by the user at about 1.5, 2 and 4 arrow lengths, matching 1.1, 2.25 and 4) |
| release `LMB` | the node stays with that heading (operation ^420 done); extend mode (E3, below) | yes (step 26, with the pointer on the heading control point) |
| `Esc` | cancel (control ^461): the node is not placed; back to draw mode, the preview has the default heading again (right; planned: keep it, ^464) | yes (step 24) |
| release `LMB` after that `Esc` | nothing changes (the button was still held; the pointer that goes on moving afterwards changes nothing) | yes (step 25; unit `editor/cancelDrag.test`) |
| `Ctrl` held | no snapping (control ^462) | no |
| `Alt`, `RMB`, `MMB`, the wheel | nothing known; to try | no |

### extend mode, the first node placed with a heading, pointer on its heading control point (E3)

Reached by releasing `LMB` in (P) with the pointer on the orange circle (heading 0°, up). Screen: extend mode (outline, icons); the node as a larger blue circle (it counts as selected, bug ^419); an orange arrow pointing up with the heading control point midway; a blue ring around the control point (hover ring, ^469, the pointer is on it); no compass any more (it shows only while the heading is dragged). Hints, top to bottom: `LMB` drag: turn heading (^465), `Alt`+`LMB`: flip arm (^466), `Esc` or `RMB`: finish (should be `cancel`, ^438; control ^467), `S`: pin snap suggestions (bug ^419; control ^417), `P`: projects (^400). No `Ctrl` hint, because nothing snaps under the pointer here; no `Tab` hint (visited), no camera hints (^389). History panel: the earlier batch (`place node`, `finish road`, one batch with a shared white right border) and one `place node` in white with its own border (the new drawing session is a batch of one so far, ^439). Hats: ^420, ^468, ^469, ^107, ^108.

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer off the control point | the control point's ring goes; over empty canvas the dashed preview of the next node and segment shows | no (next step) |
| `LMB` drag on the control point | turn heading (^465) | no |
| `Alt`+`LMB` click on the control point | flip arm (^466) | no |
| `Esc`, `RMB` | cancel first node (^467) | no |
| `LMB` click on empty canvas, `LMB` drag | place next node | no |
| `Ctrl+Z` | undoes `place node`; the panel's undo hint shows | no |
| `Tab`, `P` and the others of (E) | as in (E) | no |

### view mode (empty map)

Screen: no outline; two icons (the eye now ringed, the pointer white); hints `RMB drag` pan, wheel zoom, `MMB drag` rotate, `P` projects (there is no `Tab` hint: the control counts as visited because it was just used, ^110, which is a bug, ^384); the default cursor. Hats: ^104, ^119, ^110.

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+S` | same state, two toasts | yes |
| `Ctrl+Z`, `Alt+Ctrl+Z` | same state, toast | yes |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | same state, toast | yes |
| `Ctrl+O` | projects modal with the file window open | yes |
| `Tab` | select mode, but not the first-load state: the `Tab` hint (view mode) is gone, because the control was visited (^110, below) | yes |
| `P` | projects modal, no file window: the state after *Cancel* of the file window | yes, with that state |
| `RMB` drag, wheel, `Ctrl` + wheel, `MMB` drag | camera | no |
| `LMB`, `LMB` drag | probably nothing (view mode edits nothing) | no |

### file window over the projects modal (the browser's file picker, opened by `Ctrl+O` or *Import file…*)

Screen (Brave on Arch Linux): the browser's own window, set to Custom Files; the filter is `.json` (`accept=".json,application/json"`, `ProjectsModal.svelte`). It is not ours, so it has no hints and no tests of its own. Behind it the projects modal (below). Hats: ^223, ^164.

| Input | Result | Explored |
|-------|--------|----------|
| Cancel | projects modal (state below); nothing changed; the search field is focused (^178) | yes |
| Open file | import: the file is read, checked and migrated; on success a new project opens and the modal closes, otherwise an error shows (^164, ^192 to ^209) | no |

### projects modal (no file window)

Screen: the modal sits over everything with a veil of 60% of the background color (`.backdrop`, z-index 1); the map, the mode icons, the compass and the measurements panel are *grayed out only because they lie under that veil* (no code grays them on purpose); the control hints panel and the column of toasts and the recent history panel (both z-index 2) stay above it; the hints are replaced by the modal's own controls (`modalHints`, ^168). The history panel should be grayed too (^387); a modal is not yet a reusable component (^388). Layout and sizes: ^211. From left to right, top to bottom: the title `Projects`; an X (close); the search field (focused when the modal opens, also after the file window was cancelled, so the list can be searched by typing, ^178); the list (an empty one says `No project matches.`, bug ^385); the cards `Import file…`, `Export JSON`, `New project`. `New project` has a blue border because no project is open (`current`, ^171). Hints: `Esc` close always; over the search field and not focused `LMB` search; over a button `LMB` import, export JSON or new project; over the X one merged row `Esc or LMB`: close (rows with the same text become one row, keys before the mouse, `merged` in `modalHints.ts`; tested in e2e `projects.spec`, "one row for inputs that do the same").

While the modal is up only `Esc` is handled by the app (`modalKey` in `App.svelte`); every other key is left to the browser (so `Ctrl+S` may open the browser's save dialog: to check).

| Input | Result | Explored |
|-------|--------|----------|
| `Esc` | closes the modal, back to the state before | yes (batch) |
| click outside the modal | closes it (`requestClose`, ^233: not while a rename is unfinished) | yes (batch: back to the state before, no new transition) |
| click the X | closes it | yes (batch) |
| click the search field or type | the *Search* feature (below) | no |
| `Import file…` | the file window (same state as above) | yes (same state) |
| `Export JSON` | downloads the project as a file; toast (^163, ^226) | no |
| `New project` | blank project, closes the modal (^171) | no |
| `Ctrl+S`, `Tab`, `P`, `Ctrl+Z`, ... | to check what the browser does | no |

## Reusable features

A feature that appears in several states is audited once here and linked from the states that use it.

### Search (`FilterList`, `src/lib/ui/fuzzy.ts`, hat ^178)

Every list has a search field and the search is fuzzy: the characters of the query in order, ranked by how well they match. Transitions: to be walked as its own state when we get to it (typing, `Esc`, empty result text, focus rules, the hint `LMB search`).

## Journey (the user actions in order, from a new browser window on a new machine)

The record of what the audit has pressed, in sequence. `(S)` first-load state, `(V)` view mode, `(M)` projects modal over the state before, `(A)` select mode after a visit of view mode.

| # | State | Input | Result |
|---|-------|-------|--------|
| 1 | (S) | `Ctrl+S` | two info toasts |
| 2 | (S) | `Ctrl+Z` (`Alt` ignored) | toast `nothing to undo` |
| 3 | (S) | `Ctrl+Y` or `Ctrl+Shift+Z` (`Alt` ignored) | toast `nothing to redo` |
| 4 | (S) | `Tab` | (V) |
| 4a to 4c | (V) | `Ctrl+S`, `Ctrl+Z`, `Ctrl+Y` | the same toasts |
| 5 | (V) | `Ctrl+O` | file window over (M) |
| 6 | (M) | Cancel in the file window | (M), search focused |
| 7 | (M) | hover each element | the hints of the modal, one merged row over the X |
| 8 | (M) | `LMB` in the modal outside the search field, then hover the search field | `LMB: search` shows only while the field is not focused |
| 9 | (M) | `Esc` | (V) |
| 10 | (V) | `P` | (M), no file window |
| 11 | (M) | `LMB` outside the modal | (V) |
| 12 | (V) | `P` | (M) |
| 13 | (M) | `LMB` on the X | (V) |
| 14 | (V) | `Tab` | (A): the `Tab` hint is gone (^110) |
| 15 | (A) | `LMB` click on empty canvas | (D) draw mode, nothing drawn yet |
| 16 | (D) | `LMB` click on empty canvas | (E) extend mode, one node placed (operation `place first node`, ^409) |
| 17 | (E) | `LMB` click on the placed node | (D2) draw mode, nothing drawn, with a batch of two steps in the history (operation `cancel first node`, ^437) |
| 18 | (D2) | `Ctrl+S` (some seconds later) | the same state; toasts `saved` and `modelcity saves automatically` (^440, ^442) appear at once and go after 3 s; the history panel went away after about 3 s (^107); the project is saved (operation ^428, control ^450) |
| 19 | (D2) | `Ctrl+Z` (pointer still where the node was) | (E2) the node is back with its heading (operation `undo`, ^453, control ^454) |
| 20 | (E2) | `Ctrl+Y` | (D2) again: draw mode, nothing drawn, the preview is back; the history shows both steps white; no hints in the panel because `undo` and `redo` were just used (^110); the panel goes after about 3 s (operation `redo`, ^455, control ^456) |
| 21 | (D2) | `LMB` pressed and held, the pointer moved right to the tip of the heading arrow | (P) placing the first node with its heading: extend mode, hints of the drag, compass icon and the label `270°` (control ^411) |
| 22 | (P) | the pointer moved up and a little left, staying on the tip | the arrow moves in 45° steps; after one step `315°` |
| 23 | (P) | the pointer moved farther out: 1.5, 2, then 4 arrow lengths | steps of 15°, 5°, then 1° (^458 to ^460) |
| 24 | (P) | `Esc` | (D2): back to draw mode with a preview node; the preview heading is the default again (right); the placing is cancelled (control ^461) |
| 25 | (D2) | release `LMB` (still held) | nothing changes |
| 26 | (D2) | `LMB` pressed again, dragged up to the orange circle (half an arrow length, `0°`), released | (E3) extend mode, the node placed with its heading up (operation ^420 done, control ^411) |

`(D)` draw mode, nothing drawn yet; `(E)` extend mode, one node placed; `(D2)` draw mode after a cancelled first node; `(E2)` the node brought back by undo. Now: **(E3)**. Before: (D2) (as before, except that `undo` and `redo` count as visited, so the history panel shows no hints). Not yet explored in (M): `New project`, `Export JSON`, search, keys while the modal is open, Open file.
