/** How many of the last draws the readout looks at. */
const WINDOW = 60;
/** Two draws further apart than this (ms) are not one after the other: the view was still in between. */
const SAME_RUN_MS = 100;
/** How often the text changes (ms). */
const EVERY_MS = 200;

/**
 * The time of the frames, for a look at how fast the map draws on this machine (`Ctrl+Period`,
 * ^1252): how long a draw takes (JavaScript only, not what the browser paints after it), and how
 * often a draw follows the one before while the view moves, which is what the screen shows.
 */
export class FrameStats {
  visible = $state(false);
  text = $state('');
  private draws: { start: number; ms: number }[] = [];
  private shown = 0;

  toggle() {
    this.visible = !this.visible;
    this.draws = [];
    this.text = '';
  }

  /** A draw began at `start` and ended at `end` (`performance.now()`). */
  record(start: number, end: number) {
    if (!this.visible) return;
    this.draws.push({ start, ms: end - start });
    if (this.draws.length > WINDOW) this.draws.shift();
    if (end - this.shown < EVERY_MS) return;
    this.shown = end;
    this.text = describe(this.draws);
  }
}

/** The text of the readout for these draws. */
export function describe(draws: { start: number; ms: number }[]): string {
  const ms = draws.map((d) => d.ms);
  const gaps = draws
    .slice(1)
    .map((d, i) => d.start - draws[i]!.start)
    .filter((g) => g < SAME_RUN_MS);
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const draw = `draw ${mean(ms).toFixed(1)} ms (most ${Math.max(...ms).toFixed(1)})`;
  return gaps.length ? `${draw} · ${Math.round(1000 / mean(gaps))} frames per second` : draw;
}
