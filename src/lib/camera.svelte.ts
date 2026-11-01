import { constrainView, type Anchor } from './bounds';
import { cardinalForKey, chipAt } from './compass';
import { movePivot, setRotation, startPivot, type PivotDrag } from './pivotDrag';
import { applyTwoFinger, type Pair } from './twoFinger';
import type { CameraState } from './project/file';
import { initialView, panBy, zoomAt, type Point, type Size, type View } from './view';

const ZOOM_PER_WHEEL_PX = 0.0015;
/** Pointer travel below which a right-button press still counts as a click (^31). */
const CLICK_SLOP_PX = 4;
/** How long the scale bar stays visible after the last wheel or pinch zoom (^34). */
export const SCALE_BAR_HOLD_MS = 2000;

/**
 * The camera: view, pan, zoom and rotate interaction (^30). No DOM and no document logic: the
 * canvas component feeds it pointer events in screen pixels relative to the canvas (^12).
 */
export class Camera {
  view = $state<View>(initialView());
  size = $state<Size>({ width: 1, height: 1 });
  /** Last pointer position, screen pixels; the compass is drawn here while rotating. */
  cursor = $state.raw<Point>({ x: 0, y: 0 });
  panning = $state(false);
  private rotation = $state.raw<PivotDrag | null>(null);
  /** Key chip (n/e/s/w) currently held or clicked, shown pressed on the compass (^33). */
  pressed = $state<string | null>(null);
  rotating = $derived(this.rotation !== null);
  private recentZoom = $state(false);
  /** The scale bar is only shown while it is useful: during a middle drag and shortly after zooming (^34). */
  scaleBarVisible = $derived(this.rotating || this.recentZoom);

  /** Everything grabbable; the view must stay on it (^37). */
  private anchors: Anchor[] = [];
  private pan: { last: Point; travel: number } | null = null;
  private touches: { id: number; at: Point }[] = [];
  private zoomTimer: ReturnType<typeof setTimeout> | undefined;

  /** Every view change goes through here so the camera cannot leave the content (^37). */
  private setView(view: View) {
    this.view = constrainView(view, this.size, this.anchors);
  }

  /** The camera as a project stores it (^170). */
  get state(): CameraState {
    const { cx, cy, scale, rot } = this.view;
    return { x: cx, y: cy, scale, rotation: rot };
  }

  /** Go back to a stored camera. */
  restore({ x, y, scale, rotation }: CameraState) {
    this.setView({ ...initialView(), cx: x, cy: y, scale, rot: rotation });
  }

  /** The content moved or the window resized: keep the view on the content. */
  setAnchors(anchors: Anchor[]) {
    this.anchors = anchors;
    this.setView(this.view);
  }

  /** Zoom at `anchor` by a wheel delta in pixels (positive deltaY zooms out). */
  zoomWheel(deltaPx: number, anchor: Point) {
    this.setView(zoomAt(this.view, this.size, anchor, Math.exp(-deltaPx * ZOOM_PER_WHEEL_PX)));
    this.flashScaleBar();
  }

  private flashScaleBar() {
    this.recentZoom = true;
    clearTimeout(this.zoomTimer);
    this.zoomTimer = setTimeout(() => (this.recentZoom = false), SCALE_BAR_HOLD_MS);
  }

  startPan(at: Point) {
    this.pan = { last: at, travel: 0 };
    this.panning = true;
  }

  movePan(at: Point) {
    if (!this.pan) return;
    const dx = at.x - this.pan.last.x;
    const dy = at.y - this.pan.last.y;
    this.setView(panBy(this.view, dx, dy));
    this.pan = { last: at, travel: this.pan.travel + Math.hypot(dx, dy) };
  }

  /** Stop panning; true if the pointer actually moved (so it was a drag, not a click). */
  endPan(): boolean {
    const moved = (this.pan?.travel ?? 0) > CLICK_SLOP_PX;
    this.pan = null;
    this.panning = false;
    return moved;
  }

  startRotate(at: Point) {
    this.rotation = startPivot(this.view, at);
  }

  moveRotate(at: Point) {
    if (!this.rotation) return;
    this.rotation = movePivot(this.rotation, this.size, at);
    this.syncRotation();
  }

  endRotate() {
    this.rotation = null;
    this.pressed = null;
  }

  /** Abort the rotation and restore the view from before the drag. */
  cancelRotate() {
    if (this.rotation) this.setView(this.rotation.view0);
    this.rotation = null;
    this.pressed = null;
  }

  private rotateTo(rot: number) {
    if (!this.rotation) return;
    this.rotation = setRotation(this.rotation, this.size, rot);
    this.syncRotation();
  }

  /** Show the drag's view, kept on the content, and let the drag carry on from what is shown. */
  private syncRotation() {
    if (!this.rotation) return;
    this.setView(this.rotation.view);
    this.rotation = { ...this.rotation, view: this.view };
  }

  /** Keys that only mean something during a drag: Esc cancels, N/E/S/W set the direction. */
  key(key: string): boolean {
    if (!this.rotation) return false;
    if (key === 'Escape') this.cancelRotate();
    else {
      const card = cardinalForKey(key);
      if (!card) return false;
      this.pressed = card.key;
      this.rotateTo(card.rot);
    }
    return true;
  }

  keyUp(key: string) {
    if (this.pressed === key.toLowerCase()) this.pressed = null;
  }

  /** A click on one of the compass chips while rotating; true if it hit one. */
  compassClick(at: Point): boolean {
    const chip = this.rotation ? chipAt(this.cursor, at, this.view.rot) : undefined;
    if (!chip) return false;
    this.pressed = chip.key;
    this.rotateTo(chip.rot);
    return true;
  }

  releaseChip() {
    this.pressed = null;
  }

  /** A finger went down; returns how many fingers are down now. */
  touchDown(id: number, at: Point): number {
    this.touches = [...this.touches.filter((t) => t.id !== id), { id, at }];
    return this.touches.length;
  }

  /** A finger moved; true if two fingers are down and the camera used the movement. */
  touchMove(id: number, at: Point): boolean {
    const prev = this.touches.map((t) => t.at);
    if (!this.touches.some((t) => t.id === id)) return false;
    this.touches = this.touches.map((t) => (t.id === id ? { id, at } : t));
    if (this.touches.length !== 2) return false;
    const next = this.touches.map((t) => t.at);
    const before = this.view.scale;
    this.setView(applyTwoFinger(this.view, this.size, prev as Pair, next as Pair));
    if (this.view.scale !== before) this.flashScaleBar();
    return true;
  }

  touchUp(id: number) {
    this.touches = this.touches.filter((t) => t.id !== id);
  }
}
