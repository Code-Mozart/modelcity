# Controls

The current controls, in one place (^36). Controls in modelcity are **contextual by design** (^45): what a button or key does depends on the mode, on what is under the pointer and on what the user is doing right now. So this document is organized by context, and every context lists everything that works in it. The reasoning and history live in the hats; when a control changes, update this file and the hat that decided it.

Code: editor keys in `src/lib/editor/keymap.ts`, pointer rules in `src/lib/editor/editor.svelte.ts`, camera rules in `src/lib/camera/camera.svelte.ts`, input dispatch in `src/lib/MapCanvas.svelte`, the hints in `src/lib/hints/hints.ts`.

Mouse buttons: **LMB** left, **MMB** middle (wheel button), **RMB** right. "Click" means press and release without moving; "drag" means moving while the button is held.

## Four modes (^48, ^104, ^120)

The modes are shown as icons at the top left (eye: view, cursor: select, pen: draw, node with a dashed line: extend; view mode shows only the eye and the cursor); the current one is in the color of the mode and in a ring, the others in the text color. The screen has a hairline outline (0.5 px) in the same color: select blue, draw dark (the node color), extend orange, view none.
- **View mode (^104):** nothing can be selected or edited, only the camera works (pan, zoom, rotate). Only the generated geometry is drawn: no skeleton (curves, node dots) and no scaffold. The icon is in the text color and there is no outline. `Tab` enters it from every mode (a road being drawn is finished; the selection is kept, though not shown), and `Tab` leaves it for select mode. In view mode the keys for editing, undo and redo do nothing. The icons are not clickable, the keyboard is the way (^44).

- **Select mode:** no road is being drawn. The cursor is the default arrow and there is no preview.
- **Draw mode:** the user is drawing, but no node is being extended. The cursor is a crosshair and a preview shows the node a click would add. A click on empty canvas starts a new road; a click on a node starts extending, splitting or merging as below.
- **Extend mode:** a node is being extended (a road is being drawn, with the dashed preview line to the next node).

A left click on empty canvas in select mode only enters draw mode (it places no node, ^54); the next click places node 1 of a new road (extend mode). A left drag in select mode does not enter draw mode: it spans the selection box (^70). Finishing the road (an RMB click on empty space, a click on the node being extended, a merge or a closed loop) goes back to **draw mode**; a second RMB click on empty space, or Esc at any time, leaves draw mode for select mode (^43, ^120). Esc from extend mode jumps straight to select mode.

## What the left button does

The left button always creates or edits; there are no tools (^44). What happens depends on the mode and on the first thing under the pointer, in this order:

| Under the pointer | Select mode | Draw mode | Hats |
|-------------------|-------------|-----------|------|
| A handle: node, heading control point (on the arrow's stem), bend point (orange), radius point (orange), corner point of an S-curve (orange) | The handle is highlighted (blue ring). Click selects a node or heading. Drag edits it: moves the node (all selected nodes move with it, see Selection), turns the heading, drags the bend point, a radius point or a corner point of an S-curve (turns the heading of its node so that the heading line passes through the pointer, ^132; a hook's corner points are derived and cannot be dragged, ^105) | The same, with no node preview | ^9, ^44, ^48 |
| A node of a road (draw mode, ^23) | Same as any handle (above) | **Nothing being drawn:** a click on a node that is the only end node of its road extends that road from it (^65): the road becomes the road being drawn, at that end (at the first node backwards, the new node is added before it; but a merge right after that click runs **out of** the clicked node, in the order of the clicks: click A, then D gives A to D, and D, then A gives D to A, ^239). A click on any other node, or on a node where roads meet, **splits**: a new road starts at that node (see below). **A road is being drawn:** a click on the node where the road started **closes** a loop (^162); a click on any other node **merges**: the road ends at that node, and drawing stops; a click on the node being drawn from finishes the road (the hint is one row, `[LMB] or [Esc]: finish`, ^239). Switching to the other end of the road being drawn was dropped (^162): leave and enter again. A drag moves the node as usual | ^23, ^65 |
| A road's curve (as near as a node: 9 px, 16 on touch, and at least 0.5 m from the nodes at its ends, ^137) | No mark (the insert mark only exists in draw mode, ^79). Click selects its two nodes, Shift+click adds them (or deselects both if both are selected, ^74), Alt+click selects the branch (^131), or deselects it if all of it is selected. A drag spans the selection box | The curve gets a ring and a small tick (the white mark). A click inserts a node there (the curve does not change) and then, with nothing being drawn, **splits** a new road off that node, or, while a road is being drawn, **merges** that road into it (also on the road's own curve, ^191). A drag only inserts the node, never splits or merges, and sets its heading while dragging, which can turn the curve into an S-curve or hook (^133). Esc after a split leaves just the inserted node | ^10, ^23, ^44, ^48 |
| Empty canvas | With nothing selected, click enters draw mode (no node yet); with a selection, click deselects all instead (^75); a Shift click does nothing. Drag spans the selection box (see Selection) | A preview of the node (and, once the road has nodes, the curve to it from the last one). The first click places node 1 of a new road, heading right (a drag sets its heading). Later clicks add a node at the end of the road, its heading chosen so that the new edge is a single circular arc (a hook beyond 180°, also when the cursor is behind the arrow). Drag adds the node at the press point with the heading pointing to the cursor, previewed live | ^40, ^44, ^46, ^48 |

Details:

- Shift while dragging a heading (editing a handle, or placing a node) snaps it to 15° steps (^11).
- Dragging a radius point to within 0.5% of the largest radius that fits makes the radius auto again: a deliberate snap, on any kind of segment, and the only way back to auto (the double-click was removed, ^143); with the snapping system it is to become a snap to the limiting node (^141).
- A heading drag of a shared node turns all its copies (^92). Experiment (no shape tag): every curve is derived from the positions, headings and radii alone; the S-curve's middle line is always the derived one and cannot be moved.
- The cursor shows what a click would do: a hand over a control point, a crosshair in draw mode, a plus-like copy cursor over a curve in draw mode (click inserts, splits or merges), a pointer over a curve in select mode (click selects), else the default arrow.
- Dragging less than 6 px while placing a node does not set a heading, so a click keeps the automatic one.
- Roads are independent of each other (^42).
- Entering draw mode and placing the first node are two clicks (^54).

## Splits and merges (^23)

The map is a graph of nodes and edges (^106, `docs/data-model.md`); a road is a run of edges, one lane (^76). Several lanes next to each other are several roads, drawn by hand one lane width (3 m) apart (snapping them to each other was removed again, ^124), and roads can join at nodes:

- **Split:** with nothing being drawn, click a node or a curve in draw mode: a new road starts there (on a curve the node is inserted first). The node then has one edge in and two out.
- A split on a curve that is finished at once (`Esc`, a right click, a click on the node) leaves the curve as it was: the inserted node goes again (^237). Once the road has a second node, it stays.
- **Merge:** while a road is being drawn, click a node or a curve of another road: the road ends there, and the node then has two edges in and one out. Extending the road backwards (from its first node) turns this around: the clicked node is where the road starts, so it is a split.
- **Loops (^162):** a click on the node where the road being drawn started closes a loop (hint `close`).
- **Nodes where roads meet** are one node with one heading: selected, moved, deleted and turned as one. Deleting a node with one edge in and one out joins its neighbours; deleting a node where roads meet removes all its edges, and nodes left without an edge go.

## Selection (^70, ^71, ^72)

A selection is 0..n nodes, also of different roads. Selected nodes are drawn blue and 150% larger (^73). A *selected segment* (both its nodes selected, also while the selection box is dragged) has its curve line and its direction arrows drawn blue, not its road surface (that is later, ^98; ^231). A **hovered segment** gets a blue outline, 20 px across (like the ring of a hovered node, 10 px in radius; at least a little wider than the road), with a half circle at each end and on top of everything; with Alt held the outline covers the whole branch that Alt+click would select (^99, ^128).

| Input | Action |
|-------|--------|
| LMB drag on empty canvas (select mode) | Spans the selection box, axis-aligned with the viewport. The nodes inside are the new selection, live while dragging |
| Shift + LMB drag on empty canvas | Same, but the nodes inside are added to the current selection |
| LMB on an unselected node | It becomes the whole selection (select mode only: in draw mode a click on a node does not select, ^75) |
| Alt + Shift + LMB click on a node or curve | Add the **branch** to the selection, or deselect it (the other nodes stay) if all its nodes are selected already (^244). Hint `[Alt]+[Shift]+[LMB]: add branch to selection` or `deselect branch`, only while something is selected | ^244 |
| Alt + LMB click on a node or curve | Select the **branch** (a chain of nodes between two nodes where branches split, merge or end, both of them included, ^130, ^131); if the whole branch is selected already, deselect it instead. Alt + drag on a node moves the branch. On a node where branches meet or end, the branch that goes on from it in drawing direction (else the one before it) is meant (assumed) |
| LMB click on empty canvas (something selected) | Deselect all; with nothing selected it enters draw mode instead (^75) |
| LMB drag a selected node | All selected nodes move by the same translation; all scaffold gizmos are hidden meanwhile (^78). A click without moving reduces the selection to that node |
| LMB drag a radius point of a segment whose two nodes are selected | The radius of all selected segments (both nodes selected) is set to the dragged value; their scaffolds are shown while the radius point is hovered or dragged (^77, ^129) |
| Shift + LMB click on a node | Toggle whether the node is selected |
| LMB click on a curve (select mode) | Select its two nodes (^74) |
| Shift + LMB click on a curve | Add the segment (its two nodes) to the selection; only if both are selected already, deselect it (^74) |
| Shift + LMB drag a node | Adds the node to the selection and moves the group |
| Del or Backspace | Remove all selected nodes |

Entering draw mode, finishing a road and removing nodes clear the selection.

## Removing and finishing

| Input | Action | Hats |
|-------|--------|------|
| RMB click on a node (either mode) | Remove that node. A road left with fewer than two nodes disappears, except the road being drawn, which may have one node | ^11, ^31, ^43 |
| RMB click on a curve (either mode) | Remove that **segment**, and its nodes if it was their only segment. A segment in the middle of a road splits the road in two. While drawing, the road is not finished: it goes on from the node being drawn from if that is still there, else from its neighbour (the node at the other end of the removed segment) | ^160 |
| Del or Backspace | Remove the selected nodes (same rule) | ^11 |
| RMB click on empty space | Finish the road being drawn (leaves draw mode); nothing in select mode | ^43 |
| Esc | Finish the road being drawn. With only one node the road is cancelled, because a road needs at least two nodes | ^43 |
| Alt + RMB click on a curve (either mode) | Remove the whole **branch** the segment is on (^160): all its segments, and the nodes that had no other segment. While drawing: the road goes on from the node being drawn from if that is still there, else from a neighbour that still has a segment, else it is no longer drawn. Hint `[Alt]+[RMB]: remove branch` | ^160 |
| Alt + LMB click on a heading control point | **Flip the arm** (^234, arm: ^130): every node connected to this one turns around (every heading a half circle) and every segment between them runs the other way, so the curves stay the same and their direction arrows turn. While drawing the road goes on from the same node. Hint `[Alt]+[LMB]: flip arm`. A click, not a drag: dragging the point turns the heading as always | ^234 |
| Tab (any mode) | Enter view mode; in view mode, back to select mode (^104). The hint `[Tab]: view mode` is the top row of the hints and is hidden once used, like the camera hints (^110) | ^104 |
| Esc (select mode, something selected) | Deselect all: a selection step like a click on empty canvas, so it joins the batch of selection steps before (^218) | ^218 |
| LMB click on the node being drawn from (draw mode: the road's last node, or its first node if the road was extended backwards; a road with one node: that node) | Same as Esc. A click, not a drag: dragging the node moves it and keeps drawing | ^43 |

## The hints (top left)

The corner shows what the mouse and keys do right now, as rows of `[input]: action`, with symbols for the inputs (^49, ^50; `MouseIcon`, `MouseDragIcon`, `MouseWheelIcon`, `KeyCap`). The rows change with the mode and with what is under the pointer:

| Mode and context | Rows |
|------------------|------|
| Select mode, empty canvas | `[LMB]: draw mode` (with a selection: `[LMB]: deselect all`), `[LMB drag]: select`, `[Shift]+[LMB drag]: add to selection` (only while something is selected), `[Esc]: deselect all` and `[Del]: delete selected` (same; ^218), `[RMB drag]: pan`, `[Wheel]: zoom`, `[MMB drag]: rotate` |
| Select mode, over a curve | `[LMB]: select segment` (not if both are selected; `… instead` when something else is selected), `[LMB drag]: select`, `[Shift]+[LMB]: add segment to selection` or `deselect segment` (only with a selection), `[Alt]+[LMB]: select branch` (`deselect branch` if the whole branch is selected), `[Del]`, then the camera rows |
| Select mode, over a handle | what dragging it does (`move node`, `turn heading`, `bend curve`, `change radius`), on a node `[RMB]: delete node`, `[LMB]: select` (`select instead` if something else is selected; not if it is selected), `[Shift]+[LMB]: select` (only with a selection) or `deselect`, `[Alt]+[LMB]: select branch` (`deselect branch` if the whole branch is selected), then `[Del]` and the camera rows |
| Draw mode, empty canvas | `[LMB]: add node`, `[LMB drag]: add node and set heading`, `[Esc] or [RMB]: finish` |
| Draw mode, over a curve | `[LMB]: split` (nothing being drawn), `merge` (any curve while drawing, the road's own too, ^191), `[LMB drag]: insert and set heading`, `[Esc]: finish`, `[RMB]: remove segment` (^160) |
| Draw mode, over a node | `[LMB]: split` or `extend` (nothing being drawn), `merge` (another road's node while drawing), `close` (the node the road started at), `[LMB drag]: move node`, `[RMB]: delete node`, `[Esc]: finish`. The node being drawn from also has `[LMB]: finish` |
| Draw mode, over a heading control point | `[LMB drag]: turn heading`, `[Alt]+[LMB]: flip arm` (^234), `[Esc] or [RMB]: finish` |
| Draw mode, over another handle | what dragging it does, `[Esc] or [RMB]: finish` |

While a button is held, the rows stay those of where it was pressed.

## What is shown on the canvas (^60)

Two levels of gizmo:

- The **road surface** (^90) lies under everything: every segment is 3 m wide with an outline, in the Google Maps colors of the current theme. It is not a gizmo and cannot be edited; crossing roads merge.
- The **skeleton** is always shown: the curves, the dots of the nodes, and small direction arrows along the curves every 72 px, pointing the way the road runs (^80, ^86). There are no numbering labels.
- The **scaffold** of a segment (the curve between two nodes) is everything else: the orange lines, circle and control points (the bend's point and the heading control points), the heading arrows (orange), the axis line of an S-curve or hook and its corner points, the orange radius points, three per arc: one in the middle, on the bisector of the corner, and one at each end where the straight lines touch the arc (an end within 14 px of a node is not shown, ^139), and the radius label (`116.7m`), which hangs at the radius point that is hovered or dragged, else in the middle of the arc. It is shown completely or not at all.

Only a single segment shows its scaffold at a time (^66), over all roads, with one exception: with several segments selected (both nodes of each), they show their scaffold all together or not at all (^133). Which one:

1. A hovered or dragged orange point (bend, corner or radius) keeps its own segment, wherever the pointer is. A hovered or dragged node or heading control point takes the one of its two segments whose curve is closer to the pointer.
2. Otherwise the segment whose curve the pointer is on (within 20 px of it), the closest curve first.
3. Otherwise the segment with the control point closest to the pointer (a node, a heading control point, the bend point, a corner point of a hook or S-curve, a radius point), within 48 px; nearer curves break ties.

If that segment is one of several selected ones, all selected segments show their scaffold, with their heading arrows (^133); if it is not, the selected ones show nothing. The heading arrows of the two nodes of the shown segment are shown with it, and no other arrows. A node of a road that has no segment yet always shows its heading arrow. A node being placed counts as dragged.

Looks: blue means selected or user action (selected nodes and segments, the hover ring and outline, the selection box), orange is gizmo; an orange point that is hovered or dragged is as large as a selected node (^230). Filled points can be dragged (heading, bend, radius and corner points, all orange, ^134); the corners of an S-curve turn the heading of their node when dragged (the pointer is on the heading line). Nothing is hollow any more. On touch there is no hover, so scaffolds appear only while something is grabbed.

## Projects (^82, ^148, ^163 to ^171)

The map is a project, kept in the browser (IndexedDB) and saved by itself (autosave) a short while after the map changed (nodes, edges, lanes; at the latest 5 s after the oldest unsaved change, ^183); moving the camera alone does not change the date; the camera is saved once it has rested for 1 second (^236), and with every save. The project that was open last opens when the app starts. The camera of a project is saved with it and comes back when the project is opened, also after a reload (^236). Only `P: projects` is in the control hints panel; the other keys work but have no hint (^222, ^223, ^226): they are shown in the operations search when it exists (^97).

| Input | Does |
|-------|------|
| `Ctrl+S` | Saves the open project to the browser at once (what autosave does a short while after a change) and says `saved` in a toast (^226, ^185, ^232); with nothing to save it says `nothing to save yet`. It does not export a file any more |
| `P` | Opens the projects modal (below; ^222). The only one of these keys with a hint |
| `Ctrl+O` | Opens the projects modal and, at once, the file window of `Import file…` (^223; a browser only opens a file window right after a key press, so it is to be tried in each browser) |

The card `Export JSON` in the modal (formerly `Save to disc…`, ^226; no hotkey) downloads the project as a file (`<title>.modelcity.json`, the format of `docs/data-model.md`) and says so in a toast.

**The projects modal** (^168, ^171, ^178, ^189): while it is up the control hints panel shows only its controls (what an input does right now, as briefly as is clear, ^181: Esc always, the click only over something that can be clicked, `Enter` while renaming; inputs that do the same are one row, `Esc or LMB: cancel`) and the map takes no input. A search field (focused on opening, so typing right away searches) filters the list, which is newest first. Everything is a card of the full width; the icons of a card are inside it. A project card shows the title (cut off with … if it is long; the full title is its tooltip, ^188) and how long ago it was changed (`just now`, `17 minutes ago`; after 8 weeks the date `YYYY-MM-DD hh:mm:ss` in local time; the tooltip is the exact time in ISO form with the offset, ^190, ^214); the open project has a blue outline and the italic label "open" on its own line. A click on a card opens that project (on the open one it just closes the modal); opening a project does not change any date. The pen turns the title into a text field and itself into a check mark: Enter or the check mark renames, Esc or the cross cancels (the modal stays); a rename is written at once, the modal is blocked meanwhile, and the date of the last change stays. The bin asks first: it turns into a cross and the pen into a check mark, and the card gets a red outline; the check mark deletes (for good, there is no bin to bring a project back), the cross or Esc cancels; the check mark is on the left, so a double click on the bin cancels. Below the list three cards without icons: `Import file…` (a project file becomes a new project of the browser and keeps the dates of the file, opening a file is not a change of the map; a file that is no project, or from a newer version, is refused with a message), `Save to disc…` (the same as `Ctrl+S`) and `New project`. **No project:** at first, and after `New project` or after the last project was deleted, there is a blank map and no project; then the `New project` card has the blue outline and a click on it only closes the modal. The map becomes a project (called "Untitled project") when it has something in it, a short while after: nothing is stored before. A refused file shows a red message with an error icon (^210, ^209: not a project, newer version, old version, damaged, unreadable; the details with where in the file are in the browser console, F12). The modal is wide and up to three quarters of the screen tall; only the list scrolls, also when a message takes room (^211). Hovering the search field says `search` while it is not the one typed in. The cross in the top right corner, Esc and a click next to the modal close the modal.

**Renaming (^233):** while the name of a rename was changed, the modal does not close (click outside, the cross, `P`...) and no other card can be opened, renamed or deleted, nor `New project` or `Import file…` used; a warning toast says `Finish or cancel the rename first.` `Esc` or the cross of the card cancels the rename on purpose. With the name unchanged nothing would be lost, so the modal closes.

**Search** (^178, `src/lib/ui/fuzzy.ts`): fuzzy, case does not matter. A title matches if all characters of the search appear in it in the same order, not necessarily next to each other (`hbr` finds "Harbour district"; spaces at the start and the end of the search are ignored, spaces inside count as characters). The best matches come first: every matching character scores 10, 8 more if it directly follows the one before, 6 more at the start of a word (the start of the title, or after a character that is no letter or digit), minus the characters skipped before it (at most 5). Equal scores keep the order of the list, so the newest project stays first. An empty search shows everything.

Not decided yet: the UI to switch projects without the modal (it waits for the operations search, ^97) and a preview of the map on the cards (^179).

## Undo and redo (^81, ^88)

| Input | Action |
|-------|--------|
| Ctrl+Z (Cmd+Z) | Undo the last step |
| Ctrl+Y or Ctrl+Shift+Z | Redo |
| Alt+Ctrl+Z | Undo the whole batch the last step belongs to (^103) |
| Alt+Ctrl+Y or Alt+Ctrl+Shift+Z | Redo a whole batch (^103) |

**Single steps and batches (^103, ^216):** a batch is a run of consecutive steps of one kind: selection changes, or the steps of one drawing session (the first node until finishing the road). A step alone is a batch of one, so `Alt+Ctrl+Z` also undoes a single step and `Alt+Ctrl+Y` redoes one. A selection batch ends when the user does something other than selecting (camera moves do not end it). After an undo or redo the next step starts a batch of its own.

## The recent history panel (top right; ^107, ^108, ^109)

It shows the last **7** steps of the history, oldest on top, and the hints for undo and redo at its bottom (two rows: `Ctrl+Z: undo (Alt to undo batch)` and `Ctrl+Y or Ctrl+Shift+Z: redo (Alt to redo batch)`; each only while there is something to undo or redo, the Alt note in the muted color). Steps that were undone stay in the panel, grayed out (the muted text color) below the others, until they are redone, which colors them back in. The window slides: nothing undone, 7 steps; 1 undone, 6 and that one; 2 undone, 5 and 2; 3 or more undone, 4 and the next 3 that a redo would bring back.

Names: `place node`, `move node`, `turn heading`, `bend curve`, `change radius`, `insert node`, `split road`, `merge road`, `close road`, `extend road`, `finish road`, `delete node`, `delete 3 nodes`, `select 2 nodes`, `deselect node`, `deselect all`. A run of selection steps is one row (`select 3 nodes`, named by what it selected in the end); a run that ends where it began (select, then deselect all) changed nothing and has no row, but its steps are still undone one by one or as a batch. Every step has a line on its right; the steps of a batch sit together, so their lines join. An undone step and its line are grayed out, also inside a batch that is only partly undone. A batch with more than 5 steps shows its last 4 under an italic `(N more steps)`. There are no batch titles.

The panel appears the second a step is taken, undone or redone, and goes after 3 seconds without another one. While a road is being drawn it stays, and the 3 seconds start when the road is finished.

## Camera (always, in every context)

| Input | Action | Hats |
|-------|--------|------|
| Wheel | Zoom at the cursor (Ctrl+wheel, e.g. a trackpad pinch, is 4x faster) | ^30 |
| RMB drag | Pan. A right click without moving is not a pan: see above | ^30, ^31 |
| MMB drag left/right | Rotate about the point where the drag started (right = clockwise, 0.4° per pixel) | ^30, ^31 |
| MMB drag up/down | Zoom about the same point (up = zoom in, 1% per pixel, like Blender's dolly) | ^30, ^31 |

MMB drag details (^31): the first 20 pixels from where the drag started are a dead zone per axis, so a mostly vertical drag does not also rotate and vice versa. The effect starts from zero at the edge of the zone, and moving back inside undoes it. The scale bar (bottom left) is shown during the drag and for 2 seconds after any wheel or pinch zoom (^34).

### While the middle button is held (rotating)

The cursor becomes a compass (^33): the needle points to world north; the inner ring shows what dragging does (counterclockwise left, clockwise right, zoom in above, zoom out below); the N, E, S, W key caps on the outer ring sit in the on-screen direction of the real world direction, so they turn with the world, and turn blue while pressed. The left button does not create or edit while rotating.

| Input | Action |
|-------|--------|
| Esc | Cancel: restore the view from before the drag (it does not finish a road) |
| N, E, S, W | Rotate so that north, east, south or west is up (N resets). The drag continues from there with a fresh dead zone |
| LMB click on a key cap of the compass | Same as the key |

### Camera limits

The camera cannot leave the content (^37, ^38, ^62): at least 12 px of the (invisible, screen-aligned) bounding box around the skeleton, the curves and the node dots (not the control points), always stay on screen, whatever you pan, zoom or rotate. With nothing drawn, the view does not pan at all.

## Touch

| Input | Action | Hats |
|-------|--------|------|
| One finger | Same as the left button in every context above | ^40 |
| A second finger comes down | The one-finger action is undone (a node placed by the first finger disappears) and the gesture becomes a camera gesture | ^40 |
| Two fingers | Twist rotates, pinch zooms, moving both pans (all about the midpoint) | ^30 |

There is no one-finger pan any more: empty space belongs to creating (^14 is superseded).

## Not decided yet

- Typed length/angle, guide snapping and undo from the handover (^11).
- The HUD beyond the control hints (^20, ^29), where the grid returns (^35), and a permanent rotation indicator (^31).

## Visited controls are hidden (^110)

The hint of a control the user has just used is hidden, each control on its own: the camera controls (`pan`, `zoom`, `rotate`), the select operations (`select`, with a box, `add to selection` with Shift, `select branch` with Alt, `deselect all` with Esc, `delete selected`) and the two history hints (`undo`, `redo`). It comes back after 5 minutes (user, for now) without using that control. Nothing is stored: a new session starts with all hints. Draw mode, moving and the project controls are not affected, nor is `[LMB]: draw mode`, so on a blank map it is the only mouse hint once the camera and select controls are visited.

## Toasts (^232, ^185)

A *message* (glossary) is any text for the user with the icon of its kind in front: a toast, or the error of a refused import in the modal (^210). Short messages in the top right corner, above the recent history panel, on a transparent background, each with the icon of its kind in front (^210): `saved` (`Ctrl+S`), `nothing to save yet`, `nothing to undo` and `nothing to redo` (`Ctrl+Z`, `Ctrl+Y` and their `Alt` forms with nothing to move, ^242), `exported <file>`, `imported <title>`, and the texts of a project that cannot be loaded from the browser storage (the same texts as a refused import, ^209; the stored project stays as it is and the app starts with a new, empty project; opening such a card tells it again and changes nothing). Confirmations stay 3 seconds, warnings and errors 8 seconds (assumed); several stack, but a message that is showing already does not appear twice: its time starts again (^242). The icon is always at the start of the text (user). `Ctrl+S` also says `modelcity saves automatically` in a second toast (info), every time (user).

## Snapping (^101, ^153)

A node that is **placed** (draw mode, empty canvas) or **moved** (dragged, also a group: the dragged node snaps, the others follow, ^264) is pulled to the nearest *snap suggestion* within 25 px (assumed): a snap point, a snap line or a snap curve (glossary). A turquoise guide shows what it is pulled to: a line or curve, and a ring at a point or where two cross (^280). The suggestions are made by rules (^265 to ^273, ^279): the line along the normal and along the heading of every node, three points at a node (on it and one lane width to each side), the curve of every segment and its two offsets one lane width away, the bisector and its tangent of a bend, the lines along the normal at the ticks the radius points (^270), and the inflection point of an S-curve or hook with the lines along its tangent and normal (drawn as a ring, ^260). Only those near their nodes (300 px, assumed) are offered, except those of **pinned** nodes and of the node being drawn from (^288). The nearest point (or crossing) wins, then the nearest curve; a point and the curves through it are shown together (^289). While nodes are moved their previous positions are snap points (^113); in draw and extend mode a node, the curve of a segment and a radius point that are near are what a click works on (split, merge, extend, close, ^291): a node placed beside a curve is not left unconnected on it.

| Input | What it does |
|---|---|
| `Ctrl` (held) | Turns snapping off and hides the scaffolds (^287); its hint `[Ctrl]: no snapping` shows only while a node snaps |
| RMB on one of several selected nodes, or on a segment between two of them | Removes all selected nodes (^290) |
| `S` (nodes selected) | Pins the snap suggestions of the selected nodes: offered at any distance, the nodes turn turquoise; each pin replaces the one before (`[S]: pin snap suggestions`, never hidden). While the middle button is held (the compass) `S` is the compass key |
| `S` (nothing selected, something pinned) | Unpins all (`[S]: unpin all snap suggestions`) |
| Drop a node on another node (within the snap radius, or 0.1 m at any zoom) | The nodes are merged: the node dropped on stays, with its heading; one undoable step (^248) |
| Drop a node within 0.1 m of a curve, or snapped to it | The node joins the segment, which is split there; the node takes the tangent of the curve (^268, ^283). While dragging, the curves it would then have are shown dashed (^284) |
| LMB click on a radius point (draw or extend mode) | Splits or merges there, like a click on the curve; a drag moves the radius (^278) |
| LMB click on the node inserted by a split (draw mode) | Keeps the node and goes back to draw mode (^276); Esc or a right click right after the split still gives the curve back (^237) |

Following a snap suggestion for 1.5 s shows the tip `Select the node and press S to pin its snap suggestions`, at most once a minute (^258).

While a handle is dragged the hints are only about the drag (^286): what it does, `Ctrl` while snapping, `merge on release`. When the radius of several selected segments is dragged, segments parallel to it get the concentric radius (^282).
