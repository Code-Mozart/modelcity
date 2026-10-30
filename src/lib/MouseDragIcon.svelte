<script lang="ts">
  import { SYMBOL_STROKE, arrowPath } from './arrows';
  import MouseGlyph from './MouseGlyph.svelte';

  /**
   * A mouse button being dragged (^50, ^56): the mouse with the dragged button filled, smaller,
   * and four arrows in the style of the node headings pointing up, left, down and right. Same
   * 30 x 30 box as the other mouse symbols.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    label,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; label?: string } = $props();

  const SCALE = 0.65;
  /** The mouse is 14.3 x 17.6 here, centered at (15, 15); the four arrows have equal length. */
  const ARROWS = [
    arrowPath({ x: 15, y: 5.4 }, { x: 15, y: 0.9 }),
    arrowPath({ x: 15, y: 24.6 }, { x: 15, y: 29.1 }),
    arrowPath({ x: 7, y: 15 }, { x: 2.5, y: 15 }),
    arrowPath({ x: 23, y: 15 }, { x: 27.5, y: 15 }),
  ];
</script>

<svg
  viewBox="0 0 30 30"
  width="34"
  height="34"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <g transform="translate({15 - 11 * SCALE} {15 - 13.5 * SCALE}) scale({SCALE})">
    <MouseGlyph {lmb} {mmb} {rmb} stroke={SYMBOL_STROKE / SCALE} />
  </g>
  {#each ARROWS as d (d)}
    <path
      {d}
      fill="none"
      stroke="currentColor"
      stroke-width={SYMBOL_STROKE}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>
