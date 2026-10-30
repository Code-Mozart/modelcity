# Controls

The current controls, in one place (^36). The reasoning and history live in the hats; when a control changes, update this file and the hat that decided it. Keys are defined in `src/lib/keymap.ts` (editor) and `src/lib/camera.svelte.ts` (camera).

## Mouse

| Input | Action | Hats |
|-------|--------|------|
| Wheel | Zoom at the cursor (Ctrl+wheel, e.g. a trackpad pinch, is 4x faster) | ^30 |
| Right button, drag | Pan | ^30 |
| Right button, click without moving | Remove the node under the pointer | ^11, ^31 |
| Middle button, drag left/right | Rotate about the point where the drag started (right = clockwise, 0.4° per pixel) | ^30, ^31 |
| Middle button, drag up/down | Zoom about the same point (up = zoom in, 1% per pixel, like Blender's dolly) | ^30, ^31 |
| Left button, drag a handle | Edit: move a node, turn a heading arrow, drag the blue point or an orange radius ring | ^9, ^11 |
| Left button, double-click an orange ring | Reset that radius to auto | ^8 |
| Left button, drag on empty space | Nothing yet (reserved for a selection box) | ^30 |
| Shift while dragging a heading | Snap to 15° steps | ^11 |

Middle-button drag details (^31): the first 20 pixels from where the drag started are a dead zone per axis, so a mostly vertical drag does not also rotate and vice versa. The effect starts from zero at the edge of the zone, and moving back inside undoes it. The scale bar is shown during the drag and for 2 seconds after any wheel or pinch zoom (^34).

While the middle button is held:

| Input | Action |
|-------|--------|
| Esc | Cancel: restore the view from before the drag |
| N, E, S, W | Rotate so that north, east, south or west is up (N resets). The drag continues from there with a fresh dead zone |
| Left click on a key cap of the compass | Same as the key |

The cursor becomes a compass (^33): the needle points to world north; the inner ring shows what dragging does (counterclockwise left, clockwise right, zoom in above, zoom out below); the N, E, S, W key caps on the outer ring sit in the on-screen direction of the real world direction, so they turn with the world, and turn blue while pressed.

## Camera limits

The camera cannot leave the content (^37, ^38): at least 12 px of the (invisible, screen-aligned) bounding box around all nodes and handles always stay on screen, whatever you pan, zoom or rotate. With nothing drawn, the view does not pan at all.

## Keyboard

| Key | Action | Hats |
|-----|--------|------|
| M or Esc | Move tool (Esc also cancels a rotation, see above) | ^11 |
| A | Append tool: click adds a node at the nearer end of the path | ^11 |
| I | Insert tool: click adds a node on the curve, the curve does not change | ^10, ^11 |
| Del or Backspace | Remove the selected node | ^11 |

The toolbar buttons show the same keys as key caps (`KeyCap`, ^32).

## Touch

| Input | Action | Hats |
|-------|--------|------|
| One finger on a handle | Drag it | ^14, ^30 |
| One finger on empty space (Move tool) | Pan | ^14, ^30 |
| Two fingers | Twist rotates, pinch zooms, moving both pans (all about the midpoint) | ^30 |

## Not decided yet

- Selection box (left-drag on empty space), typed length/angle, guide snapping and undo from the handover (^11).
- Where the grid returns (^35), a permanent rotation indicator (^31), and the HUD (^20, ^29).
