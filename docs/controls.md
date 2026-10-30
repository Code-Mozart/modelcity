# Controls

The current controls, in one place (^36). Controls in modelcity are **contextual by design** (^45): what a button or key does depends on the mode, on what is under the pointer and on what the user is doing right now. So this document is organized by context, and every context lists everything that works in it. The reasoning and history live in the hats; when a control changes, update this file and the hat that decided it.

Code: editor keys in `src/lib/keymap.ts`, pointer rules in `src/lib/editor.svelte.ts`, camera rules in `src/lib/camera.svelte.ts`, input dispatch in `src/lib/MapCanvas.svelte`, the hints in `src/lib/hints.ts`.

Mouse buttons: **LMB** left, **MMB** middle (wheel button), **RMB** right. "Click" means press and release without moving; "drag" means moving while the button is held.

## Two modes (^48)

- **Select mode:** no road is being drawn. The cursor is the default arrow and there is no preview.
- **Draw mode:** a road is being drawn. The cursor is a crosshair and a preview shows the node a click would add, with the curve to it.

A left click on empty canvas in select mode only enters draw mode (it places no node, ^54); the next click places node 1 of a new road. A left drag in select mode does not enter draw mode: it spans the selection box (^70). Leaving draw mode: Esc, an RMB click on empty space, or an LMB click on the node being drawn from (^43).

## What the left button does

The left button always creates or edits; there are no tools (^44). What happens depends on the mode and on the first thing under the pointer, in this order:

| Under the pointer | Select mode | Draw mode | Hats |
|-------------------|-------------|-----------|------|
| A handle: node, heading arrow tip, bend point (orange), orange ring, yellow point | The handle is highlighted (blue ring). Click selects a node or heading. Drag edits it: moves the node (all selected nodes move with it, see Selection), turns the heading, drags the bend point or the radius ring | The same, with no node preview | ^9, ^44, ^48 |
| A leaf node: a node at either end of a road (also the only node of a road) | Same as any handle (below) | **Click extends that road from it (^65):** the node becomes the one the next node attaches to, and the road becomes the road being drawn, at that end. At a road's first node the road is extended backwards: the new node is added before it, and its curve arrives along the first node's heading. The preview shows the curve from the cursor to the node. A drag moves the node as usual. The click does not apply to the node already being drawn from: that click finishes the road | ^65 |
| A road's curve (within 18 px) | No mark (the insert mark only exists in draw mode, ^79). Click selects its two nodes, Shift+click adds them (or deselects both if both are selected, ^74), Alt+click selects the whole road (^76). A drag spans the selection box | The curve gets a ring and a small tick (the white mark). Click inserts a node there (the curve does not change). Drag inserts a node and sets its heading while dragging, which can turn the curve into an S-curve or hook | ^10, ^44, ^48 |
| Empty canvas | With nothing selected, click enters draw mode (no node yet); with a selection, click deselects all instead (^75); a Shift click does nothing. Drag spans the selection box (see Selection) | A preview of the node (and, once the road has nodes, the curve to it from the last one). The first click places node 1 of a new road, heading right (a drag sets its heading). Later clicks add a node at the end of the road, its heading chosen so that the new edge is a single circular arc (a hook beyond 180°, also when the cursor is behind the arrow). Drag adds the node at the press point with the heading pointing to the cursor, previewed live | ^40, ^44, ^46, ^48 |

Details:

- Shift while dragging a heading (editing a handle, or placing a node) snaps it to 15° steps (^11).
- Double-click on an orange ring resets that radius to auto (^8).
- Dragging less than 6 px while placing a node does not set a heading, so a click keeps the automatic one.
- Roads are independent of each other (^42).
- Entering draw mode and placing the first node are two clicks (^54).

## Selection (^70, ^71, ^72)

A selection is 0..n nodes, also of different roads. Selected nodes are drawn blue and 150% larger (^73).

| Input | Action |
|-------|--------|
| LMB drag on empty canvas (select mode) | Spans the selection box, axis-aligned with the viewport. The nodes inside are the new selection, live while dragging |
| Shift + LMB drag on empty canvas | Same, but the nodes inside are added to the current selection |
| LMB on an unselected node | It becomes the whole selection (select mode only: in draw mode a click on a node does not select, ^75) |
| Alt + LMB click on a node or curve | Select the whole road, the lane being the road for now (^76); Alt + drag on a node moves the whole road |
| LMB click on empty canvas (something selected) | Deselect all; with nothing selected it enters draw mode instead (^75) |
| LMB drag a selected node | All selected nodes move by the same translation; all scaffold gizmos are hidden meanwhile (^78). A click without moving reduces the selection to that node |
| LMB drag the orange radius point of a segment whose two nodes are selected | The radius of all selected segments (both nodes selected) is set to the dragged value; their scaffolds are shown during the drag only (^77) |
| Shift + LMB click on a node | Toggle whether the node is selected |
| LMB click on a curve (select mode) | Select its two nodes (^74) |
| Shift + LMB click on a curve | Add both nodes to the selection; only if both are selected already, deselect them (^74) |
| Shift + LMB drag a node | Adds the node to the selection and moves the group |
| Del or Backspace | Remove all selected nodes |

Entering draw mode, finishing a road and removing nodes clear the selection.

## Removing and finishing

| Input | Action | Hats |
|-------|--------|------|
| RMB click on a node (either mode) | Remove that node. A road left with fewer than two nodes disappears, except the road being drawn, which may have one node | ^11, ^31, ^43 |
| Del or Backspace | Remove the selected nodes (same rule) | ^11 |
| RMB click on empty space | Finish the road being drawn (leaves draw mode); nothing in select mode | ^43 |
| Esc | Finish the road being drawn. With only one node the road is cancelled, because a road needs at least two nodes | ^43 |
| LMB click on the node being drawn from (draw mode: the road's last node, or its first node if the road was extended backwards; a road with one node: that node) | Same as Esc. A click, not a drag: dragging the node moves it and keeps drawing | ^43 |

## The hints (top left)

The corner shows what the mouse and keys do right now, as rows of `[input]: action`, with symbols for the inputs (^49, ^50; `MouseIcon`, `MouseDragIcon`, `MouseWheelIcon`, `KeyCap`). The rows change with the mode and with what is under the pointer:

| Mode and context | Rows |
|------------------|------|
| Select mode, empty canvas | `[LMB]: draw mode` (with a selection: `[LMB]: deselect all`), `[LMB drag]: select`, `[Shift]+[LMB drag]: add to selection` (only while something is selected), `[Del]: delete selected` (same), `[RMB drag]: pan`, `[Wheel]: zoom`, `[MMB drag]: rotate` |
| Select mode, over a curve | `[LMB]: select both nodes` (not if both are selected; `… instead` when something else is selected), `[LMB drag]: select`, `[Shift]+[LMB]: add both nodes to selection` or `deselect both nodes` (only with a selection), `[Alt]+[LMB]: select lane`, `[Del]`, then the camera rows |
| Select mode, over a handle | what dragging it does (`move node`, `turn heading`, `bend curve`, `change radius`), on a node `[RMB]: delete node`, `[LMB]: select` (`select instead` if something else is selected; not if it is selected), `[Shift]+[LMB]: select` (only with a selection) or `deselect`, `[Alt]+[LMB]: select lane`, then `[Del]` and the camera rows |
| Draw mode, empty canvas | `[LMB]: add node`, `[LMB drag]: add node with heading`, `[Esc] or [RMB]: finish` |
| Draw mode, over a curve | `[LMB]: insert node`, `[LMB drag]: insert node with heading`, `[Esc] or [RMB]: finish` |
| Draw mode, over a node | `[LMB drag]: move node`, `[RMB]: delete node`, `[Esc]: finish`. The node being drawn from also has `[LMB]: finish road`; another leaf node has `[LMB]: extend road` |
| Draw mode, over another handle | what dragging it does, `[Esc] or [RMB]: finish` |

While a button is held, the rows stay those of where it was pressed.

## What is shown on the canvas (^60)

Two levels of gizmo:

- The **skeleton** is always shown: the curves, the dots of the nodes, and small direction arrows along the curves every 48 px, pointing the way the road runs (^80, ^86). There are no numbering labels.
- The **scaffold** of a segment (the curve between two nodes) is everything else: the orange lines, circle, ticks and control points (the bend's point and the heading tips), the heading arrows (orange), the yellow lines and points, the orange radius point and its label (`116.7m`). It is shown completely or not at all.

Only a single segment shows its scaffold at a time (^66), over all roads. Which one:

1. A hovered or dragged orange or yellow point keeps its own segment, wherever the pointer is. A hovered or dragged node or heading tip takes the one of its two segments whose curve is closer to the pointer.
2. Otherwise the segment whose curve the pointer is on (within 20 px of it), the closest curve first.
3. Otherwise the segment with the control point closest to the pointer (a node, a heading tip, the bend point, a hook's yellow points, the orange point), within 48 px; nearer curves break ties.

The heading arrows of the two nodes of the shown segment are shown with it, and no other arrows. A node of a road that has no segment yet always shows its heading arrow. A node being placed counts as dragged.

Looks: blue means selected or user action (selected nodes, the hover ring, the selection box), orange is gizmo. Filled points can be dragged (orange tips and bend points, orange radius points, a hook's yellow points); hollow ones (an S-curve's yellow points) only show derived geometry. On touch there is no hover, so scaffolds appear only while something is grabbed.

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
