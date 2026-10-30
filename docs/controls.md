# Controls

The current controls, in one place (^36). Controls in modelcity are **contextual by design** (^45): what a button or key does depends on what is under the pointer and on what the user is doing right now. So this document is organized by context, and every context lists everything that works in it. The reasoning and history live in the hats; when a control changes, update this file and the hat that decided it.

Code: editor keys in `src/lib/keymap.ts`, pointer rules in `src/lib/editor.svelte.ts`, camera rules in `src/lib/camera.svelte.ts`, input dispatch in `src/lib/MapCanvas.svelte`.

Mouse buttons: **LMB** left, **MMB** middle (wheel button), **RMB** right. "Click" means press and release without moving; "drag" means moving while the button is held.

## What the left button does (decided by what is under the pointer)

The left button always creates or edits, there are no tools (^44). What happens depends on the first thing under the pointer, in this order:

| Under the pointer | Preview shown while hovering | LMB click | LMB drag | Hats |
|-------------------|------------------------------|-----------|----------|------|
| A handle: node, heading arrow tip, blue point, orange ring, turquoise point | The handle is highlighted (blue ring); no preview of a new node | Selects a node or heading; on a node it is a plain click (see "Drawing" for the last node) | Edits the handle: moves the node, turns the heading, drags the blue point or the radius ring | ^9, ^44 |
| A road's curve (within 18 px) | A ring and a small tick on the curve; no preview of a new node | Inserts a node there. The curve does not change | Inserts a node and sets its heading while dragging (the heading points from the node to the cursor). This can turn the curve into an S-curve or hook | ^10, ^44 |
| Empty canvas, no road being drawn | A ghost node heading right | Starts a new road: node 1, heading right | Starts a new road with node 1's heading pointing from the press point to the cursor | ^40, ^42, ^44 |
| Empty canvas, a road being drawn | A ghost node and the curve to it from the road's last node | Adds a node at the end of the road; its heading is chosen so that the new edge is a single circular arc (a hook beyond 180°, also when the cursor is behind the arrow) | Adds the node at the press point with the heading pointing to the cursor; the curve is previewed live | ^40, ^44, ^46 |

Details:

- Shift while dragging a heading (editing a handle, or placing a node) snaps it to 15° steps (^11).
- Double-click on an orange ring resets that radius to auto (^8).
- Dragging less than 6 px while placing a node does not set a heading, so a click keeps the automatic one.

## Drawing a road (a road is being drawn)

A road is "being drawn" from its first click until it is finished. In this context everything in the table above applies, plus how to finish (any of these, ^43):

| Input | Action |
|-------|--------|
| Esc | Finish the road. With only one node the road is cancelled, because a road needs at least two nodes |
| RMB click on empty space | Same as Esc |
| LMB click on the road's last node | Same as Esc (a click, not a drag; dragging the last node moves it and keeps drawing) |

After finishing, the next LMB click on empty canvas starts a new road. Roads are independent of each other (^42).

## Removing

| Input | Action | Hats |
|-------|--------|------|
| RMB click on a node (also while drawing) | Remove that node. A road left with fewer than two nodes disappears, except the road being drawn, which may have one node | ^11, ^31, ^43 |
| Del or Backspace | Remove the selected node (same rule) | ^11 |
| RMB click on empty space | Finish the road being drawn (nothing if none) | ^43 |

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

The camera cannot leave the content (^37, ^38): at least 12 px of the (invisible, screen-aligned) bounding box around all nodes and handles always stay on screen, whatever you pan, zoom or rotate. With nothing drawn, the view does not pan at all.

## Touch

| Input | Action | Hats |
|-------|--------|------|
| One finger | Same as the left button in every context above (creating, editing, inserting, dragging a heading) | ^40 |
| A second finger comes down | The one-finger action is undone (a node placed by the first finger disappears) and the gesture becomes a camera gesture | ^40 |
| Two fingers | Twist rotates, pinch zooms, moving both pans (all about the midpoint) | ^30 |

There is no one-finger pan any more: empty space belongs to creating (^14 is superseded).

## Tooltips and feedback on the canvas

| Where | What | Hats |
|-------|------|------|
| Top left, over the map | A mouse symbol with the left button filled and the text "create node" | ^41 |
| Mouse symbol | A simplified mouse (`MouseIcon`): a filled button means that it is pressed, or has to be pressed, to trigger the action | ^41 |
| Key caps | Hotkey hints (`KeyCap`) are raised caps; pressed ones turn blue and sink in | ^32 |

## Not decided yet

- Selection box (LMB drag on empty space is used for creating now, so a box needs another trigger), typed length/angle, guide snapping and undo from the handover (^11).
- Discoverability of finishing a road (Esc, RMB click, last node) and of the other contexts: more tooltips for the top left corner, and the HUD (^20, ^29).
- Where the grid returns (^35) and a permanent rotation indicator (^31).
