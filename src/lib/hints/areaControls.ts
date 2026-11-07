import {
  always,
  draw,
  isNode,
  isType,
  key,
  lmb,
  onCurve,
  onDerived,
  onSelection,
  rmb,
  select,
  some,
  dragRow,
  type C,
} from './facts';
import { ESC, mouse } from './inputs';
import { DRAG_TEXT, type Facts } from './facts';
import { SELECT_HEAD, SELECT_TAIL } from './selectControls';
import { DRAW_HEAD, DRAW_TAIL } from './drawControls';

/** Dragging a handle, deleting a node, flipping an arm, in every mode (^488, ^697, ^695, ^696, ^489, ^466). */
const HANDLE_ROWS: C[] = [
  // Dragging a handle (^488, ^697, ^695, ^696), deleting a node (^489), flipping an arm (^466).
  dragRow(488, 'node'),
  dragRow(697, 'head'),
  dragRow(695, 'ctrl'),
  dragRow(696, 'rad'),
  // A derived node is made real by dragging it (^824).
  {
    hat: 824,
    input: mouse('lmb', true),
    on: (f) => select(f) && onDerived(f),
    listens: always,
    says: () => 'realize node',
  },
  {
    hat: 489,
    input: rmb,
    on: (f) => !f.viewing && isNode(f),
    listens: always,
    says: (f) => (onSelection(f) ? 'delete selected nodes' : 'delete node'),
  },
  {
    hat: 466,
    input: mouse('lmb', false, 'alt'),
    on: (f) => !f.viewing && isType('head')(f),
    listens: always,
    says: () => 'flip arm',
  },
];

/** Removing what a right click is on, over a curve: the segment, its branch, or the selection (^709, ^710, ^699). */
const REMOVAL_ROWS: C[] = [
  // Removing what a right click is on, over a curve: the segment, its branch, or the selection (^709, ^710, ^699).
  {
    hat: 699,
    input: [rmb, mouse('rmb', false, 'alt')],
    on: (f) => !f.viewing && onCurve(f) && onSelection(f),
    listens: always,
    says: () => 'delete selected nodes',
  },
  {
    hat: 709,
    input: rmb,
    on: (f) => !f.viewing && onCurve(f) && !onSelection(f),
    listens: always,
    says: () => 'remove segment',
  },
  {
    hat: 710,
    input: mouse('rmb', false, 'alt'),
    on: (f) => !f.viewing && onCurve(f) && !onSelection(f),
    listens: always,
    says: () => 'remove branch',
  },
];

/** The pointer controls by what is under the pointer, in the order of the hints. */
export const AREA_CONTROLS: C[] = [
  ...SELECT_HEAD,
  ...DRAW_HEAD,
  ...HANDLE_ROWS,
  ...SELECT_TAIL,
  ...DRAW_TAIL,
  ...REMOVAL_ROWS,
];

/** The camera works in every mode; its hints are hidden after use (^722, ^723, ^725, ^110, ^389). */
const CAMERA_CONTROLS: C[] = [
  {
    hat: 722,
    input: mouse('rmb', true),
    id: 'pan',
    on: always,
    listens: always,
    says: () => 'pan',
  },
  {
    hat: 723,
    input: { kind: 'wheel' },
    id: 'zoom',
    on: always,
    listens: always,
    says: () => 'zoom',
  },
  {
    hat: 725,
    input: mouse('mmb', true),
    id: 'rotate',
    on: always,
    listens: always,
    says: () => 'rotate',
  },
];

/** `Tab` goes to view mode and back (^394, ^771, ^395, ^104); the way out is never hidden (^384). */
const TAB_CONTROLS: C[] = [
  { hat: 394, input: key('Tab'), id: 'view', on: select, listens: always, says: () => 'view mode' },
  { hat: 771, input: key('Tab'), id: 'view', on: draw, listens: always, says: () => 'view mode' },
  { hat: 395, input: key('Tab'), on: (f) => f.viewing, listens: always, says: () => 'select mode' },
];

/** What the snap adds: `Ctrl` turns it off, `Shift` keeps only the position, `Alt` inverts the heading, `S` pins (^415, ^416, ^702, ^417, ^721). */
const SNAP_CONTROLS: C[] = [
  {
    hat: 415,
    input: key('Ctrl'),
    on: (f) => !f.viewing && !!f.state.snapping,
    listens: always,
    says: () => 'no snapping',
  },
  {
    hat: 416,
    input: key('Shift'),
    on: (f) => !f.viewing && !!f.state.snapping && !!f.state.placing,
    listens: always,
    says: () => 'snap only the position',
  },
  {
    hat: 702,
    input: key('Alt'),
    on: (f) => !f.viewing && !!f.state.touching,
    listens: always,
    says: () => 'opposite heading',
  },
  {
    hat: 417,
    input: key('S'),
    on: (f) => !f.viewing && !f.state.rotating,
    listens: some,
    says: (f) => (some(f) ? 'pin snap suggestions' : null),
  },
  {
    hat: 721,
    input: key('S'),
    on: (f) => !f.viewing && !f.state.rotating,
    listens: (f) => !some(f) && !!f.state.pinned,
    says: (f) => (!some(f) && f.state.pinned ? 'unpin all snap suggestions' : null),
  },
];

/** The projects, always (^400, ^168). */
const PROJECT_CONTROLS: C[] = [
  { hat: 400, input: key('P'), on: always, listens: always, says: () => 'projects' },
];

/** All controls of the hint panel but those of a drag, in the order of the panel: `Tab`, the area, the camera, the snap keys, `P`. */
export const PANEL_CONTROLS: C[] = [
  ...TAB_CONTROLS.slice(0, 2),
  ...AREA_CONTROLS,
  ...CAMERA_CONTROLS,
  ...SNAP_CONTROLS,
  ...PROJECT_CONTROLS,
];

/** View mode: the way out first (never hidden), the camera, `P`. */
export const VIEW_CONTROLS: C[] = [TAB_CONTROLS[2]!, ...CAMERA_CONTROLS, ...PROJECT_CONTROLS];

const dragging = (f: Facts) => !!f.state.drag;
const dragType = (f: Facts) => f.state.drag!.type;

/** While a handle is dragged only what matters now: what the drag does, what a key changes, and whether it merges (^286). */
export const DRAG_CONTROLS: C[] = [
  {
    hat: 488,
    input: mouse('lmb', true),
    on: dragging,
    listens: always,
    says: (f) => DRAG_TEXT[dragType(f)],
  },
  {
    hat: 703,
    input: lmb,
    on: (f) => dragging(f) && !!f.state.drag!.merge,
    listens: always,
    says: () => 'merge on release',
  },
  { hat: 461, input: ESC, on: dragging, listens: always, says: () => 'cancel' },
  {
    hat: 462,
    input: key('Ctrl'),
    on: (f) => dragging(f) && (!!f.state.snapping || dragType(f) === 'head'),
    listens: always,
    says: () => 'no snapping',
  },
  {
    hat: 702,
    input: key('Alt'),
    on: (f) => dragging(f) && !!f.state.touching,
    listens: always,
    says: () => 'opposite heading',
  },
  // A moved node takes the heading of the snap, unless `Shift` keeps only its position (^796, ^358).
  {
    hat: 796,
    input: key('Shift'),
    on: (f) => dragging(f) && dragType(f) === 'node' && !!f.state.touching,
    listens: always,
    says: () => 'snap only the position',
  },
  // Aiming (^335) is for the heading of an existing node; not while one that was just placed is set (^358).
  {
    hat: 700,
    input: key('Shift'),
    on: (f) => dragging(f) && dragType(f) === 'head' && !f.state.drag!.place,
    listens: always,
    says: () => 'aim at snap suggestion',
  },
  {
    hat: 701,
    input: key('Shift+Alt'),
    on: (f) => dragging(f) && dragType(f) === 'head' && !f.state.drag!.place,
    listens: always,
    says: () => 'aim away from snap suggestion',
  },
];
